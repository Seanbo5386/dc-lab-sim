import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NetworkNodeDetail, NetworkNodeType } from "../NetworkNodeDetail";

describe("NetworkNodeDetail", () => {
  const mockGpuNode: NetworkNodeType = {
    type: "gpu",
    data: {
      id: 0,
      uuid: "GPU-12345",
      name: "NVIDIA H100",
      type: "H100-SXM",
      pciAddress: "00:04.0",
      temperature: 65,
      powerDraw: 350,
      powerLimit: 700,
      memoryTotal: 81920,
      memoryUsed: 70000,
      utilization: 85,
      clocksSM: 1980,
      clocksMem: 1593,
      eccEnabled: true,
      eccErrors: {
        singleBit: 0,
        doubleBit: 0,
        aggregated: { singleBit: 0, doubleBit: 0 },
      },
      migMode: false,
      migInstances: [],
      nvlinks: [
        {
          linkId: 0,
          status: "Active",
          speed: 900,
          txErrors: 0,
          rxErrors: 0,
          replayErrors: 0,
        },
        {
          linkId: 1,
          status: "Down",
          speed: 0,
          txErrors: 5,
          rxErrors: 3,
          replayErrors: 1,
        },
      ],
      healthStatus: "OK",
      xidErrors: [],
      persistenceMode: true,
      computeMode: "Default",
    },
  };

  const mockSwitchNode: NetworkNodeType = {
    type: "switch",
    data: {
      id: "spine-0",
      switchType: "spine",
      status: "active",
      portCount: 8,
      activePortCount: 8,
      bandwidth: "NDR 400 Gb/s",
      connectedNodes: ["Leaf 1", "Leaf 2", "Leaf 3", "Leaf 4"],
      throughput: 950,
      temperature: 52,
      model: "NVIDIA QM9700 (NDR)",
      firmwareVersion: "29.2008.1234",
    },
  };

  const mockHostNode: NetworkNodeType = {
    type: "host",
    data: {
      id: "dgx-01",
      hostname: "dgx-01.cluster",
      hcas: [
        {
          id: 0,
          devicePath: "/dev/infiniband/mlx5_0",
          caType: "ConnectX-7",
          model: "ConnectX-7",
          firmwareVersion: "22.39.1002",
          ports: [
            {
              portNumber: 1,
              state: "Active",
              physicalState: "LinkUp",
              rate: 400,
              lid: 1,
              guid: "abc123",
              linkLayer: "InfiniBand",
              errors: {
                symbolErrors: 0,
                linkDowned: 0,
                portRcvErrors: 0,
                portXmitDiscards: 0,
                portXmitWait: 0,
              },
            },
          ],
        },
      ],
      gpuCount: 8,
    },
  };

  it("should render GPU details", () => {
    render(<NetworkNodeDetail node={mockGpuNode} onClose={() => {}} />);

    expect(screen.getByText("GPU 0")).toBeInTheDocument();
    expect(screen.getByText("NVIDIA H100")).toBeInTheDocument();
    expect(screen.getByText("65°C")).toBeInTheDocument();
    expect(screen.getByText("85%")).toBeInTheDocument();
  });

  it("should show NVLink status table", () => {
    render(<NetworkNodeDetail node={mockGpuNode} onClose={() => {}} />);

    expect(screen.getByText("NVLink Connections")).toBeInTheDocument();
    expect(screen.getByText("Link 0")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Down")).toBeInTheDocument();
  });

  it("should highlight errors", () => {
    render(<NetworkNodeDetail node={mockGpuNode} onClose={() => {}} />);

    // Link 1 has 5 TX errors
    const errorCells = screen.getAllByText("5");
    expect(errorCells.length).toBeGreaterThan(0);
    // Check that at least one has the red error class
    expect(
      errorCells.some((cell) => cell.classList.contains("text-red-500")),
    ).toBe(true);
  });

  it("should call onClose when close button clicked", () => {
    const onClose = vi.fn();
    render(<NetworkNodeDetail node={mockGpuNode} onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it("should render switch details", () => {
    render(<NetworkNodeDetail node={mockSwitchNode} onClose={() => {}} />);

    expect(screen.getByText("Core Backbone Switch")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("NVIDIA QM9700 (NDR)")).toBeInTheDocument();
    expect(screen.getByText("52°C")).toBeInTheDocument();
    expect(screen.getByText("950 GB/s")).toBeInTheDocument();
    expect(screen.getByText("Leaf 1")).toBeInTheDocument();
  });

  it("should render host details", () => {
    render(<NetworkNodeDetail node={mockHostNode} onClose={() => {}} />);

    expect(screen.getByText("dgx-01.cluster")).toBeInTheDocument();
    expect(screen.getByText("GPUs")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("HCAs")).toBeInTheDocument();
  });
});
