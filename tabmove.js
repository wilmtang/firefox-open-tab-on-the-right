// Pure tab-move computation, shared by the background script and unit tests.
//
// Given the current tab layout and the user's selection, returns an ordered
// list of { id, index } moves to apply sequentially with browser.tabs.move,
// or an empty array when no move should happen. Keeping this logic pure (no
// browser APIs) makes the tricky wrapping/consolidation math unit-testable.
//
//  selected     – array of { id, index, pinned } for the highlighted tabs
//  all          – array of { id, index, pinned } for every tab in the window
//  direction    – 'prev' | 'next'
//  wrapEnabled  – whether moving past an edge wraps to the other side
function computeTabMoves(selected, all, direction, wrapEnabled) {
  if (!selected || selected.length === 0) return [];

  // Sort by index so we can reason about positions.
  const tabs = [...selected].sort((a, b) => a.index - b.index);

  // Guard: mixed pinned / unpinned → do nothing.
  const hasPinned = tabs.some(t => t.pinned);
  const hasUnpinned = tabs.some(t => !t.pinned);
  if (hasPinned && hasUnpinned) return [];

  const allTabs = [...all].sort((a, b) => a.index - b.index);
  const totalCount = allTabs.length;
  const pinnedCount = allTabs.filter(t => t.pinned).length;

  // Determine the valid index range for this group of tabs.
  const isPinned = tabs[0].pinned;
  const rangeStart = isPinned ? 0 : pinnedCount;
  const rangeEnd = isPinned ? pinnedCount - 1 : totalCount - 1; // inclusive

  // Non-adjacent selections are first consolidated (made adjacent), mirroring
  // Firefox's native drag behaviour.
  const isContiguous = tabs.every((t, i) => i === 0 || t.index === tabs[i - 1].index + 1);
  if (!isContiguous) {
    return consolidateMoves(tabs, direction);
  }

  const blockSize = tabs.length;
  let targetStart = null;

  if (direction === 'prev') {
    if (tabs[0].index > rangeStart) {
      targetStart = tabs[0].index - 1;
    } else if (wrapEnabled) {
      targetStart = rangeEnd - blockSize + 1;
    }
  } else {
    if (tabs[tabs.length - 1].index < rangeEnd) {
      targetStart = tabs[0].index + 1;
    } else if (wrapEnabled) {
      targetStart = rangeStart;
    }
  }

  if (targetStart === null) return [];      // At a boundary and wrap disabled.
  if (targetStart === tabs[0].index) return []; // Nowhere to go.

  return buildMoves(tabs, targetStart);
}

// Build the move list, ordered so tabs never trample each other as they shift.
function buildMoves(tabs, targetStart) {
  const moves = [];
  if (targetStart < tabs[0].index) {
    // Moving left: move leftmost tabs first.
    for (let i = 0; i < tabs.length; i++) {
      moves.push({ id: tabs[i].id, index: targetStart + i });
    }
  } else {
    // Moving right: move rightmost tabs first.
    for (let i = tabs.length - 1; i >= 0; i--) {
      moves.push({ id: tabs[i].id, index: targetStart + i });
    }
  }
  return moves;
}

// Consolidate non-adjacent selected tabs into a contiguous block. The block
// forms around the tab closest to the direction of movement.
function consolidateMoves(tabs, direction) {
  if (direction === 'prev') {
    const targetStart = tabs[0].index;
    return tabs.map((t, i) => ({ id: t.id, index: targetStart + i }));
  }
  const targetStart = tabs[tabs.length - 1].index - tabs.length + 1;
  const moves = [];
  for (let i = tabs.length - 1; i >= 0; i--) {
    moves.push({ id: tabs[i].id, index: targetStart + i });
  }
  return moves;
}

// Export for Node-based unit tests; harmless no-op inside the extension where
// `module` is undefined and computeTabMoves is simply a background-script global.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { computeTabMoves };
}
