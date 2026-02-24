import { describe, it, expect, vi, afterEach } from "vitest";
import { EventLog } from "../eventLog";

describe("EventLog", () => {
  it("should start empty", () => {
    const log = new EventLog();
    expect(log.getAll()).toHaveLength(0);
  });

  it("should append events with auto-incrementing timestamps", () => {
    const log = new EventLog();
    log.append({
      type: "xid-error",
      nodeId: "dgx-00",
      gpuId: 3,
      message: "Xid (PCI:0000:18:00): 48, pid=1234",
      severity: "critical",
    });
    expect(log.getAll()).toHaveLength(1);
    expect(log.getAll()[0].type).toBe("xid-error");
    expect(log.getAll()[0].timestamp).toBeGreaterThan(0);
  });

  it("should filter events by type", () => {
    const log = new EventLog();
    log.append({
      type: "xid-error",
      nodeId: "dgx-00",
      message: "XID 48",
      severity: "critical",
    });
    log.append({
      type: "thermal",
      nodeId: "dgx-00",
      message: "Temp warning",
      severity: "warning",
    });
    log.append({
      type: "xid-error",
      nodeId: "dgx-01",
      message: "XID 43",
      severity: "critical",
    });
    expect(log.getByType("xid-error")).toHaveLength(2);
    expect(log.getByType("thermal")).toHaveLength(1);
  });

  it("should filter events by node", () => {
    const log = new EventLog();
    log.append({
      type: "xid-error",
      nodeId: "dgx-00",
      message: "XID 48",
      severity: "critical",
    });
    log.append({
      type: "xid-error",
      nodeId: "dgx-01",
      message: "XID 43",
      severity: "critical",
    });
    expect(log.getByNode("dgx-00")).toHaveLength(1);
  });

  it("should cap at max entries and evict oldest", () => {
    const log = new EventLog(5);
    for (let i = 0; i < 8; i++) {
      log.append({
        type: "info",
        nodeId: "dgx-00",
        message: `event-${i}`,
        severity: "info",
      });
    }
    expect(log.getAll()).toHaveLength(5);
    expect(log.getAll()[0].message).toBe("event-3");
  });

  it("should format events as dmesg-style log lines", () => {
    const log = new EventLog();
    log.append({
      type: "xid-error",
      nodeId: "dgx-00",
      gpuId: 3,
      message: "Xid (PCI:0000:18:00): 48, pid=1234",
      severity: "critical",
      dmesgLine: "NVRM: Xid (PCI:0000:18:00): 48, pid=1234, name=python3",
    });
    const lines = log.toDmesgOutput();
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/^\[.*\] NVRM: Xid/);
  });

  it("should get events after a given timestamp", () => {
    vi.useFakeTimers();
    const log = new EventLog();
    vi.setSystemTime(1000);
    log.append({
      type: "info",
      nodeId: "dgx-00",
      message: "early",
      severity: "info",
    });
    vi.setSystemTime(3000);
    log.append({
      type: "info",
      nodeId: "dgx-00",
      message: "late",
      severity: "info",
    });
    const after = log.getAfter(2000);
    expect(after).toHaveLength(1);
    expect(after[0].message).toBe("late");
    vi.useRealTimers();
  });

  it("should clear all events", () => {
    const log = new EventLog();
    log.append({
      type: "info",
      nodeId: "dgx-00",
      message: "test",
      severity: "info",
    });
    log.clear();
    expect(log.getAll()).toHaveLength(0);
  });
});
