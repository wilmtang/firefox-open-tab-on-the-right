// Open a new tab immediately to the right of the active tab.
function openTabToRight() {
  browser.tabs.query({ active: true, currentWindow: true }).then(async (tabs) => {
    const activeTab = tabs[0];
    if (!activeTab) return;

    const store = await browser.storage.local.get({ openAsChildTab: false });
    const options = {
      index: activeTab.index + 1,
      windowId: activeTab.windowId,
      pinned: activeTab.pinned
    };
    if (store.openAsChildTab) {
      options.openerTabId = activeTab.id;
    }

    const newTab = await browser.tabs.create(options);

    // If the active tab lives in a tab group, drop the new tab into it too.
    // `tabs.group` / `groupId` only exist on recent Firefox, so guard for both.
    if (activeTab.groupId !== undefined && activeTab.groupId !== -1 &&
        typeof browser.tabs.group === 'function') {
      browser.tabs.group({ tabIds: newTab.id, groupId: activeTab.groupId }).catch(console.error);
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
  const selected = await browser.tabs.query({ currentWindow: true, highlighted: true });
  if (selected.length === 0) return;

  const windowId = selected[0].windowId;
  const all = await browser.tabs.query({ windowId });

  const store = await browser.storage.local.get({ tabWrapEnabled: true });
  const wrapEnabled = store.tabWrapEnabled !== false;

  const moves = computeTabMoves(selected, all, direction, wrapEnabled);
  for (const move of moves) {
    await browser.tabs.move(move.id, { index: move.index });
  }
}

// Serialize moves so rapid keypresses don't interleave and read stale indices.
let moveChain = Promise.resolve();
function moveTab(direction) {
  moveChain = moveChain.then(() => doMoveTab(direction)).catch(console.error);
  return moveChain;
}

// ── Command listener (Firefox handles the keyboard shortcuts natively) ──
browser.commands.onCommand.addListener((command) => {
  if (command === 'open-tab-right') {
    openTabToRight();
  } else if (command === 'move-tab-prev') {
    moveTab('prev');
  } else if (command === 'move-tab-next') {
    moveTab('next');
  }
});
