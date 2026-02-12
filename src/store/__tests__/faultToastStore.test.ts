import { describe, it, expect, beforeEach } from "vitest";
import { useFaultToastStore } from "../faultToastStore";

describe("faultToastStore", () => {
  beforeEach(() => {
    // Reset store between tests
    useFaultToastStore.setState({ toasts: [] });
  });

  it("starts with empty toasts array", () => {
    expect(useFaultToastStore.getState().toasts).toEqual([]);
  });

  it("addToast adds a toast with generated id", () => {
    useFaultToastStore.getState().addToast({
      title: "XID Error Injected",
      message: "GPU 0 marked Critical with XID 48.",
      suggestedCommand: "nvidia-smi -q -d ECC",
      severity: "critical",
      xidCode: 48,
    });

    const { toasts } = useFaultToastStore.getState();
    expect(toasts).toHaveLength(1);
    expect(toasts[0].id).toBeTruthy();
    expect(toasts[0].title).toBe("XID Error Injected");
    expect(toasts[0].severity).toBe("critical");
    expect(toasts[0].xidCode).toBe(48);
  });

  it("removeToast removes by id", () => {
    useFaultToastStore.getState().addToast({
      title: "Toast 1",
      message: "msg",
      suggestedCommand: "cmd",
      severity: "info",
    });
    useFaultToastStore.getState().addToast({
      title: "Toast 2",
      message: "msg",
      suggestedCommand: "cmd",
      severity: "warning",
    });

    const { toasts } = useFaultToastStore.getState();
    expect(toasts).toHaveLength(2);

    useFaultToastStore.getState().removeToast(toasts[0].id);

    const updated = useFaultToastStore.getState().toasts;
    expect(updated).toHaveLength(1);
    expect(updated[0].title).toBe("Toast 2");
  });

  it("adding a 4th toast removes the oldest", () => {
    const { addToast } = useFaultToastStore.getState();

    addToast({
      title: "Toast 1",
      message: "m",
      suggestedCommand: "c",
      severity: "info",
    });
    addToast({
      title: "Toast 2",
      message: "m",
      suggestedCommand: "c",
      severity: "info",
    });
    addToast({
      title: "Toast 3",
      message: "m",
      suggestedCommand: "c",
      severity: "info",
    });

    expect(useFaultToastStore.getState().toasts).toHaveLength(3);

    addToast({
      title: "Toast 4",
      message: "m",
      suggestedCommand: "c",
      severity: "info",
    });

    const { toasts } = useFaultToastStore.getState();
    expect(toasts).toHaveLength(3);
    // Oldest (Toast 1) should be removed
    expect(toasts.map((t) => t.title)).toEqual([
      "Toast 2",
      "Toast 3",
      "Toast 4",
    ]);
  });

  it("addToast works without optional xidCode", () => {
    useFaultToastStore.getState().addToast({
      title: "Info Toast",
      message: "msg",
      suggestedCommand: "nvidia-smi",
      severity: "info",
    });

    const { toasts } = useFaultToastStore.getState();
    expect(toasts).toHaveLength(1);
    expect(toasts[0].xidCode).toBeUndefined();
  });
});
