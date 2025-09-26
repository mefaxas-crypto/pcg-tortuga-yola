import {
  writeBatch,
  serverTimestamp as originalServerTimestamp,
  type DocumentReference,
  type WriteBatch,
  type Firestore,
  setDoc,
  updateDoc,
  deleteDoc,
  type FieldValue,
} from 'firebase/firestore';
import { handleFirebaseError, StandardizedError } from './errors';

interface CommonOptions {
  source?: string; // Optional source for error tracking
}

// --- Non-blocking setDoc ---
type SetData = { [key: string]: unknown };
export async function setDocumentNonBlocking(
  ref: DocumentReference,
  data: SetData,
  options: CommonOptions = {}
): Promise<{ error?: StandardizedError }> {
  try {
    await setDoc(ref, data);
    return {};
  } catch (e) {
    const error = handleFirebaseError(e as Error, { source: options.source || 'setDocumentNonBlocking' });
    return { error };
  }
}

// --- Non-blocking updateDoc ---
type UpdateData = { [key: string]: unknown | FieldValue };
export async function updateDocumentNonBlocking(
  ref: DocumentReference,
  data: UpdateData,
  options: CommonOptions = {}
): Promise<{ error?: StandardizedError }> {
  try {
    await updateDoc(ref, data);
    return {};
  } catch (e) {
    const error = handleFirebaseError(e as Error, { source: options.source || 'updateDocumentNonBlocking' });
    return { error };
  }
}

// --- Non-blocking deleteDoc ---
export async function deleteDocumentNonBlocking(
  ref: DocumentReference,
  options: CommonOptions = {}
): Promise<{ error?: StandardizedError }> {
  try {
    await deleteDoc(ref);
    return {};
  } catch (e) {
    const error = handleFirebaseError(e as Error, { source: options.source || 'deleteDocumentNonBlocking' });
    return { error };
  }
}


// --- Batched Writes with Error Handling ---
class BatchedWrite {
  private batch: WriteBatch;
  public readonly source: string;

  constructor(firestore: Firestore, source: string) {
    this.batch = writeBatch(firestore);
    this.source = source;
  }

  set<T>(documentRef: DocumentReference<T>, data: T): void {
    this.batch.set(documentRef, data);
  }

  update(documentRef: DocumentReference, data: UpdateData): void {
    this.batch.update(documentRef, data);
  }

  delete(documentRef: DocumentReference): void {
    this.batch.delete(documentRef);
  }

  async commit(): Promise<{ error?: StandardizedError }> {
    try {
      await this.batch.commit();
      return {};
    } catch (e) {
      const error = handleFirebaseError(e as Error, { source: this.source });
      return { error };
    }
  }
}

export const createBatchedWrite = (firestore: Firestore, options: { source: string }) => {
  return new BatchedWrite(firestore, options.source);
};


// --- Server Timestamp ---
export const serverTimestamp = originalServerTimestamp as () => FieldValue;
