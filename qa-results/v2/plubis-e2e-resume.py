#!/usr/bin/env python3
"""Resume the e2e book gen for existing jobId after the polling fix."""
import os, json, urllib.request, urllib.error, time, sys, subprocess
from concurrent.futures import ThreadPoolExecutor

BASE = "https://plubis.vercel.app"
TOKEN = os.environ["AUTH_TOKEN"].strip()
H_AUTH = {"Authorization": f"Bearer {TOKEN}"}
JOB_ID = "Uf8J1Q1VBrbLFIU9hLwA"

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl): return None
urllib.request.install_opener(urllib.request.build_opener(NoRedirect))

def post(path, body):
    data = json.dumps(body).encode()
    req = urllib.request.Request(BASE + path, data=data, headers={**H_AUTH, "Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read())
        except: return e.code, {}

def get(path):
    req = urllib.request.Request(BASE + path, headers=H_AUTH)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read())
        except: return e.code, {}

print(f"=== Resuming jobId={JOB_ID} ===")
t0 = time.time()

print()
print("=== Poll until building ===")
poll_count = 0
last_phase = None
job = None
while True:
    poll_count += 1
    code, job = get(f"/api/book/status?jobId={JOB_ID}")
    if code != 200:
        print(f"  poll {poll_count} → HTTP {code}: {job}")
        if poll_count > 10:
            print("FAIL — too many bad polls")
            sys.exit(1)
        time.sleep(2)
        continue
    progress = job.get("progress", {})
    phase = progress.get("phase", "?")
    msg = progress.get("message", "?")
    pct = progress.get("percent", 0)
    status = job.get("status", "?")
    if phase != last_phase:
        print(f"  poll {poll_count} [{time.time()-t0:.0f}s]  status={status} phase={phase} ({pct}%) — {msg}")
        last_phase = phase
    if status == "building" and job.get("bookJson"):
        print(f"  ✅ book.json ready! pages={len(job['bookJson']['pages'])} title={job['bookJson'].get('title','?')!r}")
        break
    if status == "complete":
        print(f"  ✅ already complete!")
        break
    if status == "failed":
        print(f"  ❌ generation failed: {job.get('error')}")
        sys.exit(1)
    if poll_count > 200:
        print("FAIL — generation timeout")
        sys.exit(1)
    time.sleep(3)

print()
if job.get("status") == "complete":
    print("Skipping image/pdf/epub steps — job is already complete")
else:
    print("=== Fire parallel /api/book/image ===")
    page_count = len(job["bookJson"]["pages"])
    print(f"  generating cover + {page_count} pages")
    t1 = time.time()
    def gen_image(p):
        code, body = post("/api/book/image", {"jobId": JOB_ID, "page": p})
        return p, code, body.get("url") if isinstance(body, dict) else None
    with ThreadPoolExecutor(max_workers=page_count + 1) as ex:
        results = list(ex.map(gen_image, range(page_count + 1)))
    success = sum(1 for _, c, u in results if c == 200 and u)
    for p, c, u in results:
        label = "cover" if p == 0 else f"page {p}"
        print(f"  {label:8s} -> HTTP {c}")
    print(f"  {success}/{page_count + 1} succeeded in {time.time()-t1:.1f}s")

    print()
    print("=== POST /api/book/build-pdf ===")
    t2 = time.time()
    code, body = post("/api/book/build-pdf", {"jobId": JOB_ID})
    print(f"  HTTP {code} in {time.time()-t2:.1f}s")
    if isinstance(body, dict) and body.get("url"):
        print(f"  pdf_url: ...{body['url'][-60:]}")

    print()
    print("=== POST /api/book/build-epub ===")
    t3 = time.time()
    code, body = post("/api/book/build-epub", {"jobId": JOB_ID})
    print(f"  HTTP {code} in {time.time()-t3:.1f}s")
    if isinstance(body, dict) and body.get("url"):
        print(f"  epub_url: ...{body['url'][-60:]}")

print()
print("=== Final job state ===")
code, job = get(f"/api/book/status?jobId={JOB_ID}")
print(f"  status: {job.get('status')}")
print(f"  pdfUrl: {bool(job.get('pdfUrl'))}")
print(f"  epubUrl: {bool(job.get('epubUrl'))}")
print(f"  total elapsed: {time.time()-t0:.1f}s")

print()
print("=== Download artifacts ===")
out_dir = "/tmp/plubis-e2e-output"
os.makedirs(out_dir, exist_ok=True)

if job.get("pdfUrl"):
    pdf_path = f"{out_dir}/book.pdf"
    urllib.request.urlretrieve(job["pdfUrl"], pdf_path)
    size = os.path.getsize(pdf_path)
    file_type = subprocess.check_output(["/usr/bin/file", pdf_path]).decode().strip()
    print(f"  PDF: {size} bytes -- {file_type}")

if job.get("epubUrl"):
    epub_path = f"{out_dir}/book.epub"
    urllib.request.urlretrieve(job["epubUrl"], epub_path)
    size = os.path.getsize(epub_path)
    file_type = subprocess.check_output(["/usr/bin/file", epub_path]).decode().strip()
    print(f"  EPUB: {size} bytes -- {file_type}")

print()
print("=== E2E COMPLETE ===")
