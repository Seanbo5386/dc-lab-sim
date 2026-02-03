/**
 * Tests for useDebouncedStorage hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebouncedStorage } from '../useDebouncedStorage';

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('useDebouncedStorage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockLocalStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('saves value to localStorage after delay', async () => {
    const testKey = 'test-key';
    const testValue = { foo: 'bar' };

    renderHook(() => useDebouncedStorage(testKey, testValue, 500));

    // Value should not be saved immediately
    expect(mockLocalStorage.setItem).not.toHaveBeenCalled();

    // Fast-forward time by 500ms
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Now it should be saved
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      testKey,
      JSON.stringify(testValue)
    );
  });

  it('debounces rapid updates - only final value is saved', async () => {
    const testKey = 'rapid-updates-key';

    const { rerender } = renderHook(
      ({ value }) => useDebouncedStorage(testKey, value, 500),
      { initialProps: { value: 'first' } }
    );

    // Rapid updates
    rerender({ value: 'second' });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    rerender({ value: 'third' });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    rerender({ value: 'fourth' });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    rerender({ value: 'final' });

    // At this point, nothing should be saved yet (total time elapsed: 300ms)
    expect(mockLocalStorage.setItem).not.toHaveBeenCalled();

    // Fast-forward past the debounce delay
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Only the final value should be saved
    expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(1);
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      testKey,
      JSON.stringify('final')
    );
  });

  it('cleans up timeout on unmount', () => {
    const testKey = 'cleanup-key';
    const testValue = 'test-value';

    const { unmount } = renderHook(() =>
      useDebouncedStorage(testKey, testValue, 500)
    );

    // Unmount before the timeout fires
    unmount();

    // Advance time past the delay
    act(() => {
      vi.advanceTimersByTime(600);
    });

    // Value should NOT be saved because component unmounted
    expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
  });

  it('uses default delay of 500ms when not specified', () => {
    const testKey = 'default-delay-key';
    const testValue = 'default-value';

    renderHook(() => useDebouncedStorage(testKey, testValue));

    // Should not save at 400ms
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(mockLocalStorage.setItem).not.toHaveBeenCalled();

    // Should save at 500ms
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      testKey,
      JSON.stringify(testValue)
    );
  });

  it('handles complex values correctly', () => {
    const testKey = 'complex-key';
    const testValue = {
      array: [1, 2, 3],
      nested: { a: 'b', c: [4, 5] },
      set: Array.from(new Set(['x', 'y', 'z'])),
    };

    renderHook(() => useDebouncedStorage(testKey, testValue, 500));

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      testKey,
      JSON.stringify(testValue)
    );
  });

  it('handles key changes correctly', () => {
    const { rerender } = renderHook(
      ({ key, value }) => useDebouncedStorage(key, value, 500),
      { initialProps: { key: 'key-1', value: 'value-1' } }
    );

    // Change the key
    rerender({ key: 'key-2', value: 'value-2' });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Should save to the new key
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'key-2',
      JSON.stringify('value-2')
    );
    // Should NOT have saved to the old key (timeout was cleared)
    expect(mockLocalStorage.setItem).not.toHaveBeenCalledWith(
      'key-1',
      expect.anything()
    );
  });
});
