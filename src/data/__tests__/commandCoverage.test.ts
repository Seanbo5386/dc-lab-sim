import { describe, it, expect } from "vitest";
import { TERMINAL_COMMANDS } from "../registeredCommands";

// All JSON definition files. import.meta.glob is resolved by Vite/Vitest; we only use the keys (paths).
const defs = import.meta.glob("../output/**/*.json");
const commandNames = Object.keys(defs)
  .filter((p) => !p.includes("/relationships/")) // relationship metadata, not commands
  .map((p) =>
    p
      .split("/")
      .pop()!
      .replace(/\.json$/, ""),
  )
  .filter((n) => !["index", "schema"].includes(n));

// Real commands documented in JSON but not yet executable in the simulator.
// Shrinks as Phase 3/5 implement them. Each entry here is a deliberate, reviewed
// decision that the command is docs-only (has a JSON definition file but no
// router.register() handler in src/components/Terminal.tsx).
const ALLOWLIST_DOCS_ONLY = new Set<string>([
  // ── CUDA tools & samples ────────────────────────────────────────────────
  "bandwidthTest",
  "compute-sanitizer",
  "cuda-gdb",
  "cuda-memcheck",
  "cuobjdump",
  "deviceQuery",
  "ncu",
  "nsys",
  "nvdisasm",
  "nvprof",
  "ptxas",

  // ── GPU fabric / bandwidth ───────────────────────────────────────────────
  "gdrcopy_copybw",
  "gdrcopy_copylat",

  // ── InfiniBand extras ────────────────────────────────────────────────────
  "saquery",

  // ── Mellanox / firmware extras ───────────────────────────────────────────
  "flint",
  "fwupdmgr",
  "mlxdump",
  "mlxfwreset",
  "mlxreg",

  // ── NVIDIA GPU management extras ────────────────────────────────────────
  "gpustat",
  "nvidia-bug-report", // registered as nvidia-bug-report.sh; this name is unregistered
  "nvidia-cuda-mps-control",
  "nvitop",
  "nvme",
  "nvtop",

  // ── Container extras ────────────────────────────────────────────────────
  "apptainer",
  "podman",
  "pyxis",
  "singularity",

  // ── SLURM extras (many subcommands documented but not implemented) ───────
  "salloc",
  "sbcast",
  "scrontab",
  "sdiag",
  "sgather",
  "sprio",
  "sreport",
  "sshare",
  "sstat",
  "strigger",

  // ── Parallel shell ───────────────────────────────────────────────────────
  "clush",
  "nodeset",
  "pdcp",
  "pdsh",

  // ── MPI extras (only mpirun is registered) ───────────────────────────────
  "mpi_test_suite",
  "mpicc",
  "mpiexec",
  "mpif90",
  "ompi_info",

  // ── Networking extras ────────────────────────────────────────────────────
  "ucx_info",

  // ── Monitoring tools ────────────────────────────────────────────────────
  "atop",
  "dstat",
  "glances",
  "htop",
  "iotop",
  "mpstat",
  "nmon",
  "perf",
  "pidstat",
  "sar",
  "turbostat",
  "vmstat",
  "watch",

  // ── System info extras ───────────────────────────────────────────────────
  "hwloc-info",
  "hwloc-ls",
  "lsblk",
  "lsmem",
  "lstopo",
  "numastat",

  // ── Storage extras (df/mount/lfs registered; these are not) ─────────────
  "dd",
  "du",
  "findmnt",
  "smartctl",
  "umount",

  // ── General Linux utilities ──────────────────────────────────────────────
  "awk",
  "cmake",
  "crontab",
  "curl",
  "diff",
  "fio",
  "find",
  "git",
  "gzip",
  "kill",
  "ldd",
  "ln",
  "make",
  "memtester",
  "module",
  "nice",
  "nohup",
  "nproc",
  "pgrep",
  "pkill",
  "rsync",
  "scp",
  "screen",
  "sed",
  "sort",
  "strace",
  "stress-ng",
  "sudo",
  "tar",
  "tee",
  "time",
  "timeout",
  "tmux",
  "unzip",
  "wget",
  "xargs",
  // ── ADDING HERE? Prefer implementing the command in Terminal.tsx and moving it to TERMINAL_COMMANDS. This list should shrink, not grow. ──
]);

describe("every JSON-defined command is executable or explicitly docs-only", () => {
  it("discovers a realistic number of command definitions (glob sanity)", () => {
    expect(commandNames.length).toBeGreaterThan(150);
  });

  it("no JSON command silently returns 'command not found'", () => {
    const orphans = commandNames
      .filter((n) => !TERMINAL_COMMANDS.has(n) && !ALLOWLIST_DOCS_ONLY.has(n))
      .sort();
    expect(orphans).toEqual([]);
  });

  it("nvidia-bug-report is registered under its .sh name", () => {
    expect(TERMINAL_COMMANDS.has("nvidia-bug-report.sh")).toBe(true);
  });
});
