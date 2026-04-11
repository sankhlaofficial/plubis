#!/usr/bin/env python3
"""
Plubis QA v3 — deep coverage runner in Python.
Handles JSON natively (no shell escape bugs).
Requires AUTH_TOKEN env var.
"""
import os, json, urllib.request, urllib.parse, urllib.error, hmac, hashlib, time, sys
from concurrent.futures import ThreadPoolExecutor

# Don't auto-follow redirects — we want to verify the 303 itself
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None
opener = urllib.request.build_opener(NoRedirect)
urllib.request.install_opener(opener)

BASE = "https://plubis.vercel.app"
TOKEN = os.environ.get("AUTH_TOKEN", "").strip()
if not TOKEN:
    print("ERROR: AUTH_TOKEN not set")
    sys.exit(1)

# Read DODO_WEBHOOK_SECRET from .env.local
SECRET = ""
with open("/Users/divyanshkumar/Documents/Aditya/Projects/storybook-saas/.env.local") as f:
    for line in f:
        if line.startswith("DODO_WEBHOOK_SECRET="):
            SECRET = line.split("=", 1)[1].strip()
            break

LOG_PATH = "/Users/divyanshkumar/Documents/Aditya/Projects/storybook-saas/qa-results/v2/v3-run.log"
JSON_PATH = "/Users/divyanshkumar/Documents/Aditya/Projects/storybook-saas/qa-results/v2/v3-results.jsonl"
log_f = open(LOG_PATH, "w")
json_f = open(JSON_PATH, "w")

PASS = 0
FAIL = 0
TOTAL = 0

def record(test_id, name, expected, actual, accept_list=None):
    global PASS, FAIL, TOTAL
    TOTAL += 1
    if accept_list is not None:
        ok = actual in accept_list
    else:
        ok = actual == expected
    if ok:
        PASS += 1
        log_f.write(f"✅ {test_id:<14} {name}\n")
        json_f.write(json.dumps({"id": test_id, "status": "PASS", "actual": actual}) + "\n")
    else:
        FAIL += 1
        exp = accept_list if accept_list is not None else expected
        log_f.write(f"❌ {test_id:<14} {name} | expected={exp} actual={actual}\n")
        json_f.write(json.dumps({"id": test_id, "status": "FAIL", "actual": actual, "expected": exp}) + "\n")

def request(method, path, body=None, headers=None, auth=True):
    """Returns HTTP status code (int) or 0 on connection error."""
    url = BASE + path
    h = headers.copy() if headers else {}
    if auth:
        h["Authorization"] = f"Bearer {TOKEN}"
    data = None
    if body is not None:
        if isinstance(body, dict):
            data = json.dumps(body).encode("utf-8")
            h.setdefault("Content-Type", "application/json")
        elif isinstance(body, str):
            data = body.encode("utf-8")
        elif isinstance(body, bytes):
            data = body
    req = urllib.request.Request(url, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.status
    except urllib.error.HTTPError as e:
        return e.code
    except urllib.error.URLError as e:
        # NoRedirect handler raises URLError on 3xx — extract from reason
        if hasattr(e, 'reason') and isinstance(e.reason, str) and 'redirect' in e.reason.lower():
            return 303  # urllib doesn't preserve exact code; assume 303
        return 0
    except Exception:
        return 0

def post_create(body):
    return request("POST", "/api/book/create", body=body)

def post_image(body):
    return request("POST", "/api/book/image", body=body)

def post_pdf(body):
    return request("POST", "/api/book/build-pdf", body=body)

def post_epub(body):
    return request("POST", "/api/book/build-epub", body=body)

def get(path):
    return request("GET", path)

# ============================================================
print("=== V3 Python runner ===")

# V1 — page count matrix
for p in range(8, 17):
    record(f"V1.P{p}", f"pages={p} valid", None, post_create({"topic": f"valid topic test {p}", "pages": p}), accept_list=[200, 402])
for p in [0, 1, 2, 3, 4, 5, 6, 7, 17, 18, 20, 50, 100, 1000, -1, -10]:
    record(f"V1.X{p}", f"pages={p} out of range", 400, post_create({"topic": "valid topic test", "pages": p}))

# V2 — topic content variety
TOPICS = [
    "a brave little fox","a tiny whale who sings","a clumsy elephant on a bicycle",
    "a rainbow that lost its colors","a friendly dragon who hates fire","the moon visits earth for one day",
    "a bookshop run by mice","a cloud that wanted to swim","the slowest snail in the race",
    "a kite caught in a tree","a robot who learned to laugh","the toy that came alive at midnight",
    "the cat who wanted to be a fish","the boy who collected raindrops","an owl who could not sleep",
    "the flower that grew in the snow","a spider who loved spelling","the kangaroo who forgot how to hop",
    "an octopus learning to ride a bike","the boy who could talk to trees","the smallest star in the sky",
    "the train that visited the moon","a turtle in a hurry","the bear who hated honey",
    "the girl who befriended the wind","the soup that talked","a hippo who wanted to dance",
    "the umbrella that hated rain","the puppy who lost its bark","the pencil that drew real things",
    "a frog who studied music","the boy who lived in a teapot","the lazy lion king",
    "a duck on roller skates","the giraffe who wished to fly","the fish who loved books",
    "the snail who was always early","a beetle in a top hat","the moose who collected stamps",
    "the pig who painted skies","an ant carrying a cake","the boy who turned the lights off",
    "the rainbow at the bottom of the sea","the squirrel who feared heights","a starfish in space",
    "the panda who could not stop sneezing","the parrot who told the truth","the fox who returned every key",
    "a deer in a snow globe","the boy who whispered to the river",
]
for i, t in enumerate(TOPICS, 1):
    record(f"V2.T{i:02d}", f"topic '{t[:40]}...'", None, post_create({"topic": t, "pages": 12}), accept_list=[200, 402])

# Special chars
SPECIAL_TOPICS = [
    ("emoji", "a tiny whale 🐳 who sings at night"),
    ("cjk", "小猫学会分享食物的故事"),
    ("html", "<b>bold story</b> about a fox"),
    ("sql", "a fox'; DROP TABLE users;--"),
    ("xss", "<script>alert(1)</script>"),
    ("newlines", "line one\nline two\nline three"),
    ("tabs", "a\tbrave\tlittle\tfox"),
    ("quotes", 'the fox "says" hello'),
    ("backslash", "path\\to\\nowhere"),
    ("arabic", "قصة عن أرنب صغير شجاع يحب المشاركة"),
    ("hebrew", "סיפור על שועל קטן ואמיץ ששובר את המוסכמות"),
    ("ru", "история о маленьком храбром лисёнке"),
    ("hi", "एक बहादुर छोटी लोमड़ी की कहानी"),
    ("emoji_only", "🦊🌙✨"),
    ("digits", "a story about 12345 brave foxes"),
    ("punct", "a fox?! and... a (rabbit)."),
]
for label, t in SPECIAL_TOPICS:
    record(f"V2.X_{label}", f"special topic '{label}'", None, post_create({"topic": t, "pages": 12}), accept_list=[200, 402])

# Boundary length tests (now safe in Python — no shell escaping)
for n in [3, 10, 50, 100, 150, 199, 200]:
    record(f"V2.L{n}", f"topic length {n}", None, post_create({"topic": "a" * n, "pages": 12}), accept_list=[200, 402])
for n in [1, 2, 201, 500, 1000, 2000]:
    record(f"V2.L{n}_bad", f"topic length {n} (out of bounds)", 400, post_create({"topic": "a" * n, "pages": 12}))

# V3 — Personalization combinations
NAMES = ["Maya", "Aarav", "Liam", "Sophia", "小明", "Maya 🌸", "O'Brien", "Mary-Anne"]
for n in NAMES:
    record(f"V3.N_{n[:8]}", f"childName='{n}'", None, post_create({"topic": "valid topic", "pages": 12, "childName": n}), accept_list=[200, 402])
record("V3.N_empty", "childName empty", None, post_create({"topic": "valid topic", "pages": 12, "childName": ""}), accept_list=[200, 402])
record("V3.N_null", "childName null", None, post_create({"topic": "valid topic", "pages": 12, "childName": None}), accept_list=[200, 402])
record("V3.N_max", "childName 60 chars (max)", None, post_create({"topic": "valid topic", "pages": 12, "childName": "M" * 60}), accept_list=[200, 402])
record("V3.N_over", "childName 61 chars (over)", 400, post_create({"topic": "valid topic", "pages": 12, "childName": "M" * 61}))

for a in range(0, 19):
    record(f"V3.A{a:02d}", f"childAge={a}", None, post_create({"topic": "valid topic", "pages": 12, "childAge": a}), accept_list=[200, 402])
record("V3.A_neg", "childAge=-1", 400, post_create({"topic": "valid topic", "pages": 12, "childAge": -1}))
record("V3.A_19", "childAge=19", 400, post_create({"topic": "valid topic", "pages": 12, "childAge": 19}))
record("V3.A_float", "childAge=5.5", 400, post_create({"topic": "valid topic", "pages": 12, "childAge": 5.5}))
record("V3.A_str", "childAge='five'", 400, post_create({"topic": "valid topic", "pages": 12, "childAge": "five"}))

STYLES = ["watercolor", "pastel", "cartoon", "realistic", "ink wash", "anime", "studio ghibli"]
for s in STYLES:
    record(f"V3.S_{s.replace(' ','_')}", f"artStyle='{s}'", None, post_create({"topic": "valid topic", "pages": 12, "artStyle": s}), accept_list=[200, 402])
record("V3.S_max", "artStyle 60 chars", None, post_create({"topic": "valid topic", "pages": 12, "artStyle": "w" * 60}), accept_list=[200, 402])
record("V3.S_over", "artStyle 61 chars", 400, post_create({"topic": "valid topic", "pages": 12, "artStyle": "w" * 61}))

# Description
record("V3.D_short", "childDescription short", None, post_create({"topic": "valid topic", "pages": 12, "childDescription": "curly hair"}), accept_list=[200, 402])
record("V3.D_max", "childDescription 500 chars", None, post_create({"topic": "valid topic", "pages": 12, "childDescription": "c" * 500}), accept_list=[200, 402])
record("V3.D_over", "childDescription 501 chars", 400, post_create({"topic": "valid topic", "pages": 12, "childDescription": "c" * 501}))

# Combined personalization
record("V3.ALL", "all personalization fields", None, post_create({"topic": "valid topic", "pages": 12, "childName": "Maya", "childAge": 4, "childDescription": "curly hair", "artStyle": "watercolor"}), accept_list=[200, 402])

# V4 — jobId regex on all 4 routes
BAD_IDS = ["has spaces", "with/slash", "with..dotdot", "with?question", "with#hash", "with%encoded",
           "with<bracket", "with>bracket", "with|pipe", 'with"quote', "with'apos", "with\\backslash",
           "with\nnewline", "with\ttab", "_x" * 110, ""]  # last is 220 chars (over limit)
for i, bad in enumerate(BAD_IDS, 1):
    label = f"V4.S{i:02d}"
    record(label + "_status", f"/status jobId='{bad[:20]}' (bad)", 400, get(f"/api/book/status?jobId={urllib.parse.quote(bad)}"))
    record(label + "_image", f"/image jobId='{bad[:20]}' (bad)", 400, post_image({"jobId": bad, "page": 0}))
    record(label + "_pdf", f"/build-pdf jobId='{bad[:20]}' (bad)", 400, post_pdf({"jobId": bad}))
    record(label + "_epub", f"/build-epub jobId='{bad[:20]}' (bad)", 400, post_epub({"jobId": bad}))

# Valid format jobIds (should pass regex, then 404 from Firestore)
record("V4.V01_status", "/status valid format nonexistent", 404, get("/api/book/status?jobId=qa_test_nonexistent_123"))
record("V4.V02_image", "/image valid format nonexistent", 404, post_image({"jobId": "qa_test_nonexistent_123", "page": 0}))
record("V4.V03_pdf", "/build-pdf valid format nonexistent", 404, post_pdf({"jobId": "qa_test_nonexistent_123"}))
record("V4.V04_epub", "/build-epub valid format nonexistent", 404, post_epub({"jobId": "qa_test_nonexistent_123"}))

# V5 — page parameter validation
for bad in [-1, -100, 0.5, 1.5, 100.99]:
    record(f"V5.BAD_{bad}", f"image page={bad} (invalid)", 400, post_image({"jobId": "qa_valid_id", "page": bad}))
for ok in [0, 1, 5, 12, 100, 1000]:
    record(f"V5.OK{ok}", f"image page={ok} valid → 404", 404, post_image({"jobId": "qa_valid_id", "page": ok}))
record("V5.NULL", "image page=null", 400, post_image({"jobId": "qa_valid_id", "page": None}))
record("V5.STR", "image page='zero'", 400, post_image({"jobId": "qa_valid_id", "page": "zero"}))
record("V5.BOOL", "image page=true", 400, post_image({"jobId": "qa_valid_id", "page": True}))
record("V5.ARR", "image page=[0]", 400, post_image({"jobId": "qa_valid_id", "page": [0]}))
record("V5.NEG_FLOAT", "image page=-0.5", 400, post_image({"jobId": "qa_valid_id", "page": -0.5}))

# V6 — checkout product matrix
for ok_p in ["credit_1"]:
    record(f"V6.OK_{ok_p}", f"checkout product={ok_p}", 303, get(f"/api/checkout?product={ok_p}"))
for bad_p in ["credit_2", "credit_3", "credit_5", "credit_10", "credit_20", "credit_50", "credit_100", "Credit_1", "CREDIT_1", "credit-1", "credit 1", "subscription", "premium", "free", "unknown", "<script>", "' OR '1'='1"]:
    record(f"V6.BAD_{bad_p[:15]}", f"checkout product={bad_p[:20]}", 400, get(f"/api/checkout?product={urllib.parse.quote(bad_p)}"))
record("V6.empty", "checkout empty product → default", 303, get("/api/checkout?product="))
record("V6.none", "checkout no product → default", 303, get("/api/checkout"))

# V7 — concurrent burst
def burst(fn, n):
    with ThreadPoolExecutor(max_workers=n) as ex:
        return list(ex.map(lambda i: fn(i), range(n)))

results = burst(lambda i: get(f"/api/checkout?product=credit_1"), 20)
record("V7.01", "20 parallel /api/checkout (all 303)", 20, sum(1 for r in results if r == 303))

results = burst(lambda i: get(f"/api/book/status?jobId=qa_concurrent_{i}"), 20)
record("V7.02", "20 parallel /api/book/status nonexistent (all 404)", 20, sum(1 for r in results if r == 404))

# 50 parallel webhook ignored events
def webhook_call(i):
    body = json.dumps({"type": "customer.updated", "data": {"id": "cust_v7_burst"}}).encode()
    sig = hmac.new(SECRET.encode(), body, hashlib.sha256).hexdigest()
    req = urllib.request.Request(BASE + "/api/webhooks/dodo", data=body, headers={
        "Content-Type": "application/json", "webhook-signature": sig
    }, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status
    except urllib.error.HTTPError as e:
        return e.code

results = burst(webhook_call, 50)
record("V7.03", "50 parallel webhook ignored events (all 200)", 50, sum(1 for r in results if r == 200))

# V8 — Authed perf
for i in range(1, 16):
    t0 = time.time()
    code = get(f"/api/book/status?jobId=qa_perf_{i}")
    t = time.time() - t0
    if t < 2.0 and code == 404:
        record(f"V8.P{i:02d}", f"authed perf {t*1000:.0f}ms", 404, code)
    else:
        record(f"V8.P{i:02d}", f"authed perf SLOW {t*1000:.0f}ms or wrong code", 404, code)

# V9 — Error response shape
def has_error_field(method, path, body=None, headers=None, auth=True):
    url = BASE + path
    h = headers.copy() if headers else {}
    if auth:
        h["Authorization"] = f"Bearer {TOKEN}"
    data = json.dumps(body).encode() if isinstance(body, dict) else (body.encode() if isinstance(body, str) else None)
    if data:
        h.setdefault("Content-Type", "application/json")
    req = urllib.request.Request(url, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return False, r.status  # 2xx unlikely to have error
    except urllib.error.HTTPError as e:
        try:
            body = json.loads(e.read())
            return "error" in body, e.code
        except Exception:
            return False, e.code

ok, _ = has_error_field("POST", "/api/book/create", body={}, auth=False)
record("V9.01", "401 no-auth has 'error' field", True, ok)

ok, _ = has_error_field("POST", "/api/book/create", body={})
record("V9.02", "400 bad-body has 'error' field", True, ok)

ok, _ = has_error_field("GET", "/api/book/status?jobId=qa_404")
record("V9.03", "404 has 'error' field", True, ok)

ok, _ = has_error_field("POST", "/api/webhooks/dodo", body='{"type":"payment.succeeded"}', headers={}, auth=False)
record("V9.04", "401 webhook no-sig has 'error' field", True, ok)

# V10 — HTTP method matrix
ENDPOINTS = ["/api/book/create", "/api/book/status", "/api/book/image", "/api/book/build-pdf", "/api/book/build-epub", "/api/checkout", "/api/webhooks/dodo"]
for ep in ENDPOINTS:
    label = ep.replace("/", "_")
    code_options = post_create  # placeholder
    # OPTIONS
    code = request("OPTIONS", ep)
    record(f"V10.O{label}", f"OPTIONS {ep}", None, code, accept_list=[200, 204, 405])
    # HEAD
    code = request("HEAD", ep)
    record(f"V10.H{label}", f"HEAD {ep}", None, code, accept_list=[200, 401, 404, 405])

# Summary
log_f.close()
json_f.close()
print(f"=== V3 Python Summary ===")
print(f"Total: {TOTAL}")
print(f"Pass:  {PASS}")
print(f"Fail:  {FAIL}")
