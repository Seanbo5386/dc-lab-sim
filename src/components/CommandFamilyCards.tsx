/**
 * CommandFamilyCards Component - Display command family cards showing the tool landscape
 *
 * Users can view all command families, see tool details, and start quizzes.
 */

import React, { useState, useMemo } from "react";
import commandFamiliesData from "../data/commandFamilies.json";
import type {
  CommandFamily,
  Tool,
  CommandFamiliesData,
} from "../types/commandFamilies";

interface CommandFamilyCardsProps {
  /** Show specific family, or all if undefined */
  familyId?: string;
  /** full = with quiz buttons, reference = compact */
  mode?: "full" | "reference";
  /** Callback when user wants to start a quiz for a family */
  onStartQuiz?: (familyId: string) => void;
  /** Callback when user wants to see a tool example */
  onShowToolExample?: (familyId: string, toolName: string) => void;
}

interface ExpandedState {
  [familyId: string]: boolean;
}

interface ExpandedToolState {
  [key: string]: boolean; // key = `${familyId}-${toolName}`
}

export const CommandFamilyCards: React.FC<CommandFamilyCardsProps> = ({
  familyId,
  mode = "full",
  onStartQuiz,
  onShowToolExample,
}) => {
  // State for expanded families (in reference mode)
  const [expandedFamilies, setExpandedFamilies] = useState<ExpandedState>({});
  // State for expanded tools within families
  const [expandedTools, setExpandedTools] = useState<ExpandedToolState>({});

  // Get families to display
  const families = useMemo(() => {
    const data = commandFamiliesData as CommandFamiliesData;
    if (familyId) {
      const family = data.families.find((f) => f.id === familyId);
      return family ? [family] : [];
    }
    return data.families;
  }, [familyId]);

  // Toggle family expansion (for reference mode)
  const toggleFamily = (id: string) => {
    setExpandedFamilies((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Toggle tool expansion
  const toggleTool = (familyId: string, toolName: string) => {
    const key = `${familyId}-${toolName}`;
    setExpandedTools((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Check if tool is expanded
  const isToolExpanded = (familyId: string, toolName: string) => {
    return expandedTools[`${familyId}-${toolName}`] || false;
  };

  // Render permission badge
  const renderPermissionBadge = (permission: Tool["permissions"]) => {
    const isRoot = permission === "root";
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
          isRoot
            ? "bg-red-900/50 text-red-400 border border-red-700"
            : "bg-green-900/50 text-green-400 border border-green-700"
        }`}
      >
        {isRoot ? "root" : "user"}
      </span>
    );
  };

  // Render a single tool item
  const renderTool = (family: CommandFamily, tool: Tool) => {
    const expanded = isToolExpanded(family.id, tool.name);
    const toolKey = `${family.id}-${tool.name}`;

    return (
      <div
        key={toolKey}
        className="border border-gray-700 rounded-lg overflow-hidden transition-all duration-200"
      >
        {/* Tool header - always visible */}
        <button
          onClick={() => toggleTool(family.id, tool.name)}
          className="w-full flex items-center justify-between p-3 bg-gray-800/50 hover:bg-gray-700/50 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <code className="text-nvidia-green font-mono text-sm font-semibold">
              {tool.name}
            </code>
            <span className="text-gray-400 text-sm">{tool.tagline}</span>
          </div>
          <div className="flex items-center gap-2">
            {renderPermissionBadge(tool.permissions)}
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                expanded ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </button>

        {/* Expanded content */}
        <div
          className={`overflow-hidden transition-all duration-200 ${
            expanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="p-4 bg-gray-800/30 border-t border-gray-700 space-y-3">
            {/* Description */}
            <p className="text-gray-300 text-sm leading-relaxed">
              {tool.description}
            </p>

            {/* Best for */}
            <div>
              <span className="text-gray-500 text-xs uppercase tracking-wide font-semibold">
                Best For:
              </span>
              <p className="text-gray-400 text-sm mt-1">{tool.bestFor}</p>
            </div>

            {/* Example command */}
            <div>
              <span className="text-gray-500 text-xs uppercase tracking-wide font-semibold">
                Example:
              </span>
              <div className="mt-1 flex items-center gap-2">
                <code className="flex-1 bg-black rounded px-3 py-2 font-mono text-sm text-nvidia-green overflow-x-auto">
                  $ {tool.exampleCommand}
                </code>
                {onShowToolExample && (
                  <button
                    onClick={() => onShowToolExample(family.id, tool.name)}
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-xs font-medium transition-colors shrink-0"
                  >
                    Try It
                  </button>
                )}
              </div>
            </div>

            {/* Related tools */}
            {tool.relatedTools && tool.relatedTools.length > 0 && (
              <div>
                <span className="text-gray-500 text-xs uppercase tracking-wide font-semibold">
                  Related:
                </span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {tool.relatedTools.map((related) => (
                    <span
                      key={related}
                      className="px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-400 font-mono"
                    >
                      {related}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render a family card
  const renderFamilyCard = (family: CommandFamily) => {
    const isExpanded = mode === "full" || expandedFamilies[family.id];

    return (
      <div
        key={family.id}
        className="bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors overflow-hidden"
      >
        {/* Card header */}
        <div
          className={`p-5 ${mode === "reference" ? "cursor-pointer" : ""}`}
          onClick={
            mode === "reference" ? () => toggleFamily(family.id) : undefined
          }
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{family.icon}</span>
              <h3 className="text-white text-lg font-semibold m-0">
                {family.name}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-400 font-medium">
                {family.tools.length} tools
              </span>
              {mode === "reference" && (
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              )}
            </div>
          </div>

          {/* Description */}
          <p className="text-gray-400 text-sm leading-relaxed mb-4">
            {family.description}
          </p>

          {/* QuickRule - prominently displayed */}
          <div className="bg-nvidia-green/10 border border-nvidia-green/30 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <span className="text-nvidia-green text-sm font-bold shrink-0">
                Quick Rule:
              </span>
              <p className="text-gray-300 text-sm m-0 leading-relaxed">
                {family.quickRule}
              </p>
            </div>
          </div>
        </div>

        {/* Expandable content */}
        <div
          className={`overflow-hidden transition-all duration-300 ${
            isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          {/* Tool list */}
          <div className="px-5 pb-4 space-y-2">
            <h4 className="text-gray-500 text-xs uppercase tracking-wide font-semibold mb-3">
              Tools in this family
            </h4>
            {family.tools.map((tool) => renderTool(family, tool))}
          </div>

          {/* Start Quiz button (only in full mode) */}
          {mode === "full" && onStartQuiz && (
            <div className="px-5 pb-5">
              <button
                onClick={() => onStartQuiz(family.id)}
                className="w-full py-3 bg-nvidia-green hover:bg-nvidia-darkgreen text-black font-bold rounded-lg transition-colors text-sm"
              >
                Start {family.name} Quiz
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Empty state
  if (families.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-8 text-center">
        <p className="text-gray-400">
          {familyId
            ? `Command family "${familyId}" not found.`
            : "No command families available."}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Responsive grid: 1 col mobile, 2 cols tablet, 3 cols desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {families.map((family) => renderFamilyCard(family))}
      </div>
    </div>
  );
};

export default CommandFamilyCards;
