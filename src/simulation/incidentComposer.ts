/**
 * IncidentComposer
 *
 * Assembles incidents at runtime from IncidentTemplates, randomizing target
 * nodes/GPUs and layering in red herrings based on difficulty. Called by the
 * Incident Session Orchestrator when the user starts a new incident.
 */

import {
  INCIDENT_TEMPLATES,
  type IncidentTemplate,
} from "@/data/incidentTemplates";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ComposedIncident {
  templateId: string;
  situation: string;
  faults: Array<{
    faultType: string;
    nodeId: string;
    gpuId: number;
  }>;
  redHerrings: Array<{
    faultType: string;
    nodeId: string;
    gpuId: number;
  }>;
  propagationTrigger: string;
  diagnosticPath: string[];
  rootCauseOptions: string[];
  correctRootCause: string;
  templateDomains: number[];
}

export interface ComposeOptions {
  difficulty: "beginner" | "intermediate" | "advanced";
  domain?: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NODE_IDS = Array.from(
  { length: 8 },
  (_, i) => `dgx-${String(i).padStart(2, "0")}`,
);
const GPU_COUNT = 8;

/**
 * Mild red-herring fault types that look concerning but are benign in
 * isolation. These get injected on a *different* node to distract the
 * technician.
 */
const RED_HERRING_FAULT_TYPES = [
  "elevated-temperature",
  "single-bit-ecc",
  "correctable-pcie-error",
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function randomInt(max: number): number {
  return Math.floor(Math.random() * max);
}

function pickRandom<T>(arr: readonly T[]): T {
  return arr[randomInt(arr.length)];
}

/**
 * Pick a random node that is NOT in the exclusion list.
 */
function pickDifferentNode(exclude: string[]): string {
  const candidates = NODE_IDS.filter((n) => !exclude.includes(n));
  if (candidates.length === 0) {
    // Extremely unlikely with 8 nodes, but fall back gracefully
    return pickRandom(NODE_IDS);
  }
  return pickRandom(candidates);
}

// ---------------------------------------------------------------------------
// IncidentComposer
// ---------------------------------------------------------------------------

export class IncidentComposer {
  /**
   * Compose a concrete incident from a randomly selected template.
   */
  compose(options: ComposeOptions): ComposedIncident {
    const template = this.pickTemplate(options);
    const faults = this.resolveFaults(template);
    const redHerrings = this.resolveRedHerrings(options.difficulty, faults);

    return {
      templateId: template.id,
      situation: template.situation,
      faults,
      redHerrings,
      propagationTrigger: template.propagationTrigger,
      diagnosticPath: [...template.diagnosticPath],
      rootCauseOptions: [...template.rootCauseOptions],
      correctRootCause: template.correctRootCause,
      templateDomains: [...template.domains],
    };
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  private pickTemplate(options: ComposeOptions): IncidentTemplate {
    let candidates = INCIDENT_TEMPLATES.filter(
      (t) => t.difficulty === options.difficulty,
    );

    if (options.domain !== undefined) {
      const domainFiltered = candidates.filter((t) =>
        t.domains.includes(options.domain!),
      );
      if (domainFiltered.length > 0) {
        candidates = domainFiltered;
      }
      // If domain filter yields nothing, keep the difficulty-only list
    }

    // Fall back to any template if difficulty filter also yields nothing
    if (candidates.length === 0) {
      candidates = [...INCIDENT_TEMPLATES];
    }

    return pickRandom(candidates);
  }

  /**
   * Resolve template fault declarations into concrete faults with
   * randomized node IDs and GPU IDs.
   */
  private resolveFaults(
    template: IncidentTemplate,
  ): ComposedIncident["faults"] {
    const nodeId = pickRandom(NODE_IDS);

    return template.primaryFaults.map((pf) => {
      const gpuId = pf.target === "node" ? 0 : randomInt(GPU_COUNT);

      return {
        faultType: pf.faultType,
        nodeId,
        gpuId,
      };
    });
  }

  /**
   * Generate red-herring faults for intermediate and advanced difficulties.
   *
   * - intermediate: 0-1 red herrings
   * - advanced: 1-2 red herrings
   * - beginner: none
   */
  private resolveRedHerrings(
    difficulty: ComposeOptions["difficulty"],
    primaryFaults: ComposedIncident["faults"],
  ): ComposedIncident["redHerrings"] {
    if (difficulty === "beginner") {
      return [];
    }

    const usedNodes = primaryFaults.map((f) => f.nodeId);

    const count = difficulty === "advanced" ? 1 + randomInt(2) : randomInt(2);

    const herrings: ComposedIncident["redHerrings"] = [];
    for (let i = 0; i < count; i++) {
      const herringNode = pickDifferentNode(usedNodes);
      herrings.push({
        faultType: pickRandom(RED_HERRING_FAULT_TYPES),
        nodeId: herringNode,
        gpuId: randomInt(GPU_COUNT),
      });
      usedNodes.push(herringNode);
    }

    return herrings;
  }
}
