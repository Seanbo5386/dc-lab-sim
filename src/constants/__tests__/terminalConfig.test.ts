import { describe, it, expect, beforeEach } from "vitest";
import {
  generateWelcomeMessage,
  selectMountVariant,
  __resetWelcomeBannerStateForTests,
} from "../terminalConfig";

describe("generateWelcomeMessage", () => {
  it("renders the full variant by default", () => {
    const result = generateWelcomeMessage(80);
    expect(result).toContain("Data Center Lab Simulator");
    expect(result).toContain("Get started:");
    expect(result).toContain("nvidia-smi");
    expect(result).toContain("ibstat");
    expect(result).toContain("sinfo");
    expect(result).toContain("Need help?");
  });

  it("renders the full variant when explicitly requested", () => {
    const result = generateWelcomeMessage(80, { variant: "full" });
    expect(result).toContain("Data Center Lab Simulator");
  });

  it("renders a short compact variant", () => {
    const result = generateWelcomeMessage(80, { variant: "compact" });
    expect(result).toContain("Terminal ready.");
    expect(result).toContain("help");
    expect(result).toContain("hint");
    expect(result).not.toContain("Data Center Lab Simulator");
    expect(result).not.toContain("Get started:");
  });

  it("renders the mission variant with the scenario title", () => {
    const result = generateWelcomeMessage(80, {
      variant: "mission",
      scenarioTitle: "Midnight Deployment",
    });
    expect(result).toContain("MISSION BRIEFING");
    expect(result).toContain("Midnight Deployment");
  });

  it("falls back to a generic title when the mission variant has no scenario title", () => {
    const result = generateWelcomeMessage(80, { variant: "mission" });
    expect(result).toContain("MISSION BRIEFING");
    expect(result).toContain("Mission");
    expect(result).not.toContain("null");
    expect(result).not.toContain("undefined");
  });

  it("renders the architecture variant with hardware specs for the given system type", () => {
    const result = generateWelcomeMessage(80, {
      variant: "architecture",
      systemType: "DGX-H100",
    });
    expect(result).toContain("Switched to DGX H100");
    expect(result).toContain("NVLink 4.0");
    expect(result).toContain("NDR 400Gb/s");
    expect(result).toContain("HBM3");
  });

  it("does not duplicate the SXM version that is already embedded in the GPU model name", () => {
    const result = generateWelcomeMessage(80, {
      variant: "architecture",
      systemType: "DGX-H100",
    });
    const sxmMatches = result.match(/SXM5/g) ?? [];
    expect(sxmMatches).toHaveLength(1);
  });

  it("defaults the architecture variant to DGX-A100 when no system type is given", () => {
    const result = generateWelcomeMessage(80, { variant: "architecture" });
    expect(result).toContain("Switched to DGX A100");
  });
});

describe("selectMountVariant", () => {
  beforeEach(() => {
    __resetWelcomeBannerStateForTests();
  });

  it("returns mission when a scenario is active, even on the first call", () => {
    expect(selectMountVariant("domain1-midnight-deployment")).toBe("mission");
  });

  it("returns full the first time it is called with no active scenario", () => {
    expect(selectMountVariant(null)).toBe("full");
  });

  it("returns compact on later calls with no active scenario", () => {
    selectMountVariant(null);
    expect(selectMountVariant(null)).toBe("compact");
  });

  it("returns mission for a scenario even after the full banner has already been shown", () => {
    selectMountVariant(null);
    expect(selectMountVariant("domain2-fabric-outage")).toBe("mission");
  });

  it("shows the full banner again after __resetWelcomeBannerStateForTests", () => {
    selectMountVariant(null);
    __resetWelcomeBannerStateForTests();
    expect(selectMountVariant(null)).toBe("full");
  });
});
