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

export type SyncStatus = "idle" | "syncing" | "synced" | "error" | "offline";

export function useCloudSync() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Push current local state to cloud
  const syncToCloud = useCallback(async () => {
    if (!isLoggedIn) return;
    setSyncStatus("syncing");
    try {
      const local = getLocalState();
      await saveCloudProgress(
        local.simulationData,
        local.learningProgress,
        local.learningData,
      );
      setSyncStatus("synced");
    } catch {
      setSyncStatus("error");
    }
  }, [isLoggedIn, getLocalState]);

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
    };
  }, [isLoggedIn, debouncedSync, pullAndMerge]);

  return { syncStatus, isLoggedIn };
}
