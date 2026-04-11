// Watch a Plubis job in real time. Prints one line each time the state
// changes meaningfully (phase, status, image count, error). Stays quiet
// otherwise so we don't spam the chat.

const admin = require('firebase-admin');
const fs = require('fs');

const env = {};
fs.readFileSync('/Users/divyanshkumar/Documents/Aditya/Projects/storybook-saas/.env.local', 'utf-8')
  .split('\n')
  .forEach((l) => {
    const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) {
      let v = m[2];
      if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
      env[m[1]] = v;
    }
  });

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
});

const JOB_ID = process.argv[2];
if (!JOB_ID) {
  console.error('Usage: node job-watcher.js <jobId>');
  process.exit(1);
}

let last = {};
const ref = admin.firestore().collection('jobs').doc(JOB_ID);

async function tick() {
  try {
    const snap = await ref.get();
    if (!snap.exists) {
      console.log('JOB NOT FOUND');
      return;
    }
    const j = snap.data();
    const phase = j.progress?.phase;
    const pct = j.progress?.percent;
    const status = j.status;
    const cover = j.imageUrls?.cover ? 1 : 0;
    const pages = j.imageUrls?.pages || [];
    const ready = pages.filter((p) => p).length;
    const totalImg = (j.bookJson?.pages?.length || 0) + 1;
    const pdf = !!j.pdfUrl;
    const epub = !!j.epubUrl;
    const error = j.error?.message || null;

    const cur = { phase, status, ready: cover + ready, totalImg, pdf, epub, error };
    const changed = Object.keys(cur).some((k) => cur[k] !== last[k]);

    if (changed) {
      const t = new Date().toISOString().slice(11, 19);
      let msg = `[${t}] status=${status} phase=${phase} ${pct}%`;
      if (j.bookJson?.title) msg += ` title="${j.bookJson.title}"`;
      if (totalImg > 0) msg += ` imgs=${cur.ready}/${totalImg}`;
      msg += ` pdf=${pdf ? 'Y' : 'N'} epub=${epub ? 'Y' : 'N'}`;
      if (error) msg += ` ERROR="${error}"`;
      console.log(msg);
      last = cur;
    }

    if (status === 'complete' || status === 'failed') {
      console.log('TERMINAL: ' + status);
      process.exit(0);
    }
  } catch (e) {
    console.log('ERR: ' + (e.message || e));
  }
}

// Initial tick + every 8 seconds
tick();
setInterval(tick, 8000);
