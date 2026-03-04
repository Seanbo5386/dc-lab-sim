import { describe, it, expect, beforeEach } from "vitest";
import { useAuthToastStore } from "../authToastStore";

describe("authToastStore", () => {
  beforeEach(() => {
    useAuthToastStore.setState({
      visible: false,
      message: "",
      type: "success",
    });
  });

  it("starts with visible false", () => {
    expect(useAuthToastStore.getState().visible).toBe(false);
  });

  it("shows a toast with message and type", () => {
    useAuthToastStore.getState().show("Signed in!", "success");
    const state = useAuthToastStore.getState();
    expect(state.visible).toBe(true);
    expect(state.message).toBe("Signed in!");
    expect(state.type).toBe("success");
  });

  it("dismisses the toast", () => {
    useAuthToastStore.getState().show("Error occurred", "error");
    expect(useAuthToastStore.getState().visible).toBe(true);
    useAuthToastStore.getState().dismiss();
    expect(useAuthToastStore.getState().visible).toBe(false);
  });

  it("supports info type", () => {
    useAuthToastStore.getState().show("Code resent", "info");
    const state = useAuthToastStore.getState();
    expect(state.type).toBe("info");
    expect(state.message).toBe("Code resent");
  });
});
