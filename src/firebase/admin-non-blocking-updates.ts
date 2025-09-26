// Admin equivalents of the "non-blocking" client Firestore helpers.
// On the server we still perform the operations but swallow errors in the
// same places the client code expected fire-and-forget behavior, logging
// them instead of throwing inside the helper. Server actions wrap these in
// try/catch via handleAction where appropriate.

import { firestore } from './firebase-server';
import {
  type Firestore,
  type DocumentReference,
  type WriteBatch,
  FieldValue,
} from 'firebase-admin/firestore';

interface CommonOptions { source?: string }

// set (create / merge) document
export function setDocumentNonBlocking(
  ref: DocumentReference,
  data: Record<string, unknown>,
  options: { merge?: boolean; source?: string } = {},
): void {
  const { merge = false } = options;
  ref.set(data, { merge }).catch(err => {
    console.error(`[setDocumentNonBlocking:${options.source || 'unknown'}]`, err);
  });
}

export function updateDocumentNonBlocking(
  ref: DocumentReference,
  data: Record<string, unknown | ReturnType<typeof FieldValue.increment> | ReturnType<typeof FieldValue.serverTimestamp>>,
  options: CommonOptions = {},
): void {
  ref.update(data).catch(err => {
    console.error(`[updateDocumentNonBlocking:${options.source || 'unknown'}]`, err);
  });
}

export function deleteDocumentNonBlocking(
  ref: DocumentReference,
  options: CommonOptions = {},
): void {
  ref.delete().catch(err => {
    console.error(`[deleteDocumentNonBlocking:${options.source || 'unknown'}]`, err);
  });
}

class BatchedWrite {
  private batch: WriteBatch;
  public readonly source: string;
  constructor(db: Firestore, source: string) {
    this.batch = db.batch();
    this.source = source;
  }
  set(ref: DocumentReference, data: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    this.batch.set(ref, data);
  }
  update(ref: DocumentReference, data: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    this.batch.update(ref, data);
  }
  delete(ref: DocumentReference) { this.batch.delete(ref); }
  async commit(): Promise<{ error?: Error }> {
    try {
      await this.batch.commit();
      return {};
    } catch (e) {
      return { error: e as Error };
    }
  }
}

export const createBatchedWrite = (db: Firestore, opts: { source: string }) => new BatchedWrite(db, opts.source);

export const newDocumentRef = (db: Firestore, collectionPath: string) => db.collection(collectionPath).doc();

// Re-export server timestamp for convenience (matches previous helper)
export const serverTimestamp = () => FieldValue.serverTimestamp();

export { firestore }; // convenience export if a caller wants the singleton
