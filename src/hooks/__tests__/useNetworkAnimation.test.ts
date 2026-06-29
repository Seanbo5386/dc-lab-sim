import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useNetworkAnimation } from "../useNetworkAnimation";

// Mock d3 — the hook uses it for direct SVG rendering
vi.mock("d3", () => {
  const mockSelection = {
    selectAll: vi.fn().mockReturnThis(),
    data: vi.fn().mockReturnThis(),
    enter: vi.fn().mockReturnThis(),
    append: vi.fn().mockReturnThis(),
    attr: vi.fn().mockReturnThis(),
    merge: vi.fn().mockReturnThis(),
    exit: vi.fn().mockReturnThis(),
    remove: vi.fn().mockReturnThis(),
  };
  return {
    select: vi.fn(() => mockSelection),
  };
});

describe("useNetworkAnimation", () => {
  let rafCallbacks: Array<(time: number) => void> = [];
  let rafId = 0;
  const originalRAF = global.requestAnimationFrame;
  const originalCAF = global.cancelAnimationFrame;

  beforeEach(() => {
    rafCallbacks = [];
    rafId = 0;

    // Mock requestAnimationFrame
    global.requestAnimationFrame = vi.fn((callback) => {
      rafCallbacks.push(callback);
      return ++rafId;
    });

    global.cancelAnimationFrame = vi.fn((_id) => {
      // Remove callback by id (simplified, just clear)
    });
  });

  afterEach(() => {
    global.requestAnimationFrame = originalRAF;
    global.cancelAnimationFrame = originalCAF;
  });

  // Helper to simulate animation frames
  const runAnimationFrames = (count: number, timeStep: number = 16) => {
    let time = performance.now();
    for (let i = 0; i < count; i++) {
      const callbacks = [...rafCallbacks];
      rafCallbacks = [];
      time += timeStep;
      callbacks.forEach((cb) => cb(time));
    }
  };

  it("should start with empty particles", () => {
    const { result } = renderHook(() =>
      useNetworkAnimation({ enabled: false, links: [] }),
    );

    expect(result.current.particles).toEqual([]);
    expect(result.current.particleCount).toBe(0);
  });

  it("should not spawn particles when disabled", () => {
    const links = [
      {
        id: "link-1",
        sourceX: 0,
        sourceY: 0,
        targetX: 100,
        targetY: 0,
        active: true,
        utilization: 50,
      },
    ];

    const { result } = renderHook(() =>
      useNetworkAnimation({ enabled: false, links }),
    );

    act(() => {
      runAnimationFrames(60); // Simulate 1 second
    });

    expect(result.current.particles).toEqual([]);
  });

  it("should spawn particles when enabled", () => {
    const links = [
      {
        id: "link-1",
        sourceX: 0,
        sourceY: 0,
        targetX: 100,
        targetY: 0,
        active: true,
        utilization: 50,
      },
    ];

    const { result } = renderHook(() =>
      useNetworkAnimation({ enabled: true, links }),
    );

    act(() => {
      runAnimationFrames(120, 100); // Simulate multiple frames with enough time for spawning
    });

    expect(result.current.particles.length).toBeGreaterThan(0);
  });

  it("should not spawn particles on inactive (down) links", () => {
    const links = [
      {
        id: "link-down",
        sourceX: 0,
        sourceY: 0,
        targetX: 100,
        targetY: 0,
        active: false,
        utilization: 80,
      },
    ];

    const { result } = renderHook(() =>
      useNetworkAnimation({ enabled: true, links }),
    );

    act(() => {
      runAnimationFrames(120, 100); // Plenty of time to spawn if it were going to
    });

    expect(result.current.particles).toEqual([]);
  });

  it("should only spawn particles on active links in a mixed set", () => {
    const links = [
      {
        id: "link-up",
        sourceX: 0,
        sourceY: 0,
        targetX: 100,
        targetY: 0,
        active: true,
        utilization: 80,
        bidirectional: false,
      },
      {
        id: "link-down",
        sourceX: 0,
        sourceY: 50,
        targetX: 100,
        targetY: 50,
        active: false,
        utilization: 80,
        bidirectional: false,
      },
    ];

    const { result } = renderHook(() =>
      useNetworkAnimation({ enabled: true, links }),
    );

    act(() => {
      runAnimationFrames(120, 100);
    });

    expect(result.current.particles.length).toBeGreaterThan(0);
    expect(result.current.particles.every((p) => p.linkId === "link-up")).toBe(
      true,
    );
  });

  it("should clean up on unmount", () => {
    const links = [
      {
        id: "link-1",
        sourceX: 0,
        sourceY: 0,
        targetX: 100,
        targetY: 0,
        active: true,
        utilization: 50,
      },
    ];

    const { unmount } = renderHook(() =>
      useNetworkAnimation({ enabled: true, links }),
    );

    unmount();

    // No errors should occur after unmount
    expect(global.cancelAnimationFrame).toHaveBeenCalled();
  });

  it("should provide pause and resume controls", () => {
    const links = [
      {
        id: "link-1",
        sourceX: 0,
        sourceY: 0,
        targetX: 100,
        targetY: 0,
        active: true,
        utilization: 50,
      },
    ];

    const { result } = renderHook(() =>
      useNetworkAnimation({ enabled: true, links }),
    );

    expect(result.current.isPaused).toBe(false);

    act(() => {
      result.current.pause();
    });

    expect(result.current.isPaused).toBe(true);

    act(() => {
      result.current.resume();
    });

    expect(result.current.isPaused).toBe(false);
  });

  it("should reset particles when reset is called", () => {
    const links = [
      {
        id: "link-1",
        sourceX: 0,
        sourceY: 0,
        targetX: 100,
        targetY: 0,
        active: true,
        utilization: 50,
      },
    ];

    const { result } = renderHook(() =>
      useNetworkAnimation({ enabled: true, links }),
    );

    // Generate some particles
    act(() => {
      runAnimationFrames(120, 100);
    });

    // Reset
    act(() => {
      result.current.reset();
    });

    expect(result.current.particles).toEqual([]);
  });
});
