/**
 * Storage Simulator
 *
 * Simulates storage and filesystem commands:
 * - df - Disk space usage
 * - mount - Show mounted filesystems
 * - lfs - Lustre filesystem commands
 */

import { BaseSimulator } from "./BaseSimulator";
import type { CommandContext, CommandResult } from "@/types/commands";
import type { ParsedCommand } from "@/utils/commandParser";

export class StorageSimulator extends BaseSimulator {
  constructor() {
    super();
    this.initializeDefinitionRegistry();

    this.registerCommand("df", this.handleDf.bind(this), {
      name: "df",
      description: "Report file system disk space usage",
      usage: "df [options]",
      flags: [
        {
          short: "h",
          long: "human-readable",
          description: "Print sizes in human readable format",
        },
        {
          short: "T",
          long: "print-type",
          description: "Print filesystem type",
        },
        { short: "i", long: "inodes", description: "Show inode information" },
      ],
      examples: ["df -h", "df -hT", "df -i"],
    });

    this.registerCommand("mount", this.handleMount.bind(this), {
      name: "mount",
      description: "Show all mounted filesystems",
      usage: "mount",
      examples: ["mount"],
    });

    this.registerCommand("lfs", this.handleLfs.bind(this), {
      name: "lfs",
      description: "Lustre filesystem utility",
      usage: "lfs <subcommand> [options]",
      examples: ["lfs df", "lfs df -h", "lfs check servers"],
    });
  }

  getMetadata() {
    return {
      name: "storage-tools",
      version: "1.0.0",
      description: "Storage and filesystem management utilities",
      commands: Array.from(this.commandMetadata.values()),
    };
  }

  execute(parsed: ParsedCommand, context: CommandContext): CommandResult {
    if (this.hasAnyFlag(parsed, ["version", "v"])) {
      return this.handleVersion();
    }
    if (this.hasAnyFlag(parsed, ["help"])) {
      return this.handleHelp();
    }

    const handler = this.getCommand(parsed.baseCommand);
    if (!handler) {
      return this.createError(`Unknown storage command: ${parsed.baseCommand}`);
    }

    // Execute handler (handlers in this simulator are synchronous)
    const result = handler(parsed, context);
    return result as CommandResult;
  }

  private handleDf(
    parsed: ParsedCommand,
    _context: CommandContext,
  ): CommandResult {
    const humanReadable = this.hasAnyFlag(parsed, ["h", "human-readable"]);
    const showType = this.hasAnyFlag(parsed, ["T", "print-type"]);
    const showInodes = this.hasAnyFlag(parsed, ["i", "inodes"]);

    interface Filesystem {
      device: string;
      type: string;
      size: string;
      used: string;
      avail: string;
      usePercent: string;
      inodes: string;
      inodesUsed: string;
      inodesAvail: string;
      inodesPercent: string;
      mount: string;
    }

    const filesystems: Filesystem[] = [
      {
        device: "/dev/sda1",
        type: "ext4",
        size: humanReadable ? "500G" : "524288000",
        used: humanReadable ? "45G" : "47185920",
        avail: humanReadable ? "455G" : "477102080",
        usePercent: "9%",
        inodes: "32768000",
        inodesUsed: "2450000",
        inodesAvail: "30318000",
        inodesPercent: "7%",
        mount: "/",
      },
      {
        device: "nas01:/data",
        type: "nfs4",
        size: humanReadable ? "10T" : "10485760000",
        used: humanReadable ? "7.2T" : "7549747200",
        avail: humanReadable ? "2.8T" : "2936012800",
        usePercent: "72%",
        inodes: "655360000",
        inodesUsed: "471859200",
        inodesAvail: "183500800",
        inodesPercent: "72%",
        mount: "/data",
      },
      {
        device: "nas01:/home",
        type: "nfs4",
        size: humanReadable ? "2T" : "2097152000",
        used: humanReadable ? "1.1T" : "1153433600",
        avail: humanReadable ? "900G" : "943718400",
        usePercent: "55%",
        inodes: "131072000",
        inodesUsed: "72089600",
        inodesAvail: "58982400",
        inodesPercent: "55%",
        mount: "/home",
      },
      {
        device: "lustre@tcp:/scratch",
        type: "lustre",
        size: humanReadable ? "100T" : "104857600000",
        used: humanReadable ? "67T" : "70254387200",
        avail: humanReadable ? "33T" : "34603212800",
        usePercent: "67%",
        inodes: "6553600000",
        inodesUsed: "4390912000",
        inodesAvail: "2162688000",
        inodesPercent: "67%",
        mount: "/scratch",
      },
    ];

    let output = "";

    if (showInodes) {
      // Inode mode
      output =
        "Filesystem" +
        (showType ? "      Type   " : "").padEnd(20) +
        "  Inodes  IUsed   IFree IUse% Mounted on\n";
      filesystems.forEach((fs) => {
        const device = fs.device.padEnd(20);
        const type = showType ? fs.type.padEnd(8) : "";
        output += `${device}${type}${fs.inodes.padStart(9)} ${fs.inodesUsed.padStart(7)} ${fs.inodesAvail.padStart(7)} ${fs.inodesPercent.padStart(5)} ${fs.mount}\n`;
      });
    } else {
      // Regular mode
      const sizeLabel = humanReadable ? "Size" : "1K-blocks";
      output =
        "Filesystem" +
        (showType ? "      Type   " : "").padEnd(20) +
        ` ${sizeLabel.padStart(10)}  Used  Avail Use% Mounted on\n`;
      filesystems.forEach((fs) => {
        const device = fs.device.padEnd(20);
        const type = showType ? fs.type.padEnd(8) : "";
        const size = humanReadable ? fs.size.padStart(5) : fs.size.padStart(10);
        const used = humanReadable ? fs.used.padStart(5) : fs.used.padStart(10);
        const avail = humanReadable
          ? fs.avail.padStart(6)
          : fs.avail.padStart(10);
        output += `${device}${type}${size} ${used} ${avail} ${fs.usePercent.padStart(4)} ${fs.mount}\n`;
      });
    }

    return this.createSuccess(output);
  }

  private handleMount(
    _parsed: ParsedCommand,
    _context: CommandContext,
  ): CommandResult {
    const output = `/dev/sda1 on / type ext4 (rw,relatime,errors=remount-ro)
devtmpfs on /dev type devtmpfs (rw,nosuid,size=1048576k,nr_inodes=262144,mode=755)
tmpfs on /dev/shm type tmpfs (rw,nosuid,nodev)
tmpfs on /run type tmpfs (rw,nosuid,nodev,mode=755)
nas01:/data on /data type nfs4 (rw,relatime,vers=4.2,rsize=1048576,wsize=1048576,namlen=255,hard,proto=tcp,timeo=600,retrans=2,sec=sys)
nas01:/home on /home type nfs4 (rw,relatime,vers=4.2,rsize=1048576,wsize=1048576,namlen=255,hard,proto=tcp,timeo=600,retrans=2,sec=sys)
lustre@tcp:/scratch on /scratch type lustre (rw,flock,user_xattr,lazystatfs)
`;

    return this.createSuccess(output);
  }

  private handleLfs(
    parsed: ParsedCommand,
    _context: CommandContext,
  ): CommandResult {
    const subcommand = parsed.subcommands[0] || parsed.positionalArgs[0];

    if (!subcommand) {
      return this.createError(
        "lfs: missing subcommand\n\nTry 'lfs help' for more information",
      );
    }

    switch (subcommand) {
      case "df": {
        const humanReadable = this.hasAnyFlag(parsed, ["h", "human-readable"]);

        if (humanReadable) {
          return this
            .createSuccess(`UUID                       bytes        Used   Available Use% Mounted on
lustre-MDT0000_UUID      953.6G      238.4G      715.2G  25% /scratch[MDT:0]
lustre-OST0000_UUID       35.2T       23.1T       12.1T  66% /scratch[OST:0]
lustre-OST0001_UUID       35.2T       22.8T       12.4T  65% /scratch[OST:1]
lustre-OST0002_UUID       35.2T       23.4T       11.8T  67% /scratch[OST:2]
lustre-OST0003_UUID       35.2T       23.0T       12.2T  65% /scratch[OST:3]

filesystem_summary:      140.8T       92.3T       48.5T  66% /scratch
`);
        } else {
          return this
            .createSuccess(`UUID                       1K-blocks        Used   Available Use% Mounted on
lustre-MDT0000_UUID     1000341504   250006016   750335488  25% /scratch[MDT:0]
lustre-OST0000_UUID    36903628800 24235335680 12668293120  66% /scratch[OST:0]
lustre-OST0001_UUID    36903628800 23901798400 13001830400  65% /scratch[OST:1]
lustre-OST0002_UUID    36903628800 24537989120 12365639680  67% /scratch[OST:2]
lustre-OST0003_UUID    36903628800 24134615040 12769013760  65% /scratch[OST:3]

filesystem_summary:   147614515200 96809738240 50804776960  66% /scratch
`);
        }
      }

      case "check": {
        const target = parsed.positionalArgs[1] || "servers";

        if (target === "servers") {
          return this.createSuccess(`Check: lustre-MDT0000 on /scratch
Check: lustre-OST0000 on /scratch
Check: lustre-OST0001 on /scratch
Check: lustre-OST0002 on /scratch
Check: lustre-OST0003 on /scratch

All Lustre servers are responding
`);
        }

        return this.createSuccess("lfs check completed");
      }

      case "help": {
        return this.createSuccess(`Usage: lfs <command> [options]

Available commands:
  df [-h]           Show Lustre filesystem disk space usage
  check servers     Check Lustre server connectivity
  getstripe <file>  Get striping information for a file
  setstripe <file>  Set striping pattern for a file

For more information: man lfs
`);
      }

      default: {
        return this.createError(
          `lfs: unknown command '${subcommand}'\n\nTry 'lfs help' for more information`,
        );
      }
    }
  }
}
