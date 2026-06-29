import { describe, it, expect, beforeEach, vi } from "vitest";
import { LinuxUtilsSimulator } from "../linuxUtilsSimulator";
import { useSimulationStore } from "@/store/simulationStore";
import { parse } from "@/utils/commandParser";
import type { CommandContext } from "@/types/commands";

// Mock the store
vi.mock("@/store/simulationStore");

describe("LinuxUtilsSimulator", () => {
  let simulator: LinuxUtilsSimulator;
  let context: CommandContext;

  beforeEach(() => {
    simulator = new LinuxUtilsSimulator();
    context = {
      currentNode: "dgx-00",
      currentPath: "/root",
      environment: {},
      history: [],
    };
    vi.mocked(useSimulationStore.getState).mockReturnValue({
      cluster: {
        nodes: [
          {
            id: "dgx-00",
            hostname: "dgx-00.cluster.local",
            systemType: "DGX-H100",
            cudaVersion: "12.4",
            gpus: [],
            cpuCount: 2,
            ramTotal: 2048,
            ramUsed: 512,
            slurmState: "idle",
          },
        ],
      },
    } as unknown as ReturnType<typeof useSimulationStore.getState>);
  });

  describe("Metadata", () => {
    it("should return correct metadata", () => {
      const metadata = simulator.getMetadata();

      expect(metadata.name).toBe("linux-utils");
      expect(metadata.version).toBe("1.0.0");
      expect(metadata.commands).toHaveLength(18);
      expect(metadata.commands.map((c) => c.name)).toEqual([
        "cat",
        "pwd",
        "ls",
        "head",
        "tail",
        "echo",
        "wc",
        "grep",
        "ip",
        "env",
        "dpkg",
        "apt",
        "nvcc",
        "iostat",
        "efibootmgr",
        "nfsstat",
        "ldconfig",
        "taskset",
      ]);
    });
  });

  // ============================================
  // cat command
  // ============================================
  describe("cat command", () => {
    it("should display /etc/hostname with hostname string", () => {
      const result = simulator.execute(parse("cat /etc/hostname"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("dgx-00");
    });

    it("should display /proc/driver/nvidia/version with NVIDIA and version", () => {
      const result = simulator.execute(
        parse("cat /proc/driver/nvidia/version"),
        context,
      );
      expect(result.exitCode).toBe(0);
      expect(result.output).toMatch(/NVIDIA/i);
      expect(result.output).toMatch(/version/i);
      expect(result.output).toContain("535.129.03");
    });

    it("should display /etc/slurm/gres.conf with gres and gpu", () => {
      const result = simulator.execute(
        parse("cat /etc/slurm/gres.conf"),
        context,
      );
      expect(result.exitCode).toBe(0);
      expect(result.output).toMatch(/gres/i);
      expect(result.output).toMatch(/gpu/i);
    });

    it("should display /proc/net/bonding/bond0 with bonding info", () => {
      const result = simulator.execute(
        parse("cat /proc/net/bonding/bond0"),
        context,
      );
      expect(result.exitCode).toBe(0);
      expect(result.output).toMatch(/bond/i);
      expect(result.output).toContain("Bonding Mode");
    });

    it("should display HPL.dat with HPL content", () => {
      const result = simulator.execute(parse("cat HPL.dat"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toMatch(/HPL/i);
    });

    it("should display /etc/hosts", () => {
      const result = simulator.execute(parse("cat /etc/hosts"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("localhost");
    });

    it("should display /etc/slurm/slurm.conf", () => {
      const result = simulator.execute(
        parse("cat /etc/slurm/slurm.conf"),
        context,
      );
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("ClusterName");
    });

    it("should error on nonexistent file", () => {
      const result = simulator.execute(parse("cat /nonexistent/file"), context);
      expect(result.exitCode).toBe(1);
      expect(result.output).toContain("No such file or directory");
    });

    it("should error when no file operand given", () => {
      const result = simulator.execute(parse("cat"), context);
      expect(result.exitCode).not.toBe(0);
      expect(result.output).toContain("missing file operand");
    });

    it("should support -n flag for line numbers", () => {
      const result = simulator.execute(parse("cat -n /etc/hostname"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toMatch(/1/);
    });

    it("should resolve relative path from cwd", () => {
      context.currentPath = "/etc/slurm";
      const result = simulator.execute(parse("cat gres.conf"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toMatch(/gpu/i);
    });

    it("should resolve .. in relative path", () => {
      context.currentPath = "/etc/slurm";
      const result = simulator.execute(parse("cat ../hostname"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("dgx-00");
    });

    it("should resolve ./file relative path", () => {
      context.currentPath = "/etc/slurm";
      const result = simulator.execute(parse("cat ./slurm.conf"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("ClusterName");
    });
  });

  // ============================================
  // pwd command
  // ============================================
  describe("pwd command", () => {
    it("should return current path from context", () => {
      const result = simulator.execute(parse("pwd"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toBe("/root");
    });

    it("should return /home/admin when path is not set", () => {
      context.currentPath = "";
      const result = simulator.execute(parse("pwd"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toBe("/home/admin");
    });
  });

  // ============================================
  // ls command
  // ============================================
  describe("ls command", () => {
    it("should list files in /root", () => {
      const result = simulator.execute(parse("ls"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("scripts");
    });

    it("should support -l flag for long format", () => {
      const result = simulator.execute(parse("ls -l"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("total");
      expect(result.output).toContain("root");
    });

    it("should support -a flag to show hidden files", () => {
      const result = simulator.execute(parse("ls -a"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain(".bashrc");
    });

    it("should support listing /dev directory", () => {
      const result = simulator.execute(parse("ls /dev"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("nvidia0");
    });

    it("should return generic listing for unknown directory", () => {
      const result = simulator.execute(parse("ls /unknown"), context);
      expect(result.exitCode).toBe(0);
    });

    it("should resolve relative directory path from cwd", () => {
      context.currentPath = "/root";
      const result = simulator.execute(parse("ls scripts"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("setup.sh");
    });

    it("should list /root/scripts with script files", () => {
      const result = simulator.execute(parse("ls /root/scripts"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("setup.sh");
      expect(result.output).toContain("backup.sh");
    });

    it("should list /home/admin/scripts with monitor.sh", () => {
      const result = simulator.execute(
        parse("ls /home/admin/scripts"),
        context,
      );
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("monitor.sh");
    });

    it("should list root directory with standard Linux directories", () => {
      const result = simulator.execute(parse("ls /"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("etc");
      expect(result.output).toContain("home");
      expect(result.output).toContain("var");
      expect(result.output).toContain("usr");
      expect(result.output).toContain("dev");
      expect(result.output).toContain("root");
    });

    it("should support combined -la flag with path argument", () => {
      const result = simulator.execute(parse("ls -la /var/log"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("total");
      expect(result.output).toContain("syslog");
    });

    it("should support -la flag without path (uses cwd)", () => {
      const result = simulator.execute(parse("ls -la"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("total");
      expect(result.output).toContain(".bashrc");
    });

    it("should resolve .. in ls path", () => {
      context.currentPath = "/root/scripts";
      const result = simulator.execute(parse("ls .."), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("scripts");
      expect(result.output).toContain("HPL.dat");
    });
  });

  // ============================================
  // head command
  // ============================================
  describe("head command", () => {
    it("should display first 10 lines by default", () => {
      const result = simulator.execute(
        parse("head /etc/slurm/gres.conf"),
        context,
      );
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("gpu");
    });

    it("should support -n flag for number of lines", () => {
      const result = simulator.execute(
        parse("head -n 2 /etc/hostname"),
        context,
      );
      expect(result.exitCode).toBe(0);
      expect(result.output.split("\n").length).toBeLessThanOrEqual(2);
    });

    it("should error on nonexistent file", () => {
      const result = simulator.execute(parse("head /no/file"), context);
      expect(result.exitCode).toBe(1);
      expect(result.output).toContain("No such file or directory");
    });

    it("should error when no file operand given", () => {
      const result = simulator.execute(parse("head"), context);
      expect(result.exitCode).not.toBe(0);
    });

    it("should support numeric shorthand -5", () => {
      const result = simulator.execute(
        parse("head -5 /etc/slurm/gres.conf"),
        context,
      );
      expect(result.exitCode).toBe(0);
      const lines = result.output.split("\n");
      expect(lines.length).toBeLessThanOrEqual(5);
    });
  });

  // ============================================
  // tail command
  // ============================================
  describe("tail command", () => {
    it("should display last lines of a file", () => {
      const result = simulator.execute(
        parse("tail /etc/slurm/gres.conf"),
        context,
      );
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("nvidia");
    });

    it("should error on nonexistent file", () => {
      const result = simulator.execute(parse("tail /no/file"), context);
      expect(result.exitCode).toBe(1);
    });

    it("should error when no file operand given", () => {
      const result = simulator.execute(parse("tail"), context);
      expect(result.exitCode).not.toBe(0);
    });

    it("should support numeric shorthand -20", () => {
      const result = simulator.execute(
        parse("tail -20 /var/log/syslog"),
        context,
      );
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("dgx-00");
      const lines = result.output.split("\n");
      expect(lines.length).toBe(20);
    });

    it("should support -n flag for number of lines", () => {
      const result = simulator.execute(
        parse("tail -n 5 /var/log/syslog"),
        context,
      );
      expect(result.exitCode).toBe(0);
      const lines = result.output.split("\n");
      expect(lines.length).toBe(5);
    });

    it("should error with numeric shorthand and no filename", () => {
      const result = simulator.execute(parse("tail -20"), context);
      expect(result.exitCode).not.toBe(0);
      expect(result.output).toContain("missing file operand");
    });

    it("should support -f flag with file path", () => {
      const result = simulator.execute(
        parse("tail -f /var/log/syslog"),
        context,
      );
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("dgx-00");
    });
  });

  // ============================================
  // echo command
  // ============================================
  describe("echo command", () => {
    it("should echo text back", () => {
      const result = simulator.execute(parse("echo hello"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("hello");
    });

    it("should handle empty echo", () => {
      const result = simulator.execute(parse("echo"), context);
      expect(result.exitCode).toBe(0);
    });

    it("should strip injected ANSI/control sequences (F1)", () => {
      const result = simulator.execute(
        parse("echo \x1b[2J\x1b[31mRED\x1b[0m\x00done"),
        context,
      );
      expect(result.exitCode).toBe(0);
      // The escape/control bytes are gone; the printable text survives.
      expect(result.output).not.toContain("\x1b");
      expect(result.output).not.toContain("\x00");
      expect(result.output).toContain("RED");
      expect(result.output).toContain("done");
    });
  });

  // ============================================
  // wc command
  // ============================================
  describe("wc command", () => {
    it("should show line/word/char count", () => {
      const result = simulator.execute(parse("wc /etc/hostname"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("/etc/hostname");
    });

    it("should support -l flag", () => {
      const result = simulator.execute(parse("wc -l /etc/hostname"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("/etc/hostname");
    });

    it("should error on nonexistent file", () => {
      const result = simulator.execute(parse("wc /no/file"), context);
      expect(result.exitCode).toBe(1);
    });
  });

  // ============================================
  // grep command
  // ============================================
  describe("grep command", () => {
    it("should find pattern in a file", () => {
      const result = simulator.execute(
        parse("grep gpu /etc/slurm/gres.conf"),
        context,
      );
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("gpu");
    });

    it("should support case-insensitive search", () => {
      const result = simulator.execute(
        parse("grep -i GPU /etc/slurm/gres.conf"),
        context,
      );
      expect(result.exitCode).toBe(0);
    });

    it("should return exit code 1 for no matches", () => {
      const result = simulator.execute(
        parse("grep zzzzzzz /etc/hostname"),
        context,
      );
      expect(result.exitCode).toBe(1);
    });

    it("should error on nonexistent file", () => {
      const result = simulator.execute(parse("grep test /no/file"), context);
      expect(result.exitCode).toBe(2);
    });

    it("should error when no pattern given", () => {
      const result = simulator.execute(parse("grep"), context);
      expect(result.exitCode).not.toBe(0);
    });
  });

  // ============================================
  // ip command
  // ============================================
  describe("ip command", () => {
    it("should show all addresses with ip addr", () => {
      const result = simulator.execute(parse("ip addr"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("inet");
      expect(result.output).toContain("eth0");
      expect(result.output).toContain("ib0");
    });

    it("should show specific interface with ip addr show ib0", () => {
      const result = simulator.execute(parse("ip addr show ib0"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("ib0");
      expect(result.output).toContain("inet");
    });

    it("should show link state with ip link show", () => {
      const result = simulator.execute(parse("ip link show"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toMatch(/state UP/i);
      expect(result.output).toContain("link");
    });

    it("should show specific link with ip link show eth0", () => {
      const result = simulator.execute(parse("ip link show eth0"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("eth0");
      expect(result.output).toContain("state UP");
    });

    it("should show routing table with ip route", () => {
      const result = simulator.execute(parse("ip route"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("default");
    });

    it("should error for nonexistent device", () => {
      const result = simulator.execute(
        parse("ip addr show nonexistent"),
        context,
      );
      expect(result.exitCode).toBe(1);
      expect(result.output).toContain("does not exist");
    });
  });

  // ============================================
  // env command
  // ============================================
  describe("env command", () => {
    it("should show all environment variables", () => {
      const result = simulator.execute(parse("env"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("PATH=");
      expect(result.output).toContain("NCCL_DEBUG=INFO");
      expect(result.output).toContain("CUDA_HOME=");
    });

    it("should filter NCCL vars with grep", () => {
      const result = simulator.execute(parse("env | grep NCCL"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("NCCL");
      // Should NOT contain non-NCCL vars
      expect(result.output).not.toContain("PATH=");
    });

    it("should filter CUDA vars with grep", () => {
      const result = simulator.execute(parse("env | grep CUDA"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("CUDA");
    });
  });

  // ============================================
  // dpkg command
  // ============================================
  describe("dpkg command", () => {
    it("should list packages with dpkg -l", () => {
      const result = simulator.execute(parse("dpkg -l"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("nvidia-container");
    });

    it("should filter nvidia-container with grep", () => {
      const result = simulator.execute(
        parse("dpkg -l | grep nvidia-container-toolkit"),
        context,
      );
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("nvidia-container-toolkit");
    });

    it("should filter nvidia packages with grep", () => {
      const result = simulator.execute(parse("dpkg -l | grep nvidia"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("nvidia");
    });

    it("should error without action flag", () => {
      const result = simulator.execute(parse("dpkg"), context);
      expect(result.exitCode).not.toBe(0);
    });
  });

  // ============================================
  // apt command
  // ============================================
  describe("apt command", () => {
    it("should list nvidia-driver packages", () => {
      const result = simulator.execute(
        parse("apt list --installed nvidia-driver*"),
        context,
      );
      expect(result.exitCode).toBe(0);
      expect(result.output).toMatch(/nvidia-driver/i);
    });

    it("should list all installed packages", () => {
      const result = simulator.execute(parse("apt list --installed"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("nvidia-driver");
    });

    it("should show package info with apt show", () => {
      const result = simulator.execute(
        parse("apt show nvidia-driver-535"),
        context,
      );
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Package:");
    });

    it("should error without subcommand", () => {
      const result = simulator.execute(parse("apt"), context);
      expect(result.exitCode).not.toBe(0);
    });
  });

  // ============================================
  // nvcc command
  // ============================================
  describe("nvcc command", () => {
    it("should show version with --version flag", () => {
      const result = simulator.execute(parse("nvcc --version"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toMatch(/cuda/i);
      expect(result.output).toMatch(/version/i);
      expect(result.output).toMatch(/12\.\d/);
    });

    it("should show version with -V flag", () => {
      const result = simulator.execute(parse("nvcc -V"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toMatch(/cuda/i);
    });

    it("should show version info by default", () => {
      const result = simulator.execute(parse("nvcc"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("NVIDIA");
    });
  });

  // ============================================
  // iostat command
  // ============================================
  describe("iostat command", () => {
    it("should show basic I/O statistics", () => {
      const result = simulator.execute(parse("iostat"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toMatch(/Device/i);
      expect(result.output).toContain("nvme0n1");
    });

    it("should show extended stats with -x flag", () => {
      const result = simulator.execute(parse("iostat -x"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("r/s");
      expect(result.output).toContain("w/s");
      expect(result.output).toContain("nvme0n1");
    });

    it("should show avg-cpu stats", () => {
      const result = simulator.execute(parse("iostat"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("avg-cpu");
      expect(result.output).toMatch(/iowait/i);
    });
  });

  // ============================================
  // efibootmgr command
  // ============================================
  describe("efibootmgr command", () => {
    it("should show boot entries", () => {
      const result = simulator.execute(parse("efibootmgr"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Boot");
      expect(result.output).toContain("BootOrder");
    });

    it("should show verbose boot entries with -v", () => {
      const result = simulator.execute(parse("efibootmgr -v"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Boot");
      expect(result.output).toContain("EFI");
      expect(result.output).toContain("NVIDIA");
    });
  });

  // ============================================
  // nfsstat command
  // ============================================
  describe("nfsstat command", () => {
    it("should show client stats with -c", () => {
      const result = simulator.execute(parse("nfsstat -c"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toMatch(/nfs/i);
      expect(result.output).toMatch(/Client/i);
    });

    it("should show mount info with -m", () => {
      const result = simulator.execute(parse("nfsstat -m"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toMatch(/nfs/i);
      expect(result.output).toMatch(/mount|Flags/i);
    });

    it("should show all stats by default", () => {
      const result = simulator.execute(parse("nfsstat"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Client");
    });
  });

  // ============================================
  // ldconfig command
  // ============================================
  describe("ldconfig command", () => {
    it("should show cache with -p", () => {
      const result = simulator.execute(parse("ldconfig -p"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("libnccl");
    });

    it("should filter libnccl with grep", () => {
      const result = simulator.execute(
        parse("ldconfig -p | grep libnccl"),
        context,
      );
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("libnccl");
    });

    it("should filter cuda with grep", () => {
      const result = simulator.execute(
        parse("ldconfig -p | grep cuda"),
        context,
      );
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("cuda");
    });

    it("should succeed silently without flags", () => {
      const result = simulator.execute(parse("ldconfig"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toBe("");
    });
  });

  // ============================================
  // taskset command
  // ============================================
  describe("taskset command", () => {
    it("should show affinity mask with -p", () => {
      const result = simulator.execute(parse("taskset -p 12345"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toMatch(/affinity/i);
      expect(result.output).toContain("12345");
    });

    it("should show affinity list with -cp", () => {
      const result = simulator.execute(parse("taskset -cp 12345"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toMatch(/affinity/i);
    });

    it("should error without arguments", () => {
      const result = simulator.execute(parse("taskset"), context);
      expect(result.exitCode).not.toBe(0);
    });
  });

  // ============================================
  // New networking commands (PR #77)
  // ============================================
  describe("New networking commands (PR #77)", () => {
    it("ethtool should show interface settings for the given device", () => {
      const result = simulator.execute(parse("ethtool eth0"), context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Settings for eth0:");
      expect(result.output).toContain("Speed: 100000Mb/s");
      expect(result.output).toContain("Link detected: yes");
    });

    it("ethtool should default to eth0 when no device is given", () => {
      const result = simulator.execute(parse("ethtool"), context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Settings for eth0:");
    });

    it("ethtool should respect the device argument instead of always defaulting to eth0", () => {
      const result = simulator.execute(parse("ethtool eth1"), context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Settings for eth1:");
      expect(result.output).not.toContain("Settings for eth0:");
    });

    it("ethtool --help should print usage and not interface settings", () => {
      const result = simulator.execute(parse("ethtool --help"), context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Usage:");
      expect(result.output).toContain("ethtool DEVNAME");
      expect(result.output).not.toContain("Settings for");
    });

    it("ethtool --version should print the tool version", () => {
      const result = simulator.execute(parse("ethtool --version"), context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("ethtool version");
    });

    it("netstat -l should list listening sockets", () => {
      const result = simulator.execute(parse("netstat -l"), context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("servers and established");
      expect(result.output).toContain("LISTEN");
    });

    it("netstat with no flags should show the w/o-servers header", () => {
      const result = simulator.execute(parse("netstat"), context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("w/o servers");
    });

    it("ping should report round-trip stats for a host", () => {
      const result = simulator.execute(parse("ping 10.0.0.5"), context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("PING 10.0.0.5");
      expect(result.output).toContain("packets transmitted");
    });

    it("ping should echo the actual target host as the resolved address", () => {
      const result = simulator.execute(parse("ping 10.0.0.5"), context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("PING 10.0.0.5 (10.0.0.5)");
      expect(result.output).not.toContain("(10.0.0.1)");
    });

    it("ping should error when no host is given", () => {
      const result = simulator.execute(parse("ping"), context);

      expect(result.exitCode).toBe(1);
      expect(result.output).toContain("Destination address required");
    });

    it("ping --help should print usage and not attempt to ping", () => {
      const result = simulator.execute(parse("ping --help"), context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Usage:");
      expect(result.output).not.toContain("Destination address required");
    });

    it("ping --version should print the tool version", () => {
      const result = simulator.execute(parse("ping --version"), context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("ping from iputils");
    });

    it("ss -l should list listening sockets", () => {
      const result = simulator.execute(parse("ss -l"), context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("LISTEN");
    });

    it("ss -n should show numeric addresses for established sockets", () => {
      const result = simulator.execute(parse("ss -n"), context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("ESTAB");
      expect(result.output).toContain("10.0.0.1:22");
    });

    it("traceroute should print a hop list to the given host", () => {
      const result = simulator.execute(parse("traceroute 10.0.0.1"), context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("traceroute to 10.0.0.1");
      expect(result.output).toContain("gateway");
    });

    it("traceroute should echo the actual target host as the resolved address", () => {
      const result = simulator.execute(parse("traceroute 10.0.0.9"), context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("traceroute to 10.0.0.9 (10.0.0.9)");
      expect(result.output).not.toContain("(10.0.0.1)");
    });

    it("traceroute should error when no host is given", () => {
      const result = simulator.execute(parse("traceroute"), context);

      expect(result.exitCode).toBe(1);
      expect(result.output).toContain("Usage: traceroute host");
    });

    it("traceroute --help should print usage and not attempt a trace", () => {
      const result = simulator.execute(parse("traceroute --help"), context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Usage:");
      expect(result.output).not.toContain("hops max");
    });

    it("traceroute --version should print the tool version", () => {
      const result = simulator.execute(parse("traceroute --version"), context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("traceroute for Linux, version");
    });
  });

  // ============================================
  // Virtual filesystem - log files
  // ============================================
  describe("Virtual filesystem - log files", () => {
    it("should display /var/log/syslog", () => {
      const result = simulator.execute(parse("cat /var/log/syslog"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("dgx-00");
      expect(result.output).toContain("NVRM");
    });

    it("should display /var/log/dmesg", () => {
      const result = simulator.execute(parse("cat /var/log/dmesg"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("nvidia");
      expect(result.output).toContain("535.129.03");
    });

    it("should display /var/log/kern.log", () => {
      const result = simulator.execute(parse("cat /var/log/kern.log"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("XID");
    });

    it("should list /var/log directory", () => {
      const result = simulator.execute(parse("ls /var/log"), context);
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("syslog");
      expect(result.output).toContain("kern.log");
      expect(result.output).toContain("dmesg");
    });

    it("should tail /var/log/syslog with numeric shorthand", () => {
      const result = simulator.execute(
        parse("tail -20 /var/log/syslog"),
        context,
      );
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("dgx-00");
      expect(result.output.split("\n").length).toBe(20);
    });
  });

  // ============================================
  // Error handling
  // ============================================
  describe("Error handling", () => {
    it("should return error for unknown command", () => {
      const parsed = parse("unknowncmd");
      parsed.baseCommand = "unknowncmd";
      const result = simulator.execute(parsed, context);
      expect(result.exitCode).not.toBe(0);
    });

    it("should handle --help flag", () => {
      const result = simulator.execute(parse("cat --help"), context);
      expect(result.exitCode).toBe(0);
    });
  });
});
