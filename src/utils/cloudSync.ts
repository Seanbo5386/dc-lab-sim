// src/utils/cloudSync.ts
import { generateClient } from "aws-amplify/data";
import { fetchAuthSession, getCurrentUser } from "aws-amplify/auth";
import type { Schema } from "../../amplify/data/resource";
import {
  mergeSimulationData,
  mergeLearningProgress,
  mergeLearningData,
} from "./mergeProgress";

const client = generateClient<Schema>();

export interface CloudProgressData {
  simulationData: unknown;
  learningProgress: unknown;
  learningData: unknown;
  lastSyncedAt: string;
}

/**
 * Returns true if a user is currently authenticated.
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    await getCurrentUser();
    return true;
  } catch {
    return false;
  }
}

/**
 * Fetch progress from DynamoDB for the current user.
 * Returns null if no record exists.
 */
export async function fetchCloudProgress(): Promise<CloudProgressData | null> {
  try {
    const session = await fetchAuthSession();
    const userId = session.tokens?.idToken?.payload?.sub;
    if (!userId) return null;

    const { data } = await client.models.UserProgress.get({
      id: userId as string,
    });
    if (!data) return null;

    return {
      simulationData: data.simulationData
        ? JSON.parse(data.simulationData as string)
        : null,
      learningProgress: data.learningProgress
        ? JSON.parse(data.learningProgress as string)
        : null,
      learningData: data.learningData
        ? JSON.parse(data.learningData as string)
        : null,
      lastSyncedAt: data.lastSyncedAt || "",
    };
  } catch (err) {
    console.error("[CloudSync] Failed to fetch progress:", err);
    return null;
  }
}

/**
 * Write current progress to DynamoDB (create or update).
 */
export async function saveCloudProgress(
  simulationData: unknown,
  learningProgress: unknown,
  learningData: unknown,
): Promise<void> {
  try {
    const session = await fetchAuthSession();
    const userId = session.tokens?.idToken?.payload?.sub;
    if (!userId) return;

    const now = new Date().toISOString();
    const payload = {
      id: userId as string,
      simulationData: JSON.stringify(simulationData),
      learningProgress: JSON.stringify(learningProgress),
      learningData: JSON.stringify(learningData),
      lastSyncedAt: now,
    };

    // Try update first, create if it doesn't exist
    const { data: existing } = await client.models.UserProgress.get({
      id: userId as string,
    });
    if (existing) {
      await client.models.UserProgress.update(payload);
    } else {
      await client.models.UserProgress.create(payload);
    }
  } catch (err) {
    console.error("[CloudSync] Failed to save progress:", err);
  }
}

/**
 * Merge local + cloud data, returning the merged result for each store.
 */
export function mergeLocalAndCloud(
  localSim: unknown,
  localLearningProg: unknown,
  localLearning: unknown,
  cloud: CloudProgressData,
): {
  simulationData: unknown;
  learningProgress: unknown;
  learningData: unknown;
} {
  return {
    simulationData: cloud.simulationData
      ? mergeSimulationData(localSim, cloud.simulationData)
      : localSim,
    learningProgress: cloud.learningProgress
      ? mergeLearningProgress(localLearningProg, cloud.learningProgress)
      : localLearningProg,
    learningData: cloud.learningData
      ? mergeLearningData(localLearning, cloud.learningData)
      : localLearning,
  };
}
