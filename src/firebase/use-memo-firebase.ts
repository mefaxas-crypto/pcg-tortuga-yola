
'use client';

import { useMemo, useRef } from 'react';
import type { Query, DocumentReference } from 'firebase/firestore';

// Define a type for objects that have an isEqual method.
type Equalable = Query<any> | DocumentReference<any> | { isEqual: (other: any) => boolean };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function hasIsEqual(value: unknown): value is Equalable {
  return isObject(value) && typeof (value as Equalable).isEqual === 'function';
}


/**
 * A custom hook that memoizes Firebase-related objects like Queries or DocumentReferences.
 * This is crucial to prevent infinite loops in `useEffect` when these objects are used
 * as dependencies, as they are created as new objects on every render by default.
 *
 * @param value The Firebase object (Query, DocumentReference, etc.) to memoize.
 * @param compare A function to compare the previous and next values of the object.
 * @returns The memoized Firebase object.
 */
export const useMemoFirebase = <T>(
  value: T,
  compare: (a: T, b: T) => boolean
): T => {
  const previous = useRef(value);

  return useMemo(() => {
    // If the value is null/undefined or the compare function returns true,
    // it means the value has not changed, so we return the previous instance.
    if (!value || compare(previous.current, value)) {
      return previous.current;
    }
    // If the value has changed, update the ref and return the new value.
    previous.current = value;
    return value;
  // This is intentionally disabled. We want this to run on every render to compare
  // the new object with the old one. The 'compare' function prevents unnecessary updates.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, compare]);
};
