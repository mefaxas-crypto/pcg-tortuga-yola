#!/usr/bin/env ts-node
/**
 * Seed script for initial inventory data for the signed-in user or a specified userId.
 * Usage (interactive with Firebase Auth running in dev):
 *   npx ts-node scripts/seed-inventory.ts --user <uid>
 *
 * If --user is omitted, will attempt to derive SEED_USER_EMAIL (not implemented: requires Admin to look up).
 * For deterministic, pass --user explicitly (copy from Firebase Auth console or after logging in and checking user.uid in app).
 */

import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

interface SeedItem {
  name: string;
  category?: string;
  unit: string;
  parLevel?: number;
  userId: string;
  createdAt: FirebaseFirestore.FieldValue;
  updatedAt: FirebaseFirestore.FieldValue;
}

function initAdmin(): App {
  if (getApps().length) return getApps()[0];

  // Prefer service account JSON
  const saJson = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON;
  if (saJson) {
    const parsed = JSON.parse(saJson);
    return initializeApp({ credential: cert(parsed) });
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Missing admin credentials (set FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON or individual fields).');
  }

  // Support escaped newlines
  privateKey = privateKey.replace(/\\n/g, '\n');

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey })
  });
}

async function main() {
  const userIdArgIndex = process.argv.indexOf('--user');
  const userId = userIdArgIndex > -1 ? process.argv[userIdArgIndex + 1] : undefined;
  if (!userId) {
    console.error('Please pass --user <uid> (copy uid from app after logging in).');
    process.exit(1);
  }

  const app = initAdmin();
  const db = getFirestore(app);
  const now = new Date();
  const serverTs = (await import('firebase-admin/firestore')).FieldValue.serverTimestamp();

  const items: Omit<SeedItem, 'createdAt' | 'updatedAt'>[] = [
    { name: 'Tomatoes (Roma)', category: 'Produce', unit: 'kg', parLevel: 15, userId },
    { name: 'Olive Oil Extra Virgin', category: 'Dry Goods', unit: 'L', parLevel: 5, userId },
    { name: 'All-Purpose Flour', category: 'Dry Goods', unit: 'kg', parLevel: 20, userId },
    { name: 'Fresh Basil', category: 'Produce', unit: 'bunch', parLevel: 10, userId },
    { name: 'Mozzarella Cheese', category: 'Dairy', unit: 'kg', parLevel: 8, userId },
  ];

  const batch = db.batch();
  const inventoryCol = db.collection('inventory');

  for (const item of items) {
    const docRef = inventoryCol.doc();
    batch.set(docRef, { ...item, createdAt: serverTs, updatedAt: serverTs });
  }

  await batch.commit();
  console.log(`Seeded ${items.length} inventory items for user ${userId}.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
