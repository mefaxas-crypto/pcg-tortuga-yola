// Admin Firestore shim providing a subset of the modular Web v9 style API
// used throughout server actions. This lets us keep most of the existing
// action code unchanged while ensuring we only use the Admin SDK on the
// server (no client SDK mixing / type conflicts).

import {
  FieldValue,
  type Firestore,
  type WriteBatch,
  type DocumentReference,
  type Query as AdminQuery,
  type CollectionReference,
  WhereFilterOp,
} from 'firebase-admin/firestore';

// Re-exported helper functions mimicking the client modular API surface
export const collection = (db: Firestore, path: string): CollectionReference => db.collection(path);

export const doc = (db: Firestore, collectionPath: string, docId: string): DocumentReference =>
  db.collection(collectionPath).doc(docId);

export const newDocumentRef = (db: Firestore, collectionPath: string): DocumentReference =>
  db.collection(collectionPath).doc();

export const writeBatch = (db: Firestore): WriteBatch => db.batch();

export const serverTimestamp = () => FieldValue.serverTimestamp();
export const increment = (n: number) => FieldValue.increment(n);

// Simple where constraint representation
export interface WhereConstraint {
  fieldPath: string;
  opStr: WhereFilterOp;
  value: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export const where = (fieldPath: string, opStr: WhereFilterOp, value: any): WhereConstraint => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
  fieldPath,
  opStr,
  value,
});

// Query builder applying where constraints sequentially
export const query = (colRef: CollectionReference, ...constraints: WhereConstraint[]): AdminQuery => {
  let q: AdminQuery = colRef;
  for (const c of constraints) {
    q = q.where(c.fieldPath, c.opStr, c.value);
  }
  return q;
};

// Data retrieval wrappers mimicking client SDK naming
export const getDoc = (ref: DocumentReference) => ref.get();
export const getDocs = (q: AdminQuery) => q.get();
