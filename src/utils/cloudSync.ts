// src/utils/cloudSync.ts
import { generateClient } from "aws-amplify/data";
import { fetchAuthSession, getCurrentUser } from "aws-amplify/auth";
import {
  mergeSimulationData,
  mergeLearningProgress,
  mergeLearningData,
} from "./mergeProgress";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const client = generateClient<any>();

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

    const result = await client.models.UserProgress.get({
      id: userId as string,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record = (result as any)?.data;
    if (!record) return null;

    return {
      simulationData: record.simulationData
        ? JSON.parse(record.simulationData as string)
        : null,
      learningProgress: record.learningProgress
        ? JSON.parse(record.learningProgress as string)
        : null,
      learningData: record.learningData
        ? JSON.parse(record.learningData as string)
        : null,
      lastSyncedAt: record.lastSyncedAt || "",
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
    const existResult = await client.models.UserProgress.get({
      id: userId as string,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing = (existResult as any)?.data;
    if (existing) {
      await client.models.UserProgress.update(payload);
    } else {
      await client.models.UserProgress.create(payload);
    }
  } catch (err) {
    console.error("[CloudSync] Failed to save progress:", err);
    throw err;
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
