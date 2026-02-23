import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetCurrentUser = vi.fn();
const mockFetchAuthSession = vi.fn();
const mockGet = vi.fn();
const mockUpdate = vi.fn();
const mockCreate = vi.fn();

vi.mock("aws-amplify/auth", () => ({
  getCurrentUser: () => mockGetCurrentUser(),
  fetchAuthSession: () => mockFetchAuthSession(),
}));

vi.mock("aws-amplify/data", () => ({
  generateClient: () => ({
    models: {
      UserProgress: {
        get: (args: unknown) => mockGet(args),
        update: (args: unknown) => mockUpdate(args),
        create: (args: unknown) => mockCreate(args),
      },
    },
  }),
}));

import {
  isAuthenticated,
  fetchCloudProgress,
  saveCloudProgress,
} from "../cloudSync";

describe("cloudSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("isAuthenticated", () => {
    it("returns true when getCurrentUser resolves", async () => {
      mockGetCurrentUser.mockResolvedValue({ userId: "abc" });
      expect(await isAuthenticated()).toBe(true);
    });

    it("returns false when getCurrentUser throws", async () => {
      mockGetCurrentUser.mockRejectedValue(new Error("Not signed in"));
      expect(await isAuthenticated()).toBe(false);
    });
  });

  describe("fetchCloudProgress", () => {
    it("returns null when no userId in session", async () => {
      mockFetchAuthSession.mockResolvedValue({ tokens: {} });
      expect(await fetchCloudProgress()).toBeNull();
    });

    it("returns null when no record exists", async () => {
      mockFetchAuthSession.mockResolvedValue({
        tokens: { idToken: { payload: { sub: "user-123" } } },
      });
      mockGet.mockResolvedValue({ data: null });
      expect(await fetchCloudProgress()).toBeNull();
    });

    it("returns parsed data when record exists", async () => {
      mockFetchAuthSession.mockResolvedValue({
        tokens: { idToken: { payload: { sub: "user-123" } } },
      });
      mockGet.mockResolvedValue({
        data: {
          simulationData: JSON.stringify({ cluster: {} }),
          learningProgress: JSON.stringify({ toolsUsed: {} }),
          learningData: JSON.stringify({ totalSessions: 5 }),
          lastSyncedAt: "2026-01-01T00:00:00Z",
        },
      });
      const result = await fetchCloudProgress();
      expect(result).toEqual({
        simulationData: { cluster: {} },
        learningProgress: { toolsUsed: {} },
        learningData: { totalSessions: 5 },
        lastSyncedAt: "2026-01-01T00:00:00Z",
      });
    });

    it("returns null on fetch error without throwing", async () => {
      mockFetchAuthSession.mockRejectedValue(new Error("Network"));
      expect(await fetchCloudProgress()).toBeNull();
    });
  });

  describe("saveCloudProgress", () => {
    it("updates existing record", async () => {
      mockFetchAuthSession.mockResolvedValue({
        tokens: { idToken: { payload: { sub: "user-123" } } },
      });
      mockGet.mockResolvedValue({ data: { id: "user-123" } });
      mockUpdate.mockResolvedValue({});

      await saveCloudProgress({ a: 1 }, { b: 2 }, { c: 3 });
      expect(mockUpdate).toHaveBeenCalled();
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it("creates new record when none exists", async () => {
      mockFetchAuthSession.mockResolvedValue({
        tokens: { idToken: { payload: { sub: "user-123" } } },
      });
      mockGet.mockResolvedValue({ data: null });
      mockCreate.mockResolvedValue({});

      await saveCloudProgress({ a: 1 }, { b: 2 }, { c: 3 });
      expect(mockCreate).toHaveBeenCalled();
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("re-throws on save error so callers can set error status", async () => {
      mockFetchAuthSession.mockRejectedValue(new Error("Network"));
      await expect(saveCloudProgress({}, {}, {})).rejects.toThrow("Network");
    });
  });
});
