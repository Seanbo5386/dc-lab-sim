import React, { useState, useEffect, useMemo } from "react";
import {
  Terminal,
  ChevronRight,
  ChevronDown,
  Search,
  Lightbulb,
  Loader2,
} from "lucide-react";
import { getCommandDefinitionRegistry } from "@/cli";
import type { CommandDefinition, CommandCategory } from "@/cli/types";
import taskCategoriesData from "@/data/taskCategories.json";

// ============================================================================
// Constants
// ============================================================================

const CATEGORY_ORDER: CommandCategory[] = [
  "gpu_management",
  "diagnostics",
  "networking",
  "cluster_management",
  "monitoring",
  "system_info",
  "containers",
  "firmware",
  "storage",
  "gpu_fabric",
  "cuda_tools",
  "nccl_tests",
  "mpi",
  "rdma_perf",
  "parallel_shell",
  "modules",
  "general",
];

const CATEGORY_DISPLAY_NAMES: Record<CommandCategory, string> = {
  gpu_management: "GPU Management",
  diagnostics: "Diagnostics",
  networking: "Networking & InfiniBand",
  cluster_management: "Cluster Management",
  monitoring: "Monitoring",
  system_info: "System Information",
  containers: "Containers",
  firmware: "Firmware",
  storage: "Storage",
  gpu_fabric: "GPU Fabric (NVLink/NVSwitch)",
  cuda_tools: "CUDA Tools",
  nccl_tests: "NCCL Tests",
  mpi: "MPI",
  rdma_perf: "RDMA Performance",
  parallel_shell: "Parallel Shell",
  modules: "Environment Modules",
  general: "General",
};

interface DecisionGuide {
  title: string;
  guide: string;
}

const decisionGuides: DecisionGuide[] = (
  taskCategoriesData as {
    categories: { title: string; decisionGuide: string }[];
  }
).categories
  .filter((cat) => cat.title !== "Understand Errors")
  .map((cat) => ({ title: cat.title, guide: cat.decisionGuide }));

/** Extract the first sentence from a description for the collapsed header. */
function briefDescription(text: string): string {
  const match = text.match(/^[^.!]+[.!]/);
  return match ? match[0] : text;
}

interface CategoryData {
  category: CommandCategory;
  displayName: string;
  commands: CommandDefinition[];
}

// ============================================================================
// CommandsReference Component
// ============================================================================

export const CommandsReference: React.FC = () => {
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );
  const [expandedCommands, setExpandedCommands] = useState<Set<string>>(
    new Set(),
  );
  const [guidesExpanded, setGuidesExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const registry = await getCommandDefinitionRegistry();
      if (cancelled) return;

      const loaded: CategoryData[] = [];
      for (const cat of CATEGORY_ORDER) {
        const cmds = registry.getByCategory(cat);
        if (cmds.length > 0) {
          loaded.push({
            category: cat,
            displayName: CATEGORY_DISPLAY_NAMES[cat],
            commands: cmds.sort((a, b) => a.command.localeCompare(b.command)),
          });
        }
      }
      setCategories(loaded);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const query = searchQuery.toLowerCase();
    return categories
      .map((cat) => {
        // Check if category name matches
        if (cat.displayName.toLowerCase().includes(query)) return cat;
        // Filter commands within category
        const filtered = cat.commands.filter(
          (cmd) =>
            cmd.command.toLowerCase().includes(query) ||
            cmd.description.toLowerCase().includes(query) ||
            cmd.synopsis.toLowerCase().includes(query) ||
            cmd.common_usage_patterns?.some(
              (u) =>
                u.command.toLowerCase().includes(query) ||
                u.description.toLowerCase().includes(query),
            ),
        );
        if (filtered.length === 0) return null;
        return { ...cat, commands: filtered };
      })
      .filter(Boolean) as CategoryData[];
  }, [searchQuery, categories]);

  const toggleCategory = (id: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleCommand = (key: string) => {
    setExpandedCommands((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const totalCommands = categories.reduce(
    (sum, cat) => sum + cat.commands.length,
    0,
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-nvidia-green animate-spin" />
        <span className="ml-3 text-gray-400">Loading command reference...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3 border-b border-gray-700 pb-3">
          <Terminal className="w-5 h-5 text-nvidia-green" />
          <h3 className="text-xl font-bold text-white">CLI Tool Reference</h3>
          <span className="text-sm text-gray-500 ml-2">
            {totalCommands} commands across {categories.length} categories
          </span>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search commands..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-nvidia-green w-64"
          />
        </div>
      </div>

      {/* Quick Decision Guide */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <button
          onClick={() => setGuidesExpanded(!guidesExpanded)}
          className="w-full p-4 text-left hover:bg-gray-700/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Lightbulb className="w-5 h-5 text-yellow-400" />
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-yellow-400 text-base">
                Quick Decision Guide
              </h4>
              <p className="text-xs text-gray-400 mt-1">
                Which tool for which task? Quick reference for choosing the
                right command.
              </p>
            </div>
            {guidesExpanded ? (
              <ChevronDown className="w-5 h-5 text-yellow-400 shrink-0" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
            )}
          </div>
        </button>
        {guidesExpanded && (
          <div className="border-t border-gray-700 p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {decisionGuides.map((guide) => (
              <div
                key={guide.title}
                className="bg-gray-900 rounded-lg p-3 border border-gray-700"
              >
                <h5 className="text-sm font-semibold text-nvidia-green mb-1">
                  {guide.title}
                </h5>
                <p className="text-xs text-gray-400 font-mono">{guide.guide}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Category Accordions */}
      {filteredCategories.map((cat) => {
        const isExpanded = expandedCategories.has(cat.category);
        return (
          <div
            key={cat.category}
            className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden"
          >
            {/* Category header */}
            <button
              onClick={() => toggleCategory(cat.category)}
              className="w-full p-4 text-left hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-nvidia-green text-base">
                    {cat.displayName}
                  </h4>
                </div>
                <span className="text-gray-400 text-sm mr-2">
                  {cat.commands.length}{" "}
                  {cat.commands.length === 1 ? "command" : "commands"}
                </span>
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-nvidia-green shrink-0" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
                )}
              </div>
            </button>

            {/* Expanded command list */}
            {isExpanded && (
              <div className="border-t border-gray-700">
                {cat.commands.map((cmd) => {
                  const cmdKey = `${cat.category}-${cmd.command}`;
                  const cmdExpanded = expandedCommands.has(cmdKey);
                  return (
                    <div
                      key={cmd.command}
                      className="border-b border-gray-700/50 last:border-0"
                    >
                      <button
                        onClick={() => toggleCommand(cmdKey)}
                        className="w-full flex items-start gap-3 p-4 text-left hover:bg-gray-900/50 transition-colors"
                      >
                        <span className="mt-0.5 shrink-0">
                          {cmdExpanded ? (
                            <ChevronDown className="w-4 h-4 text-nvidia-green" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-500" />
                          )}
                        </span>
                        <span className="font-mono text-nvidia-green font-semibold text-sm shrink-0 w-44">
                          {cmd.command}
                        </span>
                        <span className="text-gray-400 text-sm">
                          {briefDescription(cmd.description)}
                        </span>
                      </button>

                      {cmdExpanded && <CommandDetail def={cmd} />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {filteredCategories.length === 0 && (
        <div className="text-center py-10 text-gray-500">
          No commands match &quot;{searchQuery}&quot;
        </div>
      )}
    </div>
  );
};

// ============================================================================
// CommandDetail Sub-component
// ============================================================================

const CommandDetail: React.FC<{ def: CommandDefinition }> = ({ def }) => (
  <div className="px-4 pb-4 pt-2 ml-7 space-y-4">
    {/* Synopsis */}
    <div>
      <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
        SYNOPSIS
      </h5>
      <code className="text-nvidia-green bg-black px-3 py-1.5 rounded text-xs font-mono block border border-gray-800 overflow-x-auto">
        {def.synopsis}
      </code>
    </div>

    {/* Description */}
    <div>
      <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
        DESCRIPTION
      </h5>
      <p className="text-gray-300 text-sm">{def.description}</p>
    </div>

    {/* Options */}
    {def.global_options && def.global_options.length > 0 && (
      <div>
        <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          OPTIONS
        </h5>
        <div className="space-y-1">
          {def.global_options.map((opt, i) => {
            const flagDisplay =
              opt.flag ||
              [
                opt.short ? `-${opt.short}` : "",
                opt.long ? `--${opt.long}` : "",
              ]
                .filter(Boolean)
                .join(", ");
            return (
              <div key={i} className="flex gap-4">
                <code className="text-yellow-400 font-mono text-sm w-40 shrink-0">
                  {flagDisplay}
                </code>
                <span className="text-gray-400 text-sm">{opt.description}</span>
              </div>
            );
          })}
        </div>
      </div>
    )}

    {/* Subcommands */}
    {def.subcommands && def.subcommands.length > 0 && (
      <div>
        <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          SUBCOMMANDS
        </h5>
        <div className="space-y-1">
          {def.subcommands.map((sub, i) => (
            <div key={i} className="flex gap-4">
              <code className="text-blue-400 font-mono text-sm w-40 shrink-0">
                {sub.name}
              </code>
              <span className="text-gray-400 text-sm">{sub.description}</span>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* Usage Examples */}
    {def.common_usage_patterns && def.common_usage_patterns.length > 0 && (
      <div>
        <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          USAGE EXAMPLES
        </h5>
        <div className="space-y-2">
          {def.common_usage_patterns.map((usage, i) => (
            <div key={i} className="flex flex-col sm:flex-row gap-2 sm:gap-4">
              <code className="text-nvidia-green bg-black px-3 py-1.5 rounded text-xs font-mono whitespace-nowrap border border-gray-800">
                {usage.command}
              </code>
              <span className="text-gray-400 text-sm flex items-center gap-1">
                <ChevronRight className="w-3 h-3 text-gray-600 hidden sm:block" />
                {usage.description}
              </span>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* Related Commands */}
    {def.interoperability?.related_commands &&
      def.interoperability.related_commands.length > 0 && (
        <div>
          <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            RELATED
          </h5>
          <div className="flex flex-wrap gap-2">
            {def.interoperability.related_commands.map((rel, i) => (
              <span
                key={i}
                className="text-sm bg-gray-700 px-2 py-1 rounded text-gray-300"
              >
                {rel}
              </span>
            ))}
          </div>
        </div>
      )}
  </div>
);
