function openTabToRight() {
  console.log('Executing open-tab-right action');
  browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
    const activeTab = tabs[0];
    if (activeTab) {
      browser.tabs.create({
        index: activeTab.index + 1,
        windowId: activeTab.windowId
      });
      console.log('New tab created to the right of index', activeTab.index);
    }
  });
}

browser.runtime.onInstalled.addListener(() => {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const defaultShortcut = isMac ? 'Command+Alt+T' : 'Ctrl+Alt+T';
  browser.storage.local.set({ shortcut: defaultShortcut });
});

browser.commands.onCommand.addListener((command) => {
  console.log('Command received:', command);
  if (command === "open-tab-right") {
    openTabToRight();
  }
});

browser.runtime.onMessage.addListener((message) => {
  if (message.action === 'open-tab-right') {
    openTabToRight();
  }
});


