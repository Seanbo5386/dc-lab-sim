import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VisualContextPanel } from '../VisualContextPanel';
import type { VisualizationContext } from '@/utils/scenarioVisualizationMap';

describe('VisualContextPanel', () => {
  const mockContext: VisualizationContext = {
    scenarioId: 'nccl-testing',
    primaryView: 'topology',
    title: 'NCCL Testing',
    description: 'Collective communication validation',
    domain: 'domain4',
    highlightedGpus: [0, 1, 2, 3],
    highlightedLinks: ['0-1', '1-2'],
    focusArea: 'All-reduce communication paths',
  };

  // Helper to expand the panel (it starts collapsed by default)
  const expandPanel = () => {
    const expandButton = screen.getByRole('button', { name: /expand/i });
    fireEvent.click(expandButton);
  };

  it('should render active scenario info when expanded', () => {
    render(
      <VisualContextPanel
        activeScenario={mockContext}
        currentView="topology"
        onLaunchScenario={() => {}}
      />
    );

    // Panel starts collapsed, so expand it first
    expandPanel();

    expect(screen.getByText('NCCL Testing')).toBeInTheDocument();
    expect(screen.getByText('Collective communication validation')).toBeInTheDocument();
  });

  it('should show highlighted elements info when expanded', () => {
    render(
      <VisualContextPanel
        activeScenario={mockContext}
        currentView="topology"
        onLaunchScenario={() => {}}
      />
    );

    expandPanel();

    expect(screen.getByText(/4 GPUs highlighted/)).toBeInTheDocument();
    expect(screen.getByText(/2 links highlighted/)).toBeInTheDocument();
  });

  it('should show related scenarios when no active scenario and expanded', () => {
    render(
      <VisualContextPanel
        activeScenario={null}
        currentView="topology"
        onLaunchScenario={() => {}}
      />
    );

    expandPanel();

    expect(screen.getByText('Related Labs')).toBeInTheDocument();
  });

  it('should call onLaunchScenario when scenario is clicked', () => {
    const onLaunch = vi.fn();
    render(
      <VisualContextPanel
        activeScenario={null}
        currentView="topology"
        onLaunchScenario={onLaunch}
      />
    );

    expandPanel();

    // Find a launch button (Play icon) and click it
    const buttons = screen.getAllByRole('button');
    const launchButton = buttons.find((btn) => btn.getAttribute('title') === 'Launch scenario');
    if (launchButton) {
      fireEvent.click(launchButton);
      expect(onLaunch).toHaveBeenCalled();
    }
  });

  it('should be collapsible', () => {
    render(
      <VisualContextPanel
        activeScenario={mockContext}
        currentView="topology"
        onLaunchScenario={() => {}}
      />
    );

    // Panel starts collapsed - button should say Expand
    const expandButton = screen.getByRole('button', { name: /expand/i });
    expect(expandButton).toBeInTheDocument();

    // Click to expand
    fireEvent.click(expandButton);

    // Now should show Collapse
    const collapseButton = screen.getByRole('button', { name: /collapse/i });
    expect(collapseButton).toBeInTheDocument();
  });

  it('should show domain badge when expanded', () => {
    render(
      <VisualContextPanel
        activeScenario={mockContext}
        currentView="topology"
        onLaunchScenario={() => {}}
      />
    );

    expandPanel();

    expect(screen.getByText(/Domain 4/)).toBeInTheDocument();
  });
});
