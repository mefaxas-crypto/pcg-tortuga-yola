
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
  doc,
  collection,
} from 'firebase/firestore';
import { handleFirebaseError, StandardizedError, FirestorePermissionError } from './errors';
import { errorEmitter } from './error-emitter';

interface CommonOptions {
  source?: string; // Optional source for error tracking
}

// --- Non-blocking setDoc ---
type SetData = { [key: string]: unknown };
export function setDocumentNonBlocking(
  ref: DocumentReference,
  data: SetData,
  options: { merge?: boolean, source?: string } = {}
): void {
  const { merge = false, source = 'setDocumentNonBlocking' } = options;
  setDoc(ref, data, { merge })
    .catch((serverError: Error) => {
      const permissionError = new FirestorePermissionError({
        path: ref.path,
        operation: merge ? 'update' : 'create',
        requestResourceData: data,
      });
      errorEmitter.emit('permission-error', permissionError);
      handleFirebaseError(serverError, { source });
    });
}

// --- Non-blocking updateDoc ---
type UpdateData = { [key: string]: unknown | FieldValue };
export function updateDocumentNonBlocking(
  ref: DocumentReference,
  data: UpdateData,
  options: CommonOptions = {}
): void {
    const { source = 'updateDocumentNonBlocking' } = options;
    updateDoc(ref, data)
        .catch((serverError: Error) => {
            const permissionError = new FirestorePermissionError({
                path: ref.path,
                operation: 'update',
                requestResourceData: data,
            });
            errorEmitter.emit('permission-error', permissionError);
            handleFirebaseError(serverError, { source });
        });
}


// --- Non-blocking deleteDoc ---
export function deleteDocumentNonBlocking(
  ref: DocumentReference,
  options: CommonOptions = {}
): void {
    const { source = 'deleteDocumentNonBlocking' } = options;
    deleteDoc(ref)
        .catch((serverError: Error) => {
            const permissionError = new FirestorePermissionError({
                path: ref.path,
                operation: 'delete',
            });
            errorEmitter.emit('permission-error', permissionError);
            handleFirebaseError(serverError, { source });
        });
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

// Helper to get a new document reference with a unique ID
export const newDocumentRef = (firestore: Firestore, collectionPath: string) => {
    return doc(collection(firestore, collectionPath));
}
