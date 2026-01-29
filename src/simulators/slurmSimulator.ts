import type { CommandResult, CommandContext } from '@/types/commands';
import type { ParsedCommand } from '@/utils/commandParser';
import { BaseSimulator, type SimulatorMetadata } from '@/simulators/BaseSimulator';
import { useSimulationStore } from '@/store/simulationStore';

interface SlurmJob {
  jobId: number;
  partition: string;
  name: string;
  user: string;
  state: 'RUNNING' | 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  time: string;
  timeLimit: string;
  nodes: number;
  nodelist: string;
  cpus: number;
  gpus: number;
  memory: string;
  submitTime: Date;
  startTime?: Date;
  endTime?: Date;
  priority: number;
  account: string;
  qos: string;
  workDir: string;
  command: string;
  dependency?: string;
  arrayTaskId?: number;
  reasonPending?: string;
}

/**
 * Slurm Simulator
 * 
 * Handles multiple Slurm commands: sinfo, squeue, scontrol, sbatch, srun, scancel, sacct
 * Each command is a separate entry point from Terminal.tsx.
 */
export class SlurmSimulator extends BaseSimulator {
  private jobs: SlurmJob[] = [];
  private nextJobId = 1000;
  private currentCommand = 'slurm';

  constructor() {
    super();
  }

  getMetadata(): SimulatorMetadata {
    return {
      name: this.currentCommand,
      version: '23.02.6',
      description: 'Slurm Workload Manager',
      commands: [],
    };
  }

  execute(_parsed: ParsedCommand, _context: CommandContext): CommandResult {
    return this.createError('Use specific Slurm commands: sinfo, squeue, scontrol, sbatch, srun, scancel, sacct');
  }

  /**
   * Generate sinfo --help output
   */
  private generateSinfoHelp(): string {
    let output = `Usage: sinfo [OPTIONS]\n`;
    output += `  -a, --all                  show all partitions\n`;
    output += `  -d, --dead                 show only non-responding nodes\n`;
    output += `  -e, --exact                group nodes only on exact match of configuration\n`;
    output += `  -h, --noheader             no headers on output\n`;
    output += `      --hide                 do not show hidden or non-accessible partitions\n`;
    output += `  -i, --iterate=seconds      specify an iteration period\n`;
    output += `  -l, --long                 long output - displays more information\n`;
    output += `  -M, --clusters=names       comma separated list of clusters\n`;
    output += `  -n, --nodes=nodes          report on specific node(s)\n`;
    output += `  -N, --Node                 Node-centric format\n`;
    output += `  -o, --format=format        format specification\n`;
    output += `  -O, --Format=format        long format specification\n`;
    output += `  -p, --partition=partition  report on specific partition(s)\n`;
    output += `  -r, --responding           report only responding nodes\n`;
    output += `  -R, --list-reasons         list reasons nodes are down or drained\n`;
    output += `  -s, --summarize            report state summary only\n`;
    output += `  -S, --sort=fields          comma separated list of fields to sort on\n`;
    output += `  -t, --states=states        report nodes in specific state(s)\n`;
    output += `  -T, --reservation          show reservation status\n`;
    output += `  -v, --verbose              verbosity level\n`;
    output += `  -V, --version              output version information and exit\n`;
    output += `\nHelp options:\n`;
    output += `      --help                 show this help message\n`;
    output += `      --usage                display brief usage message\n`;
    return output;
  }

  /**
   * Generate squeue --help output  
   */
  private generateSqueueHelp(): string {
    let output = `Usage: squeue [OPTIONS]\n`;
    output += `  -A, --account=account(s)   comma separated list of accounts\n`;
    output += `  -a, --all                  display all jobs in all partitions\n`;
    output += `  -h, --noheader             no headers on output\n`;
    output += `  -i, --iterate=seconds      specify an iteration period\n`;
    output += `  -j, --jobs=job_id(s)       comma separated list of jobs IDs\n`;
    output += `  -l, --long                 long report\n`;
    output += `  -M, --clusters=names       comma separated list of clusters\n`;
    output += `  -n, --name=name(s)         comma separated list of job names\n`;
    output += `  -o, --format=format        format specification\n`;
    output += `  -O, --Format=format        long format specification\n`;
    output += `  -p, --partition=partition  comma separated list of partitions\n`;
    output += `  -q, --qos=qos(s)           comma separated list of QOS\n`;
    output += `  -r, --array                display array job information\n`;
    output += `  -s, --steps                show steps only\n`;
    output += `  -S, --sort=fields          comma separated list of fields to sort on\n`;
    output += `  -t, --states=states        comma separated list of states\n`;
    output += `  -u, --user=user(s)         comma separated list of users\n`;
    output += `  -v, --verbose              verbosity level\n`;
    output += `  -V, --version              output version information and exit\n`;
    output += `  -w, --nodelist=nodes       node name(s)\n`;
    output += `\nHelp options:\n`;
    output += `      --help                 show this help message\n`;
    output += `      --usage                display brief usage message\n`;
    return output;
  }

  /**
   * Generate scontrol --help output
   */
  private generateScontrolHelp(): string {
    let output = `Usage: scontrol [OPTIONS] COMMAND [COMMAND OPTIONS]\n\n`;
    output += `COMMAND may be:\n`;
    output += `  show                     show information about slurm objects\n`;
    output += `  update                   update slurm objects\n`;
    output += `  create                   create slurm objects\n`;
    output += `  delete                   delete slurm objects\n`;
    output += `  ping                     ping slurm controllers\n`;
    output += `  reconfigure              reconfigure slurmctld\n`;
    output += `  shutdown                 shutdown slurmctld\n`;
    output += `  takeover                 take over as primary slurmctld\n`;
    output += `  setdebug                 set slurmctld debug level\n\n`;
    output += `Examples:\n`;
    output += `  scontrol show nodes\n`;
    output += `  scontrol show partition\n`;
    output += `  scontrol update NodeName=node01 State=DRAIN Reason="Maintenance"\n`;
    output += `\nHelp options:\n`;
    output += `      --help                 show this help message\n`;
    output += `  -V, --version              output version information and exit\n`;
    return output;
  }

  private getNode(context: CommandContext) {
    const state = useSimulationStore.getState();
    return state.cluster.nodes.find(n => n.id === context.currentNode);
  }

  private getAllNodes(_context: CommandContext) {
    const state = useSimulationStore.getState();
    return state.cluster.nodes;
  }

  /**
   * Sort nodes based on Slurm sort specification
   * Format: [+|-]field[,[+|-]field]...
   * + = ascending (default), - = descending
   * Fields: n=name, t=state, P=partition, c=cpus, m=memory, G=gres
   */
  private sortNodes(nodes: typeof useSimulationStore.prototype.getState.cluster.nodes, sortSpec: string) {
    const sortFields = sortSpec.split(',');

    return [...nodes].sort((a, b) => {
      for (const field of sortFields) {
        const descending = field.startsWith('-');
        const fieldName = field.replace(/^[+-]/, '');

        let comparison = 0;
        switch (fieldName.toLowerCase()) {
          case 'n': // node name
            comparison = a.id.localeCompare(b.id);
            break;
          case 't': // state
            comparison = a.slurmState.localeCompare(b.slurmState);
            break;
          case 'p': // partition (all same in our sim)
            comparison = 0;
            break;
          case 'c': // cpus
            comparison = (a.cpuCount * 64) - (b.cpuCount * 64);
            break;
          case 'm': // memory
            comparison = a.ramTotal - b.ramTotal;
            break;
          case 'g': // gres (GPUs)
            comparison = a.gpus.length - b.gpus.length;
            break;
          default:
            comparison = 0;
        }

        if (comparison !== 0) {
          return descending ? -comparison : comparison;
        }
      }
      return 0;
    });
  }

  // sinfo - Show partition and node information
  executeSinfo(parsed: ParsedCommand, _context: CommandContext): CommandResult {
    // Handle --help
    if (this.hasAnyFlag(parsed, ['help'])) {
      return this.createSuccess(this.generateSinfoHelp());
    }

    // Handle --version / -V
    if (this.hasAnyFlag(parsed, ['version', 'V'])) {
      return this.createSuccess('slurm 23.02.6');
    }

    let nodes = [...useSimulationStore.getState().cluster.nodes];

    // Handle --sort / -S flag
    const sortSpec = this.getFlagString(parsed, ['S', 'sort']);
    if (sortSpec) {
      nodes = this.sortNodes(nodes, sortSpec);
    }

    // Handle --states / -t flag to filter by state
    const statesFilter = this.getFlagString(parsed, ['t', 'states']);
    if (statesFilter) {
      const allowedStates = statesFilter.toLowerCase().split(',');
      nodes = nodes.filter(n => allowedStates.includes(n.slurmState));
    }

    // Handle --partition / -p flag to filter by partition
    const partitionFilter = this.getFlagString(parsed, ['p', 'partition']);
    if (partitionFilter) {
      // In our simulation, all nodes are in 'gpu' partition
      if (partitionFilter.toLowerCase() !== 'gpu') {
        return { output: '', exitCode: 0 }; // No matching partition
      }
    }

    // Handle --nodes / -n flag to filter by node name
    const nodeFilter = this.getFlagString(parsed, ['n', 'nodes']);
    if (nodeFilter) {
      const nodeNames = nodeFilter.split(',');
      nodes = nodes.filter(n => nodeNames.includes(n.id));
    }
    const detailed = this.hasAnyFlag(parsed, ['Nel', 'N', 'l', 'long', 'Node']);

    // Handle -R flag for node state reasons
    if (this.hasAnyFlag(parsed, ['R', 'list-reasons'])) {
      // Show reasons why nodes are unavailable
      const unavailableNodes = nodes.filter(n => n.slurmState === 'drain' || n.slurmState === 'down');

      if (unavailableNodes.length === 0) {
        // No unavailable nodes - return empty output (normal behavior)
        return { output: '', exitCode: 0 };
      }

      let output = 'REASON               USER      TIMESTAMP           NODELIST\n';
      unavailableNodes.forEach(node => {
        const reason = node.slurmReason || 'Not specified';
        const timestamp = new Date().toISOString().split('T')[0];
        output += `${reason.padEnd(20)} root      ${timestamp}         ${node.id}\n`;
      });

      return { output, exitCode: 0 };
    }

    // Handle custom output format with -o or --output-format
    const outputFormat = this.getFlagString(parsed, ['o', 'output-format']);
    if (outputFormat) {
      // Parse format string like "%n %G"
      let output = '';

      // Handle common format strings
      if (outputFormat.includes('%n') && outputFormat.includes('%G')) {
        // Show nodes and their GRES
        output = 'NODE                 GRES\n';
        nodes.forEach(node => {
          const gpuCount = node.gpus.length;
          const gres = gpuCount > 0 ? `gpu:h100:${gpuCount}` : '(null)';
          output += `${node.id.padEnd(20)} ${gres}\n`;
        });
      } else if (outputFormat.includes('%20n') && outputFormat.includes('%10G')) {
        // Show nodes and their GRES with specific column widths
        output = 'NODE                 GRES      \n';
        nodes.forEach(node => {
          const gpuCount = node.gpus.length;
          const gres = gpuCount > 0 ? `gpu:h100:${gpuCount}` : '(null)';
          output += `${node.id.padEnd(20)} ${gres.padEnd(10)}\n`;
        });
      } else {
        // Default format if we don't recognize it
        output = 'PARTITION AVAIL  TIMELIMIT  NODES  STATE NODELIST\n';
        output += 'gpu       up     infinite   8      idle  dgx-00,dgx-01,dgx-02,dgx-03,dgx-04,dgx-05,dgx-06,dgx-07\n';
      }

      return { output, exitCode: 0 };
    }

    if (detailed) {
      // SOURCE OF TRUTH: Column widths for detailed output
      const COL_NODELIST = 16;
      const COL_NODES = 6;
      const COL_PARTITION = 16;
      const COL_STATE = 10;
      const COL_CPUS = 8;
      const COL_SCT = 7;
      const COL_MEMORY = 7;
      const COL_TMPDISK = 9;
      const COL_WEIGHT = 7;
      const COL_AVAILFE = 9;

      let output = 'NODELIST'.padEnd(COL_NODELIST) +
        'NODES'.padEnd(COL_NODES) +
        'PARTITION'.padEnd(COL_PARTITION) +
        'STATE'.padEnd(COL_STATE) +
        'CPUS'.padEnd(COL_CPUS) +
        'S:C:T'.padEnd(COL_SCT) +
        'MEMORY'.padEnd(COL_MEMORY) +
        'TMP_DISK'.padEnd(COL_TMPDISK) +
        'WEIGHT'.padEnd(COL_WEIGHT) +
        'AVAIL_FE'.padEnd(COL_AVAILFE) +
        'REASON\n';

      nodes.forEach(node => {
        const state = node.slurmState === 'idle' ? 'idle' :
          node.slurmState === 'alloc' ? 'allocated' :
            node.slurmState === 'drain' ? 'drained' : 'down';
        const cpus = node.cpuCount * 64;
        const memory = node.ramTotal * 1024;
        const reason = node.slurmReason || 'none';

        output += node.id.padEnd(COL_NODELIST) +
          '1'.padEnd(COL_NODES) +
          'gpu'.padEnd(COL_PARTITION) +
          state.padEnd(COL_STATE) +
          cpus.toString().padEnd(COL_CPUS) +
          '2:64:1'.padEnd(COL_SCT) +
          memory.toString().padEnd(COL_MEMORY) +
          '0'.padEnd(COL_TMPDISK) +
          '1'.padEnd(COL_WEIGHT) +
          '(null)'.padEnd(COL_AVAILFE) +
          reason + '\n';
      });

      return { output, exitCode: 0 };
    }

    // SOURCE OF TRUTH: Column widths for default output
    const COL_PARTITION = 10;
    const COL_AVAIL = 7;
    const COL_TIMELIMIT = 11;
    const COL_NODES = 7;
    const COL_STATE = 6;

    let output = 'PARTITION'.padEnd(COL_PARTITION) +
      'AVAIL'.padEnd(COL_AVAIL) +
      'TIMELIMIT'.padEnd(COL_TIMELIMIT) +
      'NODES'.padEnd(COL_NODES) +
      'STATE'.padEnd(COL_STATE) +
      'NODELIST\n';

    const idleNodes = nodes.filter(n => n.slurmState === 'idle');
    const allocNodes = nodes.filter(n => n.slurmState === 'alloc');
    const drainNodes = nodes.filter(n => n.slurmState === 'drain');

    if (idleNodes.length > 0) {
      const nodelist = idleNodes.map(n => n.id).join(',');
      output += 'gpu'.padEnd(COL_PARTITION) +
        'up'.padEnd(COL_AVAIL) +
        'infinite'.padEnd(COL_TIMELIMIT) +
        idleNodes.length.toString().padEnd(COL_NODES) +
        'idle'.padEnd(COL_STATE) +
        nodelist + '\n';
    }

    if (allocNodes.length > 0) {
      const nodelist = allocNodes.map(n => n.id).join(',');
      output += 'gpu'.padEnd(COL_PARTITION) +
        'up'.padEnd(COL_AVAIL) +
        'infinite'.padEnd(COL_TIMELIMIT) +
        allocNodes.length.toString().padEnd(COL_NODES) +
        'alloc'.padEnd(COL_STATE) +
        nodelist + '\n';
    }

    if (drainNodes.length > 0) {
      const nodelist = drainNodes.map(n => n.id).join(',');
      output += 'gpu'.padEnd(COL_PARTITION) +
        'up'.padEnd(COL_AVAIL) +
        'infinite'.padEnd(COL_TIMELIMIT) +
        drainNodes.length.toString().padEnd(COL_NODES) +
        'drain'.padEnd(COL_STATE) +
        nodelist + '\n';
    }

    return { output, exitCode: 0 };
  }

  // squeue - Show job queue
  executeSqueue(parsed: ParsedCommand, _context: CommandContext): CommandResult {
    // Handle --help
    if (this.hasAnyFlag(parsed, ['help'])) {
      return this.createSuccess(this.generateSqueueHelp());
    }

    // Handle --version / -V
    if (this.hasAnyFlag(parsed, ['version', 'V'])) {
      return this.createSuccess('slurm 23.02.6');
    }

    const user = this.getFlagString(parsed, ['u', 'user']);
    const jobIdFilter = this.getFlagString(parsed, ['j', 'jobs']);
    const statesFilter = this.getFlagString(parsed, ['t', 'states']);
    const longFormat = this.hasAnyFlag(parsed, ['l', 'long']);
    const customFormat = this.getFlagString(parsed, ['O', 'Format']);
    const sortSpec = this.getFlagString(parsed, ['S', 'sort']);
    const noHeader = this.hasAnyFlag(parsed, ['h', 'noheader']);

    let filteredJobs = [...this.jobs];

    // Apply filters
    if (user) {
      filteredJobs = filteredJobs.filter(j => j.user === user);
    }
    if (jobIdFilter) {
      const jobIds = jobIdFilter.split(',').map(id => parseInt(id));
      filteredJobs = filteredJobs.filter(j => jobIds.includes(j.jobId));
    }
    if (statesFilter) {
      const states = statesFilter.toUpperCase().split(',');
      filteredJobs = filteredJobs.filter(j => states.includes(j.state));
    }

    // Apply sorting
    if (sortSpec) {
      filteredJobs = this.sortJobs(filteredJobs, sortSpec);
    }

    // Handle --Format (long format with custom fields)
    if (customFormat) {
      return this.formatSqueueCustom(filteredJobs, customFormat, noHeader);
    }

    // Handle --long format
    if (longFormat) {
      return this.formatSqueueLong(filteredJobs, noHeader);
    }

    // Default format
    const COL_JOBID = 10;
    const COL_PARTITION = 13;
    const COL_NAME = 12;
    const COL_USER = 9;
    const COL_ST = 3;
    const COL_TIME = 11;
    const COL_NODES = 6;

    let output = '';
    if (!noHeader) {
      output = 'JOBID'.padEnd(COL_JOBID) +
        'PARTITION'.padEnd(COL_PARTITION) +
        'NAME'.padEnd(COL_NAME) +
        'USER'.padEnd(COL_USER) +
        'ST'.padEnd(COL_ST) +
        'TIME'.padEnd(COL_TIME) +
        'NODES'.padEnd(COL_NODES) +
        'NODELIST(REASON)\n';
    }

    if (filteredJobs.length === 0) {
      return { output, exitCode: 0 };
    }

    filteredJobs.forEach(job => {
      const state = job.state === 'RUNNING' ? 'R' :
        job.state === 'PENDING' ? 'PD' :
          job.state === 'COMPLETED' ? 'CD' :
            job.state === 'CANCELLED' ? 'CA' : 'F';

      const nodelistOrReason = job.state === 'PENDING'
        ? `(${job.reasonPending || 'Priority'})`
        : job.nodelist;

      output += job.jobId.toString().padEnd(COL_JOBID) +
        job.partition.padEnd(COL_PARTITION) +
        job.name.substring(0, 11).padEnd(COL_NAME) +
        job.user.padEnd(COL_USER) +
        state.padEnd(COL_ST) +
        job.time.padEnd(COL_TIME) +
        job.nodes.toString().padEnd(COL_NODES) +
        nodelistOrReason + '\n';
    });

    return { output, exitCode: 0 };
  }

  /**
   * Sort jobs based on Slurm sort specification
   * Format: [+|-]field[,[+|-]field]...
   * Fields: i=jobid, j=name, u=user, t=time, S=starttime, p=priority
   */
  private sortJobs(jobs: SlurmJob[], sortSpec: string): SlurmJob[] {
    const sortFields = sortSpec.split(',');

    return [...jobs].sort((a, b) => {
      for (const field of sortFields) {
        const descending = field.startsWith('-');
        const fieldName = field.replace(/^[+-]/, '');

        let comparison = 0;
        switch (fieldName.toLowerCase()) {
          case 'i': // job id
            comparison = a.jobId - b.jobId;
            break;
          case 'j': // job name
            comparison = a.name.localeCompare(b.name);
            break;
          case 'u': // user
            comparison = a.user.localeCompare(b.user);
            break;
          case 't': // time used
            comparison = a.time.localeCompare(b.time);
            break;
          case 's': // start time
            const aStart = a.startTime?.getTime() || 0;
            const bStart = b.startTime?.getTime() || 0;
            comparison = aStart - bStart;
            break;
          case 'p': // priority
            comparison = a.priority - b.priority;
            break;
          default:
            comparison = 0;
        }

        if (comparison !== 0) {
          return descending ? -comparison : comparison;
        }
      }
      return 0;
    });
  }

  /**
   * Format squeue output with custom --Format specification
   * Supports fields like: JobID, Name, User, Partition, State, TimeUsed, NumNodes, etc.
   */
  private formatSqueueCustom(jobs: SlurmJob[], formatSpec: string, noHeader: boolean): CommandResult {
    // Parse format spec (e.g., "JobID:10,Name:15,User:8,State:8")
    const fields = formatSpec.split(',').map(f => {
      const parts = f.split(':');
      return {
        name: parts[0],
        width: parts[1] ? parseInt(parts[1]) : 12,
      };
    });

    let output = '';

    // Header
    if (!noHeader) {
      fields.forEach(f => {
        output += f.name.toUpperCase().padEnd(f.width);
      });
      output += '\n';
    }

    // Data rows
    jobs.forEach(job => {
      fields.forEach(f => {
        const value = this.getJobFieldValue(job, f.name);
        output += value.substring(0, f.width - 1).padEnd(f.width);
      });
      output += '\n';
    });

    return { output, exitCode: 0 };
  }

  /**
   * Format squeue output in long format (-l)
   */
  private formatSqueueLong(jobs: SlurmJob[], noHeader: boolean): CommandResult {
    const COL_JOBID = 10;
    const COL_PARTITION = 10;
    const COL_NAME = 12;
    const COL_USER = 9;
    const COL_STATE = 10;
    const COL_TIME = 11;
    const COL_TIMELIMIT = 11;
    const COL_NODES = 6;
    const COL_CPUS = 5;

    let output = '';
    if (!noHeader) {
      output = 'JOBID'.padEnd(COL_JOBID) +
        'PARTITION'.padEnd(COL_PARTITION) +
        'NAME'.padEnd(COL_NAME) +
        'USER'.padEnd(COL_USER) +
        'STATE'.padEnd(COL_STATE) +
        'TIME'.padEnd(COL_TIME) +
        'TIME_LIMI'.padEnd(COL_TIMELIMIT) +
        'NODES'.padEnd(COL_NODES) +
        'CPUS'.padEnd(COL_CPUS) +
        'NODELIST(REASON)\n';
    }

    jobs.forEach(job => {
      const nodelistOrReason = job.state === 'PENDING'
        ? `(${job.reasonPending || 'Priority'})`
        : job.nodelist;

      output += job.jobId.toString().padEnd(COL_JOBID) +
        job.partition.padEnd(COL_PARTITION) +
        job.name.substring(0, 11).padEnd(COL_NAME) +
        job.user.padEnd(COL_USER) +
        job.state.padEnd(COL_STATE) +
        job.time.padEnd(COL_TIME) +
        job.timeLimit.padEnd(COL_TIMELIMIT) +
        job.nodes.toString().padEnd(COL_NODES) +
        job.cpus.toString().padEnd(COL_CPUS) +
        nodelistOrReason + '\n';
    });

    return { output, exitCode: 0 };
  }

  /**
   * Get a field value from a job for custom format output
   */
  private getJobFieldValue(job: SlurmJob, field: string): string {
    switch (field.toLowerCase()) {
      case 'jobid':
        return job.jobId.toString();
      case 'name':
        return job.name;
      case 'user':
        return job.user;
      case 'partition':
        return job.partition;
      case 'state':
        return job.state;
      case 'statecompact':
        return job.state === 'RUNNING' ? 'R' :
          job.state === 'PENDING' ? 'PD' :
            job.state === 'COMPLETED' ? 'CD' :
              job.state === 'CANCELLED' ? 'CA' : 'F';
      case 'timeused':
      case 'time':
        return job.time;
      case 'timelimit':
        return job.timeLimit;
      case 'numnodes':
      case 'nodes':
        return job.nodes.toString();
      case 'numcpus':
      case 'cpus':
        return job.cpus.toString();
      case 'numgpus':
      case 'gpus':
        return job.gpus.toString();
      case 'memory':
      case 'minmemory':
        return job.memory;
      case 'nodelist':
        return job.nodelist;
      case 'account':
        return job.account;
      case 'qos':
        return job.qos;
      case 'priority':
        return job.priority.toString();
      case 'submittime':
        return job.submitTime.toISOString().split('T')[0];
      case 'starttime':
        return job.startTime ? job.startTime.toISOString().split('T')[0] : 'N/A';
      case 'endtime':
        return job.endTime ? job.endTime.toISOString().split('T')[0] : 'N/A';
      case 'workdir':
        return job.workDir;
      case 'command':
        return job.command;
      case 'dependency':
        return job.dependency || '';
      case 'reason':
        return job.state === 'PENDING' ? (job.reasonPending || 'Priority') : '';
      default:
        return '';
    }
  }

  // scontrol - Show/modify node and job information
  executeScontrol(parsed: ParsedCommand, context: CommandContext): CommandResult {
    // Handle --help
    if (this.hasAnyFlag(parsed, ['help'])) {
      return this.createSuccess(this.generateScontrolHelp());
    }

    // Handle --version / -V
    if (this.hasAnyFlag(parsed, ['version', 'V'])) {
      return this.createSuccess('slurm 23.02.6');
    }

    const command = parsed.subcommands[0];

    if (command === 'show') {
      const what = parsed.subcommands[1];

      if (what === 'nodes' || what === 'node') {
        // Check if specific node requested
        const nodeNameArg = parsed.subcommands[2] || parsed.positionalArgs.find(a => !a.includes('='));
        let nodes = this.getAllNodes(context);

        if (nodeNameArg) {
          nodes = nodes.filter(n => n.id === nodeNameArg);
          if (nodes.length === 0) {
            return this.createError(`Node ${nodeNameArg} not found`);
          }
        }

        let output = '';

        nodes.forEach((node, idx) => {
          if (idx > 0) output += '\n';

          const allocCpus = node.slurmState === 'alloc' ? node.cpuCount * 32 : 0;
          const allocMem = node.slurmState === 'alloc' ? Math.round(node.ramTotal * 0.5 * 1024) : 0;

          output += `NodeName=${node.id} Arch=x86_64 CoresPerSocket=64\n`;
          output += `   CPUAlloc=${allocCpus} CPUEfctv=${node.cpuCount * 64} CPUTot=${node.cpuCount * 64} CPULoad=0.50\n`;
          output += `   AvailableFeatures=(null)\n`;
          output += `   ActiveFeatures=(null)\n`;
          output += `   Gres=gpu:h100:${node.gpus.length}\n`;
          output += `   GresUsed=gpu:h100:${node.slurmState === 'alloc' ? Math.min(4, node.gpus.length) : 0}(IDX:${node.slurmState === 'alloc' ? '0-3' : 'N/A'})\n`;
          output += `   NodeAddr=${node.id} NodeHostName=${node.hostname} Version=23.02.6\n`;
          output += `   OS=Linux 5.15.0-91-generic #101-Ubuntu SMP x86_64\n`;
          output += `   RealMemory=${node.ramTotal * 1024} AllocMem=${allocMem} FreeMem=${(node.ramTotal - node.ramUsed) * 1024} Sockets=${node.cpuCount} Boards=1\n`;
          output += `   State=${node.slurmState.toUpperCase()}${node.slurmState === 'drain' ? '+DRAIN' : ''} ThreadsPerCore=1 TmpDisk=0 Weight=1 Owner=N/A MCS_label=N/A\n`;
          output += `   Partitions=gpu\n`;
          output += `   BootTime=2024-01-10T08:00:00 SlurmdStartTime=2024-01-10T08:05:00\n`;
          output += `   LastBusyTime=2024-01-11T14:30:00\n`;
          output += `   CfgTRES=cpu=${node.cpuCount * 64},mem=${node.ramTotal * 1024}M,billing=${node.cpuCount * 64},gres/gpu=${node.gpus.length}\n`;
          output += `   AllocTRES=${node.slurmState === 'alloc' ? `cpu=${allocCpus},mem=${allocMem}M,gres/gpu=4` : ''}\n`;
          output += `   CurrentWatts=0 AveWatts=0\n`;
          output += `   ExtSensorsJoules=n/s ExtSensorsWatts=0 ExtSensorsTemp=n/s\n`;

          if (node.slurmReason) {
            output += `   Reason=${node.slurmReason} [root@2024-01-11T10:00:00]\n`;
          }
        });

        return { output, exitCode: 0 };
      }

      if (what === 'job' || what === 'jobs') {
        // Check if specific job requested
        const jobIdArg = parsed.subcommands[2] || parsed.positionalArgs.find(a => !a.includes('='));

        let jobsToShow = this.jobs;
        if (jobIdArg) {
          const jobId = parseInt(jobIdArg);
          jobsToShow = this.jobs.filter(j => j.jobId === jobId);
          if (jobsToShow.length === 0) {
            return this.createError(`Job ${jobIdArg} not found`);
          }
        }

        if (jobsToShow.length === 0) {
          return { output: 'No jobs in the system\n', exitCode: 0 };
        }

        let output = '';
        jobsToShow.forEach((job, idx) => {
          if (idx > 0) output += '\n';

          const submitTimeStr = job.submitTime.toISOString().replace('T', ' ').split('.')[0];
          const startTimeStr = job.startTime
            ? job.startTime.toISOString().replace('T', ' ').split('.')[0]
            : 'Unknown';
          const endTimeStr = job.endTime
            ? job.endTime.toISOString().replace('T', ' ').split('.')[0]
            : 'Unknown';

          output += `JobId=${job.jobId} JobName=${job.name}\n`;
          output += `   UserId=${job.user}(1000) GroupId=${job.user}(1000) MCS_label=N/A\n`;
          output += `   Priority=${job.priority} Nice=0 Account=${job.account} QOS=${job.qos}\n`;
          output += `   JobState=${job.state} Reason=${job.state === 'PENDING' ? (job.reasonPending || 'Priority') : 'None'} Dependency=${job.dependency || '(null)'}\n`;
          output += `   Requeue=1 Restarts=0 BatchFlag=1 Reboot=0 ExitCode=0:0\n`;
          output += `   RunTime=${job.time} TimeLimit=${job.timeLimit} TimeMin=N/A\n`;
          output += `   SubmitTime=${submitTimeStr} EligibleTime=${submitTimeStr}\n`;
          output += `   AccrueTime=${submitTimeStr}\n`;
          output += `   StartTime=${startTimeStr} EndTime=${endTimeStr} Deadline=N/A\n`;
          output += `   SuspendTime=None SecsPreSuspend=0 LastSchedEval=${submitTimeStr}\n`;
          output += `   Scheduler=Main\n`;
          output += `   Partition=${job.partition} AllocNode:Sid=${job.nodelist}:${job.jobId}\n`;
          output += `   ReqNodeList=(null) ExcNodeList=(null)\n`;
          output += `   NodeList=${job.state === 'RUNNING' ? job.nodelist : ''}\n`;
          output += `   BatchHost=${job.state === 'RUNNING' ? job.nodelist : ''}\n`;
          output += `   NumNodes=${job.nodes} NumCPUs=${job.cpus} NumTasks=${job.cpus} CPUs/Task=1 ReqB:S:C:T=0:0:*:*\n`;
          output += `   TRES=cpu=${job.cpus},mem=${job.memory},node=${job.nodes},billing=${job.cpus},gres/gpu=${job.gpus}\n`;
          output += `   Socks/Node=* NtasksPerN:B:S:C=0:0:*:* CoreSpec=*\n`;
          output += `   MinCPUsNode=1 MinMemoryNode=${job.memory} MinTmpDiskNode=0\n`;
          output += `   Features=(null) DelayBoot=00:00:00\n`;
          output += `   OverSubscribe=OK Contiguous=0 Licenses=(null) Network=(null)\n`;
          output += `   Command=${job.command}\n`;
          output += `   WorkDir=${job.workDir}\n`;
          output += `   StdErr=${job.workDir}/slurm-${job.jobId}.err\n`;
          output += `   StdIn=/dev/null\n`;
          output += `   StdOut=${job.workDir}/slurm-${job.jobId}.out\n`;
          output += `   Power=\n`;
        });

        return { output, exitCode: 0 };
      }

      if (what === 'partition' || what === 'partitions') {
        const nodes = this.getAllNodes(context);
        const totalCpus = nodes.reduce((sum, n) => sum + n.cpuCount * 64, 0);
        const totalMem = nodes.reduce((sum, n) => sum + n.ramTotal * 1024, 0);
        const totalGpus = nodes.reduce((sum, n) => sum + n.gpus.length, 0);

        let output = 'PartitionName=gpu\n';
        output += '   AllowGroups=ALL AllowAccounts=ALL AllowQos=ALL\n';
        output += '   AllocNodes=ALL Default=YES QoS=N/A\n';
        output += '   DefaultTime=NONE DisableRootJobs=NO ExclusiveUser=NO GraceTime=0 Hidden=NO\n';
        output += '   MaxNodes=UNLIMITED MaxTime=UNLIMITED MinNodes=0 LLN=NO MaxCPUsPerNode=UNLIMITED MaxCPUsPerSocket=UNLIMITED\n';
        output += `   Nodes=dgx-[00-${(nodes.length - 1).toString().padStart(2, '0')}]\n`;
        output += '   PriorityJobFactor=1 PriorityTier=1 RootOnly=NO ReqResv=NO OverSubscribe=NO\n';
        output += '   OverTimeLimit=NONE PreemptMode=OFF\n';
        output += `   State=UP TotalCPUs=${totalCpus} TotalNodes=${nodes.length} SelectTypeParameters=NONE\n`;
        output += `   JobDefaults=(null)\n`;
        output += `   DefMemPerCPU=1024 MaxMemPerNode=UNLIMITED\n`;
        output += `   TRES=cpu=${totalCpus},mem=${totalMem}M,node=${nodes.length},billing=${totalCpus},gres/gpu=${totalGpus}\n`;

        return { output, exitCode: 0 };
      }

      if (what === 'config' || what === 'configuration') {
        let output = 'Configuration data as of 2024-01-11T12:00:00\n';
        output += 'AccountingStorageBackupHost = (null)\n';
        output += 'AccountingStorageEnforce = associations,limits,qos,safe\n';
        output += 'AccountingStorageHost = localhost\n';
        output += 'AccountingStorageParameters = (null)\n';
        output += 'AccountingStoragePort = 6819\n';
        output += 'AccountingStorageType = accounting_storage/slurmdbd\n';
        output += 'AccountingStoreFlags = job_comment,job_env,job_script\n';
        output += 'ClusterName = dgx-cluster\n';
        output += 'ControlMachine = dgx-00\n';
        output += 'DefMemPerCPU = 1024\n';
        output += 'GresTypes = gpu\n';
        output += 'MaxJobCount = 10000\n';
        output += 'MaxStepCount = 40000\n';
        output += 'PriorityType = priority/multifactor\n';
        output += 'ProctrackType = proctrack/cgroup\n';
        output += 'SchedulerType = sched/backfill\n';
        output += 'SelectType = select/cons_tres\n';
        output += 'SelectTypeParameters = CR_Core_Memory\n';
        output += 'SlurmUser = slurm\n';
        output += 'SLURM_CONF = /etc/slurm/slurm.conf\n';
        output += 'SLURM_VERSION = 23.02.6\n';
        output += 'StateSaveLocation = /var/spool/slurmctld\n';
        output += 'TaskPlugin = task/affinity,task/cgroup\n';
        return { output, exitCode: 0 };
      }
    }

    if (command === 'update') {
      // Find NodeName= in positional args or subcommands
      const nodeArg = parsed.positionalArgs.find(a => a.startsWith('NodeName='));
      const stateArg = parsed.positionalArgs.find(a => a.startsWith('State='));
      const reasonArg = parsed.positionalArgs.find(a => a.startsWith('Reason='));

      if (!nodeArg) {
        return this.createError('Error: NodeName not specified');
      }

      const nodeName = nodeArg.split('=')[1];
      const state = stateArg ? stateArg.split('=')[1].toLowerCase() : null;
      const reason = reasonArg ? reasonArg.split('=')[1].replace(/"/g, '') : undefined;

      const validStates = ['idle', 'drain', 'resume', 'down'];
      if (state && !validStates.includes(state)) {
        return this.createError(`Error: Invalid state "${state}". Valid: ${validStates.join(', ')}`);
      }

      const simState = useSimulationStore.getState();
      const nodes = simState.cluster.nodes;
      const node = nodes.find(n => n.id === nodeName);

      if (!node) {
        return this.createError(`Error: Node ${nodeName} not found`);
      }

      if (state) {
        const newState = state === 'resume' ? 'idle' : state;
        simState.setSlurmState(nodeName, newState as any, reason);
      }

      return this.createSuccess(`Node ${nodeName} updated successfully`);
    }

    return this.createError('Usage: scontrol <show|update> <nodes|node|partition> [options]');
  }

  // sbatch - Submit batch job
  executeSbatch(parsed: ParsedCommand, _context: CommandContext): CommandResult {
    // Handle --help
    if (this.hasAnyFlag(parsed, ['help'])) {
      let output = `Usage: sbatch [OPTIONS] script [args...]\n`;
      output += `  -N, --nodes=N              number of nodes to use\n`;
      output += `  -n, --ntasks=N             number of tasks to run\n`;
      output += `  -c, --cpus-per-task=N      number of CPUs per task\n`;
      output += `  -t, --time=TIME            time limit (e.g., 1:00:00, 1-00:00:00)\n`;
      output += `  -p, --partition=PARTITION  partition to submit to\n`;
      output += `  -o, --output=FILE          output file pattern (%j=jobid, %x=jobname)\n`;
      output += `  -e, --error=FILE           error file pattern\n`;
      output += `  -J, --job-name=NAME        job name\n`;
      output += `      --gres=GRES            generic resources (e.g., gpu:4, gpu:h100:8)\n`;
      output += `      --gpus=N               shortcut for number of GPUs\n`;
      output += `      --gpus-per-node=N      GPUs per node\n`;
      output += `      --gpus-per-task=N      GPUs per task\n`;
      output += `      --mem=SIZE             memory per node (e.g., 100G)\n`;
      output += `      --mem-per-cpu=SIZE     memory per CPU\n`;
      output += `      --mem-per-gpu=SIZE     memory per GPU\n`;
      output += `  -A, --account=ACCOUNT      charge job to this account\n`;
      output += `      --qos=QOS              quality of service\n`;
      output += `  -d, --dependency=TYPE:JOBID\n`;
      output += `                             job dependency (after, afterok, afternotok,\n`;
      output += `                             afterany, singleton)\n`;
      output += `      --array=SPEC           job array specification (e.g., 0-15, 0-15%4)\n`;
      output += `      --exclusive            exclusive node access\n`;
      output += `      --reservation=NAME     use this reservation\n`;
      output += `  -V, --version              output version and exit\n`;
      output += `      --help                 show this help\n`;
      output += `\nDependency Types:\n`;
      output += `  after:jobid       - begin after job starts\n`;
      output += `  afterok:jobid     - begin after job completes successfully\n`;
      output += `  afternotok:jobid  - begin after job fails\n`;
      output += `  afterany:jobid    - begin after job completes (any status)\n`;
      output += `  singleton         - begin after all previous jobs with same name complete\n`;
      return this.createSuccess(output);
    }

    if (this.hasAnyFlag(parsed, ['version', 'V'])) {
      return this.createSuccess('slurm 23.02.6');
    }

    if (parsed.positionalArgs.length === 0 && parsed.subcommands.length === 0) {
      return this.createError('Error: Batch script not specified');
    }

    const scriptPath = parsed.positionalArgs[0] || parsed.subcommands[0];
    const jobId = this.nextJobId++;

    // Parse all job options
    const jobName = this.getFlagString(parsed, ['J', 'job-name']) ||
      scriptPath.split('/').pop()?.replace('.sh', '') || 'job';
    const partition = this.getFlagString(parsed, ['p', 'partition']) || 'gpu';
    const timeLimit = this.getFlagString(parsed, ['t', 'time']) || 'infinite';
    const nodesCount = this.getFlagNumber(parsed, ['N', 'nodes'], 1);
    const ntasks = this.getFlagNumber(parsed, ['n', 'ntasks'], 1);
    const cpusPerTask = this.getFlagNumber(parsed, ['c', 'cpus-per-task'], 1);
    const memorySpec = this.getFlagString(parsed, ['mem']) || '16G';
    const account = this.getFlagString(parsed, ['A', 'account']) || 'default';
    const qos = this.getFlagString(parsed, ['qos']) || 'normal';
    const dependency = this.getFlagString(parsed, ['d', 'dependency']);
    const arraySpec = this.getFlagString(parsed, ['array']);

    // Parse GPU count from gres or gpus flag
    const gresValue = this.getFlagString(parsed, ['gres']);
    let gpuCount = 0;
    if (gresValue && gresValue.includes('gpu')) {
      // Handle formats: gpu:4, gpu:h100:4, gpu:h100:8(S:0-1)
      const match = gresValue.match(/gpu(?::[a-z0-9]+)?:(\d+)/i);
      if (match) gpuCount = parseInt(match[1]);
    }
    const gpusFlagValue = this.getFlagNumber(parsed, ['gpus'], 0);
    const gpusPerNode = this.getFlagNumber(parsed, ['gpus-per-node'], 0);
    const gpusPerTask = this.getFlagNumber(parsed, ['gpus-per-task'], 0);
    if (gpusFlagValue > 0) gpuCount = gpusFlagValue;
    if (gpusPerNode > 0) gpuCount = gpusPerNode * nodesCount;
    if (gpusPerTask > 0) gpuCount = gpusPerTask * ntasks;
    if (gpuCount === 0) gpuCount = 1; // Default to 1 GPU

    // Validate dependency if specified
    let dependencyValid = true;
    let reasonPending = 'Resources';
    if (dependency) {
      const depMatch = dependency.match(/^(after|afterok|afternotok|afterany|singleton)(?::(\d+))?$/);
      if (!depMatch) {
        return this.createError(`Error: Invalid dependency specification: ${dependency}`);
      }
      const depType = depMatch[1];
      const depJobId = depMatch[2] ? parseInt(depMatch[2]) : null;

      if (depType !== 'singleton' && depJobId) {
        const depJob = this.jobs.find(j => j.jobId === depJobId);
        if (!depJob) {
          return this.createError(`Error: Dependency job ${depJobId} not found`);
        }
        reasonPending = `Dependency`;
        // Check if dependency is satisfied
        if (depType === 'afterok' && depJob.state !== 'COMPLETED') {
          dependencyValid = false;
        } else if (depType === 'afternotok' && depJob.state !== 'FAILED') {
          dependencyValid = false;
        } else if ((depType === 'after' || depType === 'afterany') &&
          depJob.state !== 'RUNNING' && depJob.state !== 'COMPLETED' && depJob.state !== 'FAILED') {
          dependencyValid = false;
        }
      } else if (depType === 'singleton') {
        // Check if any job with same name is running
        const runningWithSameName = this.jobs.find(j => j.name === jobName && j.state === 'RUNNING');
        if (runningWithSameName) {
          dependencyValid = false;
          reasonPending = 'DependencyNeverSatisfied';
        }
      }
    }

    const job: SlurmJob = {
      jobId,
      partition,
      name: jobName,
      user: 'root',
      state: 'PENDING',
      time: '0:00',
      timeLimit,
      nodes: nodesCount,
      nodelist: '',
      cpus: ntasks * cpusPerTask,
      gpus: gpuCount,
      memory: memorySpec,
      submitTime: new Date(),
      priority: 1000 + Math.floor(Math.random() * 100),
      account,
      qos,
      workDir: '/home/root',
      command: scriptPath,
      dependency,
      reasonPending,
    };

    // Handle array jobs
    if (arraySpec) {
      const arrayMatch = arraySpec.match(/^(\d+)-(\d+)(?:%(\d+))?$/);
      if (arrayMatch) {
        const start = parseInt(arrayMatch[1]);
        const end = parseInt(arrayMatch[2]);
        // Create array master job
        job.name = `${jobName}_[${start}-${end}]`;
        // For simulation, we'll just note it's an array job
      }
    }

    this.jobs.push(job);

    // Schedule job to run (if no blocking dependency)
    if (dependencyValid || !dependency) {
      setTimeout(() => {
        const currentJob = this.jobs.find(j => j.jobId === jobId);
        if (!currentJob || currentJob.state !== 'PENDING') return;

        const state = useSimulationStore.getState();
        const nodes = state.cluster.nodes;
        const availableNode = nodes.find(n => n.slurmState === 'idle');

        if (availableNode) {
          currentJob.state = 'RUNNING';
          currentJob.nodelist = availableNode.id;
          currentJob.startTime = new Date();
          currentJob.reasonPending = undefined;

          // Allocate GPUs with utilization update (cross-tool sync)
          const gpuIds = availableNode.gpus.slice(0, gpuCount).map(g => g.id);
          state.allocateGPUsForJob(availableNode.id, gpuIds, jobId, 85);
          state.setSlurmState(availableNode.id, 'alloc');
        } else {
          currentJob.reasonPending = 'Resources';
        }
      }, 100);
    }

    let output = `Submitted batch job ${jobId}`;
    if (dependency) {
      output += ` with dependency ${dependency}`;
    }
    output += '\n';

    return this.createSuccess(output);
  }

  // srun - Run job interactively
  executeSrun(parsed: ParsedCommand, context: CommandContext): CommandResult {
    // Handle --help
    if (this.hasAnyFlag(parsed, ['help'])) {
      let output = `Usage: srun [OPTIONS] command [args...]\n`;
      output += `  -N, --nodes=N              number of nodes\n`;
      output += `  -n, --ntasks=N             number of tasks\n`;
      output += `  -c, --cpus-per-task=N      CPUs per task\n`;
      output += `  -t, --time=TIME            time limit\n`;
      output += `  -p, --partition=PARTITION  partition\n`;
      output += `      --gpus=N               number of GPUs\n`;
      output += `      --container-image=IMG  container image\n`;
      output += `  -V, --version              output version and exit\n`;
      output += `      --help                 show this help\n`;
      return this.createSuccess(output);
    }

    if (this.hasAnyFlag(parsed, ['version', 'V'])) {
      return this.createSuccess('slurm 23.02.6');
    }

    const gpuCount = this.getFlagNumber(parsed, ['gpus'], 1);
    const containerImage = this.getFlagString(parsed, ['container-image']);

    let output = '';

    if (containerImage) {
      output += `srun: Pulling container image ${containerImage}...\n`;
      output += `srun: Container ready\n`;
    }

    output += `srun: job ${this.nextJobId} queued and waiting for resources\n`;
    output += `srun: job ${this.nextJobId} has been allocated resources\n`;

    // Find command to run in positional args
    if (parsed.positionalArgs.length > 0) {
      const command = parsed.positionalArgs.join(' ');

      if (command === 'nvidia-smi' || command.includes('nvidia-smi')) {
        const node = this.getNode(context);
        if (node) {
          output += '\n';
          output += `Allocated ${gpuCount} GPU(s) from ${node.id}\n`;
          output += `GPU 0: ${node.gpus[0].name}\n`;
        }
      } else {
        output += `\nExecuting: ${command}\n`;
        output += `Job completed successfully\n`;
      }
    }

    this.nextJobId++;

    return { output, exitCode: 0 };
  }

  // scancel - Cancel job
  executeScancel(parsed: ParsedCommand, _context: CommandContext): CommandResult {
    // Handle --help
    if (this.hasAnyFlag(parsed, ['help'])) {
      let output = `Usage: scancel [OPTIONS] [job_id[_array_id][.step_id]]\n`;
      output += `  -u, --user=user            cancel jobs of a specific user\n`;
      output += `  -A, --account=account      cancel jobs of a specific account\n`;
      output += `  -n, --name=name            cancel jobs with this name\n`;
      output += `  -p, --partition=partition  cancel jobs in this partition\n`;
      output += `  -t, --state=state          cancel jobs in this state\n`;
      output += `  -V, --version              output version and exit\n`;
      output += `      --help                 show this help\n`;
      return this.createSuccess(output);
    }

    if (this.hasAnyFlag(parsed, ['version', 'V'])) {
      return this.createSuccess('slurm 23.02.6');
    }

    if (parsed.positionalArgs.length === 0 && parsed.subcommands.length === 0) {
      return this.createError('Error: Job ID not specified');
    }

    const jobId = parseInt(parsed.positionalArgs[0] || parsed.subcommands[0]);
    const jobIdx = this.jobs.findIndex(j => j.jobId === jobId);

    if (jobIdx === -1) {
      return this.createError(`scancel: error: Kill job error on job id ${jobId}: Invalid job id specified`);
    }

    const job = this.jobs[jobIdx];

    if (job.state === 'RUNNING' && job.nodelist !== '(Resources)') {
      const state = useSimulationStore.getState();
      // Deallocate GPUs (cross-tool sync - resets utilization)
      state.deallocateGPUsForJob(job.jobId);
      state.setSlurmState(job.nodelist, 'idle');
    }

    this.jobs.splice(jobIdx, 1);

    return this.createSuccess(`scancel: Terminating job ${jobId}`);
  }

  // sacct - Job accounting
  executeSacct(parsed: ParsedCommand, _context: CommandContext): CommandResult {
    // Handle --help
    if (this.hasAnyFlag(parsed, ['help'])) {
      let output = `Usage: sacct [OPTIONS]\n`;
      output += `  -a, --allusers             display all users\n`;
      output += `  -j, --jobs=job_id(s)       comma separated list of jobs\n`;
      output += `  -n, --noheader             no header\n`;
      output += `  -o, --format=format        comma separated list of fields\n`;
      output += `  -S, --starttime=time       start time\n`;
      output += `  -E, --endtime=time         end time\n`;
      output += `  -u, --user=user(s)         comma separated list of users\n`;
      output += `  -V, --version              output version and exit\n`;
      output += `      --help                 show this help\n`;
      return this.createSuccess(output);
    }

    if (this.hasAnyFlag(parsed, ['version', 'V'])) {
      return this.createSuccess('slurm 23.02.6');
    }

    // SOURCE OF TRUTH: Column widths
    const COL_JOBID = 13;
    const COL_JOBNAME = 11;
    const COL_PARTITION = 11;
    const COL_ACCOUNT = 11;
    const COL_ALLOCCPUS = 11;
    const COL_STATE = 11;
    const COL_EXITCODE = 9;

    const jobId = this.getFlagNumber(parsed, ['j', 'jobs'], 0);

    let output = 'JobID'.padEnd(COL_JOBID) +
      'JobName'.padEnd(COL_JOBNAME) +
      'Partition'.padEnd(COL_PARTITION) +
      'Account'.padEnd(COL_ACCOUNT) +
      'AllocCPUS'.padEnd(COL_ALLOCCPUS) +
      'State'.padEnd(COL_STATE) +
      'ExitCode\n';

    output += '-'.repeat(COL_JOBID - 1) + ' ' +
      '-'.repeat(COL_JOBNAME - 1) + ' ' +
      '-'.repeat(COL_PARTITION - 1) + ' ' +
      '-'.repeat(COL_ACCOUNT - 1) + ' ' +
      '-'.repeat(COL_ALLOCCPUS - 1) + ' ' +
      '-'.repeat(COL_STATE - 1) + ' ' +
      '-'.repeat(COL_EXITCODE - 1) + '\n';

    const jobsToShow = jobId !== 0
      ? this.jobs.filter(j => j.jobId === jobId)
      : this.jobs.slice(-10);

    jobsToShow.forEach(job => {
      const exitCode = job.state === 'COMPLETED' ? '0:0' : job.state === 'FAILED' ? '1:0' : '';
      output += job.jobId.toString().padEnd(COL_JOBID) +
        job.name.padEnd(COL_JOBNAME) +
        job.partition.padEnd(COL_PARTITION) +
        'root'.padEnd(COL_ACCOUNT) +
        (job.nodes * 128).toString().padEnd(COL_ALLOCCPUS) +
        job.state.padEnd(COL_STATE) +
        exitCode + '\n';
    });

    return { output, exitCode: 0 };
  }
}
