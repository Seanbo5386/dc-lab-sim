/**
 * useFocusTrap - A hook for trapping focus within a container (WCAG 2.1.2)
 *
 * Ensures keyboard focus stays within a modal or dialog by:
 * - Storing the previously focused element
 * - Trapping Tab/Shift+Tab within focusable elements
 * - Handling Escape key to close the modal
 * - Restoring focus on cleanup
 */

import { useEffect, useRef, RefObject } from 'react';

/**
 * Selector for all focusable elements within a container
 */
const FOCUSABLE_SELECTOR = [
  'a[href]:not([disabled]):not([tabindex="-1"])',
  'button:not([disabled]):not([tabindex="-1"])',
  'textarea:not([disabled]):not([tabindex="-1"])',
  'input:not([disabled]):not([tabindex="-1"])',
  'select:not([disabled]):not([tabindex="-1"])',
  '[tabindex]:not([tabindex="-1"]):not([disabled])',
  '[contenteditable]:not([tabindex="-1"])',
].join(', ');

export interface UseFocusTrapOptions {
  /** Whether the focus trap is active */
  isActive: boolean;
  /** Callback when Escape key is pressed */
  onEscape?: () => void;
}

/**
 * Traps focus within a container element for accessibility compliance.
 *
 * @param containerRef - Ref to the container element
 * @param options - Configuration options for the focus trap
 */
export function useFocusTrap<T extends HTMLElement>(
  containerRef: RefObject<T | null>,
  options: UseFocusTrapOptions
): void {
  const { isActive, onEscape } = options;
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    // Store the currently focused element to restore later
    previouslyFocusedRef.current = document.activeElement as HTMLElement;

    // Focus the first focusable element in the container
    const container = containerRef.current;
    if (container) {
      const focusableElements = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      } else {
        // If no focusable elements, focus the container itself
        container.setAttribute('tabindex', '-1');
        container.focus();
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const container = containerRef.current;
      if (!container) return;

      // Handle Escape key
      if (event.key === 'Escape') {
        event.preventDefault();
        onEscape?.();
        return;
      }

      // Handle Tab key for focus trapping
      if (event.key === 'Tab') {
        const focusableElements = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
        const focusableArray = Array.from(focusableElements);

        if (focusableArray.length === 0) {
          event.preventDefault();
          return;
        }

        const firstElement = focusableArray[0];
        const lastElement = focusableArray[focusableArray.length - 1];
        const activeElement = document.activeElement;

        if (event.shiftKey) {
          // Shift+Tab: if on first element, wrap to last
          if (activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab: if on last element, wrap to first
          if (activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Cleanup: remove event listener and restore focus
    return () => {
      document.removeEventListener('keydown', handleKeyDown);

      // Restore focus to the previously focused element
      if (previouslyFocusedRef.current && typeof previouslyFocusedRef.current.focus === 'function') {
        previouslyFocusedRef.current.focus();
      }
    };
  }, [isActive, onEscape, containerRef]);
}

export default useFocusTrap;
