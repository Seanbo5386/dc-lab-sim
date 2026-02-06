import { describe, it, expect } from "vitest";
import { levenshteinDistance, findSimilarStrings } from "../stringDistance";

describe("levenshteinDistance", () => {
  it("should return 0 for identical strings", () => {
    expect(levenshteinDistance("nvidia-smi", "nvidia-smi")).toBe(0);
  });

  it("should return correct distance for single edit", () => {
    expect(levenshteinDistance("nvidia-smi", "nvidia-sm")).toBe(1);
  });

  it("should return correct distance for substitution", () => {
    expect(levenshteinDistance("cat", "bat")).toBe(1);
  });

  it("should handle empty strings", () => {
    expect(levenshteinDistance("", "")).toBe(0);
    expect(levenshteinDistance("abc", "")).toBe(3);
    expect(levenshteinDistance("", "xyz")).toBe(3);
  });

  it("should be symmetric", () => {
    expect(levenshteinDistance("abc", "xyz")).toBe(
      levenshteinDistance("xyz", "abc"),
    );
  });
});

describe("findSimilarStrings", () => {
  const candidates = ["nvidia-smi", "ibstat", "dcgmi", "sinfo", "squeue"];

  it("should find similar commands for typos", () => {
    const results = findSimilarStrings("nvdia-smi", candidates);
    expect(results).toContain("nvidia-smi");
  });

  it("should return empty array for completely different strings", () => {
    const results = findSimilarStrings("zzzzzzzzzzz", candidates);
    expect(results).toHaveLength(0);
  });

  it("should not return exact matches", () => {
    const results = findSimilarStrings("ibstat", candidates);
    expect(results).not.toContain("ibstat");
  });

  it("should sort by distance (closest first)", () => {
    const results = findSimilarStrings("sinf", candidates);
    if (results.length > 0) {
      expect(results[0]).toBe("sinfo");
    }
  });

  it("should return at most 3 results", () => {
    const manyCandidates = Array.from({ length: 20 }, (_, i) => `cmd${i}`);
    const results = findSimilarStrings("cmd", manyCandidates);
    expect(results.length).toBeLessThanOrEqual(3);
  });
});
