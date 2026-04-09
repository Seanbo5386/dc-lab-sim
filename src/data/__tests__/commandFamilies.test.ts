import { describe, it, expect } from "vitest";
import commandFamiliesData from "../commandFamilies.json";

interface Tool {
  name: string;
  tagline: string;
  description: string;
  bestFor: string;
  exampleCommand: string;
  permissions: string;
  relatedTools: string[];
}

interface CommandFamily {
  id: string;
  name: string;
  icon: string;
  description: string;
  quickRule: string;
  tools: Tool[];
}

interface CommandFamiliesFile {
  families: CommandFamily[];
}

const EXPECTED_FAMILY_IDS = [
  "gpu-monitoring",
  "infiniband-tools",
  "bmc-hardware",
  "cluster-tools",
  "container-tools",
  "diagnostics",
  "xid-diagnostics",
];

const KNOWN_COMMANDS = [
  "nvidia-smi",
  "nvsm",
  "dcgmi",
  "nvtop",
  "ibstat",
  "perfquery",
  "ibdiagnet",
  "iblinkinfo",
  "ipmitool",
  "sensors",
  "dmidecode",
  "sinfo",
  "squeue",
  "scontrol",
  "sacct",
  "docker",
  "enroot",
  "pyxis",
  "dcgmi diag",
  "nvidia-bug-report",
  "gpu-burn",
  "dmesg",
];

describe("commandFamilies.json", () => {
  const data = commandFamiliesData as CommandFamiliesFile;
  const families = data.families;

  describe("file structure", () => {
    it("should have a families array", () => {
      expect(data).toHaveProperty("families");
      expect(Array.isArray(families)).toBe(true);
    });

    it("should have exactly 7 command families", () => {
      expect(families).toHaveLength(7);
    });
  });

  describe("all 7 families present", () => {
    it("should contain all expected family IDs", () => {
      const actualIds = families.map((f) => f.id);
      EXPECTED_FAMILY_IDS.forEach((expectedId) => {
        expect(actualIds).toContain(expectedId);
      });
    });
  });

  describe("family structure", () => {
    it("each family should have required properties: id, name, tools, tagline (via quickRule), bestFor (via description)", () => {
      families.forEach((family) => {
        expect(family).toHaveProperty("id");
        expect(family).toHaveProperty("name");
        expect(family).toHaveProperty("tools");
        expect(family).toHaveProperty("description");
        expect(family).toHaveProperty("quickRule");
        expect(family).toHaveProperty("icon");
      });
    });

    it("family names should be non-empty strings", () => {
      families.forEach((family) => {
        expect(typeof family.name).toBe("string");
        expect(family.name.length).toBeGreaterThan(0);
      });
    });

    it("family descriptions should be non-empty strings", () => {
      families.forEach((family) => {
        expect(typeof family.description).toBe("string");
        expect(family.description.length).toBeGreaterThan(0);
      });
    });
  });

  describe("no duplicate IDs", () => {
    it("should have unique family IDs", () => {
      const ids = families.map((f) => f.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe("tools arrays", () => {
    it("all tools arrays should be non-empty", () => {
      families.forEach((family) => {
        expect(Array.isArray(family.tools)).toBe(true);
        expect(family.tools.length).toBeGreaterThan(0);
      });
    });

    it("each family should have at least 2 tools", () => {
      families.forEach((family) => {
        expect(family.tools.length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe("tool structure", () => {
    it("each tool should have required properties: name, tagline, description, bestFor, exampleCommand", () => {
      families.forEach((family) => {
        family.tools.forEach((tool) => {
          expect(tool).toHaveProperty("name");
          expect(tool).toHaveProperty("tagline");
          expect(tool).toHaveProperty("description");
          expect(tool).toHaveProperty("bestFor");
          expect(tool).toHaveProperty("exampleCommand");
        });
      });
    });

    it("tool names should match known simulator commands", () => {
      families.forEach((family) => {
        family.tools.forEach((tool) => {
          expect(KNOWN_COMMANDS).toContain(tool.name);
        });
      });
    });

    it("bestFor descriptions should be non-empty for all tools", () => {
      families.forEach((family) => {
        family.tools.forEach((tool) => {
          expect(typeof tool.bestFor).toBe("string");
          expect(tool.bestFor.length).toBeGreaterThan(0);
        });
      });
    });

    it("taglines should be concise (under 100 characters)", () => {
      families.forEach((family) => {
        family.tools.forEach((tool) => {
          expect(tool.tagline.length).toBeLessThan(100);
        });
      });
    });
  });

  describe("no duplicate tool names", () => {
    it("should have no duplicate tool names within a single family", () => {
      families.forEach((family) => {
        const toolNames = family.tools.map((t) => t.name);
        const uniqueNames = new Set(toolNames);
        expect(uniqueNames.size).toBe(toolNames.length);
      });
    });
  });

  describe("relatedTools consistency", () => {
    it("relatedTools should reference valid tool names within the data", () => {
      const allToolNames = new Set(
        families.flatMap((f) => f.tools.map((t) => t.name)),
      );
      families.forEach((family) => {
        family.tools.forEach((tool) => {
          if (tool.relatedTools) {
            tool.relatedTools.forEach((related) => {
              expect(allToolNames.has(related)).toBe(true);
            });
          }
        });
      });
    });
  });

  describe("permissions field", () => {
    it("each tool should have a valid permissions value (user or root)", () => {
      families.forEach((family) => {
        family.tools.forEach((tool) => {
          expect(["user", "root"]).toContain(tool.permissions);
        });
      });
    });
  });

  describe("quickRule content", () => {
    it("each family should have a non-empty quickRule string", () => {
      families.forEach((family) => {
        expect(typeof family.quickRule).toBe("string");
        expect(family.quickRule.length).toBeGreaterThan(0);
      });
    });
  });
});
