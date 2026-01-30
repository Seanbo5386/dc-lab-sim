// Benchmark types and interfaces

/**
 * Burn-in test progress tracking
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
