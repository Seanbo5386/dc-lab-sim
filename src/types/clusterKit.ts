export interface ClusterKitCheckResult {
  status: 'pass' | 'warning' | 'fail';
  message: string;
  details?: string[];
}

export interface ClusterKitAssessment {
  nodeId: string;
  hostname: string;
  timestamp: Date;
  overallHealth: 'pass' | 'warning' | 'fail';
  checks: {
    gpu: ClusterKitCheckResult;
    network: ClusterKitCheckResult;
    storage: ClusterKitCheckResult;
    firmware: ClusterKitCheckResult;
    drivers: ClusterKitCheckResult;
  };
}
