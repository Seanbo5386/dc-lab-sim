import type { GPU, DGXNode } from "@/types/hardware";

export type RemediationAction =
  | "gpu-reset"
  | "reset-ecc-errors"
  | "set-power-limit"
  | "fabricmanager-restart"
  | "power-cycle"
  | "reseat-gpu"
  | "reseat-nvlink"
  | "rma";

export type RemediationOutcome =
  | "fixed"
  | "insufficient"
  | "not-applicable"
  | "blocked";

export interface RemediationResult {
  outcome: RemediationOutcome;
  message: string;
  gpuUpdates?: Partial<GPU>;
}

type FaultKind =
  | "rma"
  | "off-bus"
  | "thermal-alert"
  | "nvlink"
  | "pcie"
  | "xid"
  | "ecc"
  | "thermal"
  | "power";

const EMPTY_ECC = {
  singleBit: 0,
  doubleBit: 0,
  aggregated: { singleBit: 0, doubleBit: 0 },
};

const DISRUPTIVE: RemediationAction[] = ["gpu-reset", "power-cycle"];

function hasXID(gpu: GPU, code: number): boolean {
  return gpu.xidErrors.some((x) => x.code === code);
}

/**
 * Classify the GPU's current primary fault. Order matters: the most severe /
 * most specific signature wins so stacked faults (e.g. severe-ecc = XID 63 +
 * ECC) resolve to their governing kind.
 */
function classifyFault(gpu: GPU): FaultKind | null {
  if (hasXID(gpu, 63)) return "rma"; // row-remap / uncorrectable -> replace
  if (hasXID(gpu, 79)) return "off-bus"; // fell off the PCIe bus -> power cycle
  if (gpu.temperature >= 90) return "thermal-alert"; // node-wide overheat
  if (gpu.nvlinks.some((l) => l.status === "Down")) return "nvlink";
  if (hasXID(gpu, 62)) return "pcie"; // PCIe internal error
  if (gpu.xidErrors.length > 0) return "xid"; // any other XID (43, 48, ...)
  if (gpu.eccErrors.doubleBit > 0) return "ecc";
  if (gpu.temperature >= 85) return "thermal";
  if (gpu.powerDraw >= gpu.powerLimit * 0.95) return "power";
  return null;
}

interface FaultProfile {
  /** Actions that fully resolve this fault. */
  resolvedBy: RemediationAction[];
  /** Recognizable but too-low attempts -> "insufficient" with escalateHint. */
  escalateFrom: RemediationAction[];
  escalateHint: string;
  /** The healthy-state updates applied when the fault is resolved. */
  healthyUpdates: (gpu: GPU) => Partial<GPU>;
}

const PROFILES: Record<FaultKind, FaultProfile> = {
  xid: {
    resolvedBy: ["gpu-reset"],
    escalateFrom: [],
    escalateHint: "",
    healthyUpdates: () => ({ xidErrors: [], healthStatus: "OK" }),
  },
  pcie: {
    resolvedBy: ["gpu-reset", "reseat-gpu"],
    escalateFrom: [],
    escalateHint: "",
    healthyUpdates: () => ({ xidErrors: [], healthStatus: "OK" }),
  },
  ecc: {
    resolvedBy: ["reset-ecc-errors", "gpu-reset"],
    escalateFrom: [],
    escalateHint: "",
    healthyUpdates: () => ({ eccErrors: { ...EMPTY_ECC }, healthStatus: "OK" }),
  },
  thermal: {
    resolvedBy: ["set-power-limit"],
    escalateFrom: [],
    escalateHint: "",
    healthyUpdates: () => ({ temperature: 65, healthStatus: "OK" }),
  },
  power: {
    resolvedBy: ["set-power-limit"],
    escalateFrom: [],
    escalateHint: "",
    healthyUpdates: (gpu) => ({
      powerDraw: Math.round(gpu.powerLimit * 0.3),
      healthStatus: "OK",
    }),
  },
  nvlink: {
    resolvedBy: ["fabricmanager-restart", "reseat-nvlink"],
    escalateFrom: ["gpu-reset"],
    escalateHint:
      "NVLink is down — restart the fabric manager: systemctl restart nvidia-fabricmanager",
    healthyUpdates: (gpu) => ({
      nvlinks: gpu.nvlinks.map((l) => ({
        ...l,
        status: "Active" as const,
        txErrors: 0,
        rxErrors: 0,
      })),
      healthStatus: "OK",
    }),
  },
  "off-bus": {
    resolvedBy: ["power-cycle"],
    escalateFrom: ["gpu-reset", "reset-ecc-errors"],
    escalateHint:
      "GPU is off the bus — power-cycle the node: ipmitool chassis power cycle",
    healthyUpdates: () => ({
      xidErrors: [],
      temperature: 65,
      healthStatus: "OK",
    }),
  },
  "thermal-alert": {
    resolvedBy: ["power-cycle"],
    escalateFrom: ["set-power-limit"],
    escalateHint:
      "Node-wide overheat — power-cycle the node: ipmitool chassis power cycle",
    healthyUpdates: () => ({ temperature: 65, healthStatus: "OK" }),
  },
  rma: {
    resolvedBy: ["rma"],
    escalateFrom: ["gpu-reset", "reset-ecc-errors", "power-cycle"],
    escalateHint:
      "Unrecoverable fault — collect nvidia-bug-report.sh, drain the node, then mark for RMA",
    healthyUpdates: () => ({ rmaStatus: "pending" }),
  },
};

export function applyRemediation(
  gpu: GPU,
  node: DGXNode,
  action: RemediationAction,
): RemediationResult {
  const kind = classifyFault(gpu);

  if (kind === null) {
    return {
      outcome: "not-applicable",
      message: `GPU ${gpu.id} shows no active fault to remediate.`,
    };
  }

  // Drain gate for disruptive actions.
  if (DISRUPTIVE.includes(action) && node.slurmState === "alloc") {
    return {
      outcome: "blocked",
      message: `Node ${node.id} is running a job (alloc). Drain it first: scontrol update nodename=${node.id} state=drain`,
    };
  }

  const profile = PROFILES[kind];

  // RMA has its own gate, independent of fault kind.
  if (action === "rma") {
    if (kind !== "rma") {
      return {
        outcome: "not-applicable",
        message: `GPU ${gpu.id} fault is recoverable; RMA is not warranted.`,
      };
    }
    if (!node.bugReportCollected || node.slurmState === "alloc") {
      return {
        outcome: "blocked",
        message:
          "Before RMA: collect a bug report (nvidia-bug-report.sh) and drain the node.",
      };
    }
    return {
      outcome: "fixed",
      message: `GPU ${gpu.id} flagged for RMA. It remains offline until physically replaced.`,
      gpuUpdates: profile.healthyUpdates(gpu),
    };
  }

  if (profile.resolvedBy.includes(action)) {
    return {
      outcome: "fixed",
      message: `GPU ${gpu.id} ${kind} fault resolved.`,
      gpuUpdates: profile.healthyUpdates(gpu),
    };
  }

  if (profile.escalateFrom.includes(action)) {
    return { outcome: "insufficient", message: profile.escalateHint };
  }

  return {
    outcome: "not-applicable",
    message: `${action} does not address the ${kind} fault on GPU ${gpu.id}.`,
  };
}
