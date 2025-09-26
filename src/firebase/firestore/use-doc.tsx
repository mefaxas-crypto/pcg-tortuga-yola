
'use client';

import {
  onSnapshot,
  type DocumentReference,
  type DocumentData,
  type SnapshotListenOptions,
  type FirestoreError,
} from 'firebase/firestore';
import { useEffect, useReducer, useMemo } from 'react';
import { handleFirebaseError, StandardizedError } from '@/firebase/errors';

export interface UseDocOptions {
  snapshotListenOptions?: SnapshotListenOptions;
}

// Reducer for managing the state of the document hook
interface DocState<T> {
  isLoading: boolean;
  data: T | null;
  error: StandardizedError | null;
}

type DocAction<T> = 
  | { type: 'data'; payload: T | null } 
  | { type: 'error'; payload: StandardizedError }
  | { type: 'reset' };

function docReducer<T>(state: DocState<T>, action: DocAction<T>): DocState<T> {
  switch (action.type) {
    case 'data':
      return { ...state, isLoading: false, data: action.payload, error: null };
    case 'error':
      return { ...state, isLoading: false, error: action.payload };
    case 'reset':
      return { isLoading: true, data: null, error: null };
    default:
      return state;
  }
}

export const useDoc = <T extends DocumentData>(
  ref: DocumentReference<T> | null,
  options?: UseDocOptions,
) => {
  const [state, dispatch] = useReducer<React.Reducer<DocState<T>, DocAction<T>>>(docReducer, {
    isLoading: true,
    data: null,
    error: null,
  });

  const memoizedRef = useMemo(() => ref, [ref]);

  useEffect(() => {
    if (!memoizedRef) {
      dispatch({ type: 'reset' });
      return;
    }

    dispatch({ type: 'reset' });

    const unsubscribe = onSnapshot(
      memoizedRef,
      options?.snapshotListenOptions ?? {},
      (snapshot) => {
        if (snapshot.exists()) {
          const data = { ...snapshot.data(), id: snapshot.id };
          dispatch({ type: 'data', payload: data });
        } else {
          dispatch({ type: 'data', payload: null });
        }
      },
      (unhandledError: FirestoreError) => {
        const error = handleFirebaseError(unhandledError, { source: 'useDoc' });
        dispatch({ type: 'error', payload: error });
      },
    );

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memoizedRef]);

  return useMemo(() => state, [state]);
};
