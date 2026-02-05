import type {
  CommandResult,
  CommandContext,
  ParsedCommand,
  SimulatorMetadata,
} from "@/types/commands";
import { BaseSimulator } from "./BaseSimulator";
import { useSimulationStore } from "@/store/simulationStore";

interface Container {
  id: string;
  image: string;
  command: string;
  status: string;
  name: string;
}

interface Image {
  repository: string;
  tag: string;
  id: string;
  size: string;
}

export class ContainerSimulator extends BaseSimulator {
  private containers: Container[] = [];
  private images: Image[] = [
    {
      repository: "nvidia/cuda",
      tag: "12.4.0-base",
      id: "abc123def456",
      size: "1.2GB",
    },
    {
      repository: "nvcr.io/nvidia/pytorch",
      tag: "24.01-py3",
      id: "def789ghi012",
      size: "8.5GB",
    },
    {
      repository: "nvcr.io/nvidia/tensorflow",
      tag: "24.01-tf2-py3",
      id: "ghi345jkl678",
      size: "7.8GB",
    },
  ];

  private ngcConfigured = false;

  constructor() {
    super();
    this.initializeDefinitionRegistry();
  }

  getMetadata(): SimulatorMetadata {
    return {
      name: "container-tools",
      version: "1.0.0",
      description: "Container management tools (Docker, NGC, Enroot)",
      commands: [
        {
          name: "docker",
          description: "Docker container runtime",
          usage: "docker [OPTIONS] COMMAND [ARGS...]",
          examples: [
            "docker ps",
            "docker images",
            "docker run --gpus all nvidia/cuda:12.4.0-base nvidia-smi",
          ],
        },
        {
          name: "ngc",
          description: "NVIDIA GPU Cloud CLI",
          usage: "ngc [COMMAND] [OPTIONS]",
          examples: [
            "ngc config set",
            "ngc registry image list",
            "ngc registry model list",
          ],
        },
        {
          name: "enroot",
          description: "Unprivileged container runtime",
          usage: "enroot [COMMAND] [OPTIONS]",
          examples: [
            "enroot import docker://nvidia/cuda:12.4.0-base",
            "enroot list",
            "enroot start container-name",
          ],
        },
      ],
    };
  }

  execute(parsed: ParsedCommand, context: CommandContext): CommandResult {
    // Handle --version flag at root level
    if (this.hasAnyFlag(parsed, ["version", "v"])) {
      return this.handleVersion();
    }

    // Handle --help flag at root level
    if (this.hasAnyFlag(parsed, ["help", "h"])) {
      return this.handleHelp();
    }

    // Route to appropriate tool handler based on baseCommand
    const tool = parsed.baseCommand;

    switch (tool) {
      case "docker":
        return this.handleDocker(parsed, context);
      case "ngc":
        return this.handleNGC(parsed, context);
      case "enroot":
        return this.handleEnroot(parsed, context);
      default:
        return this.createError(`Unknown container tool: ${tool}`);
    }
  }

  private getNode(context: CommandContext) {
    const state = useSimulationStore.getState();
    return state.cluster.nodes.find((n) => n.id === context.currentNode);
  }

  // Docker commands
  private handleDocker(
    parsed: ParsedCommand,
    context: CommandContext,
  ): CommandResult {
    // Handle --help flag
    if (this.hasAnyFlag(parsed, ["help", "h"])) {
      let output = "Usage: docker [OPTIONS] COMMAND\n\n";
      output += "A self-sufficient runtime for containers\n\n";
      output += "Options:\n";
      output += "      --help       Print usage\n";
      output += "  -v, --version    Print version information\n\n";
      output += "Commands:\n";
      output += "  run       Create and run a new container\n";
      output += "  ps        List containers\n";
      output += "  images    List images\n";
      output += "  pull      Download an image\n\n";
      output +=
        "Run 'docker COMMAND --help' for more information on a command.\n";
      return this.createSuccess(output);
    }

    // Handle --version flag
    if (this.hasAnyFlag(parsed, ["version", "v"])) {
      return this.createSuccess("Docker version 24.0.7, build afdd53b");
    }

    const command = parsed.subcommands[0];

    if (command === "run") {
      // Check for --gpus flag
      const gpuSpec = this.getFlagString(parsed, ["gpus"]);
      if (!gpuSpec) {
        return this.createError(
          "Error: GPU specification missing. Use --gpus <spec>",
          125,
        );
      }

      // Get image from positional args (first positional arg after subcommands)
      const image = parsed.positionalArgs[0];
      if (!image) {
        return this.createError("Error: Image not specified");
      }

      // Get command args (remaining positional args after image)
      const commandArgs = parsed.positionalArgs.slice(1);

      const node = this.getNode(context);
      if (!node) {
        return this.createError("Error: Unable to determine current node");
      }

      // Validate GPU specification
      if (gpuSpec === "all") {
        // All GPUs
        let output = `docker: Pulling ${image}...\n`;
        output += `docker: Container started with ${node.gpus.length} GPU(s)\n\n`;

        if (commandArgs.includes("nvidia-smi")) {
          output += "Running nvidia-smi inside container:\n\n";
          output += "GPU 0: " + node.gpus[0].name + "\n";
          node.gpus.slice(1).forEach((gpu, idx) => {
            output += `GPU ${idx + 1}: ${gpu.name}\n`;
          });
        } else if (commandArgs.length > 0) {
          output += `Executing: ${commandArgs.join(" ")}\n`;
          output += "Command completed successfully\n";
        }

        return this.createSuccess(output);
      }

      if (gpuSpec.startsWith("device=")) {
        const devices = gpuSpec.split("=")[1].split(",");

        // Check for MIG device specification
        if (devices[0].startsWith("MIG-GPU")) {
          const migDeviceMatch = devices[0].match(/MIG-GPU-(\d+)/);
          if (migDeviceMatch) {
            const gpuId = parseInt(migDeviceMatch[1]);
            const gpu = node.gpus[gpuId];

            if (!gpu || !gpu.migMode) {
              return this.createError(
                "Error: MIG device not found or MIG mode not enabled",
                125,
              );
            }

            let output = `docker: Container started with MIG device ${devices[0]}\n\n`;

            if (commandArgs.includes("nvidia-smi")) {
              output += "Running nvidia-smi inside container:\n\n";
              output += `MIG Device: ${devices[0]}\n`;
              output += "Memory: 4.75 GB\n";
              output += "Compute Slices: 14\n";
            }

            return this.createSuccess(output);
          }
        }

        // Regular GPU device specification
        let output = `docker: Container started with GPU(s): ${devices.join(", ")}\n\n`;

        if (commandArgs.includes("nvidia-smi")) {
          output += "Running nvidia-smi inside container:\n\n";
          devices.forEach((deviceId) => {
            const id = parseInt(deviceId);
            if (id >= 0 && id < node.gpus.length) {
              output += `GPU ${id}: ${node.gpus[id].name}\n`;
            }
          });
        }

        return this.createSuccess(output);
      }

      return this.createError(
        'Error: Invalid GPU specification. Use "all" or "device=0,1,..."',
        125,
      );
    }

    if (command === "ps") {
      // SOURCE OF TRUTH: Column widths for docker ps
      const COL_CONTAINERID = 15;
      const COL_IMAGE = 25;
      const COL_COMMAND = 17;
      const COL_CREATED = 16;
      const COL_STATUS = 15;
      const COL_PORTS = 10;
      // NAMES has no fixed width (last column)

      let output =
        "CONTAINER ID".padEnd(COL_CONTAINERID) +
        "IMAGE".padEnd(COL_IMAGE) +
        "COMMAND".padEnd(COL_COMMAND) +
        "CREATED".padEnd(COL_CREATED) +
        "STATUS".padEnd(COL_STATUS) +
        "PORTS".padEnd(COL_PORTS) +
        "NAMES\n";

      if (this.containers.length === 0) {
        return this.createSuccess(output);
      }

      this.containers.forEach((container) => {
        output +=
          container.id.padEnd(COL_CONTAINERID) +
          container.image.padEnd(COL_IMAGE) +
          `"${container.command}"`.padEnd(COL_COMMAND) +
          "".padEnd(COL_CREATED) +
          container.status.padEnd(COL_STATUS) +
          "".padEnd(COL_PORTS) +
          container.name +
          "\n";
      });

      return this.createSuccess(output);
    }

    if (command === "images") {
      // SOURCE OF TRUTH: Column widths for docker images
      const COL_REPOSITORY = 34;
      const COL_TAG = 15;
      const COL_IMAGEID = 15;
      const COL_CREATED = 15;
      // SIZE has no fixed width (last column)

      let output =
        "REPOSITORY".padEnd(COL_REPOSITORY) +
        "TAG".padEnd(COL_TAG) +
        "IMAGE ID".padEnd(COL_IMAGEID) +
        "CREATED".padEnd(COL_CREATED) +
        "SIZE\n";

      this.images.forEach((image) => {
        output +=
          image.repository.padEnd(COL_REPOSITORY) +
          image.tag.padEnd(COL_TAG) +
          image.id.padEnd(COL_IMAGEID) +
          "2 weeks ago".padEnd(COL_CREATED) +
          image.size +
          "\n";
      });

      return this.createSuccess(output);
    }

    if (command === "pull") {
      const image = parsed.positionalArgs[0];

      if (!image) {
        return this.createError("Error: Image name not specified");
      }

      let output = `Pulling ${image}...\n`;
      output += "latest: Pulling from " + image.split(":")[0] + "\n";
      output += "████████████████████████████████ 100%\n";
      output += "Digest: sha256:abc123...\n";
      output += "Status: Downloaded newer image for " + image + "\n";

      // Add to images if not already present
      const [repo, tag] = image.split(":");
      if (
        !this.images.find(
          (i) => i.repository === repo && i.tag === (tag || "latest"),
        )
      ) {
        this.images.push({
          repository: repo,
          tag: tag || "latest",
          id: Math.random().toString(36).substring(7),
          size: "2.5GB",
        });
      }

      return this.createSuccess(output);
    }

    return this.createError("Usage: docker <run|ps|images|pull> [options]");
  }

  // NGC CLI commands
  private handleNGC(
    parsed: ParsedCommand,
    _context: CommandContext,
  ): CommandResult {
    const command = parsed.subcommands[0];

    if (command === "config") {
      const subCommand = parsed.subcommands[1];

      if (subCommand === "set") {
        this.ngcConfigured = true;
        return this.createSuccess(
          "NGC CLI configuration set successfully.\nAPI key saved.",
        );
      }

      if (subCommand === "current") {
        if (!this.ngcConfigured) {
          return this.createError(
            'NGC CLI not configured. Run "ngc config set" first.',
          );
        }

        return this.createSuccess(
          "Current NGC Configuration:\n  API Key: ****...****\n  Org: nvidia\n  Team: default",
        );
      }

      return this.createError("Usage: ngc config <set|current>");
    }

    if (!this.ngcConfigured) {
      return this.createError(
        'Error: NGC CLI not configured. Run "ngc config set" first.',
      );
    }

    if (command === "registry") {
      const subCommand = parsed.subcommands[1];

      if (subCommand === "image") {
        const action = parsed.subcommands[2];

        if (action === "list") {
          const repo = parsed.positionalArgs[0] || "nvcr.io/nvidia/pytorch";

          let output = `Images in ${repo}:\n\n`;
          output +=
            "NAME                                     TAG          SIZE       LAST MODIFIED\n";
          output +=
            "-----------------------------------------------------------------------\n";
          output += `${repo.padEnd(40)} 24.01-py3    8.5 GB     2024-01-15\n`;
          output += `${repo.padEnd(40)} 23.12-py3    8.3 GB     2023-12-20\n`;
          output += `${repo.padEnd(40)} 23.11-py3    8.1 GB     2023-11-15\n`;

          return this.createSuccess(output);
        }

        if (action === "pull") {
          const image = parsed.positionalArgs[0];

          if (!image) {
            return this.createError("Error: Image name not specified");
          }

          let output = `Pulling ${image} from NGC...\n`;
          output += "████████████████████████████████ 100%\n";
          output += `Successfully pulled ${image}\n`;

          return this.createSuccess(output);
        }

        if (action === "info") {
          const image =
            parsed.positionalArgs[0] || "nvcr.io/nvidia/pytorch:24.01-py3";

          let output = `Image Information: ${image}\n\n`;
          output += "Repository: nvcr.io/nvidia/pytorch\n";
          output += "Tag: 24.01-py3\n";
          output += "Size: 8.5 GB\n";
          output += "Architecture: amd64\n";
          output += "OS: Linux\n";
          output += "Created: 2024-01-15\n";
          output += "Description: PyTorch container with CUDA 12.4 support\n";
          output += "\nIncluded Software:\n";
          output += "  - PyTorch 2.2.0\n";
          output += "  - CUDA 12.4\n";
          output += "  - cuDNN 8.9.7\n";
          output += "  - NCCL 2.20.5\n";

          return this.createSuccess(output);
        }
      }

      if (subCommand === "model") {
        const action = parsed.subcommands[2];

        if (action === "list") {
          let output = "Available NGC Models:\n\n";
          output += "NAME                                DESCRIPTION\n";
          output +=
            "---------------------------------------------------------------------\n";
          output +=
            "nvidia/nemo-megatron-gpt-20b        20B parameter GPT model\n";
          output += "nvidia/llama-2-70b                  Meta Llama 2 70B\n";
          output += "nvidia/stable-diffusion-xl          Text-to-image model\n";
          output +=
            "nvidia/resnet50                     Image classification\n";

          return this.createSuccess(output);
        }
      }

      return this.createError(
        "Usage: ngc registry <image|model> <list|pull|info> [name]",
      );
    }

    return this.createError("Usage: ngc <config|registry> [options]");
  }

  // Enroot commands
  private handleEnroot(
    parsed: ParsedCommand,
    _context: CommandContext,
  ): CommandResult {
    const command = parsed.subcommands[0];

    if (command === "import") {
      const source = parsed.positionalArgs[0];

      if (!source) {
        return this.createError("Error: Source not specified");
      }

      let output = `Importing ${source}...\n`;
      output += "Fetching image...\n";
      output += "████████████████████████████████ 100%\n";
      output += `Successfully imported to ${source.replace("docker://", "").replace(/[/:]/g, "+")}.sqsh\n`;

      return this.createSuccess(output);
    }

    if (command === "create") {
      const image = parsed.positionalArgs[0];

      if (!image) {
        return this.createError("Error: Image not specified");
      }

      const containerName =
        image.replace(/[/:]/g, "-") +
        "-" +
        Math.random().toString(36).substring(7);

      return this.createSuccess(
        `Creating container from ${image}...\nContainer created: ${containerName}`,
      );
    }

    if (command === "list") {
      return this.createSuccess(
        "Available enroot containers:\n  pytorch-24.01-py3-abc123\n  tensorflow-24.01-def456",
      );
    }

    if (command === "start") {
      const container = parsed.positionalArgs[0];

      if (!container) {
        return this.createError("Error: Container not specified");
      }

      return this.createSuccess(
        `Starting container ${container}...\nContainer started successfully.`,
      );
    }

    return this.createError(
      "Usage: enroot <import|create|list|start> [options]",
    );
  }
}
