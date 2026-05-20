// ── Multi-command shortcut state ──
// Maps command names to their parsed shortcut matcher and enabled state
const commandShortcuts = {};

// Commands we handle via content-script fallback
const COMMANDS = ['open-tab-right', 'move-tab-prev', 'move-tab-next'];

function storageKeyForCommand(commandName, suffix) {
  if (commandName === 'open-tab-right') return suffix; // backwards compat
  return `${suffix}_${commandName}`;
}

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

// Load all command shortcuts and enabled states from storage
function loadAllShortcuts() {
  const keys = [];
  for (const cmd of COMMANDS) {
    keys.push(storageKeyForCommand(cmd, 'shortcut'));
    keys.push(storageKeyForCommand(cmd, 'shortcutEnabled'));
  }

  browser.storage.local.get(keys).then(res => {
    for (const cmd of COMMANDS) {
      const shortcutKey = storageKeyForCommand(cmd, 'shortcut');
      const enabledKey = storageKeyForCommand(cmd, 'shortcutEnabled');

      const shortcutValue = res[shortcutKey];
      const enabledValue = res[enabledKey];

      commandShortcuts[cmd] = {
        parsed: shortcutValue ? parseShortcut(shortcutValue) : null,
        enabled: enabledValue !== false,
      };
    }
  });
}

// Initial load
loadAllShortcuts();

// Listen for storage changes (e.g. user changes shortcut in options)
browser.storage.onChanged.addListener((changes) => {
  for (const cmd of COMMANDS) {
    const shortcutKey = storageKeyForCommand(cmd, 'shortcut');
    const enabledKey = storageKeyForCommand(cmd, 'shortcutEnabled');

    if (changes[shortcutKey]) {
      if (!commandShortcuts[cmd]) {
        commandShortcuts[cmd] = { parsed: null, enabled: true };
      }
      commandShortcuts[cmd].parsed = parseShortcut(changes[shortcutKey].newValue);
    }
    if (changes[enabledKey]) {
      if (!commandShortcuts[cmd]) {
        commandShortcuts[cmd] = { parsed: null, enabled: true };
      }
      commandShortcuts[cmd].enabled = changes[enabledKey].newValue !== false;
    }
  }
});

// Capture the keydown event at the capture phase to intercept
// before editors or other page scripts can swallow it
window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();

  for (const cmd of COMMANDS) {
    const entry = commandShortcuts[cmd];
    if (!entry || !entry.enabled || !entry.parsed) continue;

    const sc = entry.parsed;
    const isMatch =
      key === sc.key &&
      event.ctrlKey === sc.ctrl &&
      event.altKey === sc.alt &&
      event.shiftKey === sc.shift &&
      event.metaKey === sc.meta;

    if (isMatch) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      browser.runtime.sendMessage({ action: cmd });
      return; // Only fire the first match
    }
  }
}, true); // capture phase
