import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { FaultPropagationEngine } from "../faultPropagation";

describe("FaultPropagationEngine", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("should start with no pending consequences", () => {
    const engine = new FaultPropagationEngine();
    expect(engine.getPending()).toHaveLength(0);
  });

  it("should schedule consequences when a fault is triggered", () => {
    const engine = new FaultPropagationEngine();
    engine.triggerFault({
      faultType: "xid-43",
      nodeId: "dgx-00",
      gpuId: 3,
    });
    expect(engine.getPending().length).toBeGreaterThan(0);
  });

  it("should return due consequences after their delay elapses", () => {
    const engine = new FaultPropagationEngine();
    engine.triggerFault({
      faultType: "xid-43",
      nodeId: "dgx-00",
      gpuId: 3,
    });
    // No consequences due immediately
    expect(engine.getDueConsequences()).toHaveLength(0);
    // Advance 5 seconds — first consequence should be due
    vi.advanceTimersByTime(5000);
    const due = engine.getDueConsequences();
    expect(due.length).toBeGreaterThan(0);
  });

  it("should remove consequences once consumed", () => {
    const engine = new FaultPropagationEngine();
    engine.triggerFault({
      faultType: "xid-43",
      nodeId: "dgx-00",
      gpuId: 3,
    });
    vi.advanceTimersByTime(60000);
    const due = engine.getDueConsequences();
    const countBefore = engine.getPending().length;
    engine.consumeConsequences(due.map((c) => c.id));
    expect(engine.getPending().length).toBeLessThan(countBefore);
  });

  it("should clear all pending consequences", () => {
    const engine = new FaultPropagationEngine();
    engine.triggerFault({ faultType: "xid-43", nodeId: "dgx-00", gpuId: 3 });
    engine.clear();
    expect(engine.getPending()).toHaveLength(0);
  });

  it("should not schedule consequences for unknown fault types", () => {
    const engine = new FaultPropagationEngine();
    engine.triggerFault({ faultType: "unknown-fault", nodeId: "dgx-00" });
    expect(engine.getPending()).toHaveLength(0);
  });

  it("should schedule 3 consequences for power-anomaly trigger", () => {
    const engine = new FaultPropagationEngine();
    engine.triggerFault({
      faultType: "power-anomaly",
      nodeId: "dgx-05",
    });
    const pending = engine.getPending();
    expect(pending).toHaveLength(3);
    // First consequence due at 5s
    vi.advanceTimersByTime(5000);
    const due5s = engine.getDueConsequences();
    expect(due5s.length).toBe(1);
    expect(due5s[0].ruleAction).toBe("power-cap-reduce");
  });
});
