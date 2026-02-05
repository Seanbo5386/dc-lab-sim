// src/components/ReferenceTab.tsx
import { useState, useMemo } from "react";
import { Search, ChevronRight, ChevronDown } from "lucide-react";
import taskCategoriesData from "../data/taskCategories.json";
import { XidErrorReference } from "./XidErrorReference";

interface CommandReference {
  name: string;
  summary: string;
  commonUsage: { command: string; description: string }[];
  options: { flag: string; description: string }[];
  related: string[];
}

interface TaskCategory {
  id: string;
  title: string;
  icon: string;
  decisionGuide: string;
  commands: CommandReference[];
}

const categories = taskCategoriesData.categories as TaskCategory[];

export function ReferenceTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<TaskCategory | null>(
    null,
  );
  const [expandedCommands, setExpandedCommands] = useState<Set<string>>(
    new Set(),
  );

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const query = searchQuery.toLowerCase();
    return categories.filter(
      (cat) =>
        cat.title.toLowerCase().includes(query) ||
        cat.commands.some(
          (cmd) =>
            cmd.name.toLowerCase().includes(query) ||
            cmd.summary.toLowerCase().includes(query),
        ),
    );
  }, [searchQuery]);

  const toggleCommand = (cmdName: string) => {
    setExpandedCommands((prev) => {
      const next = new Set(prev);
      if (next.has(cmdName)) {
        next.delete(cmdName);
      } else {
        next.add(cmdName);
      }
      return next;
    });
  };

  const handleCategoryClick = (category: TaskCategory) => {
    setSelectedCategory(category);
    setExpandedCommands(new Set([category.commands[0]?.name]));
  };

  const handleBackToMain = () => {
    setSelectedCategory(null);
    setExpandedCommands(new Set());
  };

  // Category detail view
  if (selectedCategory) {
    // Special case: Understand Errors shows XidErrorReference
    if (selectedCategory.id === "understand-errors") {
      return (
        <div className="h-full overflow-auto p-6 bg-gray-900">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
            <button
              onClick={handleBackToMain}
              className="hover:text-white transition-colors"
            >
              Reference
            </button>
            <ChevronRight className="w-4 h-4" />
            <span className="text-white">{selectedCategory.title}</span>
          </div>
          <XidErrorReference />
        </div>
      );
    }

    return (
      <div className="h-full overflow-auto p-6 bg-gray-900">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <button
            onClick={handleBackToMain}
            className="hover:text-white transition-colors"
          >
            Reference
          </button>
          <ChevronRight className="w-4 h-4" />
          <span className="text-white">{selectedCategory.title}</span>
        </div>

        {/* Page title for accessibility */}
        <h1 className="sr-only">Reference › {selectedCategory.title}</h1>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search commands..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-nvidia-green"
          />
        </div>

        {/* Decision Guide */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-400 mb-2">
            When to use these tools:
          </h3>
          <p className="text-gray-300 font-mono text-sm">
            {selectedCategory.decisionGuide}
          </p>
        </div>

        {/* Commands */}
        <div className="space-y-3">
          {selectedCategory.commands.map((cmd) => {
            const isExpanded = expandedCommands.has(cmd.name);
            return (
              <div
                key={cmd.name}
                className="bg-gray-800 border border-gray-700 rounded-lg"
              >
                <button
                  onClick={() => toggleCommand(cmd.name)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-750 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-nvidia-green" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                    <span className="font-mono text-nvidia-green font-semibold">
                      {cmd.name}
                    </span>
                  </div>
                  <span className="text-gray-400 text-sm">{cmd.summary}</span>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-gray-700">
                    {/* Common Usage */}
                    <div className="mb-4">
                      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                        COMMON USAGE
                      </h4>
                      <div className="space-y-2">
                        {cmd.commonUsage.map((usage, i) => (
                          <div key={i} className="flex gap-4">
                            <code className="text-nvidia-green bg-gray-900 px-2 py-1 rounded text-sm whitespace-nowrap">
                              {usage.command}
                            </code>
                            <span className="text-gray-400 text-sm">
                              {usage.description}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Options */}
                    {cmd.options.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                          KEY OPTIONS
                        </h4>
                        <div className="space-y-1">
                          {cmd.options.map((opt, i) => (
                            <div key={i} className="flex gap-4">
                              <code className="text-yellow-400 font-mono text-sm w-32 shrink-0">
                                {opt.flag}
                              </code>
                              <span className="text-gray-400 text-sm">
                                {opt.description}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Related */}
                    {cmd.related.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                          RELATED
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {cmd.related.map((rel, i) => (
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
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Main category grid view
  return (
    <div className="h-full overflow-auto p-6 bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Reference</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search commands..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-nvidia-green w-64"
          />
        </div>
      </div>

      {/* Subtitle */}
      <p className="text-gray-400 mb-6">What do you want to do?</p>

      {/* Category Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCategories.map((category) => (
          <button
            key={category.id}
            onClick={() => handleCategoryClick(category)}
            className="bg-gray-800 border border-gray-700 rounded-lg p-6 text-left hover:border-nvidia-green transition-colors group"
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">{category.icon}</span>
              <h3 className="text-lg font-semibold text-white group-hover:text-nvidia-green transition-colors">
                {category.title}
              </h3>
            </div>
            <div className="text-sm text-gray-400">
              {category.commands.map((cmd) => cmd.name).join(", ")}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
