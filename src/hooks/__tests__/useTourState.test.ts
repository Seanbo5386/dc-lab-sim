import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTourState } from "../useTourState";

describe("useTourState", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns shouldShow=true when tour has not been seen", () => {
    const { result } = renderHook(() => useTourState("simulator"));
    expect(result.current.shouldShow).toBe(true);
  });

  it("returns shouldShow=false when tour has been seen", () => {
    localStorage.setItem("ncp-aii-tour-simulator-seen", "true");
    const { result } = renderHook(() => useTourState("simulator"));
    expect(result.current.shouldShow).toBe(false);
  });

  it("markSeen sets shouldShow to false and writes localStorage", () => {
    const { result } = renderHook(() => useTourState("labs"));
    expect(result.current.shouldShow).toBe(true);

    act(() => {
      result.current.markSeen();
    });

    expect(result.current.shouldShow).toBe(false);
    expect(localStorage.getItem("ncp-aii-tour-labs-seen")).toBe("true");
  });

  it("reset sets shouldShow to true and removes localStorage key", () => {
    localStorage.setItem("ncp-aii-tour-docs-seen", "true");
    const { result } = renderHook(() => useTourState("docs"));
    expect(result.current.shouldShow).toBe(false);

    act(() => {
      result.current.reset();
    });

    expect(result.current.shouldShow).toBe(true);
    expect(localStorage.getItem("ncp-aii-tour-docs-seen")).toBeNull();
  });

  it("tour IDs are independent of each other", () => {
    localStorage.setItem("ncp-aii-tour-simulator-seen", "true");

    const { result: sim } = renderHook(() => useTourState("simulator"));
    const { result: labs } = renderHook(() => useTourState("labs"));
    const { result: docs } = renderHook(() => useTourState("docs"));
    const { result: exams } = renderHook(() => useTourState("exams"));
    const { result: about } = renderHook(() => useTourState("about"));

    expect(sim.current.shouldShow).toBe(false);
    expect(labs.current.shouldShow).toBe(true);
    expect(docs.current.shouldShow).toBe(true);
    expect(exams.current.shouldShow).toBe(true);
    expect(about.current.shouldShow).toBe(true);
  });

  it("markSeen callback identity is stable across renders", () => {
    const { result, rerender } = renderHook(() => useTourState("simulator"));
    const firstMarkSeen = result.current.markSeen;
    const firstReset = result.current.reset;

    rerender();

    expect(result.current.markSeen).toBe(firstMarkSeen);
    expect(result.current.reset).toBe(firstReset);
  });
});
