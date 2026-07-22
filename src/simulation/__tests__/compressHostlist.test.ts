import { describe, it, expect } from "vitest";
import { compressHostlist } from "../compressHostlist";

describe("compressHostlist", () => {
  it("returns empty string for an empty list", () => {
    expect(compressHostlist([])).toBe("");
  });

  it("returns a bare hostname for a single node", () => {
    expect(compressHostlist(["dgx-00"])).toBe("dgx-00");
  });

  it("compresses a contiguous run into a bracketed range", () => {
    expect(compressHostlist(["dgx-00", "dgx-01", "dgx-02", "dgx-03"])).toBe(
      "dgx-[00-03]",
    );
  });

  it("compresses out-of-order input the same as sorted input", () => {
    expect(compressHostlist(["dgx-03", "dgx-00", "dgx-02", "dgx-01"])).toBe(
      "dgx-[00-03]",
    );
  });

  it("joins non-contiguous runs with commas inside one bracket pair", () => {
    expect(
      compressHostlist(["dgx-00", "dgx-01", "dgx-02", "dgx-05", "dgx-06"]),
    ).toBe("dgx-[00-02,05-06]");
  });

  it("lists isolated non-adjacent nodes comma-separated inside brackets", () => {
    expect(compressHostlist(["dgx-00", "dgx-05"])).toBe("dgx-[00,05]");
  });

  it("preserves zero-padded width", () => {
    expect(compressHostlist(["dgx-00", "dgx-01"])).toBe("dgx-[00-01]");
  });

  it("passes through a hostname with no trailing digits unmodified", () => {
    expect(compressHostlist(["headnode"])).toBe("headnode");
  });

  it("keeps different prefixes as separate comma-joined segments", () => {
    expect(compressHostlist(["dgx-00", "dgx-01", "gpu-00"])).toBe(
      "dgx-[00-01],gpu-00",
    );
  });

  it("deduplicates a repeated id", () => {
    expect(compressHostlist(["dgx-00", "dgx-00", "dgx-01"])).toBe(
      "dgx-[00-01]",
    );
  });
});
