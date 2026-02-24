export type ClusterEventType =
  | "xid-error"
  | "thermal"
  | "nvlink"
  | "ecc"
  | "power"
  | "slurm-state"
  | "slurm-job"
  | "pcie"
  | "clock-throttle"
  | "cascading-fault"
  | "consequence"
  | "info";

export type EventSeverity = "critical" | "warning" | "info";

export interface ClusterEventInput {
  type: ClusterEventType;
  nodeId: string;
  gpuId?: number;
  message: string;
  severity: EventSeverity;
  dmesgLine?: string;
}

export interface ClusterEvent extends ClusterEventInput {
  id: number;
  timestamp: number;
}

const DEFAULT_MAX_ENTRIES = 1000;

export class EventLog {
  private events: ClusterEvent[] = [];
  private nextId = 0;
  private maxEntries: number;

  constructor(maxEntries: number = DEFAULT_MAX_ENTRIES) {
    this.maxEntries = maxEntries;
  }

  append(input: ClusterEventInput): ClusterEvent {
    const event: ClusterEvent = {
      ...input,
      id: this.nextId++,
      timestamp: Date.now(),
    };
    this.events.push(event);
    if (this.events.length > this.maxEntries) {
      this.events = this.events.slice(this.events.length - this.maxEntries);
    }
    return event;
  }

  getAll(): ClusterEvent[] {
    return [...this.events];
  }

  getByType(type: ClusterEventType): ClusterEvent[] {
    return this.events.filter((e) => e.type === type);
  }

  getByNode(nodeId: string): ClusterEvent[] {
    return this.events.filter((e) => e.nodeId === nodeId);
  }

  getAfter(timestamp: number): ClusterEvent[] {
    return this.events.filter((e) => e.timestamp > timestamp);
  }

  toDmesgOutput(): string[] {
    return this.events
      .filter((e) => e.dmesgLine)
      .map((e) => {
        const seconds = ((e.timestamp % 100000) / 1000).toFixed(6);
        return `[${seconds.padStart(12)}] ${e.dmesgLine}`;
      });
  }

  clear(): void {
    this.events = [];
    this.nextId = 0;
  }
}
