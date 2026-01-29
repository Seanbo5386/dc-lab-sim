import { describe, it, expect, beforeEach } from 'vitest';
import {
  createPane,
  createSplitState,
  countPanes,
  findNode,
  findParent,
  splitPane,
  closePane,
  setActivePane,
  resizePanes,
  navigatePane,
  getAllPanes,
  getActivePane,
  canAddPane,
  canClosePane,
  resetLayout,
  flattenLayout,
  saveSplitState,
  loadSplitState,
  clearSplitState,
  DEFAULT_MAX_PANES,
  MIN_PANE_SIZE,
  type TerminalSplitState,
} from '../terminalSplitManager';

describe('terminalSplitManager', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('createPane', () => {
    it('should create a pane node', () => {
      const pane = createPane('terminal-1');
      expect(pane.type).toBe('pane');
      expect(pane.pane?.terminalId).toBe('terminal-1');
      expect(pane.pane?.size).toBe(100);
    });

    it('should create a pane with custom size', () => {
      const pane = createPane('terminal-1', 50);
      expect(pane.pane?.size).toBe(50);
    });

    it('should generate unique IDs', () => {
      const pane1 = createPane('terminal-1');
      const pane2 = createPane('terminal-2');
      expect(pane1.id).not.toBe(pane2.id);
    });
  });

  describe('createSplitState', () => {
    it('should create initial state with single pane', () => {
      const state = createSplitState('terminal-1');
      expect(state.root.type).toBe('pane');
      expect(countPanes(state.root)).toBe(1);
      expect(state.activePaneId).toBe(state.root.id);
      expect(state.maxPanes).toBe(DEFAULT_MAX_PANES);
    });
  });

  describe('countPanes', () => {
    it('should count single pane', () => {
      const state = createSplitState('terminal-1');
      expect(countPanes(state.root)).toBe(1);
    });

    it('should count panes after split', () => {
      let state = createSplitState('terminal-1');
      state = splitPane(state, state.root.id, 'vertical', 'terminal-2');
      expect(countPanes(state.root)).toBe(2);
    });

    it('should count nested splits', () => {
      let state = createSplitState('terminal-1');
      state = splitPane(state, state.root.id, 'vertical', 'terminal-2');
      state = splitPane(state, state.activePaneId, 'horizontal', 'terminal-3');
      expect(countPanes(state.root)).toBe(3);
    });
  });

  describe('findNode', () => {
    it('should find root node', () => {
      const state = createSplitState('terminal-1');
      const found = findNode(state.root, state.root.id);
      expect(found).toBe(state.root);
    });

    it('should find nested node', () => {
      let state = createSplitState('terminal-1');
      state = splitPane(state, state.root.id, 'vertical', 'terminal-2');

      const found = findNode(state.root, state.activePaneId);
      expect(found).not.toBeNull();
    });

    it('should return null for non-existent ID', () => {
      const state = createSplitState('terminal-1');
      const found = findNode(state.root, 'non-existent');
      expect(found).toBeNull();
    });
  });

  describe('findParent', () => {
    it('should return null for root node', () => {
      const state = createSplitState('terminal-1');
      const parent = findParent(state.root, state.root.id);
      expect(parent).toBeNull();
    });

    it('should find parent of split child', () => {
      let state = createSplitState('terminal-1');
      state = splitPane(state, state.root.id, 'vertical', 'terminal-2');

      const parent = findParent(state.root, state.activePaneId);
      expect(parent).not.toBeNull();
      expect(parent?.type).toBe('split');
    });
  });

  describe('splitPane', () => {
    it('should split pane vertically', () => {
      let state = createSplitState('terminal-1');
      state = splitPane(state, state.root.id, 'vertical', 'terminal-2');

      expect(state.root.type).toBe('split');
      expect(state.root.direction).toBe('vertical');
      expect(state.root.children?.length).toBe(2);
    });

    it('should split pane horizontally', () => {
      let state = createSplitState('terminal-1');
      state = splitPane(state, state.root.id, 'horizontal', 'terminal-2');

      expect(state.root.direction).toBe('horizontal');
    });

    it('should set new pane as active', () => {
      let state = createSplitState('terminal-1');
      const originalActive = state.activePaneId;
      state = splitPane(state, state.root.id, 'vertical', 'terminal-2');

      expect(state.activePaneId).not.toBe(originalActive);
    });

    it('should not exceed max panes', () => {
      let state = createSplitState('terminal-1');
      for (let i = 0; i < DEFAULT_MAX_PANES + 2; i++) {
        state = splitPane(state, state.activePaneId, 'vertical', `terminal-${i + 2}`);
      }

      expect(countPanes(state.root)).toBe(DEFAULT_MAX_PANES);
    });

    it('should handle non-existent pane ID', () => {
      const state = createSplitState('terminal-1');
      const newState = splitPane(state, 'non-existent', 'vertical', 'terminal-2');

      expect(newState).toEqual(state);
    });
  });

  describe('closePane', () => {
    it('should close a pane', () => {
      let state = createSplitState('terminal-1');
      state = splitPane(state, state.root.id, 'vertical', 'terminal-2');
      const paneToClose = state.activePaneId;

      state = closePane(state, paneToClose);
      expect(countPanes(state.root)).toBe(1);
    });

    it('should not close the last pane', () => {
      const state = createSplitState('terminal-1');
      const newState = closePane(state, state.root.id);

      expect(countPanes(newState.root)).toBe(1);
    });

    it('should update active pane when closing active', () => {
      let state = createSplitState('terminal-1');
      state = splitPane(state, state.root.id, 'vertical', 'terminal-2');
      const closingPane = state.activePaneId;

      state = closePane(state, closingPane);
      expect(state.activePaneId).not.toBe(closingPane);
    });

    it('should restructure layout after closing', () => {
      let state = createSplitState('terminal-1');
      state = splitPane(state, state.root.id, 'vertical', 'terminal-2');
      const paneToClose = state.activePaneId;

      state = closePane(state, paneToClose);

      // After closing, root should be a pane again
      expect(state.root.type).toBe('pane');
    });
  });

  describe('setActivePane', () => {
    it('should set active pane', () => {
      let state = createSplitState('terminal-1');
      state = splitPane(state, state.root.id, 'vertical', 'terminal-2');
      const firstPaneId = state.root.children?.[0].id || '';

      state = setActivePane(state, firstPaneId);
      expect(state.activePaneId).toBe(firstPaneId);
    });

    it('should handle non-existent pane', () => {
      const state = createSplitState('terminal-1');
      const newState = setActivePane(state, 'non-existent');

      expect(newState).toEqual(state);
    });
  });

  describe('resizePanes', () => {
    it('should resize panes', () => {
      let state = createSplitState('terminal-1');
      state = splitPane(state, state.root.id, 'vertical', 'terminal-2');

      state = resizePanes(state, state.root.id, [30, 70]);

      expect(state.root.children?.[0].pane?.size).toBe(30);
      expect(state.root.children?.[1].pane?.size).toBe(70);
    });

    it('should reject sizes not summing to 100', () => {
      let state = createSplitState('terminal-1');
      state = splitPane(state, state.root.id, 'vertical', 'terminal-2');
      const originalState = { ...state };

      state = resizePanes(state, state.root.id, [30, 60]); // Only 90

      // State should be unchanged (comparing structure)
      expect(state.root.children?.[0].pane?.size).toBe(originalState.root.children?.[0].pane?.size);
    });

    it('should reject sizes below minimum', () => {
      let state = createSplitState('terminal-1');
      state = splitPane(state, state.root.id, 'vertical', 'terminal-2');

      const newState = resizePanes(state, state.root.id, [5, 95]); // 5 is below MIN_PANE_SIZE

      expect(newState.root.children?.[0].pane?.size).not.toBe(5);
    });
  });

  describe('navigatePane', () => {
    it('should navigate to next pane', () => {
      let state = createSplitState('terminal-1');
      state = splitPane(state, state.root.id, 'vertical', 'terminal-2');
      const firstPaneId = state.root.children?.[0].id || '';
      state = setActivePane(state, firstPaneId);

      state = navigatePane(state, 'right');
      expect(state.activePaneId).not.toBe(firstPaneId);
    });

    it('should wrap around', () => {
      let state = createSplitState('terminal-1');
      state = splitPane(state, state.root.id, 'vertical', 'terminal-2');

      // Get all panes and their IDs
      const panes = getAllPanes(state.root);
      expect(panes).toHaveLength(2);

      // Active pane is the second one (newly created)
      // Navigate right wraps from last to first
      state = navigatePane(state, 'right');
      expect(state.activePaneId).toBe(panes[0].id);

      // Navigate right again goes to second
      state = navigatePane(state, 'right');
      expect(state.activePaneId).toBe(panes[1].id);
    });

    it('should not change with single pane', () => {
      const state = createSplitState('terminal-1');
      const newState = navigatePane(state, 'right');

      expect(newState.activePaneId).toBe(state.activePaneId);
    });
  });

  describe('getAllPanes', () => {
    it('should return all panes', () => {
      let state = createSplitState('terminal-1');
      state = splitPane(state, state.root.id, 'vertical', 'terminal-2');
      state = splitPane(state, state.activePaneId, 'horizontal', 'terminal-3');

      const panes = getAllPanes(state.root);
      expect(panes.length).toBe(3);
    });

    it('should return single pane', () => {
      const state = createSplitState('terminal-1');
      const panes = getAllPanes(state.root);
      expect(panes.length).toBe(1);
    });
  });

  describe('getActivePane', () => {
    it('should return active pane', () => {
      const state = createSplitState('terminal-1');
      const active = getActivePane(state);

      expect(active).not.toBeNull();
      expect(active?.id).toBe(state.activePaneId);
    });
  });

  describe('canAddPane', () => {
    it('should return true when under max', () => {
      const state = createSplitState('terminal-1');
      expect(canAddPane(state)).toBe(true);
    });

    it('should return false when at max', () => {
      let state = createSplitState('terminal-1');
      for (let i = 0; i < DEFAULT_MAX_PANES - 1; i++) {
        state = splitPane(state, state.activePaneId, 'vertical', `terminal-${i + 2}`);
      }

      expect(canAddPane(state)).toBe(false);
    });
  });

  describe('canClosePane', () => {
    it('should return false with single pane', () => {
      const state = createSplitState('terminal-1');
      expect(canClosePane(state)).toBe(false);
    });

    it('should return true with multiple panes', () => {
      let state = createSplitState('terminal-1');
      state = splitPane(state, state.root.id, 'vertical', 'terminal-2');

      expect(canClosePane(state)).toBe(true);
    });
  });

  describe('resetLayout', () => {
    it('should reset to single pane', () => {
      let state = createSplitState('terminal-1');
      state = splitPane(state, state.root.id, 'vertical', 'terminal-2');
      state = splitPane(state, state.activePaneId, 'horizontal', 'terminal-3');

      state = resetLayout(state, 'terminal-new');

      expect(countPanes(state.root)).toBe(1);
      expect(state.root.type).toBe('pane');
    });
  });

  describe('flattenLayout', () => {
    it('should flatten single pane', () => {
      const state = createSplitState('terminal-1');
      const flat = flattenLayout(state);

      expect(flat.length).toBe(1);
      expect(flat[0].bounds).toEqual({ x: 0, y: 0, width: 100, height: 100 });
    });

    it('should flatten vertical split', () => {
      let state = createSplitState('terminal-1');
      state = splitPane(state, state.root.id, 'vertical', 'terminal-2');
      state = resizePanes(state, state.root.id, [50, 50]);

      const flat = flattenLayout(state);

      expect(flat.length).toBe(2);
      expect(flat[0].bounds.width).toBe(50);
      expect(flat[1].bounds.width).toBe(50);
      expect(flat[1].bounds.x).toBe(50);
    });

    it('should flatten horizontal split', () => {
      let state = createSplitState('terminal-1');
      state = splitPane(state, state.root.id, 'horizontal', 'terminal-2');
      state = resizePanes(state, state.root.id, [50, 50]);

      const flat = flattenLayout(state);

      expect(flat.length).toBe(2);
      expect(flat[0].bounds.height).toBe(50);
      expect(flat[1].bounds.height).toBe(50);
      expect(flat[1].bounds.y).toBe(50);
    });

    it('should mark active pane', () => {
      const state = createSplitState('terminal-1');
      const flat = flattenLayout(state);

      expect(flat[0].isActive).toBe(true);
    });

    it('should use custom container dimensions', () => {
      const state = createSplitState('terminal-1');
      const flat = flattenLayout(state, 800, 600);

      expect(flat[0].bounds).toEqual({ x: 0, y: 0, width: 800, height: 600 });
    });
  });

  describe('Persistence', () => {
    it('should save and load state', () => {
      let state = createSplitState('terminal-1');
      state = splitPane(state, state.root.id, 'vertical', 'terminal-2');

      saveSplitState(state);
      const loaded = loadSplitState();

      expect(loaded).not.toBeNull();
      expect(countPanes(loaded!.root)).toBe(2);
    });

    it('should return null when no saved state', () => {
      const loaded = loadSplitState();
      expect(loaded).toBeNull();
    });

    it('should clear saved state', () => {
      const state = createSplitState('terminal-1');
      saveSplitState(state);
      clearSplitState();

      const loaded = loadSplitState();
      expect(loaded).toBeNull();
    });

    it('should handle invalid saved state', () => {
      localStorage.setItem('terminal-split', 'invalid json');
      const loaded = loadSplitState();
      expect(loaded).toBeNull();
    });
  });

  describe('Constants', () => {
    it('should have correct default max panes', () => {
      expect(DEFAULT_MAX_PANES).toBe(4);
    });

    it('should have correct min pane size', () => {
      expect(MIN_PANE_SIZE).toBe(10);
    });
  });
});
