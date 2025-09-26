'use client';

import {
  onSnapshot,
  type Query,
  type DocumentData,
  type SnapshotListenOptions,
  type FirestoreError,
} from 'firebase/firestore';
import { useEffect, useReducer, useMemo } from 'react';
import { useMemoFirebase } from '@/firebase/use-memo-firebase';
import { handleFirebaseError, StandardizedError } from '@/firebase/errors';

export interface UseCollectionOptions {
  snapshotListenOptions?: SnapshotListenOptions;
}

// Reducer for managing the state of the collection hook
interface CollectionState<T> {
  isLoading: boolean;
  data: T[] | null;
  error: StandardizedError | null;
}

type CollectionAction<T> = 
  | { type: 'data'; payload: T[] } 
  | { type: 'error'; payload: StandardizedError }
  | { type: 'reset' };

function collectionReducer<T>(state: CollectionState<T>, action: CollectionAction<T>): CollectionState<T> {
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

export const useCollection = <T extends DocumentData>(
  query: Query<T> | null,
  options?: UseCollectionOptions,
) => {
  const [state, dispatch] = useReducer<React.Reducer<CollectionState<T>, CollectionAction<T>>>(collectionReducer, {
    isLoading: true,
    data: null,
    error: null,
  });

  const memoizedQuery = useMemoFirebase(query, (a, b) => a?.isEqual(b) ?? false);

  useEffect(() => {
    if (!memoizedQuery) {
      dispatch({ type: 'reset' });
      return;
    }

    dispatch({ type: 'reset' });

    const unsubscribe = onSnapshot(
      memoizedQuery,
      options?.snapshotListenOptions ?? {},
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
        dispatch({ type: 'data', payload: data });
      },
      (unhandledError: FirestoreError) => {
        const error = handleFirebaseError(unhandledError, { source: 'useCollection' });
        dispatch({ type: 'error', payload: error });
      },
    );

    return () => unsubscribe();
  }, [memoizedQuery, options?.snapshotListenOptions]);

  return useMemo(() => state, [state]);
};
