import { describe, it, expect } from "vitest";
import {
  deriveFabricTopology,
  getSwitchModelForRate,
} from "../ibFabricTopology";
import { createCustomCluster } from "@/utils/clusterFactory";

describe("getSwitchModelForRate (SIM-7/SIM-12 unification)", () => {
  it("maps port rates to the correct Mellanox switch model", () => {
    expect(getSwitchModelForRate(800)).toBe("QM9790");
    expect(getSwitchModelForRate(400)).toBe("QM9700");
    expect(getSwitchModelForRate(200)).toBe("QM8790");
    expect(getSwitchModelForRate(100)).toBe("QM8700");
  });
});

describe("deriveFabricTopology (SIM-7/SIM-12 unification)", () => {
  it("derives 4 spine switches and one leaf switch per HCA on the first node", () => {
    const cluster = createCustomCluster(2, "DGX-H100");
    const topology = deriveFabricTopology(cluster.nodes);
    expect(topology.spineSwitches).toHaveLength(4);
    expect(topology.leafSwitches).toHaveLength(cluster.nodes[0].hcas.length);
  });

  it("every switch has a unique GUID and a unique LID", () => {
    const cluster = createCustomCluster(1, "DGX-H100");
    const topology = deriveFabricTopology(cluster.nodes);
    const allSwitches = [...topology.spineSwitches, ...topology.leafSwitches];
    expect(new Set(allSwitches.map((s) => s.guid)).size).toBe(
      allSwitches.length,
    );
    expect(new Set(allSwitches.map((s) => s.lid)).size).toBe(
      allSwitches.length,
    );
  });

  it("switch model reflects the cluster's real port rate (H100 = NDR = QM9700)", () => {
    const cluster = createCustomCluster(1, "DGX-H100");
    const topology = deriveFabricTopology(cluster.nodes);
    expect(topology.spineSwitches[0].model).toBe("QM9700");
  });
});
