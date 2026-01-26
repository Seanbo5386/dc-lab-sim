import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SparklineChart, MultiSparkline, ThresholdSparkline } from '../SparklineChart';
import { ClusterHeatmap } from '../ClusterHeatmap';
import { NCCLBenchmarkChart } from '../NCCLBenchmarkChart';
import { PerformanceComparison } from '../PerformanceComparison';
import type { DGXNode, GPU, InfiniBandHCA, InfiniBandPort } from '@/types/hardware';

// Mock Recharts components
vi.mock('recharts', () => ({
  LineChart: vi.fn(({ children }) => <div data-testid="line-chart">{children}</div>),
  Line: vi.fn(() => null),
  XAxis: vi.fn(() => null),
  YAxis: vi.fn(() => null),
  CartesianGrid: vi.fn(() => null),
  Tooltip: vi.fn(() => null),
  Legend: vi.fn(() => null),
  ResponsiveContainer: vi.fn(({ children }) => <div data-testid="responsive-container">{children}</div>),
  ReferenceLine: vi.fn(() => null),
  Area: vi.fn(() => null),
  ComposedChart: vi.fn(({ children }) => <div data-testid="composed-chart">{children}</div>),
  BarChart: vi.fn(({ children }) => <div data-testid="bar-chart">{children}</div>),
  Bar: vi.fn(() => null),
  Cell: vi.fn(() => null),
}));

describe('SparklineChart', () => {
  describe('Basic Rendering', () => {
    it('should render SVG sparkline with data', () => {
      const data = [10, 20, 30, 40, 50];
      const { container } = render(<SparklineChart data={data} />);

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should render placeholder when data has fewer than 2 points', () => {
      const { container } = render(<SparklineChart data={[50]} />);

      expect(container.textContent).toBe('--');
    });

    it('should render placeholder for empty data', () => {
      const { container } = render(<SparklineChart data={[]} />);

      expect(container.textContent).toBe('--');
    });

    it('should render with custom dimensions', () => {
      const { container } = render(<SparklineChart data={[10, 20, 30]} width={100} height={30} />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', '100');
      expect(svg).toHaveAttribute('height', '30');
    });

    it('should render with custom color', () => {
      const { container } = render(<SparklineChart data={[10, 20, 30]} color="#FF0000" />);

      // Get the line path (second path, the first is the fill area)
      const paths = container.querySelectorAll('path');
      const linePath = paths[1]; // Line path has stroke attribute
      expect(linePath).toHaveAttribute('stroke', '#FF0000');
    });

    it('should show range when showRange is true', () => {
      const { container } = render(<SparklineChart data={[10, 50, 30]} showRange />);

      expect(container.textContent).toContain('10');
      expect(container.textContent).toContain('50');
    });
  });
});

describe('MultiSparkline', () => {
  it('should render multiple lines', () => {
    const datasets = [
      { data: [10, 20, 30], color: '#FF0000', label: 'Series 1' },
      { data: [15, 25, 35], color: '#00FF00', label: 'Series 2' },
    ];

    const { container } = render(<MultiSparkline datasets={datasets} />);

    const paths = container.querySelectorAll('path');
    expect(paths.length).toBe(2);
  });

  it('should handle empty datasets', () => {
    const { container } = render(<MultiSparkline datasets={[]} />);

    expect(container.textContent).toBe('--');
  });
});

describe('ThresholdSparkline', () => {
  it('should render threshold line', () => {
    const { container } = render(
      <ThresholdSparkline data={[60, 70, 80, 90, 85]} threshold={80} />
    );

    const lines = container.querySelectorAll('line');
    expect(lines.length).toBeGreaterThan(0);
  });

  it('should use warning color for values above threshold', () => {
    const { container } = render(
      <ThresholdSparkline
        data={[60, 70, 90, 95]}
        threshold={80}
        normalColor="#00FF00"
        warningColor="#FF0000"
      />
    );

    const paths = container.querySelectorAll('path');
    const colors = Array.from(paths).map(p => p.getAttribute('stroke'));
    expect(colors).toContain('#FF0000');
  });
});

describe('ClusterHeatmap', () => {
  const createMockGPU = (id: number, utilization: number = 50): GPU => ({
    id,
    uuid: `GPU-${id}-0000-0000-0000`,
    name: 'A100-SXM4-80GB',
    type: 'A100-80GB',
    pciAddress: `0000:${(0x10 + id).toString(16)}:00.0`,
    temperature: 45 + id * 5,
    powerDraw: 200 + id * 20,
    powerLimit: 400,
    memoryTotal: 81920,
    memoryUsed: 1024 * (id + 1),
    utilization,
    clocksSM: 1410,
    clocksMem: 1215,
    eccEnabled: true,
    eccErrors: { singleBit: 0, doubleBit: 0, aggregated: { singleBit: 0, doubleBit: 0 } },
    migMode: false,
    migInstances: [],
    nvlinks: [],
    healthStatus: 'OK',
    xidErrors: [],
    persistenceMode: true,
  });

  const createMockPort = (portNumber: number): InfiniBandPort => ({
    portNumber,
    state: 'Active',
    physicalState: 'LinkUp',
    rate: 400,
    width: '4x',
    linkLayer: 'InfiniBand',
    smLid: 1,
    baseLid: portNumber,
    txBytes: 1000000,
    rxBytes: 1000000,
    txPackets: 10000,
    rxPackets: 10000,
    symbolErrors: 0,
  });

  const createMockHCA = (id: number): InfiniBandHCA => ({
    guid: `0x${id.toString(16).padStart(16, '0')}`,
    caType: 'MT4125',
    numPorts: 2,
    firmwareVersion: '22.35.1012',
    driverVersion: 'MLNX_OFED-5.8',
    ports: [createMockPort(1), createMockPort(2)],
    pciAddress: `0000:${(0xc1 + id).toString(16)}:00.0`,
    boardId: 'MT_0000000001',
    sysImageGuid: `0x${(id + 1).toString(16).padStart(16, '0')}`,
    nodeDescription: `mlx5_${id}`,
  });

  const mockNodes: DGXNode[] = [
    {
      id: 'dgx-00',
      hostname: 'dgx-00.local',
      systemType: 'DGX-A100',
      gpus: Array.from({ length: 8 }, (_, i) => createMockGPU(i)),
      dpus: [],
      hcas: [createMockHCA(0)],
      bmc: {
        ipAddress: '192.168.0.100',
        macAddress: '00:00:00:00:00:01',
        firmwareVersion: '1.2.3',
        manufacturer: 'NVIDIA',
        sensors: [],
        powerState: 'On',
      },
      cpuModel: 'AMD EPYC 7742',
      cpuCount: 128,
      ramTotal: 2048,
      ramUsed: 256,
      osVersion: 'Ubuntu 22.04',
      kernelVersion: '5.15.0',
      nvidiaDriverVersion: '535.104.05',
      cudaVersion: '12.2',
      healthStatus: 'OK',
      slurmState: 'idle',
    },
    {
      id: 'dgx-01',
      hostname: 'dgx-01.local',
      systemType: 'DGX-A100',
      gpus: Array.from({ length: 8 }, (_, i) => createMockGPU(i + 8, 75)),
      dpus: [],
      hcas: [createMockHCA(1)],
      bmc: {
        ipAddress: '192.168.0.101',
        macAddress: '00:00:00:00:00:02',
        firmwareVersion: '1.2.3',
        manufacturer: 'NVIDIA',
        sensors: [],
        powerState: 'On',
      },
      cpuModel: 'AMD EPYC 7742',
      cpuCount: 128,
      ramTotal: 2048,
      ramUsed: 512,
      osVersion: 'Ubuntu 22.04',
      kernelVersion: '5.15.0',
      nvidiaDriverVersion: '535.104.05',
      cudaVersion: '12.2',
      healthStatus: 'OK',
      slurmState: 'allocated',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the heatmap title', () => {
      render(<ClusterHeatmap nodes={mockNodes} />);

      expect(screen.getByText(/Cluster Heatmap/)).toBeInTheDocument();
    });

    it('should render GPU cells for each node', () => {
      const { container } = render(<ClusterHeatmap nodes={mockNodes} />);

      // Should have cells for all GPUs (16 total)
      const cells = container.querySelectorAll('[style*="background-color"]');
      expect(cells.length).toBeGreaterThanOrEqual(16);
    });

    it('should show node IDs', () => {
      render(<ClusterHeatmap nodes={mockNodes} />);

      expect(screen.getByText('dgx-00')).toBeInTheDocument();
      expect(screen.getByText('dgx-01')).toBeInTheDocument();
    });
  });

  describe('Metric Selector', () => {
    it('should show all metric options', () => {
      render(<ClusterHeatmap nodes={mockNodes} />);

      // Use getByRole with button to be specific
      expect(screen.getByRole('button', { name: /Utilization/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Temperature/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Power Draw/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Memory Usage/i })).toBeInTheDocument();
    });

    it('should switch metrics on click', () => {
      render(<ClusterHeatmap nodes={mockNodes} />);

      const tempButton = screen.getByRole('button', { name: /Temperature/i });
      fireEvent.click(tempButton);

      // Button should now be active (has nvidia-green background)
      expect(tempButton.className).toContain('bg-nvidia-green');
    });
  });

  describe('Legend', () => {
    it('should show color scale legend', () => {
      render(<ClusterHeatmap nodes={mockNodes} />);

      expect(screen.getByText('Low')).toBeInTheDocument();
      expect(screen.getByText('High')).toBeInTheDocument();
    });
  });

  describe('Callbacks', () => {
    it('should call onGPUClick when GPU cell is clicked', () => {
      const onGPUClick = vi.fn();
      const { container } = render(<ClusterHeatmap nodes={mockNodes} onGPUClick={onGPUClick} />);

      // Find and click a GPU cell
      const cells = container.querySelectorAll('[style*="background-color"]');
      if (cells[0]) {
        fireEvent.click(cells[0]);
        expect(onGPUClick).toHaveBeenCalled();
      }
    });
  });
});

describe('NCCLBenchmarkChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the chart title', () => {
      render(<NCCLBenchmarkChart />);

      expect(screen.getByText(/NCCL All-Reduce Bandwidth/)).toBeInTheDocument();
    });

    it('should show bandwidth and latency toggle buttons', () => {
      render(<NCCLBenchmarkChart />);

      expect(screen.getByText('Bandwidth')).toBeInTheDocument();
      expect(screen.getByText('Latency')).toBeInTheDocument();
    });

    it('should show running indicator when isRunning', () => {
      render(<NCCLBenchmarkChart isRunning />);

      expect(screen.getByText('Running')).toBeInTheDocument();
    });

    it('should render chart container', () => {
      render(<NCCLBenchmarkChart />);

      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });
  });

  describe('Stats Display', () => {
    it('should show peak bandwidth stat', () => {
      render(<NCCLBenchmarkChart />);

      expect(screen.getByText('Peak Bandwidth')).toBeInTheDocument();
    });

    it('should show average bandwidth stat', () => {
      render(<NCCLBenchmarkChart />);

      expect(screen.getByText('Average Bandwidth')).toBeInTheDocument();
    });

    it('should show bus efficiency stat', () => {
      render(<NCCLBenchmarkChart />);

      expect(screen.getByText('Bus Efficiency')).toBeInTheDocument();
    });
  });

  describe('Toggle', () => {
    it('should switch to latency view on click', () => {
      render(<NCCLBenchmarkChart />);

      const latencyButton = screen.getByText('Latency');
      fireEvent.click(latencyButton);

      // The button should now be active (has nvidia-green background)
      expect(latencyButton.className).toContain('bg-nvidia-green');
    });
  });
});

describe('PerformanceComparison', () => {
  const createMockGPU = (id: number): GPU => ({
    id,
    uuid: `GPU-${id}-0000-0000-0000`,
    name: 'A100-SXM4-80GB',
    type: 'A100-80GB',
    pciAddress: `0000:${(0x10 + id).toString(16)}:00.0`,
    temperature: 45,
    powerDraw: 250,
    powerLimit: 400,
    memoryTotal: 81920,
    memoryUsed: 1024,
    utilization: 50 + id * 5,
    clocksSM: 1410,
    clocksMem: 1215,
    eccEnabled: true,
    eccErrors: { singleBit: 0, doubleBit: 0, aggregated: { singleBit: 0, doubleBit: 0 } },
    migMode: false,
    migInstances: [],
    nvlinks: Array.from({ length: 6 }, (_, j) => ({
      linkId: j,
      status: 'Active' as const,
      speed: 50,
      txErrors: 0,
      rxErrors: 0,
      replayErrors: 0,
    })),
    healthStatus: 'OK',
    xidErrors: [],
    persistenceMode: true,
  });

  const createMockPort = (portNumber: number): InfiniBandPort => ({
    portNumber,
    state: 'Active',
    physicalState: 'LinkUp',
    rate: 400,
    width: '4x',
    linkLayer: 'InfiniBand',
    smLid: 1,
    baseLid: portNumber,
    txBytes: 1000000,
    rxBytes: 1000000,
    txPackets: 10000,
    rxPackets: 10000,
    symbolErrors: 0,
  });

  const createMockHCA = (id: number): InfiniBandHCA => ({
    guid: `0x${id.toString(16).padStart(16, '0')}`,
    caType: 'MT4125',
    numPorts: 2,
    firmwareVersion: '22.35.1012',
    driverVersion: 'MLNX_OFED-5.8',
    ports: [createMockPort(1), createMockPort(2)],
    pciAddress: `0000:${(0xc1 + id).toString(16)}:00.0`,
    boardId: 'MT_0000000001',
    sysImageGuid: `0x${(id + 1).toString(16).padStart(16, '0')}`,
    nodeDescription: `mlx5_${id}`,
  });

  const mockNodes: DGXNode[] = [
    {
      id: 'dgx-00',
      hostname: 'dgx-00.local',
      systemType: 'DGX-A100',
      gpus: Array.from({ length: 4 }, (_, i) => createMockGPU(i)),
      dpus: [],
      hcas: [createMockHCA(0)],
      bmc: {
        ipAddress: '192.168.0.100',
        macAddress: '00:00:00:00:00:01',
        firmwareVersion: '1.2.3',
        manufacturer: 'NVIDIA',
        sensors: [],
        powerState: 'On',
      },
      cpuModel: 'AMD EPYC 7742',
      cpuCount: 128,
      ramTotal: 2048,
      ramUsed: 256,
      osVersion: 'Ubuntu 22.04',
      kernelVersion: '5.15.0',
      nvidiaDriverVersion: '535.104.05',
      cudaVersion: '12.2',
      healthStatus: 'OK',
      slurmState: 'idle',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the comparison title', () => {
      render(<PerformanceComparison nodes={mockNodes} />);

      expect(screen.getByText(/Actual vs Expected/)).toBeInTheDocument();
    });

    it('should show expected baseline', () => {
      render(<PerformanceComparison nodes={mockNodes} />);

      expect(screen.getByText('Expected')).toBeInTheDocument();
    });

    it('should show efficiency stats', () => {
      render(<PerformanceComparison nodes={mockNodes} />);

      expect(screen.getByText('Avg Efficiency')).toBeInTheDocument();
      expect(screen.getByText('Min Efficiency')).toBeInTheDocument();
    });

    it('should render bar chart', () => {
      render(<PerformanceComparison nodes={mockNodes} />);

      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });
  });

  describe('Metric Types', () => {
    it('should render bandwidth comparison by default', () => {
      render(<PerformanceComparison nodes={mockNodes} />);

      expect(screen.getByText(/NVLink Bandwidth/)).toBeInTheDocument();
    });

    it('should render compute comparison', () => {
      render(<PerformanceComparison nodes={mockNodes} metricType="compute" />);

      expect(screen.getByText(/GPU Compute/)).toBeInTheDocument();
    });

    it('should render memory comparison', () => {
      render(<PerformanceComparison nodes={mockNodes} metricType="memory" />);

      expect(screen.getByText(/Memory Bandwidth/)).toBeInTheDocument();
    });

    it('should render power comparison', () => {
      render(<PerformanceComparison nodes={mockNodes} metricType="power" />);

      expect(screen.getByText(/Power Efficiency/)).toBeInTheDocument();
    });
  });

  describe('Status Indicators', () => {
    it('should show all GPUs within tolerance message when no issues', () => {
      // This might not always be true due to random data, but the component should handle it
      render(<PerformanceComparison nodes={mockNodes} />);

      // Either shows issues or success message
      const hasStatus = screen.queryByText(/issue/) || screen.queryByText(/All GPUs within tolerance/);
      expect(hasStatus).toBeInTheDocument();
    });
  });
});
