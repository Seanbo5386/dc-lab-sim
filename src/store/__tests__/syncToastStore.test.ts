import { describe, it, expect, beforeEach } from "vitest";
import { useSyncToastStore } from "../syncToastStore";

describe("syncToastStore", () => {
  beforeEach(() => {
    useSyncToastStore.setState({
      visible: false,
      message: "",
      type: "error",
    });
  });

  it("should start with toast hidden", () => {
    const state = useSyncToastStore.getState();
    expect(state.visible).toBe(false);
    expect(state.message).toBe("");
  });

  it("should show a toast with message and type", () => {
    useSyncToastStore.getState().show("Sync failed", "error");
    const state = useSyncToastStore.getState();
    expect(state.visible).toBe(true);
    expect(state.message).toBe("Sync failed");
    expect(state.type).toBe("error");
  });

  it("should show offline toast", () => {
    useSyncToastStore.getState().show("You're offline", "offline");
    const state = useSyncToastStore.getState();
    expect(state.visible).toBe(true);
    expect(state.type).toBe("offline");
  });

  it("should show retrying toast", () => {
    useSyncToastStore.getState().show("Retrying...", "retrying");
    const state = useSyncToastStore.getState();
    expect(state.visible).toBe(true);
    expect(state.type).toBe("retrying");
  });

  it("should dismiss the toast", () => {
    useSyncToastStore.getState().show("Error", "error");
    expect(useSyncToastStore.getState().visible).toBe(true);
    useSyncToastStore.getState().dismiss();
    expect(useSyncToastStore.getState().visible).toBe(false);
  });
});
