import { getApps, initializeApp, cert, AppOptions } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';

// Provide a safe wrapper that won't crash if admin credentials are absent (e.g., on Vercel preview without secrets)
let adminInitTried = false;
let adminAvailable = false;

function initAdminIfPossible() {
  if (getApps().length) {
    adminAvailable = true;
    return;
  }
  if (adminInitTried) return;
  adminInitTried = true;

  try {
    const saJson = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON;
    if (saJson) {
      const parsed = JSON.parse(saJson);
      initializeApp({ credential: cert(parsed) });
      adminAvailable = true;
      return;
    }
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
    if (projectId && clientEmail && privateKey) {
      privateKey = privateKey.replace(/\\n/g, '\n');
      initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
      adminAvailable = true;
      return;
    }
    // No credentials provided -> stay in client-only mode
    adminAvailable = false;
  } catch (e) {
    console.warn('[firebase-admin] Initialization failed, continuing without admin SDK:', e);
    adminAvailable = false;
  }
}

export function getAdminDb() {
  initAdminIfPossible();
  if (!adminAvailable) {
    throw new Error('Admin SDK not available: missing credentials. Provide FIREBASE_ADMIN_* env vars.');
  }
  return getAdminFirestore();
}

export function tryGetAdminDb() {
  try {
    return getAdminDb();
  } catch {
    return null;
  }
}

