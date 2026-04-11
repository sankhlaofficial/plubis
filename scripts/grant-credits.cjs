// Grant credits directly via Firebase Admin SDK — bypasses Dodo, costs $0.
// Used for QA: gives the test user 2 credits so we can run a real book gen
// without burning $5 of real payment.
//
// Usage:
//   node scripts/grant-credits.cjs <uid> <amount>
//
// Reads credentials from .env.local (DOTENV-style parsing).

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const envFile = path.join(__dirname, '..', '.env.local');
const env = {};
for (const line of fs.readFileSync(envFile, 'utf-8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (!m) continue;
  let v = m[2];
  if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
  env[m[1]] = v;
}

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
});

const db = admin.firestore();

async function main() {
  const uid = process.argv[2];
  const amount = parseInt(process.argv[3] || '2', 10);
  if (!uid) {
    console.error('Usage: node scripts/grant-credits.cjs <uid> <amount>');
    process.exit(1);
  }

  const userRef = db.collection('users').doc(uid);
  const txnCol = db.collection('credit_txns');

  const newBalance = await db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    const data = snap.exists ? snap.data() : null;
    const current = data?.credits ?? 0;
    const balance = current + amount;

    if (snap.exists) {
      tx.update(userRef, { credits: balance });
    } else {
      tx.set(userRef, {
        uid,
        email: '',
        displayName: '',
        photoURL: '',
        credits: balance,
        totalBooksGenerated: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastActiveAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    tx.set(txnCol.doc(), {
      userId: uid,
      type: 'purchase',
      amount,
      balanceAfter: balance,
      jobId: null,
      dodoPaymentId: 'qa_grant_' + Date.now(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return balance;
  });

  console.log(`✅ Granted ${amount} credits to ${uid}. New balance: ${newBalance}`);
  process.exit(0);
}

main().catch((e) => {
  console.error('FAIL:', e);
  process.exit(1);
});
