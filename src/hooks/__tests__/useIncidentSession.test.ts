/**
 * Tests for useIncidentSession hook.
 *
 * Verifies the incident session orchestrator:
 * 1. Starts in "idle" state
 * 2. startIncident creates sandbox, composes incident, injects faults, transitions to "active"
 * 3. recordCommand forwards to WorkflowTracker and checks ConsequenceEngine
 * 4. submitDiagnosis calculates score, records result, transitions to "review"
 * 5. abandonIncident cleans up and transitions to "idle"
 * 6. EventLog receives entries and consequence events are tracked for scoring
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Hoisted mocks - these are available inside vi.mock factories
// ---------------------------------------------------------------------------

const {
  mockEventLog,
  mockContext,
  mockScenarioContextManager,
  mockComposedIncident,
  mockCompose,
  mockRecordCommand,
  mockGetPhaseHistory,
  mockCalculateScore,
  mockEvaluate,
  mockTriggerFault,
  mockGetPending,
  mockClear,
  mockApplyFaultsToContext,
  mockRecordIncidentResult,
} = vi.hoisted(() => {
  const mockEventLog = {
    append: vi.fn().mockImplementation((input: Record<string, unknown>) => ({
      ...input,
      id: 0,
      timestamp: Date.now(),
    })),
    getAll: vi.fn().mockReturnValue([]),
  };

  const mockContext = {
    getCluster: vi.fn().mockReturnValue({
      name: "test-cluster",
      nodes: [
        {
          id: "dgx-03",
          slurmState: "idle",
          healthStatus: "Healthy",
          gpus: [
            {
              id: 0,
              migMode: false,
              migInstances: [],
              utilization: 10,
            },
          ],
        },
      ],
    }),
    getNode: vi.fn().mockReturnValue({
      id: "dgx-03",
      slurmState: "idle",
      healthStatus: "Healthy",
      gpus: [
        {
          id: 0,
          migMode: false,
          migInstances: [],
          utilization: 10,
        },
      ],
    }),
    getEventLog: vi.fn().mockReturnValue(mockEventLog),
  };

  const mockScenarioContextManager = {
    createContext: vi.fn().mockReturnValue(mockContext),
    setActiveContext: vi.fn(),
    getActiveContext: vi.fn().mockReturnValue(mockContext),
    deleteContext: vi.fn().mockReturnValue(true),
  };

  const mockComposedIncident = {
    templateId: "gpu-memory-xid48",
    situation: "A GPU has an uncorrectable ECC error.",
    faults: [{ faultType: "ecc-error", nodeId: "dgx-03", gpuId: 5 }],
    redHerrings: [
      { faultType: "elevated-temperature", nodeId: "dgx-05", gpuId: 2 },
    ],
    propagationTrigger: "xid-48",
    diagnosticPath: ["nvidia-smi", "nvidia-smi -q -d ECC", "dmesg | grep xid"],
    rootCauseOptions: [
      "ECC memory error",
      "Thermal shutdown",
      "PCIe bus failure",
      "Driver crash",
    ],
    correctRootCause: "ECC memory error",
    templateDomains: [1],
  };

  const mockCompose = vi.fn().mockReturnValue(mockComposedIncident);
  const mockRecordCommand = vi.fn().mockImplementation((cmd: string) => ({
    command: cmd,
    phase: "survey" as const,
    timestamp: Date.now(),
  }));
  const mockGetPhaseHistory = vi.fn().mockReturnValue([]);
  const mockCalculateScore = vi.fn().mockReturnValue({
    methodology: 15,
    efficiency: 12,
    accuracy: 20,
    noCollateral: 20,
    completeness: 10,
    total: 77,
  });
  const mockEvaluate = vi.fn().mockReturnValue(null);
  const mockTriggerFault = vi.fn();
  const mockGetPending = vi.fn().mockReturnValue([]);
  const mockClear = vi.fn();
  const mockApplyFaultsToContext = vi.fn();
  const mockRecordIncidentResult = vi.fn();

  return {
    mockEventLog,
    mockContext,
    mockScenarioContextManager,
    mockComposedIncident,
    mockCompose,
    mockRecordCommand,
    mockGetPhaseHistory,
    mockCalculateScore,
    mockEvaluate,
    mockTriggerFault,
    mockGetPending,
    mockClear,
    mockApplyFaultsToContext,
    mockRecordIncidentResult,
  };
});

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("@/store/scenarioContext", () => ({
  ScenarioContext: vi.fn(),
  ScenarioContextManager: {
    getInstance: () => mockScenarioContextManager,
  },
  scenarioContextManager: mockScenarioContextManager,
}));

vi.mock("@/simulation/incidentComposer", () => ({
  IncidentComposer: vi.fn().mockImplementation(() => ({
    compose: mockCompose,
  })),
}));

vi.mock("@/simulation/workflowTracker", () => ({
  WorkflowTracker: vi.fn().mockImplementation(() => ({
    recordCommand: mockRecordCommand,
    getPhaseHistory: mockGetPhaseHistory,
    calculateScore: mockCalculateScore,
  })),
}));

vi.mock("@/simulation/consequenceEngine", () => ({
  ConsequenceEngine: vi.fn().mockImplementation(() => ({
    evaluate: mockEvaluate,
  })),
}));

vi.mock("@/simulation/faultPropagation", () => ({
  FaultPropagationEngine: vi.fn().mockImplementation(() => ({
    triggerFault: mockTriggerFault,
    getPending: mockGetPending,
    clear: mockClear,
  })),
}));

vi.mock("@/utils/scenarioLoader", () => ({
  applyFaultsToContext: (...args: unknown[]) =>
    mockApplyFaultsToContext(...args),
}));

vi.mock("@/store/learningProgressStore", () => ({
  useLearningProgressStore: Object.assign(
    vi.fn((selector?: (state: Record<string, unknown>) => unknown) => {
      const state = {
        recordIncidentResult: mockRecordIncidentResult,
      };
      return selector ? selector(state) : state;
    }),
    {
      getState: () => ({
        recordIncidentResult: mockRecordIncidentResult,
      }),
    },
  ),
}));

// ---------------------------------------------------------------------------
// Import the hook AFTER mocks are configured
// ---------------------------------------------------------------------------

import { useIncidentSession } from "../useIncidentSession";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useIncidentSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-configure default return values after clearAllMocks
    mockCompose.mockReturnValue(mockComposedIncident);
    mockContext.getNode.mockReturnValue({
      id: "dgx-03",
      slurmState: "idle",
      healthStatus: "Healthy",
      gpus: [
        {
          id: 0,
          migMode: false,
          migInstances: [],
          utilization: 10,
        },
      ],
    });
    mockContext.getEventLog.mockReturnValue(mockEventLog);
    mockContext.getCluster.mockReturnValue({
      name: "test-cluster",
      nodes: [
        {
          id: "dgx-03",
          slurmState: "idle",
          healthStatus: "Healthy",
          gpus: [
            {
              id: 0,
              migMode: false,
              migInstances: [],
              utilization: 10,
            },
          ],
        },
      ],
    });
    mockScenarioContextManager.createContext.mockReturnValue(mockContext);
    mockScenarioContextManager.deleteContext.mockReturnValue(true);
    mockGetPhaseHistory.mockReturnValue([]);
    mockEventLog.getAll.mockReturnValue([]);
    mockEventLog.append.mockImplementation(
      (input: Record<string, unknown>) => ({
        ...input,
        id: 0,
        timestamp: Date.now(),
      }),
    );
    mockEvaluate.mockReturnValue(null);
    mockRecordCommand.mockImplementation((cmd: string) => ({
      command: cmd,
      phase: "survey" as const,
      timestamp: Date.now(),
    }));
    mockCalculateScore.mockReturnValue({
      methodology: 15,
      efficiency: 12,
      accuracy: 20,
      noCollateral: 20,
      completeness: 10,
      total: 77,
    });
    mockGetPending.mockReturnValue([]);
  });

  // -------------------------------------------------------------------------
  // 1. Starts in "idle" state
  // -------------------------------------------------------------------------
  it("starts in idle state with no active data", () => {
    const { result } = renderHook(() => useIncidentSession());

    expect(result.current.incidentState).toBe("idle");
    expect(result.current.situation).toBe("");
    expect(result.current.reviewData).toBeNull();
    expect(result.current.workflowPhases).toEqual([]);
    expect(result.current.rootCauseOptions).toEqual([]);
    expect(result.current.diagnosticPath).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // 2. startIncident creates sandbox, composes incident, injects faults
  // -------------------------------------------------------------------------
  it("startIncident transitions to active, creates context and composes incident", () => {
    const { result } = renderHook(() => useIncidentSession());

    act(() => {
      result.current.startIncident("beginner", 1);
    });

    // State transitioned
    expect(result.current.incidentState).toBe("active");
    expect(result.current.situation).toBe(
      "A GPU has an uncorrectable ECC error.",
    );

    // Context was created
    expect(mockScenarioContextManager.createContext).toHaveBeenCalledWith(
      expect.stringContaining("incident-"),
    );
    expect(mockScenarioContextManager.setActiveContext).toHaveBeenCalledWith(
      expect.stringContaining("incident-"),
    );

    // Incident was composed
    expect(mockCompose).toHaveBeenCalledWith({
      difficulty: "beginner",
      domain: 1,
    });

    // Faults were applied to the context (primary + red herrings)
    expect(mockApplyFaultsToContext).toHaveBeenCalled();
    const applyCalls = mockApplyFaultsToContext.mock.calls;
    expect(applyCalls.length).toBeGreaterThanOrEqual(1);

    // Propagation engine was triggered
    expect(mockTriggerFault).toHaveBeenCalledWith({
      faultType: "xid-48",
      nodeId: "dgx-03",
      gpuId: 5,
    });

    // Root cause options are exposed
    expect(result.current.rootCauseOptions).toEqual(
      mockComposedIncident.rootCauseOptions,
    );
    expect(result.current.diagnosticPath).toEqual(
      mockComposedIncident.diagnosticPath,
    );
  });

  // -------------------------------------------------------------------------
  // 3. recordCommand forwards to WorkflowTracker and checks ConsequenceEngine
  // -------------------------------------------------------------------------
  it("recordCommand forwards to tracker and checks consequences", () => {
    const { result } = renderHook(() => useIncidentSession());

    act(() => {
      result.current.startIncident("beginner");
    });

    act(() => {
      result.current.recordCommand("nvidia-smi");
    });

    // WorkflowTracker was called
    expect(mockRecordCommand).toHaveBeenCalledWith("nvidia-smi");

    // ConsequenceEngine was called
    expect(mockEvaluate).toHaveBeenCalledWith(
      "nvidia-smi",
      expect.objectContaining({ id: "dgx-03" }),
    );
  });

  it("recordCommand increments collateral and logs event when consequence is found", () => {
    const { result } = renderHook(() => useIncidentSession());

    act(() => {
      result.current.startIncident("beginner");
    });

    // Configure consequence engine to return a result for the NEXT call
    mockEvaluate.mockReturnValueOnce({
      type: "mig-destroyed",
      description: "MIG instances destroyed",
      mutations: [],
    });

    act(() => {
      result.current.recordCommand("nvidia-smi -r");
    });

    // EventLog should have been appended with the consequence
    expect(mockEventLog.append).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "consequence",
        message: expect.stringContaining("MIG instances destroyed"),
      }),
    );
  });

  // -------------------------------------------------------------------------
  // 4. submitDiagnosis calculates score and transitions to "review"
  // -------------------------------------------------------------------------
  it("submitDiagnosis calculates score, records result, and transitions to review", () => {
    const { result } = renderHook(() => useIncidentSession());

    mockGetPhaseHistory.mockReturnValue([
      { command: "nvidia-smi", phase: "survey", timestamp: 1 },
    ]);
    mockEventLog.getAll.mockReturnValue([
      {
        id: 0,
        timestamp: 1,
        type: "xid-error",
        nodeId: "dgx-03",
        message: "XID 48",
        severity: "critical",
      },
    ]);

    act(() => {
      result.current.startIncident("beginner");
    });

    act(() => {
      result.current.submitDiagnosis("ECC memory error");
    });

    // State transitioned to review
    expect(result.current.incidentState).toBe("review");

    // Score was calculated
    expect(mockCalculateScore).toHaveBeenCalledWith({
      correctDiagnosis: true,
      collateralDamage: 0,
    });

    // Result was recorded in learningProgressStore
    expect(mockRecordIncidentResult).toHaveBeenCalledWith(
      "gpu-memory-xid48",
      77,
    );

    // Review data is populated
    expect(result.current.reviewData).not.toBeNull();
    expect(result.current.reviewData!.correctDiagnosis).toBe(true);
    expect(result.current.reviewData!.selectedRootCause).toBe(
      "ECC memory error",
    );
    expect(result.current.reviewData!.correctRootCause).toBe(
      "ECC memory error",
    );
    expect(result.current.reviewData!.score.total).toBe(77);

    // Context was cleaned up
    expect(mockScenarioContextManager.setActiveContext).toHaveBeenCalledWith(
      null,
    );
    expect(mockScenarioContextManager.deleteContext).toHaveBeenCalled();
  });

  it("submitDiagnosis marks incorrect diagnosis", () => {
    const { result } = renderHook(() => useIncidentSession());

    act(() => {
      result.current.startIncident("beginner");
    });

    act(() => {
      result.current.submitDiagnosis("Thermal shutdown");
    });

    expect(result.current.reviewData!.correctDiagnosis).toBe(false);
    expect(mockCalculateScore).toHaveBeenCalledWith({
      correctDiagnosis: false,
      collateralDamage: 0,
    });
  });

  // -------------------------------------------------------------------------
  // 5. abandonIncident cleans up and transitions to idle
  // -------------------------------------------------------------------------
  it("abandonIncident cleans up sandbox and transitions to idle", () => {
    const { result } = renderHook(() => useIncidentSession());

    act(() => {
      result.current.startIncident("beginner");
    });
    expect(result.current.incidentState).toBe("active");

    act(() => {
      result.current.abandonIncident();
    });

    expect(result.current.incidentState).toBe("idle");
    expect(result.current.situation).toBe("");
    expect(result.current.reviewData).toBeNull();

    // Context was cleaned up
    expect(mockScenarioContextManager.setActiveContext).toHaveBeenCalledWith(
      null,
    );
    expect(mockScenarioContextManager.deleteContext).toHaveBeenCalled();

    // No result was recorded
    expect(mockRecordIncidentResult).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 6. EventLog receives entries during session + consequence tracking
  // -------------------------------------------------------------------------
  it("EventLog entries are included in review data", () => {
    const { result } = renderHook(() => useIncidentSession());

    const mockEvents = [
      {
        id: 0,
        timestamp: Date.now(),
        type: "xid-error" as const,
        nodeId: "dgx-03",
        gpuId: 5,
        message: "XID 48 on GPU 5",
        severity: "critical" as const,
      },
      {
        id: 1,
        timestamp: Date.now(),
        type: "consequence" as const,
        nodeId: "dgx-03",
        message: "Jobs killed",
        severity: "warning" as const,
      },
    ];
    mockEventLog.getAll.mockReturnValue(mockEvents);

    act(() => {
      result.current.startIncident("beginner");
    });

    act(() => {
      result.current.submitDiagnosis("ECC memory error");
    });

    expect(result.current.reviewData!.events).toEqual(mockEvents);
  });

  it("collateral damage from consequences is tracked for scoring", () => {
    const { result } = renderHook(() => useIncidentSession());

    act(() => {
      result.current.startIncident("beginner");
    });

    // Two consequence-producing commands
    mockEvaluate.mockReturnValueOnce({
      type: "jobs-killed",
      description: "Running jobs killed",
      mutations: [],
    });

    act(() => {
      result.current.recordCommand("ipmitool power cycle");
    });

    mockEvaluate.mockReturnValueOnce({
      type: "mig-destroyed",
      description: "MIG instances destroyed",
      mutations: [],
    });

    act(() => {
      result.current.recordCommand("nvidia-smi -r");
    });

    act(() => {
      result.current.submitDiagnosis("ECC memory error");
    });

    // collateralDamage should be 2
    expect(mockCalculateScore).toHaveBeenCalledWith({
      correctDiagnosis: true,
      collateralDamage: 2,
    });
  });

  // -------------------------------------------------------------------------
  // Additional: requestHint tracks via ref for scoring
  // -------------------------------------------------------------------------
  it("requestHint tracks hints for penalty scoring", () => {
    const { result } = renderHook(() => useIncidentSession());

    act(() => {
      result.current.startIncident("beginner");
    });

    // requestHint should not throw and should be callable multiple times
    act(() => {
      result.current.requestHint();
      result.current.requestHint();
    });

    // Verify hint penalty is applied in score (tested more fully in hint penalty test)
    expect(typeof result.current.requestHint).toBe("function");
  });

  // -------------------------------------------------------------------------
  // workflowPhases updates after recordCommand (re-render fix)
  // -------------------------------------------------------------------------
  it("workflowPhases updates after recordCommand", () => {
    const { result } = renderHook(() => useIncidentSession());

    act(() => {
      result.current.startIncident("beginner");
    });

    // Before any commands, workflowPhases is empty
    expect(result.current.workflowPhases).toEqual([]);

    // Configure getPhaseHistory to return data on subsequent reads
    const phaseEntry = {
      command: "nvidia-smi",
      phase: "survey" as const,
      timestamp: Date.now(),
    };
    mockGetPhaseHistory.mockReturnValue([phaseEntry]);

    act(() => {
      result.current.recordCommand("nvidia-smi");
    });

    // After recordCommand, workflowPhases should reflect the new data
    expect(result.current.workflowPhases).toEqual([phaseEntry]);
    expect(result.current.commandCount).toBe(1);
  });

  // -------------------------------------------------------------------------
  // Edge: recordCommand/submitDiagnosis are no-ops when idle
  // -------------------------------------------------------------------------
  it("recordCommand is a no-op when not active", () => {
    const { result } = renderHook(() => useIncidentSession());

    act(() => {
      result.current.recordCommand("nvidia-smi");
    });

    expect(mockRecordCommand).not.toHaveBeenCalled();
  });

  it("submitDiagnosis is a no-op when not active", () => {
    const { result } = renderHook(() => useIncidentSession());

    act(() => {
      result.current.submitDiagnosis("ECC memory error");
    });

    expect(result.current.incidentState).toBe("idle");
    expect(result.current.reviewData).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Hint penalty reduces total score
  // -------------------------------------------------------------------------
  it("hint penalty reduces total score by 5 per hint", () => {
    const { result } = renderHook(() => useIncidentSession());

    act(() => {
      result.current.startIncident("beginner");
    });

    // Use 2 hints
    act(() => {
      result.current.requestHint();
    });
    act(() => {
      result.current.requestHint();
    });

    act(() => {
      result.current.submitDiagnosis("ECC memory error");
    });

    // Raw score was 77, with 2 hints => 77 - 10 = 67
    expect(result.current.reviewData!.score.total).toBe(67);
  });

  // -------------------------------------------------------------------------
  // Review data includes difficulty and domain for restart
  // -------------------------------------------------------------------------
  it("review data includes difficulty and domain for restart", () => {
    const { result } = renderHook(() => useIncidentSession());

    act(() => {
      result.current.startIncident("intermediate", 3);
    });

    act(() => {
      result.current.submitDiagnosis("ECC memory error");
    });

    expect(result.current.reviewData!.difficulty).toBe("intermediate");
    expect(result.current.reviewData!.domain).toBe(3);
  });
});
