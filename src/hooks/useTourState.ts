/**
 * useTourState - localStorage hook for tracking tour completion per tab.
 *
 * Each tab (simulator, labs, docs) has an independent "seen" flag stored
 * in localStorage. The hook returns whether the tour should show and
 * callbacks to mark it seen or reset it.
 */

import { useState, useCallback } from "react";
import type { TourId } from "../data/tourSteps";

const TOUR_KEYS: Record<TourId, string> = {
  simulator: "ncp-aii-tour-simulator-seen",
  labs: "ncp-aii-tour-labs-seen",
  docs: "ncp-aii-tour-docs-seen",
  exams: "ncp-aii-tour-exams-seen",
  about: "ncp-aii-tour-about-seen",
};

export interface UseTourStateReturn {
  /** true if the user has NOT seen this tour yet */
  shouldShow: boolean;
  /** Mark the tour as seen (persists to localStorage) */
  markSeen: () => void;
  /** Reset the tour so it shows again on next visit */
  reset: () => void;
}

/**
 * Hook for managing tour visibility state per tab.
 *
 * @param tourId - Which tour to manage ('simulator' | 'labs' | 'docs')
 * @returns Object with shouldShow boolean and markSeen/reset callbacks
 *
 * @example
 * const { shouldShow, markSeen, reset } = useTourState('simulator');
 * if (shouldShow) startTour();
 * // On complete: markSeen();
 * // On "?" button click: reset();
 */
export function useTourState(tourId: TourId): UseTourStateReturn {
  const key = TOUR_KEYS[tourId];

  const [shouldShow, setShouldShow] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(key) !== "true";
    } catch {
      return false;
    }
  });

  const markSeen = useCallback(() => {
    try {
      localStorage.setItem(key, "true");
    } catch {
      // localStorage not available
    }
    setShouldShow(false);
  }, [key]);

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(key);
    } catch {
      // localStorage not available
    }
    setShouldShow(true);
  }, [key]);

  return { shouldShow, markSeen, reset };
}

export default useTourState;
