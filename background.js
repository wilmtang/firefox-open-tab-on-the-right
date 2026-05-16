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

// Set default shortcut in storage on install
browser.runtime.onInstalled.addListener(() => {
  browser.runtime.getPlatformInfo().then((info) => {
    const defaultShortcut = info.os === 'mac' ? 'Command+Alt+T' : 'Ctrl+Alt+T';
    browser.storage.local.get('shortcut').then((res) => {
      // Only set default if not already configured
      if (!res.shortcut) {
        browser.storage.local.set({ shortcut: defaultShortcut });
      }
    });
  });
});

browser.commands.onCommand.addListener((command) => {
  if (command === "open-tab-right") {
    openTabToRight();
  }
});

browser.runtime.onMessage.addListener((message) => {
  if (message.action === 'open-tab-right') {
    openTabToRight();
  }
});
