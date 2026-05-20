function openTabToRight() {
  browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
    const activeTab = tabs[0];
    if (activeTab) {
      browser.tabs.create({
        index: activeTab.index + 1,
        windowId: activeTab.windowId,
        pinned: activeTab.pinned
      }).then((newTab) => {
        if (activeTab.groupId !== undefined && activeTab.groupId !== -1) {
          if (typeof browser.tabs.group === 'function') {
            browser.tabs.group({
              tabIds: newTab.id,
              groupId: activeTab.groupId
            }).catch(console.error);
          }
        }
      });
    }
  });
}

/**
 * Move the currently highlighted (selected) tabs one position in the given direction.
 *
 * Edge cases handled:
 *  - Multiple selected tabs are moved as a block.
 *  - If selection mixes pinned and unpinned tabs, no move occurs.
 *  - Non-adjacent selected tabs are first consolidated (made adjacent) toward the
 *    direction of movement, mirroring Firefox's native drag behaviour.
 *  - Wrapping is controlled by the `tabWrapEnabled` storage key (default: true).
 *    Pinned tabs wrap within the pinned range; unpinned tabs wrap within the unpinned range.
 *
 * @param {'prev'|'next'} direction
 */
async function moveTab(direction) {
  const tabs = await browser.tabs.query({ currentWindow: true, highlighted: true });
  if (tabs.length === 0) return;

  // Sort by index so we can reason about positions
  tabs.sort((a, b) => a.index - b.index);

  // ── Guard: mixed pinned / unpinned → do nothing ──
  const hasPinned = tabs.some(t => t.pinned);
  const hasUnpinned = tabs.some(t => !t.pinned);
  if (hasPinned && hasUnpinned) return;

  // ── Read wrapping preference safely ──
  const store = await browser.storage.local.get({ tabWrapEnabled: true });
  const wrapEnabled = store && store.tabWrapEnabled !== false;

  // ── Get all tabs in the tab's specific window for boundary calculations ──
  const windowId = tabs[0].windowId;
  const allTabs = await browser.tabs.query({ windowId: windowId });
  allTabs.sort((a, b) => a.index - b.index);
  const totalCount = allTabs.length;
  const pinnedCount = allTabs.filter(t => t.pinned).length;

  // Determine the valid index range for this group of tabs
  const isPinned = tabs[0].pinned;
  const rangeStart = isPinned ? 0 : pinnedCount;
  const rangeEnd = isPinned ? pinnedCount - 1 : totalCount - 1; // inclusive

  // ── Check if tabs are contiguous ──
  const isContiguous = tabs.every((t, i) => i === 0 || t.index === tabs[i - 1].index + 1);

  if (!isContiguous) {
    // Consolidate non-adjacent tabs toward the direction of movement
    await consolidateTabs(tabs, direction);
    return;
  }

  // Calculate target start index of the block
  const blockSize = tabs.length;
  let targetStart = null;

  if (direction === 'prev') {
    if (tabs[0].index > rangeStart) {
      targetStart = tabs[0].index - 1;
    } else if (wrapEnabled) {
      targetStart = rangeEnd - blockSize + 1;
    }
  } else {
    // direction === 'next'
    if (tabs[tabs.length - 1].index < rangeEnd) {
      targetStart = tabs[0].index + 1;
    } else if (wrapEnabled) {
      targetStart = rangeStart;
    }
  }

  if (targetStart === null) return; // Cannot move (e.g. at boundary and wrap disabled)

  // Move sequentially in correct order to avoid shifting/ordering bugs
  if (targetStart < tabs[0].index) {
    // Moving left: move leftmost tabs first (0 to length-1)
    for (let i = 0; i < tabs.length; i++) {
      await browser.tabs.move(tabs[i].id, { index: targetStart + i });
    }
  } else if (targetStart > tabs[0].index) {
    // Moving right: move rightmost tabs first (length-1 down to 0)
    for (let i = tabs.length - 1; i >= 0; i--) {
      await browser.tabs.move(tabs[i].id, { index: targetStart + i });
    }
  }
}

/**
 * Consolidate non-adjacent selected tabs into a contiguous block.
 * The block forms around the tab closest to the direction of movement.
 */
async function consolidateTabs(tabs, direction) {
  let targetStart;
  if (direction === 'prev') {
    // Consolidate toward the first selected tab's position
    targetStart = tabs[0].index;
    for (let i = 0; i < tabs.length; i++) {
      await browser.tabs.move(tabs[i].id, { index: targetStart + i });
    }
  } else {
    // Consolidate toward the last selected tab's position
    const anchor = tabs[tabs.length - 1].index;
    targetStart = anchor - tabs.length + 1;
    for (let i = tabs.length - 1; i >= 0; i--) {
      await browser.tabs.move(tabs[i].id, { index: targetStart + i });
    }
  }
}

// ── Default shortcuts on install ──
const COMMAND_DEFAULTS = {
  'open-tab-right': { mac: 'Command+Alt+T', other: 'Ctrl+Alt+T' },
  'move-tab-prev':  { mac: 'MacCtrl+Command+Left', other: 'Ctrl+Alt+Left' },
  'move-tab-next':  { mac: 'MacCtrl+Command+Right', other: 'Ctrl+Alt+Right' },
};

function storageKeyForCommand(commandName, suffix) {
  if (commandName === 'open-tab-right') return suffix; // backwards compat
  return `${suffix}_${commandName}`;
}

browser.runtime.onInstalled.addListener(() => {
  browser.runtime.getPlatformInfo().then((info) => {
    const isMac = info.os === 'mac';
    for (const [cmd, defaults] of Object.entries(COMMAND_DEFAULTS)) {
      const defaultShortcut = isMac ? defaults.mac : defaults.other;
      const key = storageKeyForCommand(cmd, 'shortcut');
      browser.storage.local.get(key).then((res) => {
        if (!res[key]) {
          browser.storage.local.set({ [key]: defaultShortcut });
        }
      });
    }
    // Default wrapping to true
    browser.storage.local.get('tabWrapEnabled').then((res) => {
      if (res.tabWrapEnabled === undefined) {
        browser.storage.local.set({ tabWrapEnabled: true });
      }
    });
  });
});

// ── Command listener ──
browser.commands.onCommand.addListener((command) => {
  if (command === 'open-tab-right') {
    openTabToRight();
  } else if (command === 'move-tab-prev') {
    moveTab('prev');
  } else if (command === 'move-tab-next') {
    moveTab('next');
  }
});

// ── Message listener (content-script fallback) ──
browser.runtime.onMessage.addListener((message) => {
  if (message.action === 'open-tab-right') {
    openTabToRight();
  } else if (message.action === 'move-tab-prev') {
    moveTab('prev');
  } else if (message.action === 'move-tab-next') {
    moveTab('next');
  }
});
