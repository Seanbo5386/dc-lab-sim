// src/hooks/useCloudSync.ts
import { useEffect, useRef, useCallback, useState } from "react";
import { Hub } from "aws-amplify/utils";
import { useSimulationStore } from "@/store/simulationStore";
import { useLearningProgressStore } from "@/store/learningProgressStore";
import { useLearningStore } from "@/store/learningStore";
import {
  fetchCloudProgress,
  saveCloudProgress,
  mergeLocalAndCloud,
  isAuthenticated,
} from "@/utils/cloudSync";
import { useSyncToastStore } from "@/store/syncToastStore";

export type SyncStatus = "idle" | "syncing" | "synced" | "error" | "offline";

const MAX_RETRIES = 3;
const RETRY_DELAYS = [2000, 4000, 8000]; // exponential backoff

export function useCloudSync() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCount = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Gather partialized state from all 3 stores
  const getLocalState = useCallback(() => {
    const simState = useSimulationStore.getState();
    const lpState = useLearningProgressStore.getState();
    const lState = useLearningStore.getState();

    return {
      simulationData: {
        cluster: simState.cluster,
        systemType: simState.systemType,
        simulationSpeed: simState.simulationSpeed,
        scenarioProgress: simState.scenarioProgress,
        completedScenarios: simState.completedScenarios,
      },
      learningProgress: {
        toolsUsed: lpState.toolsUsed,
        familyQuizScores: lpState.familyQuizScores,
        masteryQuizScores: lpState.masteryQuizScores,
        unlockedTiers: lpState.unlockedTiers,
        tierProgress: lpState.tierProgress,
        explanationGateResults: lpState.explanationGateResults,
        reviewSchedule: lpState.reviewSchedule,
      },
      learningData: {
        commandProficiency: lState.commandProficiency,
        domainProgress: lState.domainProgress,
        sessionHistory: lState.sessionHistory,
        totalStudyTimeSeconds: lState.totalStudyTimeSeconds,
        totalSessions: lState.totalSessions,
        currentStreak: lState.currentStreak,
        longestStreak: lState.longestStreak,
        lastStudyDate: lState.lastStudyDate,
        examAttempts: lState.examAttempts,
        gauntletAttempts: lState.gauntletAttempts,
        achievements: lState.achievements,
      },
    };
  }, []);

  // Push current local state to cloud with retry logic
  const syncToCloud = useCallback(async () => {
    if (!isLoggedIn) return;
    if (!navigator.onLine) {
      setSyncStatus("offline");
      useSyncToastStore
        .getState()
        .show(
          "You're offline. Progress will sync when reconnected.",
          "offline",
        );
      return;
    }

    setSyncStatus("syncing");
    try {
      const local = getLocalState();
      await saveCloudProgress(
        local.simulationData,
        local.learningProgress,
        local.learningData,
      );
      setSyncStatus("synced");
      retryCount.current = 0;
    } catch {
      if (retryCount.current < MAX_RETRIES) {
        const delay = RETRY_DELAYS[retryCount.current];
        retryCount.current++;
        setSyncStatus("syncing");
        useSyncToastStore
          .getState()
          .show(
            `Sync failed. Retrying in ${delay / 1000}s... (${retryCount.current}/${MAX_RETRIES})`,
            "retrying",
          );
        retryTimer.current = setTimeout(() => {
          syncToCloud();
        }, delay);
      } else {
        setSyncStatus("error");
        retryCount.current = 0;
        useSyncToastStore
          .getState()
          .show("Progress sync failed. Your data is saved locally.", "error");
      }
    }
  }, [isLoggedIn, getLocalState]);

  // Manual retry exposed for the toast "Retry now" button
  const manualRetry = useCallback(() => {
    retryCount.current = 0;
    syncToCloud();
  }, [syncToCloud]);

  // Debounced sync — called on store changes
  const debouncedSync = useCallback(() => {
    if (!isLoggedIn) return;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(syncToCloud, 5000);
  }, [isLoggedIn, syncToCloud]);

  // Pull cloud data + merge on login
  const pullAndMerge = useCallback(async () => {
    setSyncStatus("syncing");
    try {
      const cloud = await fetchCloudProgress();
      if (!cloud) {
        // No cloud data — push local state up
        await syncToCloud();
        return;
      }

      const local = getLocalState();
      const merged = mergeLocalAndCloud(
        local.simulationData,
        local.learningProgress,
        local.learningData,
        cloud,
      );

      // Apply merged state to all stores
      const mergedSim = merged.simulationData as Record<string, unknown>;
      if (mergedSim.cluster) {
        useSimulationStore
          .getState()
          .importCluster(JSON.stringify(mergedSim.cluster));
      }
      useLearningProgressStore.setState(
        merged.learningProgress as Record<string, unknown>,
      );
      useLearningStore.setState(merged.learningData as Record<string, unknown>);

      // Push merged state back to cloud
      await saveCloudProgress(
        merged.simulationData,
        merged.learningProgress,
        merged.learningData,
      );
      setSyncStatus("synced");
    } catch {
      setSyncStatus("error");
      useSyncToastStore
        .getState()
        .show("Progress sync failed. Your data is saved locally.", "error");
    }
  }, [getLocalState, syncToCloud]);

  // Check auth on mount
  useEffect(() => {
    isAuthenticated().then(setIsLoggedIn);
  }, []);

  // Listen for auth events
  useEffect(() => {
    const unsubscribe = Hub.listen("auth", ({ payload }) => {
      switch (payload.event) {
        case "signedIn":
          setIsLoggedIn(true);
          pullAndMerge();
          break;
        case "signedOut":
          setIsLoggedIn(false);
          setSyncStatus("idle");
          break;
      }
    });
    return unsubscribe;
  }, [pullAndMerge]);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      useSyncToastStore.getState().dismiss();
      if (isLoggedIn) {
        setSyncStatus("idle");
        syncToCloud();
      }
    };

    const handleOffline = () => {
      setSyncStatus("offline");
      if (isLoggedIn) {
        useSyncToastStore
          .getState()
          .show(
            "You're offline. Progress will sync when reconnected.",
            "offline",
          );
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [isLoggedIn, syncToCloud]);

  // Subscribe to store changes for debounced sync
  useEffect(() => {
    if (!isLoggedIn) return;

    const unsub1 = useSimulationStore.subscribe(debouncedSync);
    const unsub2 = useLearningProgressStore.subscribe(debouncedSync);
    const unsub3 = useLearningStore.subscribe(debouncedSync);

    // Initial pull on mount if logged in
    pullAndMerge();

    return () => {
      unsub1();
      unsub2();
      unsub3();
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, [isLoggedIn, debouncedSync, pullAndMerge]);

  return { syncStatus, isLoggedIn, manualRetry };
}
