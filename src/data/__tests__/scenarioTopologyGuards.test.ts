import { describe, it, expect } from "vitest";
import scenariosData from "../narrativeScenarios.json";

interface Fault {
  nodeId: string;
  gpuId?: number;
  type: string;
  parameters?: Record<string, unknown>;
}
interface Step {
  id: string;
  situation: string;
  task: string;
  autoFaults?: Fault[];
  validation?: { pattern?: string };
}
interface Scenario {
  id: string;
  steps: Step[];
  narrative?: { hook: string; setting: string; resolution: string };
}

const scenarios = (scenariosData as { scenarios: Scenario[] }).scenarios;
const BASE_NODES = Array.from(
  { length: 8 },
  (_, i) => `dgx-${String(i).padStart(2, "0")}`,
);

describe("scenario node references stay within the live topology", () => {
  it("non-add-node faults only target nodes that exist (base set or a prior add-node in the same scenario)", () => {
    const offenders: string[] = [];
    for (const s of scenarios) {
      const valid = new Set(BASE_NODES);
      for (const step of s.steps) {
        for (const f of step.autoFaults ?? []) {
          if (f.type === "add-node") {
            valid.add(f.nodeId);
            continue;
          }
          if (!valid.has(f.nodeId))
            offenders.push(`${s.id}/${step.id}: ${f.type} on ${f.nodeId}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

// domain1-rack-expansion legitimately uses add-node faults for dgx-08..dgx-11.
// The add-node handler in scenarioLoader.ts calls context.addNode() which is a real
// implementation (not a stub) — it creates a new DGX node and adds it to the isolated
// sandbox cluster. rack-expansion is therefore valid and completable by design.

describe("specific fault↔narrative consistency", () => {
  it("domain5-xid-investigation XID 79 fault targets the GPU the narrative names (GPU 5)", () => {
    const s = scenarios.find((x) => x.id === "domain5-xid-investigation");
    expect(s, "domain5-xid-investigation not found in scenarios").toBeDefined();
    const fault = s!.steps
      .flatMap((st) => st.autoFaults ?? [])
      .find((f) => f.parameters?.xid === 79);
    expect(
      fault,
      "XID 79 fault not found in domain5-xid-investigation",
    ).toBeDefined();
    expect(fault!.gpuId).toBe(5);
  });

  it("domain4-silent-cluster step-4 narrative ECC count matches the injected singleBit (150)", () => {
    const s = scenarios.find((x) => x.id === "domain4-silent-cluster");
    expect(s, "domain4-silent-cluster not found in scenarios").toBeDefined();
    const eccFault = s!.steps
      .flatMap((st) => st.autoFaults ?? [])
      .find((f) => f.type === "ecc-error");
    expect(
      eccFault,
      "ecc-error fault not found in domain4-silent-cluster",
    ).toBeDefined();
    const step4 = s!.steps.find((st) => st.id === "step-4");
    expect(step4, "step-4 not found in domain4-silent-cluster").toBeDefined();
    const m = step4!.situation.match(/(\d+)\s+ECC\s+single-bit/i);
    expect(m).not.toBeNull();
    expect(Number(m![1])).toBe(eccFault!.parameters!.singleBit);
  });
});

describe("validation patterns are architecture-neutral", () => {
  const FORBIDDEN = /\b(A100|H100|H200|B200|GB200|VR200|R200|HDR|NDR|XDR)\b/;
  it("no validation.pattern contains a hardcoded architecture/IB-generation token", () => {
    const offenders: string[] = [];
    for (const s of scenarios) {
      for (const step of s.steps) {
        const p = step.validation?.pattern;
        if (p && FORBIDDEN.test(p))
          offenders.push(`${s.id}/${step.id}: "${p}"`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("narrative cluster sizes fit the 8-node/64-GPU topology", () => {
  const text = (s: Scenario) =>
    [
      s.narrative?.hook,
      s.narrative?.setting,
      s.narrative?.resolution,
      ...s.steps.flatMap((st) => [st.situation, st.task]),
    ]
      .filter(Boolean)
      .join(" ");
  it("no scenario prose claims more than 8 nodes or 64 GPUs", () => {
    const offenders: string[] = [];
    for (const s of scenarios) {
      const t = text(s);
      for (const m of t.matchAll(/\b(\d{1,3})[- ]node/gi))
        if (Number(m[1]) > 8) offenders.push(`${s.id}: "${m[0]}"`);
      for (const m of t.matchAll(
        /\b(\d{2,4})\s+(?:total\s+)?(?:\{\{[^}]+\}\}\s+)?GPUs?\b/gi,
      ))
        if (Number(m[1]) > 64) offenders.push(`${s.id}: "${m[0]}"`);
    }
    expect(offenders).toEqual([]);
  });
});
