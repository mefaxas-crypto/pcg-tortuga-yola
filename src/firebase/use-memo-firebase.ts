'use client';

import { useMemo, useRef } from 'react';

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
    if (!compare(previous.current, value)) {
      previous.current = value;
    }
    return previous.current;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
};
