/**
 * useDebouncedStorage - A hook for debounced localStorage writes
 *
 * Prevents UI blocking by debouncing localStorage saves. Only the final value
 * within the delay window is written to storage.
 */

import { useEffect, useRef } from 'react';

/**
 * Debounces localStorage writes to prevent UI blocking during rapid state updates.
 *
 * @param key - The localStorage key to write to
 * @param value - The value to store (will be JSON stringified)
 * @param delay - Debounce delay in milliseconds (default: 500ms)
 */
export function useDebouncedStorage<T>(
  key: string,
  value: T,
  delay: number = 500
): void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set a new timeout to save the value
    timeoutRef.current = setTimeout(() => {
      try {
        const serialized = JSON.stringify(value);
        localStorage.setItem(key, serialized);
      } catch (error) {
        console.error(`Failed to save to localStorage key "${key}":`, error);
      }
    }, delay);

    // Cleanup on unmount or when dependencies change
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [key, value, delay]);
}

export default useDebouncedStorage;
