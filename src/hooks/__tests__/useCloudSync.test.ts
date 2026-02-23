import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

const mockIsAuthenticated = vi.fn();
const mockFetchCloudProgress = vi.fn();
const mockSaveCloudProgress = vi.fn();
const mockMergeLocalAndCloud = vi.fn();

vi.mock("@/utils/cloudSync", () => ({
  isAuthenticated: () => mockIsAuthenticated(),
  fetchCloudProgress: () => mockFetchCloudProgress(),
  saveCloudProgress: (...args: unknown[]) => mockSaveCloudProgress(...args),
  mergeLocalAndCloud: (...args: unknown[]) => mockMergeLocalAndCloud(...args),
}));

const hubListeners: Record<string, (data: unknown) => void> = {};
vi.mock("aws-amplify/utils", () => ({
  Hub: {
    listen: (channel: string, callback: (data: unknown) => void) => {
      hubListeners[channel] = callback;
      return () => {
        delete hubListeners[channel];
      };
    },
  },
}));

const mockSimStore = {
  cluster: {},
  systemType: "DGX-A100",
  simulationSpeed: 1,
  scenarioProgress: {},
  completedScenarios: [],
  importCluster: vi.fn(),
};
const mockLpStore = {
  toolsUsed: {},
  familyQuizScores: {},
  masteryQuizScores: {},
  unlockedTiers: {},
  tierProgress: {},
  explanationGateResults: {},
  reviewSchedule: {},
};
const mockLStore = {
  commandProficiency: {},
  domainProgress: {},
  sessionHistory: [],
  totalStudyTimeSeconds: 0,
  totalSessions: 0,
  currentStreak: 0,
  longestStreak: 0,
  lastStudyDate: null,
  examAttempts: [],
  gauntletAttempts: [],
  achievements: [],
};

vi.mock("@/store/simulationStore", () => ({
  useSimulationStore: Object.assign(
    vi.fn(() => mockSimStore),
    { getState: () => mockSimStore, subscribe: vi.fn(() => vi.fn()) },
  ),
}));

vi.mock("@/store/learningProgressStore", () => ({
  useLearningProgressStore: Object.assign(
    vi.fn(() => mockLpStore),
    { getState: () => mockLpStore, subscribe: vi.fn(() => vi.fn()) },
  ),
}));

vi.mock("@/store/learningStore", () => ({
  useLearningStore: Object.assign(
    vi.fn(() => mockLStore),
    { getState: () => mockLStore, subscribe: vi.fn(() => vi.fn()) },
  ),
}));

import { useCloudSync } from "../useCloudSync";

describe("useCloudSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAuthenticated.mockResolvedValue(false);
    mockFetchCloudProgress.mockResolvedValue(null);
    mockSaveCloudProgress.mockResolvedValue(undefined);
  });

  it("starts with idle sync status and not logged in", () => {
    const { result } = renderHook(() => useCloudSync());
    expect(result.current.syncStatus).toBe("idle");
    expect(result.current.isLoggedIn).toBe(false);
  });

  it("checks authentication on mount", async () => {
    mockIsAuthenticated.mockResolvedValue(true);
    renderHook(() => useCloudSync());
    await waitFor(() => {
      expect(mockIsAuthenticated).toHaveBeenCalled();
    });
  });

  it("updates isLoggedIn on signedIn hub event", async () => {
    const { result } = renderHook(() => useCloudSync());
    // Wait for the mount effect (isAuthenticated check) to settle
    await waitFor(() => {
      expect(mockIsAuthenticated).toHaveBeenCalled();
    });
    await act(async () => {
      hubListeners["auth"]?.({ payload: { event: "signedIn" } });
    });
    await waitFor(() => {
      expect(result.current.isLoggedIn).toBe(true);
    });
  });

  it("resets to idle on signedOut hub event", async () => {
    mockIsAuthenticated.mockResolvedValue(true);
    const { result } = renderHook(() => useCloudSync());
    await act(async () => {
      hubListeners["auth"]?.({ payload: { event: "signedIn" } });
    });
    await act(async () => {
      hubListeners["auth"]?.({ payload: { event: "signedOut" } });
    });
    expect(result.current.isLoggedIn).toBe(false);
    expect(result.current.syncStatus).toBe("idle");
  });
});
