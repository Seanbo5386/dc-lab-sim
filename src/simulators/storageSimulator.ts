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
    return this.safeExecuteHandler(handler, parsed, context) as CommandResult;
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
        size: humanReadable ? "1.2P" : "1258291200000",
        used: humanReadable ? "804T" : "843308236800",
        avail: humanReadable ? "396T" : "414982963200",
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
      // Inode mode - numeric columns right-aligned
      const devW = 20;
      const typeW = 8;
      const inodesW = 12;
      const iusedW = 12;
      const ifreeW = 12;
      const ipctW = 6;
      const hdr =
        "Filesystem".padEnd(devW) +
        (showType ? "Type".padEnd(typeW) : "") +
        "Inodes".padStart(inodesW) +
        " " +
        "IUsed".padStart(iusedW) +
        " " +
        "IFree".padStart(ifreeW) +
        " " +
        "IUse%".padStart(ipctW) +
        " " +
        "Mounted on\n";
      output = hdr;
      filesystems.forEach((fs) => {
        const device = fs.device.padEnd(devW);
        const type = showType ? fs.type.padEnd(typeW) : "";
        output += `${device}${type}${fs.inodes.padStart(inodesW)} ${fs.inodesUsed.padStart(iusedW)} ${fs.inodesAvail.padStart(ifreeW)} ${fs.inodesPercent.padStart(ipctW)} ${fs.mount}\n`;
      });
    } else {
      // Regular mode - numeric columns right-aligned
      const devW = 20;
      const typeW = 8;
      const sizeW = humanReadable ? 6 : 13;
      const usedW = humanReadable ? 6 : 13;
      const availW = humanReadable ? 6 : 13;
      const pctW = 5;
      const sizeLabel = humanReadable ? "Size" : "1K-blocks";
      const hdr =
        "Filesystem".padEnd(devW) +
        (showType ? "Type".padEnd(typeW) : "") +
        sizeLabel.padStart(sizeW) +
        " " +
        "Used".padStart(usedW) +
        " " +
        "Avail".padStart(availW) +
        " " +
        "Use%".padStart(pctW) +
        " " +
        "Mounted on\n";
      output = hdr;
      filesystems.forEach((fs) => {
        const device = fs.device.padEnd(devW);
        const type = showType ? fs.type.padEnd(typeW) : "";
        output += `${device}${type}${fs.size.padStart(sizeW)} ${fs.used.padStart(usedW)} ${fs.avail.padStart(availW)} ${fs.usePercent.padStart(pctW)} ${fs.mount}\n`;
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
scratch-MDT0000_UUID     953.6G      238.4G      715.2G  25% /scratch[MDT:0]
scratch-OST0000_UUID     300.0T      201.0T       99.0T  67% /scratch[OST:0]
scratch-OST0001_UUID     300.0T      198.0T      102.0T  66% /scratch[OST:1]
scratch-OST0002_UUID     300.0T      204.0T       96.0T  68% /scratch[OST:2]
scratch-OST0003_UUID     300.0T      201.0T       99.0T  67% /scratch[OST:3]

filesystem_summary:        1.2P      804.0T      396.0T  67% /scratch
`);
        } else {
          return this
            .createSuccess(`UUID                       1K-blocks        Used   Available Use% Mounted on
scratch-MDT0000_UUID    1000341504   250006016   750335488  25% /scratch[MDT:0]
scratch-OST0000_UUID  314572800000 210827059200 103745740800  67% /scratch[OST:0]
scratch-OST0001_UUID  314572800000 207693004800 106879795200  66% /scratch[OST:1]
scratch-OST0002_UUID  314572800000 213961113600 100611686400  68% /scratch[OST:2]
scratch-OST0003_UUID  314572800000 210827059200 103745740800  67% /scratch[OST:3]

filesystem_summary:  1258291200000 843308236800 414982963200  67% /scratch
`);
        }
      }

      case "check": {
        const target = parsed.positionalArgs[1] || "servers";

        if (target === "servers") {
          return this.createSuccess(`Check: scratch-MDT0000 on /scratch
Check: scratch-OST0000 on /scratch
Check: scratch-OST0001 on /scratch
Check: scratch-OST0002 on /scratch
Check: scratch-OST0003 on /scratch

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

      case "getstripe": {
        const path = parsed.positionalArgs[1] || "/data/training";
        return this.createSuccess(`lmm_stripe_count:  4
lmm_stripe_size:   1048576
lmm_pattern:       raid0
lmm_layout_gen:    0
lmm_stripe_offset: 0
        obdidx           objid           objid           group
             0          389120       0x5f000                0
             1          389121       0x5f001                0
             2          389122       0x5f002                0
             3          389123       0x5f003                0

${path}: stripe_count=4, stripe_size=1048576, stripe_offset=0
`);
      }

      case "setstripe": {
        const path = parsed.positionalArgs[1] || "/data/output";
        const stripeCount =
          this.getFlagString(parsed, ["c", "stripe-count"]) || "4";
        const stripeSize =
          this.getFlagString(parsed, ["S", "stripe-size"]) || "1M";
        return this.createSuccess(
          `lfs setstripe: ${path} configured with stripe_count=${stripeCount}, stripe_size=${stripeSize}`,
        );
      }

      default: {
        return this.createError(
          `lfs: unknown command '${subcommand}'\n\nTry 'lfs help' for more information`,
        );
      }
    }
  }
}
