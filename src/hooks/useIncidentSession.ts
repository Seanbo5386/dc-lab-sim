/**
 * useIncidentSession - Incident Session Orchestrator hook.
 *
 * Wires together sandbox creation, incident composition, fault injection,
 * workflow tracking, consequence evaluation, and scoring into a single
 * React hook consumed by App.tsx.
 *
 * Lifecycle:
 *   idle -> startIncident() -> active -> submitDiagnosis() -> review
 *                                     -> abandonIncident() -> idle
 */

import { useState, useCallback, useRef } from "react";
import { scenarioContextManager } from "@/store/scenarioContext";
import type { ScenarioContext } from "@/store/scenarioContext";
import {
  IncidentComposer,
  type ComposedIncident,
} from "@/simulation/incidentComposer";
import {
  WorkflowTracker,
  type PhaseEntry,
  type WorkflowScore,
} from "@/simulation/workflowTracker";
import { ConsequenceEngine } from "@/simulation/consequenceEngine";
import { FaultPropagationEngine } from "@/simulation/faultPropagation";
import { applyFaultsToContext } from "@/utils/scenarioLoader";
import { useLearningProgressStore } from "@/store/learningProgressStore";
import type { FaultInjectionConfig, FaultType } from "@/types/scenarios";
import type { ClusterEvent } from "@/simulation/eventLog";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type IncidentState = "idle" | "active" | "review";

export interface ReviewData {
  score: WorkflowScore;
  correctDiagnosis: boolean;
  selectedRootCause: string;
  correctRootCause: string;
  events: ClusterEvent[];
  commands: PhaseEntry[];
  tip: string;
  difficulty: string;
  domain?: number;
}

// ---------------------------------------------------------------------------
// Fault mapping helper
// ---------------------------------------------------------------------------

/**
 * Maps an IncidentComposer fault descriptor to the FaultInjectionConfig shape
 * expected by applyFaultsToContext.
 *
 * IncidentComposer produces: { faultType: "xid-48", nodeId, gpuId }
 * applyFaultsToContext expects: { nodeId, gpuId, type, severity, parameters? }
 */
function mapIncidentFault(fault: {
  faultType: string;
  nodeId: string;
  gpuId: number;
}): FaultInjectionConfig {
  const { faultType, nodeId, gpuId } = fault;

  if (faultType.startsWith("xid-")) {
    const xidCode = parseInt(faultType.split("-")[1], 10) || 48;
    return {
      nodeId,
      gpuId,
      type: "xid-error" as FaultType,
      severity: "critical",
      parameters: { xid: xidCode },
    };
  }

  switch (faultType) {
    case "thermal-runaway":
      return {
        nodeId,
        gpuId,
        type: "thermal" as FaultType,
        severity: "critical",
        parameters: { targetTemp: 95 },
      };

    case "elevated-temperature":
      return {
        nodeId,
        gpuId,
        type: "thermal" as FaultType,
        severity: "warning",
        parameters: { targetTemp: 82 },
      };

    case "ecc-accumulation":
    case "ecc-error":
      return {
        nodeId,
        gpuId,
        type: "ecc-error" as FaultType,
        severity: "critical",
        parameters: { singleBit: 150, doubleBit: 1 },
      };

    case "single-bit-ecc":
      return {
        nodeId,
        gpuId,
        type: "ecc-error" as FaultType,
        severity: "warning",
        parameters: { singleBit: 50, doubleBit: 0 },
      };

    case "nvlink-failure":
      return {
        nodeId,
        gpuId,
        type: "nvlink-failure" as FaultType,
        severity: "critical",
      };

    case "gpu-hang":
      return {
        nodeId,
        gpuId,
        type: "gpu-hang" as FaultType,
        severity: "critical",
      };

    case "correctable-pcie-error":
    case "pcie-error":
      return {
        nodeId,
        gpuId,
        type: "pcie-error" as FaultType,
        severity: "warning",
      };

    case "power-anomaly":
      return {
        nodeId,
        gpuId,
        type: "power" as FaultType,
        severity: "warning",
        parameters: { powerDraw: 700 },
      };

    default:
      // Best-effort: use faultType as the type directly
      return {
        nodeId,
        gpuId,
        type: faultType as FaultType,
        severity: "warning",
      };
  }
}

// ---------------------------------------------------------------------------
// Tip generation
// ---------------------------------------------------------------------------

function generateTip(correctDiagnosis: boolean, score: WorkflowScore): string {
  if (!correctDiagnosis) {
    return "Focus on gathering evidence before diagnosing. Check nvidia-smi output, dmesg logs, and ECC counters to build a complete picture before committing to a root cause.";
  }
  if (score.methodology < 10) {
    return "Try following a more structured diagnostic workflow: survey the cluster first, triage the symptoms, isolate the faulty component, remediate, then verify the fix.";
  }
  if (score.efficiency < 10) {
    return "You used more commands than necessary. Focus on targeted diagnostics that narrow down the root cause with fewer steps.";
  }
  if (score.noCollateral < 15) {
    return "Be careful with destructive commands on nodes with active workloads. Always check Slurm state and running jobs before power cycling or resetting GPUs.";
  }
  if (score.completeness < 15) {
    return "After applying a fix, always verify it worked by re-running your diagnostic commands to confirm the issue is resolved.";
  }
  return "Great diagnostic work! Continue practicing to sharpen your incident response skills across different failure modes.";
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useIncidentSession() {
  // State
  const [incidentState, setIncidentState] = useState<IncidentState>("idle");
  const [situation, setSituation] = useState("");
  const [reviewData, setReviewData] = useState<ReviewData | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  // commandCount forces re-renders so workflowPhases picks up fresh tracker data
  const [commandCount, setCommandCount] = useState(0);

  // Refs for mutable instances (not re-render triggers)
  const composedRef = useRef<ComposedIncident | null>(null);
  const trackerRef = useRef<WorkflowTracker | null>(null);
  const propagationRef = useRef<FaultPropagationEngine | null>(null);
  const consequenceRef = useRef<ConsequenceEngine | null>(null);
  const contextIdRef = useRef<string | null>(null);
  const contextRef = useRef<ScenarioContext | null>(null);
  const collateralCountRef = useRef(0);
  const hintsUsedRef = useRef(0);
  const difficultyRef = useRef<string>("beginner");
  const domainRef = useRef<number | undefined>(undefined);

  // -------------------------------------------------------------------------
  // startIncident
  // -------------------------------------------------------------------------
  const startIncident = useCallback((difficulty: string, domain?: number) => {
    // 1. Create ScenarioContext with unique ID
    const contextId = `incident-${Date.now()}`;
    const context = scenarioContextManager.createContext(contextId);

    // 2. Compose incident
    const composer = new IncidentComposer();
    const composed = composer.compose({
      difficulty: difficulty as "beginner" | "intermediate" | "advanced",
      domain,
    });

    // 3. Map composed faults to FaultInjectionConfig and apply
    const primaryFaultConfigs = composed.faults.map(mapIncidentFault);
    applyFaultsToContext(primaryFaultConfigs, context);

    // 4. Apply red herrings the same way
    if (composed.redHerrings.length > 0) {
      const herringConfigs = composed.redHerrings.map(mapIncidentFault);
      applyFaultsToContext(herringConfigs, context);
    }

    // 5. Set active context
    scenarioContextManager.setActiveContext(contextId);

    // 6. Create engine instances
    const tracker = new WorkflowTracker();
    const propagation = new FaultPropagationEngine();
    const consequence = new ConsequenceEngine();

    // 7. Trigger propagation for the primary fault
    if (composed.faults.length > 0) {
      const primaryFault = composed.faults[0];
      propagation.triggerFault({
        faultType: composed.propagationTrigger,
        nodeId: primaryFault.nodeId,
        gpuId: primaryFault.gpuId,
      });
    }

    // 8. Store refs
    composedRef.current = composed;
    trackerRef.current = tracker;
    propagationRef.current = propagation;
    consequenceRef.current = consequence;
    contextIdRef.current = contextId;
    contextRef.current = context;
    collateralCountRef.current = 0;
    hintsUsedRef.current = 0;
    difficultyRef.current = difficulty;
    domainRef.current = domain;

    // 9. Set state
    setSituation(composed.situation);
    setHintsUsed(0);
    setCommandCount(0);
    setReviewData(null);
    setIncidentState("active");
  }, []);

  // -------------------------------------------------------------------------
  // recordCommand
  // -------------------------------------------------------------------------
  const recordCommand = useCallback(
    (command: string): PhaseEntry | null => {
      if (incidentState !== "active") return null;
      if (!trackerRef.current || !consequenceRef.current || !contextRef.current)
        return null;

      // 1. Forward to WorkflowTracker
      const entry = trackerRef.current.recordCommand(command);

      // Bump counter to trigger re-render (so workflowPhases picks up fresh data)
      setCommandCount((c) => c + 1);

      // 2. Check ConsequenceEngine against the first node in context
      //    (the node affected by the primary fault)
      const composed = composedRef.current;
      if (composed && composed.faults.length > 0) {
        const primaryNodeId = composed.faults[0].nodeId;
        const node = contextRef.current.getNode(primaryNodeId);

        if (node) {
          const consequence = consequenceRef.current.evaluate(command, node);

          if (consequence) {
            // 3. Increment collateral counter
            collateralCountRef.current += 1;

            // 4. Log to EventLog
            const eventLog = contextRef.current.getEventLog();
            eventLog.append({
              type: "consequence",
              nodeId: primaryNodeId,
              message: consequence.description,
              severity: "warning",
            });
          }
        }
      }

      return entry;
    },
    [incidentState],
  );

  // -------------------------------------------------------------------------
  // submitDiagnosis
  // -------------------------------------------------------------------------
  const submitDiagnosis = useCallback(
    (selectedRootCause: string) => {
      if (incidentState !== "active") return;
      if (!composedRef.current || !trackerRef.current || !contextRef.current)
        return;

      const composed = composedRef.current;

      // 1. Check correctness
      const correctDiagnosis = selectedRootCause === composed.correctRootCause;

      // 2. Calculate score (with hint penalty)
      const rawScore = trackerRef.current.calculateScore({
        correctDiagnosis,
        collateralDamage: collateralCountRef.current,
      });
      const hintPenalty = hintsUsedRef.current * 5;
      const score: WorkflowScore = {
        ...rawScore,
        total: Math.max(0, rawScore.total - hintPenalty),
      };

      // 3. Record result in learningProgressStore
      useLearningProgressStore
        .getState()
        .recordIncidentResult(composed.templateId, score.total);

      // 4. Gather events and commands for review
      const events = contextRef.current.getEventLog().getAll();
      const commands = trackerRef.current.getPhaseHistory();
      const tip = generateTip(correctDiagnosis, score);

      // 5. Build review data
      const review: ReviewData = {
        score,
        correctDiagnosis,
        selectedRootCause,
        correctRootCause: composed.correctRootCause,
        events,
        commands,
        tip,
        difficulty: difficultyRef.current,
        domain: domainRef.current,
      };

      // 6. Clean up context
      const contextId = contextIdRef.current;
      if (contextId) {
        scenarioContextManager.setActiveContext(null);
        scenarioContextManager.deleteContext(contextId);
      }

      // 7. Clear propagation engine
      if (propagationRef.current) {
        propagationRef.current.clear();
      }

      // 8. Set state
      setReviewData(review);
      setIncidentState("review");
    },
    [incidentState],
  );

  // -------------------------------------------------------------------------
  // abandonIncident
  // -------------------------------------------------------------------------
  const abandonIncident = useCallback(() => {
    // 1. Clean up context
    const contextId = contextIdRef.current;
    if (contextId) {
      scenarioContextManager.setActiveContext(null);
      scenarioContextManager.deleteContext(contextId);
    }

    // 2. Clear propagation
    if (propagationRef.current) {
      propagationRef.current.clear();
    }

    // 3. Reset all refs
    composedRef.current = null;
    trackerRef.current = null;
    propagationRef.current = null;
    consequenceRef.current = null;
    contextIdRef.current = null;
    contextRef.current = null;
    collateralCountRef.current = 0;

    // 4. Set state to idle
    setSituation("");
    setHintsUsed(0);
    setCommandCount(0);
    setReviewData(null);
    setIncidentState("idle");
  }, []);

  // -------------------------------------------------------------------------
  // requestHint
  // -------------------------------------------------------------------------
  const requestHint = useCallback(() => {
    setHintsUsed((prev) => prev + 1);
    hintsUsedRef.current += 1;
  }, []);

  // -------------------------------------------------------------------------
  // Return
  // -------------------------------------------------------------------------
  return {
    incidentState,
    situation,
    workflowPhases: trackerRef.current?.getPhaseHistory() ?? [],
    commandCount,
    reviewData,
    hintsUsed,
    rootCauseOptions: composedRef.current?.rootCauseOptions ?? [],
    diagnosticPath: composedRef.current?.diagnosticPath ?? [],
    startIncident,
    recordCommand,
    submitDiagnosis,
    abandonIncident,
    requestHint,
  };
}
