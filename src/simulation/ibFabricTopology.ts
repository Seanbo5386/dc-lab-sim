import type { DGXNode } from "@/types/hardware";

export interface FabricSwitch {
  id: string; // "spine-0", "leaf-3"
  tier: "spine" | "leaf";
  guid: string;
  lid: number;
  model: string;
}

export interface FabricTopology {
  spineSwitches: FabricSwitch[];
  leafSwitches: FabricSwitch[];
}

/**
 * Switch model derived from the fabric's port rate -- the same ternary
 * chain was previously copy-pasted verbatim 3 times inside
 * infinibandSimulator.ts (ibnetdiscover, ibswitches, ibtracert), plus a
 * 4th independent copy in InfiniBandMap.tsx's getSwitchModel (out of
 * scope for this phase -- that one drives a D3 visualization, not a
 * terminal command, and is left untouched).
 */
export function getSwitchModelForRate(rateGbs: number): string {
  if (rateGbs >= 800) return "QM9790";
  if (rateGbs >= 400) return "QM9700";
  if (rateGbs >= 200) return "QM8790";
  return "QM8700";
}

/**
 * Derive the cluster's spine/leaf switch topology (4 spine + one leaf per
 * HCA on the first node, a rail-optimized architecture) -- the single
 * source of truth every IB topology-reporting command reads instead of
 * independently re-deriving switch GUIDs/models (SIM-7/SIM-12). GUID base
 * (0xe41d2d030010/0xe41d2d030020) matches the scheme executeIbswitches
 * already used before this task -- chosen as canonical over
 * executeIbnetdiscover's ad hoc 0x1000/0x2000 base because e4:1d:2d is a
 * real Mellanox OUI prefix.
 */
export function deriveFabricTopology(nodes: DGXNode[]): FabricTopology {
  const portRate = nodes[0]?.hcas?.[0]?.ports?.[0]?.rate ?? 400;
  const model = getSwitchModelForRate(portRate);
  const leafCount = nodes[0]?.hcas?.length ?? 8;
  const spineCount = 4;

  const spineSwitches: FabricSwitch[] = Array.from(
    { length: spineCount },
    (_, i) => ({
      id: `spine-${i}`,
      tier: "spine" as const,
      guid: `0x${(0xe41d2d030010 + i).toString(16).padStart(16, "0")}`,
      lid: 10 + i,
      model,
    }),
  );

  const leafSwitches: FabricSwitch[] = Array.from(
    { length: leafCount },
    (_, i) => ({
      id: `leaf-${i}`,
      tier: "leaf" as const,
      guid: `0x${(0xe41d2d030020 + i).toString(16).padStart(16, "0")}`,
      lid: 20 + i,
      model,
    }),
  );

  return { spineSwitches, leafSwitches };
}
