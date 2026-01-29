/**
 * Visual Context Panel
 *
 * Shows contextual information about the current visualization,
 * related lab scenarios, and active scenario details.
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Play, Info, Cpu, Link2 } from 'lucide-react';
import {
  VisualizationContext,
  VisualizationView,
  getRelatedScenarios,
} from '@/utils/scenarioVisualizationMap';

interface VisualContextPanelProps {
  activeScenario: VisualizationContext | null;
  currentView: VisualizationView;
  onLaunchScenario: (scenarioId: string) => void;
}

const DOMAIN_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  domain1: { bg: 'bg-blue-900/50', text: 'text-blue-400', label: 'Domain 1: Platform Bring-Up' },
  domain2: { bg: 'bg-green-900/50', text: 'text-green-400', label: 'Domain 2: Accelerator Config' },
  domain3: { bg: 'bg-purple-900/50', text: 'text-purple-400', label: 'Domain 3: Base Infrastructure' },
  domain4: { bg: 'bg-orange-900/50', text: 'text-orange-400', label: 'Domain 4: Validation & Testing' },
  domain5: { bg: 'bg-red-900/50', text: 'text-red-400', label: 'Domain 5: Troubleshooting' },
};

export const VisualContextPanel: React.FC<VisualContextPanelProps> = ({
  activeScenario,
  currentView,
  onLaunchScenario,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const relatedScenarios = getRelatedScenarios(currentView).slice(0, 5);

  const domainStyle = activeScenario
    ? DOMAIN_COLORS[activeScenario.domain]
    : { bg: 'bg-gray-800', text: 'text-gray-400', label: '' };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2 bg-gray-900 cursor-pointer"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-nvidia-green" />
          <span className="text-sm font-medium text-gray-200">
            {activeScenario ? 'Active Scenario' : 'Lab Context'}
          </span>
        </div>
        <button
          className="p-1 hover:bg-gray-700 rounded"
          aria-label={isCollapsed ? 'Expand' : 'Collapse'}
        >
          {isCollapsed ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          )}
        </button>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className="p-4">
          {activeScenario ? (
            /* Active Scenario View */
            <div className="space-y-3">
              {/* Domain badge */}
              <div className={`inline-flex items-center px-2 py-1 rounded text-xs ${domainStyle.bg} ${domainStyle.text}`}>
                {domainStyle.label}
              </div>

              {/* Title and description */}
              <div>
                <h4 className="text-sm font-semibold text-white">{activeScenario.title}</h4>
                <p className="text-xs text-gray-400 mt-1">{activeScenario.description}</p>
              </div>

              {/* Focus area */}
              {activeScenario.focusArea && (
                <div className="text-xs text-gray-500">
                  <span className="text-gray-400">Focus:</span> {activeScenario.focusArea}
                </div>
              )}

              {/* Highlighted elements */}
              <div className="flex flex-wrap gap-2">
                {activeScenario.highlightedGpus && activeScenario.highlightedGpus.length > 0 && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-green-900/30 rounded text-xs text-green-400">
                    <Cpu className="w-3 h-3" />
                    {activeScenario.highlightedGpus.length} GPUs highlighted
                  </div>
                )}
                {activeScenario.highlightedLinks && activeScenario.highlightedLinks.length > 0 && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-blue-900/30 rounded text-xs text-blue-400">
                    <Link2 className="w-3 h-3" />
                    {activeScenario.highlightedLinks.length} links highlighted
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Related Scenarios View */
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-300">Related Labs</h4>
              <p className="text-xs text-gray-500">
                Labs that focus on the current visualization view
              </p>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {relatedScenarios.map((scenario) => {
                  const style = DOMAIN_COLORS[scenario.domain];
                  return (
                    <div
                      key={scenario.scenarioId}
                      className="flex items-center justify-between p-2 bg-gray-900 rounded hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs ${style.text}`}>
                            {scenario.domain.replace('domain', 'D')}
                          </span>
                          <span className="text-sm text-gray-200 truncate">
                            {scenario.title}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {scenario.description}
                        </p>
                      </div>
                      <button
                        onClick={() => onLaunchScenario(scenario.scenarioId)}
                        className="ml-2 p-1.5 bg-nvidia-green/20 hover:bg-nvidia-green/30 rounded text-nvidia-green transition-colors"
                        title="Launch scenario"
                      >
                        <Play className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {relatedScenarios.length === 0 && (
                <p className="text-xs text-gray-500 italic">
                  No related labs for this view
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
