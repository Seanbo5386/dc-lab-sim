export const HEALTHY_CLUSTER = {
  nodes: [
    { id: 'dgx-00', hostname: 'dgx-00', status: 'healthy' },
    { id: 'dgx-01', hostname: 'dgx-01', status: 'healthy' },
    { id: 'dgx-02', hostname: 'dgx-02', status: 'healthy' },
  ],
};

export const DEGRADED_CLUSTER = {
  nodes: [
    { id: 'dgx-00', hostname: 'dgx-00', status: 'healthy' },
    { id: 'dgx-01', hostname: 'dgx-01', status: 'degraded' },
    { id: 'dgx-02', hostname: 'dgx-02', status: 'healthy' },
  ],
};

export const MULTI_NODE_CLUSTER = {
  nodes: Array.from({ length: 8 }, (_, i) => ({
    id: `dgx-${String(i).padStart(2, '0')}`,
    hostname: `dgx-${String(i).padStart(2, '0')}`,
    status: i % 3 === 0 ? 'degraded' : 'healthy',
  })),
};
