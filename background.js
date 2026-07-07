// Open a new tab immediately to the right of the active tab.
function openTabToRight() {
  return browserAPI.tabs.query({ active: true, currentWindow: true }).then(async (tabs) => {
    const activeTab = tabs[0];
    if (!activeTab) return;

    const store = await browserAPI.storage.local.get({ openAsChildTab: false });
    const options = {
      index: activeTab.index + 1,
      windowId: activeTab.windowId,
      pinned: activeTab.pinned
    };
    if (store.openAsChildTab) {
      options.openerTabId = activeTab.id;
    }

    const newTab = await browserAPI.tabs.create(options);

    // If the active tab lives in a tab group, drop the new tab into it too.
    // `tabs.group` / `groupId` only exist on recent Firefox, so guard for both.
    if (activeTab.groupId !== undefined && activeTab.groupId !== -1 &&
        typeof browserAPI.tabs.group === 'function') {
      browserAPI.tabs.group({ tabIds: newTab.id, groupId: activeTab.groupId }).catch(console.error);
    }
  }).catch(console.error);
}

/**
 * Move the currently highlighted (selected) tabs one position in the given
 * direction. The position math lives in computeTabMoves() (tabmove.js) so it
 * can be unit-tested; this function just gathers state and applies the result.
 *
 * Edge cases handled by computeTabMoves:
 *  - Multiple selected tabs move as a block.
 *  - A selection mixing pinned and unpinned tabs does nothing.
 *  - Non-adjacent selections are consolidated toward the direction of movement.
 *  - Wrapping (storage key `tabWrapEnabled`, default true) keeps pinned tabs in
 *    the pinned range and unpinned tabs in the unpinned range.
 *
 * @param {'prev'|'next'} direction
 */
async function doMoveTab(direction) {
  const selected = await browserAPI.tabs.query({ currentWindow: true, highlighted: true });
  if (selected.length === 0) return;

  const windowId = selected[0].windowId;
  const all = await browserAPI.tabs.query({ windowId });

  const store = await browserAPI.storage.local.get({ tabWrapEnabled: true });
  const wrapEnabled = store.tabWrapEnabled !== false;

  const moves = computeTabMoves(selected, all, direction, wrapEnabled);
  for (const move of moves) {
    await browserAPI.tabs.move(move.id, { index: move.index });
  }
}

// Serialize moves so rapid keypresses don't interleave and read stale indices.
// NOTE: On Chrome MV3, service workers are ephemeral so this chain variable
// may reset between events. In practice, tab moves are fast enough that
// interleaving from rapid keypresses is extremely unlikely.
let moveChain = Promise.resolve();
function moveTab(direction) {
  moveChain = moveChain.then(() => doMoveTab(direction)).catch(console.error);
  return moveChain;
}

// ── Command listener (the browser handles the keyboard shortcuts natively) ──
browserAPI.commands.onCommand.addListener((command) => {
  if (command === 'open-tab-right') {
    openTabToRight();
  } else if (command === 'move-tab-prev') {
    moveTab('prev');
  } else if (command === 'move-tab-next') {
    moveTab('next');
  }
});

// ── Popup actions (popup.js sends one-shot { action } messages) ──
// The popup closes itself right after sending, so the tab work has to run
// here rather than in the popup's own context.
browserAPI.runtime.onMessage.addListener((message) => {
  if (!message || typeof message !== 'object') return;
  if (message.action === 'open-tab-right') {
    openTabToRight();
  } else if (message.action === 'move-tab-prev') {
    moveTab('prev');
  } else if (message.action === 'move-tab-next') {
    moveTab('next');
  }
});
