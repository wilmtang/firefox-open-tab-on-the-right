document.addEventListener('DOMContentLoaded', async () => {
    const MACOS = navigator.platform?.toLowerCase().includes('mac') ||
        navigator.userAgent?.toLowerCase().includes('mac');

    // On Mac, render modifiers as the native key symbols (like the options
    // page badges). Firefox treats "Ctrl" as Command on Mac, hence the ⌘.
    const MAC_MODS = { Command: '⌘', Ctrl: '⌘', MacCtrl: '⌃', Alt: '⌥', Shift: '⇧' };
    const KEY_GLYPHS = { Left: '←', Right: '→', Up: '↑', Down: '↓', Comma: ',', Period: '.' };
    const GLYPH_CHARS = new Set(['⌘', '⌥', '⌃', '⇧']);

    // Split a Commands-API shortcut string into displayable key parts.
    // Firefox reports "Command+Alt+T"; Chrome on Mac reports glyph runs
    // like "⌥T" or "⇧⌘Y" with no separators.
    function shortcutParts(shortcut) {
        if (!shortcut) return null;
        if (shortcut.includes('+')) {
            return shortcut.split('+').map((part) => {
                if (MACOS && MAC_MODS[part]) return MAC_MODS[part];
                return KEY_GLYPHS[part] || part;
            });
        }
        const parts = [];
        let rest = shortcut;
        while (rest.length > 1 && GLYPH_CHARS.has(rest[0])) {
            parts.push(rest[0]);
            rest = rest.slice(1);
        }
        parts.push(KEY_GLYPHS[rest] || rest);
        return parts;
    }

    // Show the live shortcut bindings so the popup doubles as a cheat sheet.
    // commands.getAll() reflects changes made in about:addons (Firefox) or
    // chrome://extensions/shortcuts (Chrome), not just the manifest defaults.
    const commands = await browserAPI.commands.getAll();
    document.querySelectorAll('.shortcut-keys').forEach((slot) => {
        const cmd = commands.find(c => c.name === slot.dataset.command);
        const parts = shortcutParts(cmd?.shortcut);
        if (!parts) return;
        parts.forEach((part, i) => {
            if (i > 0) {
                const sep = document.createElement('span');
                sep.className = 'key-sep';
                sep.textContent = '+';
                slot.appendChild(sep);
            }
            const chip = document.createElement('span');
            chip.className = 'key-chip';
            chip.textContent = part;
            slot.appendChild(chip);
        });
        slot.hidden = false;
    });

    // The tab work happens in the background script: the popup is about to
    // close itself, so it must not own the async tab operations.
    async function sendAction(action) {
        try {
            await browserAPI.runtime.sendMessage({ action });
        } catch (e) {
            // No response from the background listener is fine.
        }
        window.close();
    }

    document.getElementById('action-open-tab-right')
        .addEventListener('click', () => sendAction('open-tab-right'));
    document.getElementById('action-move-tab-prev')
        .addEventListener('click', () => sendAction('move-tab-prev'));
    document.getElementById('action-move-tab-next')
        .addEventListener('click', () => sendAction('move-tab-next'));

    document.getElementById('open-settings').addEventListener('click', async () => {
        await browserAPI.runtime.openOptionsPage();
        window.close();
    });
});
