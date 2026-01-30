// Benchmark types and interfaces

/**
 * Burn-in test progress tracking
 *
 * @remarks
 * This interface is currently unused but reserved for future enhancements
 * that will add real-time progress tracking for burn-in tests.
 *
 * Planned usage: Track progress state when burn-in tests run in background
 * or provide streaming updates to UI components.
 */
export interface BurnInProgress {
  testName: string;
  iterations: number;
  currentIteration: number;
  startTime: Date;
  lastUpdate: Date;
  status: 'running' | 'completed' | 'failed';
  failures: string[];
}
