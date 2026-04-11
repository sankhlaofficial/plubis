import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getStorage, type Storage } from 'firebase-admin/storage';
import { getAuth, type Auth } from 'firebase-admin/auth';

let app: App;
let db: Firestore;
let storage: Storage;
let auth: Auth;

function getApp(): App {
  if (app) return app;
  if (getApps().length > 0) {
    app = getApps()[0]!;
    return app;
  }

  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!privateKey) throw new Error('FIREBASE_ADMIN_PRIVATE_KEY not set');

  app = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
      privateKey,
    }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
  return app;
}

export function adminDb(): Firestore {
  if (!db) db = getFirestore(getApp());
  return db;
}

export function adminStorage(): Storage {
  if (!storage) storage = getStorage(getApp());
  return storage;
}

export function adminAuth(): Auth {
  if (!auth) auth = getAuth(getApp());
  return auth;
}
