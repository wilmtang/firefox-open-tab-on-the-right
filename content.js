// Shortcut state — will be populated from storage before use
let currentShortcut = null;

// Parse a shortcut string like "Command+Alt+T" or "Ctrl+Alt+T"
// into a matcher object for keyboard events
function parseShortcut(shortcutString) {
  if (!shortcutString) return null;

  const parts = shortcutString.split('+');
  const key = parts[parts.length - 1].toLowerCase();
  const modifiers = parts.slice(0, -1).map(m => m.toLowerCase());

  return {
    key,
    // "Command" in Firefox shortcut syntax = metaKey (⌘ on Mac)
    // "MacCtrl" in Firefox shortcut syntax = ctrlKey (the physical Control key on Mac)
    // "Ctrl" = ctrlKey on Windows/Linux, metaKey mapping not used
    ctrl: modifiers.includes('ctrl') || modifiers.includes('macctrl'),
    alt: modifiers.includes('alt'),
    shift: modifiers.includes('shift'),
    meta: modifiers.includes('command'),
  };
}

// Load shortcut from storage
browser.storage.local.get('shortcut').then(res => {
  if (res.shortcut) {
    currentShortcut = parseShortcut(res.shortcut);
  }
  // If storage is empty, we leave currentShortcut as null.
  // The browser.commands API will still handle the default shortcut;
  // the content script fallback just won't activate until storage is set.
});

// Listen for storage changes (e.g. user changes shortcut in options)
browser.storage.onChanged.addListener((changes) => {
  if (changes.shortcut) {
    currentShortcut = parseShortcut(changes.shortcut.newValue);
  }
});

// Capture the keydown event at the capture phase to intercept
// before editors or other page scripts can swallow it
window.addEventListener('keydown', (event) => {
  if (!currentShortcut) return;

  const key = event.key.toLowerCase();

  const isMatch =
    key === currentShortcut.key &&
    event.ctrlKey === currentShortcut.ctrl &&
    event.altKey === currentShortcut.alt &&
    event.shiftKey === currentShortcut.shift &&
    event.metaKey === currentShortcut.meta;

  if (isMatch) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    browser.runtime.sendMessage({ action: 'open-tab-right' });
  }
}, true); // capture phase
