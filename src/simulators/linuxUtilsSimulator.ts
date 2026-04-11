import type {
  CommandResult,
  CommandContext,
  ParsedCommand,
  SimulatorMetadata,
} from "@/types/commands";
import { BaseSimulator } from "./BaseSimulator";

/**
 * LinuxUtilsSimulator
 * Handles common Linux utility commands needed by narrative scenarios.
 *
 * Commands:
 * - cat: Concatenate and display file contents
 * - pwd: Print working directory
 * - ls: List directory contents
 * - head: Display first lines of a file
 * - tail: Display last lines of a file
 * - echo: Display a line of text
 * - wc: Word, line, character count
 * - grep: Search text using patterns
 * - ip: Show/manipulate routing, devices, policy routing
 * - env: Display environment variables
 * - dpkg: Debian package manager query
 * - apt: APT package manager
 * - nvcc: NVIDIA CUDA Compiler version
 * - iostat: Report CPU and I/O statistics
 * - efibootmgr: EFI Boot Manager
 * - nfsstat: NFS statistics
 * - ldconfig: Configure dynamic linker run-time bindings
 * - taskset: Set or retrieve process CPU affinity
 */
export class LinuxUtilsSimulator extends BaseSimulator {
  getMetadata(): SimulatorMetadata {
    return {
      name: "linux-utils",
      version: "1.0.0",
      description: "Common Linux utility commands",
      commands: [
        { name: "cat", description: "Concatenate and display file contents" },
        { name: "pwd", description: "Print working directory" },
        { name: "ls", description: "List directory contents" },
        { name: "head", description: "Display first lines of a file" },
        { name: "tail", description: "Display last lines of a file" },
        { name: "echo", description: "Display a line of text" },
        { name: "wc", description: "Word, line, character count" },
        { name: "grep", description: "Search text using patterns" },
        { name: "ip", description: "Show/manipulate network devices" },
        { name: "env", description: "Display environment variables" },
        { name: "dpkg", description: "Debian package manager query" },
        { name: "apt", description: "APT package manager" },
        { name: "nvcc", description: "NVIDIA CUDA Compiler version" },
        { name: "iostat", description: "Report CPU and I/O statistics" },
        { name: "efibootmgr", description: "EFI Boot Manager" },
        { name: "nfsstat", description: "NFS statistics" },
        {
          name: "ldconfig",
          description: "Configure dynamic linker run-time bindings",
        },
        {
          name: "taskset",
          description: "Set or retrieve process CPU affinity",
        },
      ],
    };
  }

  execute(parsed: ParsedCommand, context: CommandContext): CommandResult {
    parsed = this.parseWithSchema(parsed.raw);
    if (!parsed?.flags) {
      return this.createSuccess("");
    }

    if (this.hasAnyFlag(parsed, ["help"])) {
      return this.handleHelp();
    }

    switch (parsed.baseCommand) {
      case "cat":
        return this.handleCat(parsed, context);
      case "pwd":
        return this.handlePwd(parsed, context);
      case "ls":
        return this.handleLs(parsed, context);
      case "head":
        return this.handleHead(parsed, context);
      case "tail":
        return this.handleTail(parsed, context);
      case "echo":
        return this.handleEcho(parsed, context);
      case "wc":
        return this.handleWc(parsed, context);
      case "grep":
        return this.handleGrep(parsed, context);
      case "ip":
        return this.handleIp(parsed, context);
      case "env":
        return this.handleEnv(parsed, context);
      case "dpkg":
        return this.handleDpkg(parsed, context);
      case "apt":
        return this.handleApt(parsed, context);
      case "nvcc":
        return this.handleNvcc(parsed, context);
      case "iostat":
        return this.handleIostat(parsed, context);
      case "efibootmgr":
        return this.handleEfibootmgr(parsed, context);
      case "nfsstat":
        return this.handleNfsstat(parsed, context);
      case "ldconfig":
        return this.handleLdconfig(parsed, context);
      case "taskset":
        return this.handleTaskset(parsed, context);
      default:
        return this.createError(`Unknown command: ${parsed.baseCommand}`);
    }
  }

  // =========================================================================
  // Virtual filesystem for cat / head / tail / ls / wc
  // =========================================================================

  /**
   * Resolve a file or directory path against the current working directory.
   * Handles relative paths, `.`, and `..`.
   */
  private resolvePath(rawPath: string, context: CommandContext): string {
    let target = rawPath;

    // Resolve relative paths against cwd
    if (!target.startsWith("/")) {
      const base = context.currentPath || "/root";
      target = base === "/" ? `/${target}` : `${base}/${target}`;
    }

    // Normalize . and ..
    const parts = target.split("/").filter(Boolean);
    const resolved: string[] = [];
    for (const p of parts) {
      if (p === ".") continue;
      if (p === "..") {
        resolved.pop();
      } else {
        resolved.push(p);
      }
    }

    return "/" + resolved.join("/");
  }

  /**
   * Returns simulated file contents for known paths.
   * Unknown paths return undefined (triggering a "No such file" error).
   */
  private getFileContents(
    filePath: string,
    context: CommandContext,
  ): string | undefined {
    const resolved = this.resolvePath(filePath, context);
    const hostname = context.currentNode || "dgx-node-01";

    const files: Record<string, string> = {
      "/etc/hostname": hostname,

      "/etc/hosts": `127.0.0.1   localhost
127.0.1.1   ${hostname}
10.0.0.1    dgx-00
10.0.0.2    dgx-01
10.0.0.3    dgx-02
10.0.0.4    dgx-03

# The following lines are desirable for IPv6 capable hosts
::1     ip6-localhost ip6-loopback
fe00::0 ip6-localnet
ff00::0 ip6-mcastprefix
ff02::1 ip6-allnodes
ff02::2 ip6-allrouters`,

      "/proc/driver/nvidia/version": `NVRM version: NVIDIA UNIX x86_64 Kernel Module  535.129.03  Thu Dec  7 19:01:02 UTC 2023
GCC version:  gcc version 11.4.0 (Ubuntu 11.4.0-1ubuntu1~22.04)`,

      "/etc/slurm/gres.conf": `# GRES (Generic Resource) Configuration
# AutoDetect=nvml
Name=gpu Type=a100 File=/dev/nvidia0
Name=gpu Type=a100 File=/dev/nvidia1
Name=gpu Type=a100 File=/dev/nvidia2
Name=gpu Type=a100 File=/dev/nvidia3
Name=gpu Type=a100 File=/dev/nvidia4
Name=gpu Type=a100 File=/dev/nvidia5
Name=gpu Type=a100 File=/dev/nvidia6
Name=gpu Type=a100 File=/dev/nvidia7`,

      "/etc/slurm/slurm.conf": `# Slurm configuration file
ClusterName=dgx-cluster
SlurmctldHost=${hostname}
MpiDefault=pmix
ProctrackType=proctrack/cgroup
ReturnToService=2
SlurmctldPidFile=/run/slurmctld.pid
SlurmdPidFile=/run/slurmd.pid
SlurmdSpoolDir=/var/spool/slurmd
StateSaveLocation=/var/spool/slurmctld
SwitchType=switch/none
TaskPlugin=task/affinity,task/cgroup
GresTypes=gpu
NodeName=dgx-[00-03] Gres=gpu:a100:8 CPUs=128 Boards=1 SocketsPerBoard=2 CoresPerSocket=64 ThreadsPerCore=2 RealMemory=1024000
PartitionName=batch Nodes=dgx-[00-03] Default=YES MaxTime=INFINITE State=UP`,

      "/proc/net/bonding/bond0": `Ethernet Channel Bonding Driver: v5.15.0-91-generic

Bonding Mode: IEEE 802.3ad Dynamic link aggregation
Transmit Hash Policy: layer3+4 (1)
MII Status: up
MII Polling Interval (ms): 100
Up Delay (ms): 0
Down Delay (ms): 0
Peer Notification Delay (ms): 0

802.3ad info
LACP active: on
LACP rate: fast
Min links: 0
Aggregator selection policy (ad_select): stable

Slave Interface: enp1s0f0
MII Status: up
Speed: 100000 Mbps
Duplex: full
Link Failure Count: 0
Permanent HW addr: 00:11:22:33:44:55
Slave queue ID: 0
Aggregator ID: 1

Slave Interface: enp1s0f1
MII Status: up
Speed: 100000 Mbps
Duplex: full
Link Failure Count: 0
Permanent HW addr: 00:11:22:33:44:56
Slave queue ID: 0
Aggregator ID: 1`,

      "/root/HPL.dat": `HPLinpack benchmark input file
Innovative Computing Laboratory, University of Tennessee
HPL.out      output file name (if any)
6            device out (6=stdout,7=stderr,file)
1            # of problems sizes (N)
131072       Ns
1            # of NBs
384          NBs
0            PMAP process mapping (0=Row-,1=Column-major)
1            # of process grids (P x Q)
2            Ps
4            Qs
16.0         threshold
1            # of panel fact
2            PFACTs (0=left, 1=Crout, 2=Right)
1            # of recursive stopping criterium
4            NBMINs (>= 1)
1            # of panels in recursion
2            NDIVs
1            # of recursive panel fact.
1            RFACTs (0=left, 1=Crout, 2=Right)
1            # of broadcast
1            BCASTs (0=1rg,1=1rM,2=2rg,3=2rM,4=Lng,5=LnM)
1            # of lookahead depth
1            DEPTHs (>=0)
2            SWAP (0=bin-exch,1=long,2=mix)
64           swapping threshold
0            L1 in (0=transposed,1=no-transposed) form
0            U  in (0=transposed,1=no-transposed) form
1            Equilibration (0=no,1=yes)
8            memory alignment in double (> 0)`,

      "/home/admin/HPL.dat": `HPLinpack benchmark input file
Innovative Computing Laboratory, University of Tennessee
HPL.out      output file name (if any)
6            device out (6=stdout,7=stderr,file)
1            # of problems sizes (N)
131072       Ns
1            # of NBs
384          NBs
0            PMAP process mapping (0=Row-,1=Column-major)
1            # of process grids (P x Q)
2            Ps
4            Qs
16.0         threshold
1            # of panel fact
2            PFACTs (0=left, 1=Crout, 2=Right)
1            # of recursive stopping criterium
4            NBMINs (>= 1)
1            # of panels in recursion
2            NDIVs
1            # of recursive panel fact.
1            RFACTs (0=left, 1=Crout, 2=Right)
1            # of broadcast
1            BCASTs (0=1rg,1=1rM,2=2rg,3=2rM,4=Lng,5=LnM)
1            # of lookahead depth
1            DEPTHs (>=0)
2            SWAP (0=bin-exch,1=long,2=mix)
64           swapping threshold
0            L1 in (0=transposed,1=no-transposed) form
0            U  in (0=transposed,1=no-transposed) form
1            Equilibration (0=no,1=yes)
8            memory alignment in double (> 0)`,

      "/root/scripts/setup.sh": `#!/bin/bash
# DGX System Setup Script
set -e

echo "Configuring NVIDIA drivers..."
nvidia-smi -pm 1
nvidia-smi -ac 1215,1410

echo "Verifying GPU topology..."
nvidia-smi topo -m

echo "Setup complete."`,

      "/root/scripts/backup.sh": `#!/bin/bash
# Cluster Backup Script
set -e

BACKUP_DIR="/data/backups/$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"

echo "Backing up Slurm configuration..."
cp /etc/slurm/*.conf "$BACKUP_DIR/"

echo "Backing up NCCL configuration..."
cp /etc/nccl.conf "$BACKUP_DIR/"

echo "Backup complete: $BACKUP_DIR"`,

      "/home/admin/scripts/monitor.sh": `#!/bin/bash
# GPU Health Monitor Script
while true; do
  nvidia-smi --query-gpu=index,temperature.gpu,utilization.gpu,memory.used --format=csv,noheader
  sleep 5
done`,

      "/etc/nccl.conf": `# NCCL Configuration
NCCL_DEBUG=INFO
NCCL_IB_DISABLE=0
NCCL_SOCKET_IFNAME=eth0
NCCL_IB_HCA=mlx5
NCCL_TOPO_FILE=/etc/nccl/topo.xml`,

      "/etc/nvidia-container-runtime/config.toml": `[nvidia-container-cli]
#root = "/run/nvidia/driver"
#path = "/usr/bin/nvidia-container-cli"
environment = []
#debug = "/var/log/nvidia-container-toolkit.log"
#ldcache = "/etc/ld.so.cache"
load-kmods = true
#no-cgroups = false
#user = "root:video"
ldconfig = "@/sbin/ldconfig"

[nvidia-container-runtime]
#debug = "/var/log/nvidia-container-runtime.log"
log-level = "info"
mode = "auto"
runtimes = ["docker-runc", "runc"]

[nvidia-container-runtime.modes.csv]
mount-spec-path = "/etc/nvidia-container-runtime/host-files-for-container.d"`,

      "/etc/fstab": `# /etc/fstab: static file system information.
UUID=abcd-1234-efgh-5678   /               ext4    errors=remount-ro 0       1
UUID=dcba-4321-hgfe-8765   /boot/efi       vfat    umask=0077        0       1
nas01:/data                /data           nfs     defaults          0       0
nas01:/home                /home           nfs     defaults          0       0
lustre@tcp:/scratch        /scratch        lustre  defaults          0       0
tmpfs                      /dev/shm        tmpfs   defaults,size=64g 0       0`,

      "/etc/docker/daemon.json": `{
  "default-runtime": "nvidia",
  "runtimes": {
    "nvidia": {
      "path": "nvidia-container-runtime",
      "runtimeArgs": []
    }
  },
  "storage-driver": "overlay2",
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "100m",
    "max-file": "5"
  },
  "default-shm-size": "64G"
}`,

      "/var/log/syslog": `Feb 12 08:15:01 dgx-00 CRON[12345]: (root) CMD (test -x /usr/sbin/anacron || ( cd / && run-parts --report /etc/cron.daily ))
Feb 12 08:15:03 dgx-00 systemd[1]: Starting Daily apt download activities...
Feb 12 08:15:05 dgx-00 kernel: [234567.890] NVRM: GPU at 0000:07:00.0 has been initialized
Feb 12 08:15:05 dgx-00 kernel: [234567.891] NVRM: GPU at 0000:0a:00.0 has been initialized
Feb 12 08:15:06 dgx-00 nvidia-fabricmanager[1234]: GPU 0 (UUID: GPU-abc12345) registered
Feb 12 08:15:06 dgx-00 nvidia-fabricmanager[1234]: GPU 1 (UUID: GPU-def67890) registered
Feb 12 08:15:07 dgx-00 nvidia-fabricmanager[1234]: NVSwitch fabric initialized successfully
Feb 12 08:15:10 dgx-00 dcgm[5678]: DCGM initialized successfully
Feb 12 08:15:12 dgx-00 kernel: [234568.100] mlx5_core 0000:e3:00.0: firmware version: 20.38.1002
Feb 12 08:15:12 dgx-00 kernel: [234568.101] mlx5_core 0000:e3:00.0: ConnectX-7 HCA registered
Feb 12 08:15:15 dgx-00 slurmd[9012]: slurmd version 23.02.6 started
Feb 12 08:15:15 dgx-00 slurmd[9012]: Node configuration: CPUs=128 Boards=1 SocketsPerBoard=2
Feb 12 08:15:16 dgx-00 kernel: [234568.500] nvidia-peermem: module loaded
Feb 12 08:15:17 dgx-00 containerd[3456]: containerd started
Feb 12 08:15:18 dgx-00 dockerd[3457]: Docker daemon initialized
Feb 12 08:15:20 dgx-00 systemd[1]: Started NVIDIA Persistence Daemon.
Feb 12 08:15:21 dgx-00 nvidia-persistenced[7890]: PID file: /var/run/nvidia-persistenced/nvidia-persistenced.pid
Feb 12 08:15:22 dgx-00 kernel: [234569.000] ECC: All GPUs reporting 0 errors
Feb 12 08:15:25 dgx-00 nvsm[4321]: Health check completed: All components OK
Feb 12 08:15:30 dgx-00 CRON[12346]: (root) CMD (/usr/lib/nvidia/nvsm/nvsm_monitor)`,

      "/var/log/dmesg": `[    0.000000] Linux version 5.15.0-91-generic (buildd@lcy02-amd64-116) (gcc (Ubuntu 11.4.0-1ubuntu1~22.04) 11.4.0, GNU ld (GNU Binutils for Ubuntu) 2.38)
[    0.000000] Command line: BOOT_IMAGE=/vmlinuz-5.15.0-91-generic root=UUID=abcd-1234 ro quiet splash
[    1.234567] ACPI: RSDP 0x00000000000F0490 000024 (v02 NVIDIA)
[    2.345678] PCI: Using configuration type 1 for base access
[    5.123456] nvidia: loading out-of-tree module taints kernel.
[    5.234567] nvidia: module license 'NVIDIA' taints kernel.
[    5.345678] NVRM: loading NVIDIA UNIX x86_64 Kernel Module  535.129.03
[    5.456789] nvidia-nvlink: Nvlink Core is being initialized
[    5.567890] nvidia 0000:07:00.0: enabling device (0000 -> 0003)
[    5.678901] nvidia 0000:07:00.0: vgaarb: changed VGA decode
[    6.123456] NVRM: GPU 0000:07:00.0: RmInitAdapter succeeded!
[    6.234567] NVRM: GPU 0000:0a:00.0: RmInitAdapter succeeded!
[    6.345678] NVRM: GPU 0000:47:00.0: RmInitAdapter succeeded!
[    6.456789] NVRM: GPU 0000:4e:00.0: RmInitAdapter succeeded!
[    6.567890] NVRM: GPU 0000:87:00.0: RmInitAdapter succeeded!
[    6.678901] NVRM: GPU 0000:90:00.0: RmInitAdapter succeeded!
[    6.789012] NVRM: GPU 0000:b7:00.0: RmInitAdapter succeeded!
[    6.890123] NVRM: GPU 0000:bd:00.0: RmInitAdapter succeeded!
[    7.123456] nvidia-peermem: Mellanox different types of NVIDIA peer memory client registered
[    7.234567] mlx5_core 0000:e3:00.0: firmware version: 20.38.1002, flow steering mode(DMFS)`,

      "/var/log/kern.log": `Feb 12 08:15:05 dgx-00 kernel: [234567.890] NVRM: GPU at 0000:07:00.0 has been initialized
Feb 12 08:15:05 dgx-00 kernel: [234567.891] NVRM: GPU at 0000:0a:00.0 has been initialized
Feb 12 08:15:05 dgx-00 kernel: [234567.892] NVRM: GPU at 0000:47:00.0 has been initialized
Feb 12 08:15:05 dgx-00 kernel: [234567.893] NVRM: GPU at 0000:4e:00.0 has been initialized
Feb 12 08:15:12 dgx-00 kernel: [234568.100] mlx5_core 0000:e3:00.0: firmware version: 20.38.1002
Feb 12 08:15:12 dgx-00 kernel: [234568.101] mlx5_core 0000:e3:00.0: ConnectX-7 HCA registered
Feb 12 08:15:16 dgx-00 kernel: [234568.500] nvidia-peermem: module loaded
Feb 12 08:15:22 dgx-00 kernel: [234569.000] ECC: All GPUs reporting 0 errors
Feb 12 08:15:23 dgx-00 kernel: [234569.100] XID 79 on GPU 0000:07:00.0: GPU has fallen off the bus
Feb 12 08:15:24 dgx-00 kernel: [234569.200] NVRM: GPU at 0000:07:00.0: GPU is lost`,
    };

    return files[resolved];
  }

  // =========================================================================
  // Command handlers
  // =========================================================================

  /**
   * cat - Concatenate and display file contents
   */
  private handleCat(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    // Determine the file path from subcommands or positional args.
    // The parser may consume file paths as flag values (e.g. "-n /etc/hostname"
    // treats /etc/hostname as the value of -n). Detect this and correct.
    let filePath = parsed.subcommands[0] || parsed.positionalArgs[0];
    let showLineNumbers = false;

    const nFlagValue = parsed.flags.get("n");
    if (typeof nFlagValue === "string") {
      // Parser consumed the file path as a flag value -- treat it as the file
      filePath = filePath || nFlagValue;
      showLineNumbers = true;
    } else if (nFlagValue === true) {
      showLineNumbers = true;
    }

    if (!filePath) {
      return this.createError("cat: missing file operand");
    }

    const contents = this.getFileContents(filePath, context);
    if (contents === undefined) {
      return {
        output: `cat: ${filePath}: No such file or directory`,
        exitCode: 1,
      };
    }

    if (showLineNumbers) {
      const lines = contents.split("\n");
      const numbered = lines
        .map((line, i) => `     ${(i + 1).toString().padStart(3)}  ${line}`)
        .join("\n");
      return this.createSuccess(numbered);
    }

    return this.createSuccess(contents);
  }

  /**
   * pwd - Print working directory
   */
  private handlePwd(
    _parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    const cwd = context.currentPath || "/home/admin";
    return this.createSuccess(cwd);
  }

  /**
   * ls - List directory contents
   */
  private handleLs(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    let longFormat = this.hasAnyFlag(parsed, ["l"]);
    let all = this.hasAnyFlag(parsed, ["a"]);
    let rawPath = parsed.subcommands[0] || parsed.positionalArgs[0];

    // Handle combined short flags (e.g., -la, -lah, -al) that the parser
    // treats as a single multi-char flag, consuming the next arg as its value
    for (const [key, value] of parsed.flags) {
      if (key.length > 1 && /^[laRrhS]+$/.test(key)) {
        if (key.includes("l")) longFormat = true;
        if (key.includes("a")) all = true;
        if (!rawPath && typeof value === "string" && value !== "true") {
          rawPath = value;
        }
      }
    }

    const dirPath = rawPath
      ? this.resolvePath(rawPath, context)
      : context.currentPath || "/root";

    // Simulated directory listings
    const directories: Record<string, string[][]> = {
      "/": [
        ["drwxr-xr-x", "2", "root", "root", "4096", "Jan 10 12:00", "bin"],
        ["drwxr-xr-x", "4", "root", "root", "4096", "Jan 10 12:00", "boot"],
        ["drwxr-xr-x", "18", "root", "root", "4200", "Jan 10 12:00", "dev"],
        ["drwxr-xr-x", "130", "root", "root", "12288", "Jan 10 12:00", "etc"],
        ["drwxr-xr-x", "3", "root", "root", "4096", "Jan 10 12:00", "home"],
        ["drwxr-xr-x", "22", "root", "root", "4096", "Jan 10 12:00", "lib"],
        ["drwxr-xr-x", "2", "root", "root", "4096", "Jan 10 12:00", "lib64"],
        [
          "drwx------",
          "2",
          "root",
          "root",
          "16384",
          "Jan 10 12:00",
          "lost+found",
        ],
        ["drwxr-xr-x", "2", "root", "root", "4096", "Jan 10 12:00", "media"],
        ["drwxr-xr-x", "2", "root", "root", "4096", "Jan 10 12:00", "mnt"],
        ["drwxr-xr-x", "4", "root", "root", "4096", "Jan 10 12:00", "opt"],
        ["dr-xr-xr-x", "580", "root", "root", "0", "Jan 10 12:00", "proc"],
        ["drwx------", "6", "root", "root", "4096", "Jan 10 12:00", "root"],
        ["drwxr-xr-x", "32", "root", "root", "940", "Jan 10 12:00", "run"],
        ["drwxr-xr-x", "2", "root", "root", "12288", "Jan 10 12:00", "sbin"],
        ["drwxr-xr-x", "2", "root", "root", "4096", "Jan 10 12:00", "srv"],
        ["dr-xr-xr-x", "13", "root", "root", "0", "Jan 10 12:00", "sys"],
        ["drwxrwxrwt", "14", "root", "root", "4096", "Feb 12 08:15", "tmp"],
        ["drwxr-xr-x", "12", "root", "root", "4096", "Jan 10 12:00", "usr"],
        ["drwxr-xr-x", "14", "root", "root", "4096", "Jan 10 12:00", "var"],
      ],
      "/root": [
        ["-rw-r--r--", "1", "root", "root", "3106", "Jan 10 12:00", ".bashrc"],
        ["-rw-r--r--", "1", "root", "root", "161", "Jan 10 12:00", ".profile"],
        ["drwxr-xr-x", "2", "root", "root", "4096", "Jan 10 12:00", "scripts"],
        ["-rw-r--r--", "1", "root", "root", "2048", "Jan 10 12:00", "HPL.dat"],
      ],
      "/home/admin": [
        [
          "-rw-r--r--",
          "1",
          "admin",
          "admin",
          "3106",
          "Jan 10 12:00",
          ".bashrc",
        ],
        [
          "-rw-r--r--",
          "1",
          "admin",
          "admin",
          "161",
          "Jan 10 12:00",
          ".profile",
        ],
        [
          "drwxr-xr-x",
          "2",
          "admin",
          "admin",
          "4096",
          "Jan 10 12:00",
          "scripts",
        ],
        [
          "-rw-r--r--",
          "1",
          "admin",
          "admin",
          "2048",
          "Jan 10 12:00",
          "HPL.dat",
        ],
      ],
      "/root/scripts": [
        ["-rwxr-xr-x", "1", "root", "root", "1024", "Jan 10 12:00", "setup.sh"],
        [
          "-rwxr-xr-x",
          "1",
          "root",
          "root",
          "2048",
          "Jan 10 12:00",
          "backup.sh",
        ],
      ],
      "/home/admin/scripts": [
        [
          "-rwxr-xr-x",
          "1",
          "admin",
          "admin",
          "1536",
          "Jan 10 12:00",
          "monitor.sh",
        ],
      ],
      "/etc/slurm": [
        [
          "-rw-r--r--",
          "1",
          "root",
          "root",
          "1234",
          "Jan 10 12:00",
          "slurm.conf",
        ],
        ["-rw-r--r--", "1", "root", "root", "512", "Jan 10 12:00", "gres.conf"],
        [
          "-rw-r--r--",
          "1",
          "root",
          "root",
          "256",
          "Jan 10 12:00",
          "cgroup.conf",
        ],
      ],
      "/dev": [
        ["crw-rw-rw-", "1", "root", "root", "195,0", "Jan 10 12:00", "nvidia0"],
        ["crw-rw-rw-", "1", "root", "root", "195,1", "Jan 10 12:00", "nvidia1"],
        ["crw-rw-rw-", "1", "root", "root", "195,2", "Jan 10 12:00", "nvidia2"],
        ["crw-rw-rw-", "1", "root", "root", "195,3", "Jan 10 12:00", "nvidia3"],
        ["crw-rw-rw-", "1", "root", "root", "195,4", "Jan 10 12:00", "nvidia4"],
        ["crw-rw-rw-", "1", "root", "root", "195,5", "Jan 10 12:00", "nvidia5"],
        ["crw-rw-rw-", "1", "root", "root", "195,6", "Jan 10 12:00", "nvidia6"],
        ["crw-rw-rw-", "1", "root", "root", "195,7", "Jan 10 12:00", "nvidia7"],
        [
          "crw-rw-rw-",
          "1",
          "root",
          "root",
          "195,255",
          "Jan 10 12:00",
          "nvidiactl",
        ],
        [
          "crw-rw-rw-",
          "1",
          "root",
          "root",
          "235,0",
          "Jan 10 12:00",
          "nvidia-uvm",
        ],
      ],
      "/etc": [
        ["drwxr-xr-x", "2", "root", "root", "4096", "Jan 10 12:00", "apt"],
        [
          "-rw-r--r--",
          "1",
          "root",
          "root",
          "2981",
          "Jan 10 12:00",
          "bash.bashrc",
        ],
        ["-rw-r--r--", "1", "root", "root", "367", "Jan 10 12:00", "hosts"],
        ["-rw-r--r--", "1", "root", "root", "14", "Jan 10 12:00", "hostname"],
        ["drwxr-xr-x", "2", "root", "root", "4096", "Jan 10 12:00", "network"],
        ["drwxr-xr-x", "2", "root", "root", "4096", "Jan 10 12:00", "nvidia"],
        ["-rw-r--r--", "1", "root", "root", "552", "Jan 10 12:00", "passwd"],
        ["drwxr-xr-x", "2", "root", "root", "4096", "Jan 10 12:00", "slurm"],
        [
          "-rw-r--r--",
          "1",
          "root",
          "root",
          "1722",
          "Jan 10 12:00",
          "sysctl.conf",
        ],
      ],
      "/home": [
        ["drwxr-xr-x", "4", "admin", "admin", "4096", "Jan 10 12:00", "admin"],
      ],
      "/usr": [
        ["drwxr-xr-x", "2", "root", "root", "69632", "Jan 10 12:00", "bin"],
        ["drwxr-xr-x", "2", "root", "root", "4096", "Jan 10 12:00", "include"],
        ["drwxr-xr-x", "92", "root", "root", "4096", "Jan 10 12:00", "lib"],
        ["drwxr-xr-x", "12", "root", "root", "4096", "Jan 10 12:00", "local"],
        ["drwxr-xr-x", "2", "root", "root", "12288", "Jan 10 12:00", "sbin"],
        ["drwxr-xr-x", "160", "root", "root", "4096", "Jan 10 12:00", "share"],
      ],
      "/usr/bin": [
        ["-rwxr-xr-x", "1", "root", "root", "35312", "Jan 10 12:00", "bash"],
        ["-rwxr-xr-x", "1", "root", "root", "142848", "Jan 10 12:00", "grep"],
        ["-rwxr-xr-x", "1", "root", "root", "59160", "Jan 10 12:00", "less"],
        [
          "-rwxr-xr-x",
          "1",
          "root",
          "root",
          "14568",
          "Jan 10 12:00",
          "nvidia-smi",
        ],
        ["-rwxr-xr-x", "1", "root", "root", "45896", "Jan 10 12:00", "python3"],
        ["-rwxr-xr-x", "1", "root", "root", "35312", "Jan 10 12:00", "vim"],
      ],
      "/var": [
        ["drwxr-xr-x", "2", "root", "root", "4096", "Jan 10 12:00", "cache"],
        ["drwxr-xr-x", "2", "root", "root", "4096", "Jan 10 12:00", "lib"],
        ["drwxrwxr-x", "14", "syslog", "adm", "4096", "Feb 12 08:15", "log"],
        ["drwxr-xr-x", "2", "root", "root", "4096", "Jan 10 12:00", "run"],
        ["drwxr-xr-x", "2", "root", "root", "4096", "Jan 10 12:00", "spool"],
        ["drwxrwxrwt", "2", "root", "root", "4096", "Jan 10 12:00", "tmp"],
      ],
      "/var/log": [
        [
          "-rw-r-----",
          "1",
          "syslog",
          "adm",
          "234567",
          "Feb 12 08:15",
          "syslog",
        ],
        [
          "-rw-r-----",
          "1",
          "root",
          "adm",
          "123456",
          "Feb 12 08:15",
          "kern.log",
        ],
        ["-rw-r-----", "1", "root", "adm", "345678", "Feb 12 08:15", "dmesg"],
        ["-rw-r-----", "1", "root", "adm", "67890", "Feb 12 08:15", "auth.log"],
        ["-rw-r-----", "1", "root", "adm", "45678", "Feb 12 08:15", "dpkg.log"],
      ],
    };

    const entries = directories[dirPath];
    if (!entries) {
      // Infer child directories from known paths to give a plausible listing
      const prefix = dirPath === "/" ? "/" : dirPath + "/";
      const children = new Set<string>();
      for (const knownPath of Object.keys(directories)) {
        if (knownPath.startsWith(prefix) && knownPath !== dirPath) {
          const rest = knownPath.slice(prefix.length);
          const firstSegment = rest.split("/")[0];
          if (firstSegment) children.add(firstSegment);
        }
      }
      if (children.size > 0) {
        const names = [...children].sort();
        if (longFormat) {
          const lines = names.map(
            (n) => `drwxr-xr-x  2 root root 4096 Jan 10 12:00 ${n}`,
          );
          return this.createSuccess(
            [`total ${names.length * 4}`, ...lines].join("\n"),
          );
        }
        return this.createSuccess(names.join("  "));
      }
      // Truly unknown directory — show empty
      const genericOutput = longFormat ? "total 0" : "";
      return this.createSuccess(genericOutput);
    }

    if (longFormat) {
      const header = `total ${entries.length * 4}`;
      const lines = entries
        .filter((e) => all || !e[6].startsWith("."))
        .map((e) => e.join("  "));
      return this.createSuccess([header, ...lines].join("\n"));
    }

    const names = entries
      .filter((e) => all || !e[6].startsWith("."))
      .map((e) => e[6]);
    return this.createSuccess(names.join("  "));
  }

  /**
   * head - Display first lines of a file
   */
  private handleHead(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    let filePath = parsed.subcommands[0] || parsed.positionalArgs[0];
    let numLines = this.getFlagNumber(parsed, ["n"], -1);

    // Check for numeric shorthand: -5 parsed as flag "5" with filename as value
    if (numLines === -1) {
      for (const [key, value] of parsed.flags) {
        if (/^\d+$/.test(key)) {
          numLines = parseInt(key, 10);
          if (!filePath && typeof value === "string") {
            filePath = value;
          }
          break;
        }
      }
    }
    if (numLines === -1) numLines = 10;

    if (!filePath) {
      return this.createError("head: missing file operand");
    }

    const contents = this.getFileContents(filePath, context);
    if (contents === undefined) {
      return {
        output: `head: cannot open '${filePath}' for reading: No such file or directory`,
        exitCode: 1,
      };
    }

    const lines = contents.split("\n").slice(0, numLines);
    return this.createSuccess(lines.join("\n"));
  }

  /**
   * tail - Display last lines of a file
   */
  private handleTail(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    let filePath = parsed.subcommands[0] || parsed.positionalArgs[0];
    let numLines = this.getFlagNumber(parsed, ["n"], -1);

    // Handle -f flag: parser may consume the filename as -f's value
    if (!filePath) {
      const fValue = parsed.flags.get("f");
      if (typeof fValue === "string" && fValue !== "true") {
        filePath = fValue;
      }
    }

    // Check for numeric shorthand: -20 parsed as flag "20" with filename as value
    if (numLines === -1) {
      for (const [key, value] of parsed.flags) {
        if (/^\d+$/.test(key)) {
          numLines = parseInt(key, 10);
          // The filename was consumed as the flag value
          if (!filePath && typeof value === "string") {
            filePath = value;
          }
          break;
        }
      }
    }
    if (numLines === -1) numLines = 10;

    if (!filePath) {
      return this.createError("tail: missing file operand");
    }

    const contents = this.getFileContents(filePath, context);
    if (contents === undefined) {
      return {
        output: `tail: cannot open '${filePath}' for reading: No such file or directory`,
        exitCode: 1,
      };
    }

    const allLines = contents.split("\n");
    const lines = allLines.slice(Math.max(0, allLines.length - numLines));
    return this.createSuccess(lines.join("\n"));
  }

  /**
   * echo - Display a line of text
   */
  private handleEcho(
    parsed: ParsedCommand,
    _context: CommandContext,
  ): CommandResult {
    // Reconstruct text from subcommands and positional args
    const text = [...parsed.subcommands, ...parsed.positionalArgs].join(" ");
    return this.createSuccess(text);
  }

  /**
   * wc - Word, line, character count
   */
  private handleWc(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    // Handle flag-value confusion: -l /path may parse as flag l="/path"
    let filePath = parsed.subcommands[0] || parsed.positionalArgs[0];
    let linesOnly = false;
    let wordsOnly = false;
    let charsOnly = false;

    for (const flag of ["l", "w", "c"]) {
      const val = parsed.flags.get(flag);
      if (typeof val === "string") {
        filePath = filePath || val;
        if (flag === "l") linesOnly = true;
        if (flag === "w") wordsOnly = true;
        if (flag === "c") charsOnly = true;
      } else if (val === true) {
        if (flag === "l") linesOnly = true;
        if (flag === "w") wordsOnly = true;
        if (flag === "c") charsOnly = true;
      }
    }

    if (!filePath) {
      return this.createError("wc: missing file operand");
    }

    const contents = this.getFileContents(filePath, context);
    if (contents === undefined) {
      return {
        output: `wc: ${filePath}: No such file or directory`,
        exitCode: 1,
      };
    }

    const lines = contents.split("\n").length;
    const words = contents.split(/\s+/).filter(Boolean).length;
    const chars = contents.length;

    if (linesOnly) {
      return this.createSuccess(`${lines} ${filePath}`);
    }
    if (wordsOnly) {
      return this.createSuccess(`${words} ${filePath}`);
    }
    if (charsOnly) {
      return this.createSuccess(`${chars} ${filePath}`);
    }

    return this.createSuccess(`  ${lines}  ${words} ${chars} ${filePath}`);
  }

  /**
   * grep - Search text using patterns
   * In this simulator, grep is mostly a no-op since piped grep is handled
   * at the terminal level. This handles standalone grep usage.
   */
  private handleGrep(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    const pattern = parsed.subcommands[0] || parsed.positionalArgs[0];
    const filePath = parsed.subcommands[1] || parsed.positionalArgs[1];

    if (!pattern) {
      return this.createError("grep: missing pattern");
    }

    if (!filePath) {
      // No file specified - would read from stdin in real Linux
      return this.createSuccess("");
    }

    const contents = this.getFileContents(filePath, context);
    if (contents === undefined) {
      return {
        output: `grep: ${filePath}: No such file or directory`,
        exitCode: 2,
      };
    }

    const caseInsensitive = this.hasAnyFlag(parsed, ["i"]);
    const regex = new RegExp(
      pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      caseInsensitive ? "i" : undefined,
    );

    const matchingLines = contents
      .split("\n")
      .filter((line) => regex.test(line));

    if (matchingLines.length === 0) {
      return { output: "", exitCode: 1 };
    }

    return this.createSuccess(matchingLines.join("\n"));
  }

  /**
   * ip - Show/manipulate routing, devices, policy routing
   */
  private handleIp(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    const subcommand = parsed.subcommands[0] || "addr";
    const action = parsed.subcommands[1] || "";
    const device = parsed.subcommands[2] || "";
    const hostname = context.currentNode || "dgx-00";

    if (
      subcommand === "addr" ||
      subcommand === "address" ||
      subcommand === "a"
    ) {
      if (action === "show" && device) {
        // Show specific interface
        return this.handleIpAddrShow(device, hostname);
      }
      // Show all interfaces
      return this.handleIpAddrAll(hostname);
    }

    if (subcommand === "link") {
      if (action === "show" && device) {
        return this.handleIpLinkShow(device);
      }
      return this.handleIpLinkAll();
    }

    if (subcommand === "route" || subcommand === "r") {
      return this.handleIpRoute();
    }

    // Default to addr
    return this.handleIpAddrAll(hostname);
  }

  private handleIpAddrShow(device: string, _hostname: string): CommandResult {
    const interfaces: Record<string, string> = {
      ib0: `4: ib0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 4092 qdisc mq state UP group default qlen 256
    link/infiniband 80:00:00:02:fe:80:00:00:00:00:00:00:00:11:22:03:00:44:55:66 brd 00:ff:ff:ff:ff:12:40:1b:ff:ff:00:00:00:00:00:00:00:00:00:00
    inet 10.0.1.1/24 brd 10.0.1.255 scope global ib0
       valid_lft forever preferred_lft forever
    inet6 fe80::211:2203:44:5566/64 scope link
       valid_lft forever preferred_lft forever`,
      ib1: `5: ib1: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 4092 qdisc mq state UP group default qlen 256
    link/infiniband 80:00:00:02:fe:80:00:00:00:00:00:00:00:11:22:03:00:44:55:67 brd 00:ff:ff:ff:ff:12:40:1b:ff:ff:00:00:00:00:00:00:00:00:00:00
    inet 10.0.2.1/24 brd 10.0.2.255 scope global ib1
       valid_lft forever preferred_lft forever`,
      eth0: `2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc mq state UP group default qlen 1000
    link/ether 00:11:22:33:44:55 brd ff:ff:ff:ff:ff:ff
    inet 10.0.0.1/24 brd 10.0.0.255 scope global eth0
       valid_lft forever preferred_lft forever
    inet6 fe80::211:22ff:fe33:4455/64 scope link
       valid_lft forever preferred_lft forever`,
      bond0: `6: bond0: <BROADCAST,MULTICAST,MASTER,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default qlen 1000
    link/ether 00:11:22:33:44:55 brd ff:ff:ff:ff:ff:ff
    inet 192.168.1.10/24 brd 192.168.1.255 scope global bond0
       valid_lft forever preferred_lft forever`,
      lo: `1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
    inet6 ::1/128 scope host
       valid_lft forever preferred_lft forever`,
    };

    const output = interfaces[device];
    if (!output) {
      return {
        output: `Device "${device}" does not exist.`,
        exitCode: 1,
      };
    }

    return this.createSuccess(output);
  }

  private handleIpAddrAll(_hostname: string): CommandResult {
    const output = `1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
    inet6 ::1/128 scope host
       valid_lft forever preferred_lft forever
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc mq state UP group default qlen 1000
    link/ether 00:11:22:33:44:55 brd ff:ff:ff:ff:ff:ff
    inet 10.0.0.1/24 brd 10.0.0.255 scope global eth0
       valid_lft forever preferred_lft forever
    inet6 fe80::211:22ff:fe33:4455/64 scope link
       valid_lft forever preferred_lft forever
3: eth1: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc mq state UP group default qlen 1000
    link/ether 00:11:22:33:44:56 brd ff:ff:ff:ff:ff:ff
    inet 10.0.0.2/24 brd 10.0.0.255 scope global eth1
       valid_lft forever preferred_lft forever
4: ib0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 4092 qdisc mq state UP group default qlen 256
    link/infiniband 80:00:00:02:fe:80:00:00:00:00:00:00:00:11:22:03:00:44:55:66 brd 00:ff:ff:ff:ff:12:40:1b:ff:ff:00:00:00:00:00:00:00:00:00:00
    inet 10.0.1.1/24 brd 10.0.1.255 scope global ib0
       valid_lft forever preferred_lft forever
    inet6 fe80::211:2203:44:5566/64 scope link
       valid_lft forever preferred_lft forever
5: ib1: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 4092 qdisc mq state UP group default qlen 256
    link/infiniband 80:00:00:02:fe:80:00:00:00:00:00:00:00:11:22:03:00:44:55:67 brd 00:ff:ff:ff:ff:12:40:1b:ff:ff:00:00:00:00:00:00:00:00:00:00
    inet 10.0.2.1/24 brd 10.0.2.255 scope global ib1
       valid_lft forever preferred_lft forever
6: bond0: <BROADCAST,MULTICAST,MASTER,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default qlen 1000
    link/ether 00:11:22:33:44:55 brd ff:ff:ff:ff:ff:ff
    inet 192.168.1.10/24 brd 192.168.1.255 scope global bond0
       valid_lft forever preferred_lft forever`;

    return this.createSuccess(output);
  }

  private handleIpLinkShow(device: string): CommandResult {
    const interfaces: Record<string, string> = {
      eth0: `2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc mq state UP mode DEFAULT group default qlen 1000
    link/ether 00:11:22:33:44:55 brd ff:ff:ff:ff:ff:ff`,
      eth1: `3: eth1: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc mq state UP mode DEFAULT group default qlen 1000
    link/ether 00:11:22:33:44:56 brd ff:ff:ff:ff:ff:ff`,
      ib0: `4: ib0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 4092 qdisc mq state UP mode DEFAULT group default qlen 256
    link/infiniband 80:00:00:02:fe:80:00:00:00:00:00:00:00:11:22:03:00:44:55:66 brd 00:ff:ff:ff:ff:12:40:1b:ff:ff:00:00:00:00:00:00:00:00:00:00`,
      ib1: `5: ib1: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 4092 qdisc mq state UP mode DEFAULT group default qlen 256
    link/infiniband 80:00:00:02:fe:80:00:00:00:00:00:00:00:11:22:03:00:44:55:67 brd 00:ff:ff:ff:ff:12:40:1b:ff:ff:00:00:00:00:00:00:00:00:00:00`,
      bond0: `6: bond0: <BROADCAST,MULTICAST,MASTER,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP mode DEFAULT group default qlen 1000
    link/ether 00:11:22:33:44:55 brd ff:ff:ff:ff:ff:ff`,
    };

    const output = interfaces[device];
    if (!output) {
      return {
        output: `Device "${device}" does not exist.`,
        exitCode: 1,
      };
    }

    return this.createSuccess(output);
  }

  private handleIpLinkAll(): CommandResult {
    const output = `1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN mode DEFAULT group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc mq state UP mode DEFAULT group default qlen 1000
    link/ether 00:11:22:33:44:55 brd ff:ff:ff:ff:ff:ff
3: eth1: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc mq state UP mode DEFAULT group default qlen 1000
    link/ether 00:11:22:33:44:56 brd ff:ff:ff:ff:ff:ff
4: ib0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 4092 qdisc mq state UP mode DEFAULT group default qlen 256
    link/infiniband 80:00:00:02:fe:80:00:00:00:00:00:00:00:11:22:03:00:44:55:66 brd 00:ff:ff:ff:ff:12:40:1b:ff:ff:00:00:00:00:00:00:00:00:00:00
5: ib1: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 4092 qdisc mq state UP mode DEFAULT group default qlen 256
    link/infiniband 80:00:00:02:fe:80:00:00:00:00:00:00:00:11:22:03:00:44:55:67 brd 00:ff:ff:ff:ff:12:40:1b:ff:ff:00:00:00:00:00:00:00:00:00:00
6: bond0: <BROADCAST,MULTICAST,MASTER,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP mode DEFAULT group default qlen 1000
    link/ether 00:11:22:33:44:55 brd ff:ff:ff:ff:ff:ff`;

    return this.createSuccess(output);
  }

  private handleIpRoute(): CommandResult {
    const output = `default via 10.0.0.254 dev eth0 proto static
10.0.0.0/24 dev eth0 proto kernel scope link src 10.0.0.1
10.0.1.0/24 dev ib0 proto kernel scope link src 10.0.1.1
10.0.2.0/24 dev ib1 proto kernel scope link src 10.0.2.1
192.168.1.0/24 dev bond0 proto kernel scope link src 192.168.1.10`;

    return this.createSuccess(output);
  }

  /**
   * env - Display environment variables
   * Includes NCCL-related variables for scenario validation
   */
  private handleEnv(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    const rawCommand = parsed.raw || "";
    const grepNCCL =
      rawCommand.includes("grep NCCL") || rawCommand.includes("grep -i nccl");
    const grepCUDA =
      rawCommand.includes("grep CUDA") || rawCommand.includes("grep -i cuda");

    const node = this.resolveNode(context);
    const cudaVersion = node?.cudaVersion ?? "12.2";
    const cudaMajor = cudaVersion.split(".").slice(0, 2).join(".");

    const ncclVars = [
      "NCCL_DEBUG=INFO",
      "NCCL_IB_DISABLE=0",
      "NCCL_SOCKET_IFNAME=eth0",
      "NCCL_IB_HCA=mlx5",
      "NCCL_NET_GDR_LEVEL=5",
      "NCCL_P2P_LEVEL=NVL",
      "NCCL_TOPO_FILE=/etc/nccl/topo.xml",
    ];

    const cudaVars = [
      `CUDA_HOME=/usr/local/cuda-${cudaMajor}`,
      `CUDA_PATH=/usr/local/cuda-${cudaMajor}`,
      "CUDA_VISIBLE_DEVICES=0,1,2,3,4,5,6,7",
    ];

    if (grepNCCL) {
      return this.createSuccess(ncclVars.join("\n"));
    }

    if (grepCUDA) {
      return this.createSuccess(cudaVars.join("\n"));
    }

    // Full environment
    const allVars = [
      "SHELL=/bin/bash",
      `PATH=/usr/local/cuda-${cudaMajor}/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin`,
      "HOME=/root",
      "USER=root",
      "LOGNAME=root",
      "LANG=en_US.UTF-8",
      "TERM=xterm-256color",
      "HOSTNAME=dgx-00",
      `LD_LIBRARY_PATH=/usr/local/cuda-${cudaMajor}/lib64:/usr/lib/x86_64-linux-gnu`,
      ...cudaVars,
      ...ncclVars,
      "NVIDIA_DRIVER_CAPABILITIES=compute,utility,graphics",
      "NVIDIA_VISIBLE_DEVICES=all",
      "SLURM_CONF=/etc/slurm/slurm.conf",
      "MODULEPATH=/usr/share/modules/modulefiles",
    ];

    return this.createSuccess(allVars.join("\n"));
  }

  /**
   * dpkg - Debian package manager query
   * Key for container-crisis scenario
   */
  private handleDpkg(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    const rawCommand = parsed.raw || "";
    const node = this.resolveNode(context);
    const cudaVersion = node?.cudaVersion ?? "12.2";
    const cudaMajor = cudaVersion.split(".").slice(0, 2).join(".");
    const cudaPkgSlug = cudaMajor.replace(".", "-");
    const listFlag = this.hasAnyFlag(parsed, ["l"]);
    const grepNvidiaContainer =
      rawCommand.includes("grep nvidia-container") ||
      rawCommand.includes("grep -i nvidia-container");
    const grepNvidia =
      rawCommand.includes("grep nvidia") ||
      rawCommand.includes("grep -i nvidia");

    if (listFlag || parsed.subcommands.includes("list")) {
      const nvidiaContainerPkgs = [
        "ii  nvidia-container-toolkit        1.14.3-1        amd64     NVIDIA Container Toolkit (includes runtime, hook, CLI)",
        "ii  nvidia-container-toolkit-base   1.14.3-1        amd64     NVIDIA Container Toolkit Base",
        "ii  nvidia-container-runtime        3.14.0-1        amd64     NVIDIA Container Runtime (runc wrapper)",
        "ii  libnvidia-container1            1.14.3-1        amd64     NVIDIA container library",
        "ii  libnvidia-container-tools       1.14.3-1        amd64     NVIDIA container library tools",
      ];

      const nvidiaDriverPkgs = [
        "ii  nvidia-driver-535               535.129.03-0ubuntu1  amd64     NVIDIA driver metapackage",
        "ii  nvidia-dkms-535                 535.129.03-0ubuntu1  amd64     NVIDIA DKMS package",
        "ii  nvidia-kernel-source-535        535.129.03-0ubuntu1  amd64     NVIDIA kernel source package",
        "ii  nvidia-utils-535                535.129.03-0ubuntu1  amd64     NVIDIA driver utilities",
      ];

      if (grepNvidiaContainer) {
        return this.createSuccess(
          `Desired=Unknown/Install/Remove/Purge/Hold\n| Status=Not/Inst/Conf-files/Unpacked/halF-conf/Half-inst/trig-aWait/Trig-pend\n|/ Err?=(none)/Reinst-required (Status,Err: uppercase=bad)\n||/ Name                            Version             Architecture Description\n+++-===============================-===================-============-==================================================\n${nvidiaContainerPkgs.join("\n")}`,
        );
      }

      if (grepNvidia) {
        return this.createSuccess(
          `Desired=Unknown/Install/Remove/Purge/Hold\n| Status=Not/Inst/Conf-files/Unpacked/halF-conf/Half-inst/trig-aWait/Trig-pend\n|/ Err?=(none)/Reinst-required (Status,Err: uppercase=bad)\n||/ Name                            Version             Architecture Description\n+++-===============================-===================-============-==================================================\n${[...nvidiaDriverPkgs, ...nvidiaContainerPkgs].join("\n")}`,
        );
      }

      // Full package listing (abbreviated)
      return this.createSuccess(
        `Desired=Unknown/Install/Remove/Purge/Hold\n| Status=Not/Inst/Conf-files/Unpacked/halF-conf/Half-inst/trig-aWait/Trig-pend\n|/ Err?=(none)/Reinst-required (Status,Err: uppercase=bad)\n||/ Name                            Version             Architecture Description\n+++-===============================-===================-============-==================================================\nii  apt                             2.4.10              amd64        commandline package manager\nii  base-files                      12ubuntu4.4         amd64        Debian base system miscellaneous files\nii  bash                            5.1-6ubuntu1.1      amd64        GNU Bourne Again SHell\n${[...nvidiaDriverPkgs, ...nvidiaContainerPkgs].join("\n")}\nii  cuda-toolkit-${cudaPkgSlug}               ${cudaMajor}.2-1            amd64        CUDA Toolkit ${cudaMajor} meta-package\nii  datacenter-gpu-manager           3.3.5-1             amd64        NVIDIA DCGM`,
      );
    }

    return this.createError(
      "dpkg: error: need an action option\nUse dpkg --help for help.",
    );
  }

  /**
   * apt - APT package manager
   */
  private handleApt(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    const subcommand = parsed.subcommands[0] || "";
    const node = this.resolveNode(context);
    const cudaVersion = node?.cudaVersion ?? "12.2";
    const cudaMajor = cudaVersion.split(".").slice(0, 2).join(".");
    const cudaPkgSlug = cudaMajor.replace(".", "-");
    const rawCommand = parsed.raw || "";
    const grepNvidiaDriver =
      rawCommand.includes("nvidia-driver") ||
      rawCommand.includes("grep nvidia");

    if (subcommand === "list") {
      const installedOnly =
        this.hasAnyFlag(parsed, ["installed"]) ||
        rawCommand.includes("--installed");

      const nvidiaDriverPkgs = [
        "nvidia-driver-535/jammy,now 535.129.03-0ubuntu1 amd64 [installed]",
        "nvidia-driver-535-server/jammy 535.129.03-0ubuntu1 amd64 [installed]",
        "nvidia-dkms-535/jammy,now 535.129.03-0ubuntu1 amd64 [installed,automatic]",
        "nvidia-utils-535/jammy,now 535.129.03-0ubuntu1 amd64 [installed,automatic]",
      ];

      const containerPkgs = [
        "nvidia-container-toolkit/jammy,now 1.14.3-1 amd64 [installed]",
        "nvidia-container-runtime/jammy,now 3.14.0-1 amd64 [installed]",
      ];

      const cudaPkgs = [
        `cuda-toolkit-${cudaPkgSlug}/jammy,now ${cudaMajor}.2-1 amd64 [installed]`,
        "cuda-drivers-535/jammy,now 535.129.03-1 amd64 [installed]",
      ];

      if (grepNvidiaDriver) {
        return this.createSuccess(`Listing...\n${nvidiaDriverPkgs.join("\n")}`);
      }

      if (installedOnly) {
        return this.createSuccess(
          `Listing...\n${[...nvidiaDriverPkgs, ...containerPkgs, ...cudaPkgs].join("\n")}`,
        );
      }

      // Handle pattern argument like "nvidia-driver*"
      const pattern = parsed.subcommands[1] || parsed.positionalArgs[0] || "";
      if (pattern.includes("nvidia-driver")) {
        return this.createSuccess(`Listing...\n${nvidiaDriverPkgs.join("\n")}`);
      }

      return this.createSuccess(
        `Listing...\n${[...nvidiaDriverPkgs, ...containerPkgs, ...cudaPkgs].join("\n")}`,
      );
    }

    if (subcommand === "search") {
      const query = parsed.subcommands[1] || parsed.positionalArgs[0] || "";
      return this.createSuccess(
        `Sorting...\nFull Text Search...\nnvidia-driver-535/jammy 535.129.03-0ubuntu1 amd64\n  NVIDIA driver metapackage (${query})`,
      );
    }

    if (subcommand === "show") {
      const pkg = parsed.subcommands[1] || parsed.positionalArgs[0] || "";
      return this.createSuccess(
        `Package: ${pkg}\nVersion: 535.129.03-0ubuntu1\nPriority: optional\nSection: restricted/misc\nMaintainer: NVIDIA <linux-bugs@nvidia.com>\nInstalled-Size: 512 kB\nDepends: nvidia-dkms-535, nvidia-utils-535\nDescription: NVIDIA driver metapackage`,
      );
    }

    return this.createError("Usage: apt [list|search|show] [options]");
  }

  /**
   * nvcc - NVIDIA CUDA Compiler version
   */
  private handleNvcc(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    const node = this.resolveNode(context);
    const cudaVersion = node?.cudaVersion ?? "12.2";
    const cudaMajor = cudaVersion.split(".").slice(0, 2).join(".");

    const nvccOutput = `nvcc: NVIDIA (R) Cuda compiler driver
Copyright (c) 2005-2023 NVIDIA Corporation
Built on Tue_Aug_15_22:02:13_PDT_2023
Cuda compilation tools, release ${cudaMajor}, V${cudaMajor}.140
Build cuda_${cudaMajor}.r${cudaMajor}/compiler.33191640_0
CUDA version: ${cudaMajor}`;

    if (this.hasAnyFlag(parsed, ["version", "V"])) {
      return this.createSuccess(nvccOutput);
    }

    // Default: show version info
    return this.createSuccess(nvccOutput);
  }

  /**
   * iostat - Report CPU and I/O statistics
   */
  private handleIostat(
    parsed: ParsedCommand,
    _context: CommandContext,
  ): CommandResult {
    const extended = this.hasAnyFlag(parsed, ["x"]);

    if (extended) {
      const output = `Linux 5.15.0-91-generic (dgx-00)    02/11/2026    _x86_64_    (128 CPU)

avg-cpu:  %user   %nice %system %iowait  %steal   %idle
           2.34    0.00    0.82    0.31    0.00   96.53

Device            r/s     rkB/s   rrqm/s  %rrqm r_await rareq-sz     w/s     wkB/s   wrqm/s  %wrqm w_await wareq-sz     d/s     dkB/s   drqm/s  %drqm d_await dareq-sz     f/s f_await  aqu-sz  %util
sda             12.45    256.78     0.50   3.86    0.45    20.63   45.67   1234.56     5.23  10.28    1.23    27.03    0.00      0.00     0.00   0.00    0.00     0.00    0.00    0.00    0.06   3.45
sdb              5.23    128.45     0.12   2.24    0.32    24.56   12.34    567.89     1.56  11.21    0.89    46.02    0.00      0.00     0.00   0.00    0.00     0.00    0.00    0.00    0.02   1.23
nvme0n1        234.56  12345.67    12.34   5.00    0.12    52.67  567.89  23456.78    45.67   7.44    0.23    41.30    0.00      0.00     0.00   0.00    0.00     0.00    0.00    0.00    0.15   8.90
nvme1n1        198.76  10234.56     8.90   4.28    0.15    51.50  489.12  20123.45    38.90   7.37    0.25    41.14    0.00      0.00     0.00   0.00    0.00     0.00    0.00    0.00    0.13   7.65`;
      return this.createSuccess(output);
    }

    const output = `Linux 5.15.0-91-generic (dgx-00)    02/11/2026    _x86_64_    (128 CPU)

avg-cpu:  %user   %nice %system %iowait  %steal   %idle
           2.34    0.00    0.82    0.31    0.00   96.53

Device             tps    kB_read/s    kB_wrtn/s    kB_dscd/s    kB_read    kB_wrtn    kB_dscd
sda              58.12       256.78      1234.56         0.00    2567890   12345678          0
sdb              17.57       128.45       567.89         0.00    1284567    5678901          0
nvme0n1         802.45     12345.67     23456.78         0.00  123456789  234567890          0
nvme1n1         687.88     10234.56     20123.45         0.00  102345678  201234567          0`;

    return this.createSuccess(output);
  }

  /**
   * efibootmgr - EFI Boot Manager
   */
  private handleEfibootmgr(
    parsed: ParsedCommand,
    _context: CommandContext,
  ): CommandResult {
    const verbose = this.hasAnyFlag(parsed, ["v", "verbose"]);

    if (verbose) {
      const output = `BootCurrent: 0001
Timeout: 5 seconds
BootOrder: 0001,0002,0003,0004
Boot0001* UEFI: NVIDIA DGX System Boot    HD(1,GPT,abcd-1234,0x800,0x100000)/File(\\EFI\\ubuntu\\shimx64.efi)
Boot0002* UEFI: PXE Network Boot (IPv4)   PciRoot(0x0)/Pci(0x1,0x0)/Pci(0x0,0x0)/MAC(001122334455,1)/IPv4(0.0.0.0,0,0)
Boot0003* UEFI: PXE Network Boot (IPv6)   PciRoot(0x0)/Pci(0x1,0x0)/Pci(0x0,0x0)/MAC(001122334455,1)/IPv6([::]:<->[::]:,0,0)
Boot0004* UEFI: Built-in EFI Shell        VenMedia(c57ad6b7-0515-40a8-9d21-551652854e37)`;
      return this.createSuccess(output);
    }

    const output = `BootCurrent: 0001
Timeout: 5 seconds
BootOrder: 0001,0002,0003,0004
Boot0001* UEFI: NVIDIA DGX System Boot
Boot0002* UEFI: PXE Network Boot (IPv4)
Boot0003* UEFI: PXE Network Boot (IPv6)
Boot0004* UEFI: Built-in EFI Shell`;

    return this.createSuccess(output);
  }

  /**
   * nfsstat - NFS statistics
   */
  private handleNfsstat(
    parsed: ParsedCommand,
    _context: CommandContext,
  ): CommandResult {
    const clientMode = this.hasAnyFlag(parsed, ["c", "client"]);
    const mountMode = this.hasAnyFlag(parsed, ["m", "mounts"]);

    if (mountMode) {
      const output = `NFS mount points:

/data from nas01:/data
 Flags: rw,relatime,vers=4.2,rsize=1048576,wsize=1048576,namlen=255,hard,proto=tcp,timeo=600,retrans=2,sec=sys,clientaddr=10.0.0.1,local_lock=none,addr=10.0.0.100

/home from nas01:/home
 Flags: rw,relatime,vers=4.2,rsize=1048576,wsize=1048576,namlen=255,hard,proto=tcp,timeo=600,retrans=2,sec=sys,clientaddr=10.0.0.1,local_lock=none,addr=10.0.0.100

/scratch from lustre@tcp:/scratch
 Flags: rw,lazystatfs,flock,user_xattr`;
      return this.createSuccess(output);
    }

    if (clientMode) {
      const output = `Client RPC stats:
rpc packets     calls      retrans    authrefrsh
                456789     12         456789

Client nfs v4:
null         read         write        commit       open         open_conf
0         0% 234567   51% 123456   27% 5678     1% 12345    2% 8901     1%
open_noat    open_dgrd    close        setattr      fsinfo       renew
456      0% 0         0% 12345    2% 2345     0% 1234     0% 4567     1%
setclntid    confirm      lock         lockt        locku        access
1         0% 1         0% 5678     1% 0         0% 5678     1% 34567    7%
getattr      lookup       lookup_root  remove       rename       link
45678    10% 12345    2% 0         0% 2345     0% 1234     0% 567      0%
symlink      create       pathconf     statfs       readlink     readdir
123      0% 4567     1% 0         0% 6789     1% 345      0% 2345     0%
server_caps  delegreturn  getacl       setacl       fs_locations rel_lkowner
456      0% 3456     0% 0         0% 0         0% 0         0% 0         0%`;
      return this.createSuccess(output);
    }

    // Default: show all stats
    const output = `Server rpc stats:
calls      badcalls   badfmt     badauth    badclnt
0          0          0          0          0

Client rpc stats:
calls      retrans    authrefrsh
456789     12         456789

Client nfs v4:
null         read         write        commit       open
0         0% 234567   51% 123456   27% 5678     1% 12345    2%`;
    return this.createSuccess(output);
  }

  /**
   * ldconfig - Configure dynamic linker run-time bindings
   */
  private handleLdconfig(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    const printCache = this.hasAnyFlag(parsed, ["p", "print-cache"]);
    const rawCommand = parsed.raw || "";
    const grepNCCL =
      rawCommand.includes("grep libnccl") ||
      rawCommand.includes("grep -i nccl");
    const grepCuda =
      rawCommand.includes("grep cuda") || rawCommand.includes("grep -i cuda");
    const grepNvidia =
      rawCommand.includes("grep nvidia") ||
      rawCommand.includes("grep -i nvidia");

    if (printCache || grepNCCL || grepCuda || grepNvidia) {
      const node = this.resolveNode(context);
      const cudaVersion = node?.cudaVersion ?? "12.2";
      const cudaMajor = cudaVersion.split(".").slice(0, 2).join(".");

      const ncclLibs = [
        "\tlibnccl.so.2 (libc6,x86-64) => /usr/lib/x86_64-linux-gnu/libnccl.so.2",
        "\tlibnccl.so.2.19.3 (libc6,x86-64) => /usr/lib/x86_64-linux-gnu/libnccl.so.2.19.3",
        "\tlibnccl-net.so (libc6,x86-64) => /usr/lib/x86_64-linux-gnu/libnccl-net.so",
      ];

      const cudaLibs = [
        `\tlibcudart.so.12 (libc6,x86-64) => /usr/local/cuda-${cudaMajor}/lib64/libcudart.so.12`,
        `\tlibcudart.so.${cudaMajor}.140 (libc6,x86-64) => /usr/local/cuda-${cudaMajor}/lib64/libcudart.so.${cudaMajor}.140`,
        `\tlibcublas.so.12 (libc6,x86-64) => /usr/local/cuda-${cudaMajor}/lib64/libcublas.so.12`,
        "\tlibcudnn.so.8 (libc6,x86-64) => /usr/lib/x86_64-linux-gnu/libcudnn.so.8",
      ];

      const nvidiaLibs = [
        "\tlibnvidia-ml.so.1 (libc6,x86-64) => /usr/lib/x86_64-linux-gnu/libnvidia-ml.so.1",
        "\tlibnvidia-ml.so.535.129.03 (libc6,x86-64) => /usr/lib/x86_64-linux-gnu/libnvidia-ml.so.535.129.03",
        "\tlibnvidia-ptxjitcompiler.so.1 (libc6,x86-64) => /usr/lib/x86_64-linux-gnu/libnvidia-ptxjitcompiler.so.1",
      ];

      if (grepNCCL) {
        return this.createSuccess(ncclLibs.join("\n"));
      }
      if (grepCuda) {
        return this.createSuccess(cudaLibs.join("\n"));
      }
      if (grepNvidia) {
        return this.createSuccess([...nvidiaLibs, ...ncclLibs].join("\n"));
      }

      // Full cache
      const output = `${ncclLibs.length + cudaLibs.length + nvidiaLibs.length + 50} libs found in cache \`/etc/ld.so.cache'\n${[...ncclLibs, ...cudaLibs, ...nvidiaLibs].join("\n")}`;
      return this.createSuccess(output);
    }

    // ldconfig without -p just rebuilds the cache (silent success)
    return this.createSuccess("");
  }

  /**
   * taskset - Set or retrieve process CPU affinity
   */
  private handleTaskset(
    parsed: ParsedCommand,
    _context: CommandContext,
  ): CommandResult {
    // Handle combined flags: -cp is parsed as single flag "cp" by the parser
    const hasCp = parsed.flags.has("cp");
    const getPid = this.hasAnyFlag(parsed, ["p"]) || hasCp;
    const cpuList = this.hasAnyFlag(parsed, ["c", "cpu-list"]) || hasCp;

    if (getPid) {
      // taskset -p <pid> or taskset -p $(pgrep hpl)
      // The pid may be in positional args, subcommands, or as a flag value
      let pidArg = parsed.positionalArgs[0] || parsed.subcommands[0] || "";
      // Check if -p or -cp consumed the pid as its value
      if (!pidArg) {
        const pVal = parsed.flags.get("p");
        if (typeof pVal === "string") pidArg = pVal;
        const cpVal = parsed.flags.get("cp");
        if (typeof cpVal === "string") pidArg = pidArg || cpVal;
      }
      if (!pidArg) pidArg = "12345";

      // The pid might be "$(pgrep hpl)" or a number
      const pid = pidArg.match(/\d+/) ? pidArg.match(/\d+/)![0] : "12345";

      if (cpuList) {
        return this.createSuccess(`pid ${pid}'s current affinity list: 0-63`);
      }

      return this.createSuccess(
        `pid ${pid}'s current affinity mask: ffffffffffffffff`,
      );
    }

    // taskset without -p: set affinity for new process
    if (parsed.positionalArgs.length > 0 || parsed.subcommands.length > 0) {
      return this.createSuccess("");
    }

    return this.createError(
      `taskset: missing arguments\nUsage: taskset [options] [mask | cpu-list] [pid | cmd [args...]]`,
    );
  }
}
