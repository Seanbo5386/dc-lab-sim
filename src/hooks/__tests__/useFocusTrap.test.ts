/**
 * Tests for useFocusTrap hook (WCAG 2.1.2 compliance)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFocusTrap } from '../useFocusTrap';

describe('useFocusTrap', () => {
  let container: HTMLDivElement;
  let button1: HTMLButtonElement;
  let button2: HTMLButtonElement;
  let button3: HTMLButtonElement;

  beforeEach(() => {
    // Create a container with focusable elements
    container = document.createElement('div');
    container.id = 'modal-container';

    button1 = document.createElement('button');
    button1.id = 'button1';
    button1.textContent = 'First';

    button2 = document.createElement('button');
    button2.id = 'button2';
    button2.textContent = 'Second';

    button3 = document.createElement('button');
    button3.id = 'button3';
    button3.textContent = 'Third';

    container.appendChild(button1);
    container.appendChild(button2);
    container.appendChild(button3);
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('calls onEscape when Escape key is pressed', () => {
    const onEscape = vi.fn();
    const containerRef = { current: container };

    renderHook(() =>
      useFocusTrap(containerRef, { isActive: true, onEscape })
    );

    // Simulate Escape key press
    const escapeEvent = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
    });
    document.dispatchEvent(escapeEvent);

    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it('does not call onEscape when trap is not active', () => {
    const onEscape = vi.fn();
    const containerRef = { current: container };

    renderHook(() =>
      useFocusTrap(containerRef, { isActive: false, onEscape })
    );

    // Simulate Escape key press
    const escapeEvent = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
    });
    document.dispatchEvent(escapeEvent);

    expect(onEscape).not.toHaveBeenCalled();
  });

  it('cycles Tab through focusable elements - forward', () => {
    const containerRef = { current: container };

    renderHook(() =>
      useFocusTrap(containerRef, { isActive: true })
    );

    // Focus should start on first button
    expect(document.activeElement).toBe(button1);

    // Tab to second button
    const tabEvent1 = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
    });
    document.dispatchEvent(tabEvent1);

    // Focus the last button manually to test wrapping
    button3.focus();
    expect(document.activeElement).toBe(button3);

    // Tab from last element should wrap to first
    const tabEvent2 = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
    });
    document.dispatchEvent(tabEvent2);

    expect(document.activeElement).toBe(button1);
  });

  it('cycles Tab through focusable elements - backward with Shift+Tab', () => {
    const containerRef = { current: container };

    renderHook(() =>
      useFocusTrap(containerRef, { isActive: true })
    );

    // Focus should start on first button
    expect(document.activeElement).toBe(button1);

    // Shift+Tab from first element should wrap to last
    const shiftTabEvent = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
    });
    document.dispatchEvent(shiftTabEvent);

    expect(document.activeElement).toBe(button3);
  });

  it('focuses the first focusable element when activated', () => {
    const containerRef = { current: container };

    // Focus something outside the container first
    const outsideButton = document.createElement('button');
    document.body.appendChild(outsideButton);
    outsideButton.focus();

    renderHook(() =>
      useFocusTrap(containerRef, { isActive: true })
    );

    expect(document.activeElement).toBe(button1);
  });

  it('restores focus to previously focused element on cleanup', () => {
    const containerRef = { current: container };

    // Create and focus an element outside the container
    const outsideButton = document.createElement('button');
    outsideButton.id = 'outside-button';
    document.body.appendChild(outsideButton);
    outsideButton.focus();

    expect(document.activeElement).toBe(outsideButton);

    const { unmount } = renderHook(() =>
      useFocusTrap(containerRef, { isActive: true })
    );

    // Focus should now be inside the container
    expect(document.activeElement).toBe(button1);

    // Unmount the hook
    unmount();

    // Focus should be restored to the outside button
    expect(document.activeElement).toBe(outsideButton);
  });

  it('handles container with no focusable elements', () => {
    const emptyContainer = document.createElement('div');
    emptyContainer.id = 'empty-container';
    document.body.appendChild(emptyContainer);

    const containerRef = { current: emptyContainer };

    // Should not throw
    expect(() => {
      renderHook(() =>
        useFocusTrap(containerRef, { isActive: true })
      );
    }).not.toThrow();

    // Container itself should get focus
    expect(document.activeElement).toBe(emptyContainer);
    expect(emptyContainer.getAttribute('tabindex')).toBe('-1');
  });

  it('does not affect focus when trap is inactive', () => {
    const containerRef = { current: container };

    // Focus an element outside
    const outsideButton = document.createElement('button');
    document.body.appendChild(outsideButton);
    outsideButton.focus();

    renderHook(() =>
      useFocusTrap(containerRef, { isActive: false })
    );

    // Focus should remain outside
    expect(document.activeElement).toBe(outsideButton);
  });

  it('handles null container ref gracefully', () => {
    const containerRef = { current: null };

    // Should not throw
    expect(() => {
      renderHook(() =>
        useFocusTrap(containerRef, { isActive: true })
      );
    }).not.toThrow();
  });

  it('re-activates when isActive changes from false to true', () => {
    const containerRef = { current: container };

    // Focus outside
    const outsideButton = document.createElement('button');
    document.body.appendChild(outsideButton);
    outsideButton.focus();

    const { rerender } = renderHook(
      ({ isActive }) => useFocusTrap(containerRef, { isActive }),
      { initialProps: { isActive: false } }
    );

    // Focus should still be outside
    expect(document.activeElement).toBe(outsideButton);

    // Activate the trap
    rerender({ isActive: true });

    // Focus should move to first element in container
    expect(document.activeElement).toBe(button1);
  });
});
