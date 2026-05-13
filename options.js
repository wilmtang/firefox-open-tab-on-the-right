document.addEventListener('DOMContentLoaded', async () => {
    // ── Elements ──
    const shortcutDisplay = document.getElementById('shortcut-display');
    const recordBtn = document.getElementById('record-btn');
    const saveButton = document.getElementById('save');
    const resetButton = document.getElementById('reset-default');
    const statusDiv = document.getElementById('status');
    const validationMsg = document.getElementById('validation-msg');
    const enabledToggle = document.getElementById('shortcut-enabled');

    // ── State ──
    let isRecording = false;
    let savedShortcut = '';          // The last successfully-saved shortcut string
    let pendingShortcut = '';        // Currently displayed (might not be saved yet)
    let shortcutEnabled = true;
    let currentKeys = new Set();     // Keys currently held down during recording

    // ── Valid keys for Firefox shortcuts (per MDN) ──
    const VALID_MODIFIERS = new Set(['Ctrl', 'Alt', 'Command', 'MacCtrl', 'Shift']);
    const PRIMARY_MODIFIERS = new Set(['Ctrl', 'Alt', 'Command', 'MacCtrl']);

    const VALID_KEYS = new Set([
        'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
        'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
        '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
        'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
        'Comma', 'Period', 'Home', 'End', 'PageUp', 'PageDown',
        'Space', 'Insert', 'Delete', 'Up', 'Down', 'Left', 'Right'
    ]);

    // Map DOM event.key / event.code → Firefox shortcut name
    const KEY_MAP = {
        'Control': null,        // modifier only
        'Alt': null,
        'Meta': null,
        'Shift': null,
        'Tab': null,            // not valid
        'CapsLock': null,
        'Escape': 'Escape',     // special: cancel recording
        'Backspace': 'Backspace', // special: clear shortcut
        ',': 'Comma',
        '.': 'Period',
        ' ': 'Space',
        'ArrowUp': 'Up',
        'ArrowDown': 'Down',
        'ArrowLeft': 'Left',
        'ArrowRight': 'Right',
        'PageUp': 'PageUp',
        'PageDown': 'PageDown',
        'Home': 'Home',
        'End': 'End',
        'Insert': 'Insert',
        'Delete': 'Delete',
    };

    // ── Helpers ──

    function showStatus(message, type) {
        statusDiv.textContent = message;
        statusDiv.className = type;
        if (type) {
            setTimeout(() => {
                statusDiv.textContent = '';
                statusDiv.className = '';
            }, 4000);
        }
    }

    function showValidation(message, type) {
        validationMsg.textContent = message;
        validationMsg.className = `validation-msg show ${type}`;
    }

    function hideValidation() {
        validationMsg.className = 'validation-msg';
        validationMsg.textContent = '';
    }

    function isMac() {
        return navigator.platform?.toLowerCase().includes('mac') ||
            navigator.userAgent?.toLowerCase().includes('mac');
    }

    /** Convert a keyboard event into a Firefox-format shortcut string, or null */
    function eventToShortcutParts(e) {
        const modifiers = [];

        if (e.metaKey) modifiers.push('Command');
        if (e.ctrlKey) modifiers.push(isMac() ? 'MacCtrl' : 'Ctrl');
        if (e.altKey) modifiers.push('Alt');
        if (e.shiftKey) modifiers.push('Shift');

        // Determine the main key
        let key = e.key;

        // Skip if only modifiers are pressed
        if (['Control', 'Alt', 'Meta', 'Shift', 'CapsLock', 'Tab'].includes(key)) {
            return { modifiers, key: null, display: modifiers };
        }

        // Map special keys
        if (KEY_MAP[key] !== undefined) {
            key = KEY_MAP[key];
        } else if (key.length === 1) {
            key = key.toUpperCase();
        } else if (key.startsWith('F') && !isNaN(key.slice(1)) && key.length <= 3) {
            // F1-F12 — keep as is
        } else {
            key = null;  // unmapped key
        }

        return { modifiers, key };
    }

    /** Render the shortcut display with key badges */
    function renderShortcut(shortcutString) {
        if (!shortcutString) {
            if (!shortcutEnabled) {
                shortcutDisplay.innerHTML = '<span class="placeholder">Shortcut disabled</span>';
            } else {
                shortcutDisplay.innerHTML = '<span class="placeholder">No shortcut set</span>';
            }
            return;
        }
        const parts = shortcutString.split('+');
        const html = parts.map((part, i) => {
            let displayPart = part;
            // Show friendly names on Mac
            if (isMac()) {
                if (part === 'Command') displayPart = '⌘ Cmd';
                else if (part === 'Alt') displayPart = '⌥ Option';
                else if (part === 'MacCtrl') displayPart = '⌃ Ctrl';
                else if (part === 'Shift') displayPart = '⇧ Shift';
            }
            const badge = `<span class="key-badge">${displayPart}</span>`;
            const sep = i < parts.length - 1 ? '<span class="key-separator">+</span>' : '';
            return badge + sep;
        }).join('');
        shortcutDisplay.innerHTML = html;
    }

    /** Render live key-in-progress display during recording */
    function renderRecordingKeys(modifiers, key) {
        if (modifiers.length === 0 && !key) {
            shortcutDisplay.innerHTML = '<span class="recording-label">Press a key combination…</span>';
            return;
        }
        const parts = [...modifiers];
        if (key) parts.push(key);
        const html = parts.map((part, i) => {
            let displayPart = part;
            if (isMac()) {
                if (part === 'Command') displayPart = '⌘ Cmd';
                else if (part === 'Alt') displayPart = '⌥ Option';
                else if (part === 'MacCtrl') displayPart = '⌃ Ctrl';
                else if (part === 'Shift') displayPart = '⇧ Shift';
            }
            const badge = `<span class="key-badge">${displayPart}</span>`;
            const sep = i < parts.length - 1 ? '<span class="key-separator">+</span>' : '';
            return badge + sep;
        }).join('');
        shortcutDisplay.innerHTML = html;
    }

    /**
     * Validate a shortcut string per Firefox rules:
     *  - Must have 1 primary modifier (Ctrl, Alt, Command, MacCtrl)
     *  - May have 1 secondary modifier (Shift, or another primary != the first)
     *  - Must have exactly 1 valid key
     *  - Total parts: 2 or 3
     */
    function validateShortcut(shortcutString) {
        if (!shortcutString) return { valid: false, reason: 'No shortcut entered.' };

        const parts = shortcutString.split('+');
        if (parts.length < 2 || parts.length > 3) {
            return { valid: false, reason: 'Shortcut must have 2 or 3 keys (modifier + key, or modifier + modifier + key).' };
        }

        const key = parts[parts.length - 1];
        const mods = parts.slice(0, -1);

        // Validate key
        if (!VALID_KEYS.has(key)) {
            return { valid: false, reason: `"${key}" is not a valid shortcut key. Use a letter (A-Z), number (0-9), function key (F1-F12), or special key (Comma, Period, Space, Arrow keys, etc).` };
        }

        // Validate modifiers
        if (mods.length === 0) {
            return { valid: false, reason: 'At least one modifier key is required (Ctrl, Alt, Command, or MacCtrl).' };
        }

        const hasPrimary = mods.some(m => PRIMARY_MODIFIERS.has(m));
        if (!hasPrimary) {
            return { valid: false, reason: 'Must include at least one primary modifier: Ctrl, Alt, Command, or MacCtrl.' };
        }

        for (const m of mods) {
            if (!VALID_MODIFIERS.has(m)) {
                return { valid: false, reason: `"${m}" is not a valid modifier.` };
            }
        }

        // Check for duplicate modifiers
        if (mods.length === 2 && mods[0] === mods[1]) {
            return { valid: false, reason: 'Cannot use the same modifier twice.' };
        }

        // Function keys can work with a single modifier
        // No further rules needed

        return { valid: true };
    }

    // ── Recording logic ──

    function startRecording() {
        if (!shortcutEnabled) return;
        isRecording = true;
        currentKeys.clear();
        recordBtn.textContent = 'Stop';
        recordBtn.classList.add('is-recording');
        shortcutDisplay.classList.add('recording');
        shortcutDisplay.innerHTML = '<span class="recording-label">Press a key combination…</span>';
        hideValidation();
        shortcutDisplay.focus();
    }

    function stopRecording(restoreDisplay = true) {
        isRecording = false;
        currentKeys.clear();
        recordBtn.textContent = 'Record';
        recordBtn.classList.remove('is-recording');
        shortcutDisplay.classList.remove('recording');
        if (restoreDisplay) {
            renderShortcut(pendingShortcut);
        }
    }

    function handleRecordKeyDown(e) {
        if (!isRecording) return;
        e.preventDefault();
        e.stopPropagation();

        // Escape → cancel recording
        if (e.key === 'Escape') {
            pendingShortcut = savedShortcut;
            stopRecording();
            return;
        }

        // Backspace → clear shortcut (set to empty = will disable)
        if (e.key === 'Backspace' && !e.ctrlKey && !e.altKey && !e.metaKey) {
            pendingShortcut = '';
            stopRecording();
            hideValidation();
            return;
        }

        const result = eventToShortcutParts(e);

        // Show live modifiers while user is still pressing
        if (!result.key) {
            renderRecordingKeys(result.modifiers, null);
            return;
        }

        // Got a full combo — build the shortcut string
        const parts = [...result.modifiers, result.key];
        const shortcutString = parts.join('+');

        // Validate
        const validation = validateShortcut(shortcutString);
        if (!validation.valid) {
            showValidation(`Invalid shortcut: ${validation.reason}`, 'error');
            pendingShortcut = savedShortcut;
            stopRecording();
            return;
        }

        // Valid! Set as pending
        pendingShortcut = shortcutString;
        hideValidation();
        stopRecording(true);
    }

    // ── Event listeners ──

    recordBtn.addEventListener('click', () => {
        if (isRecording) {
            // Cancel recording
            pendingShortcut = savedShortcut;
            stopRecording();
        } else {
            startRecording();
        }
    });

    // Capture keydowns on the display box itself (it's focusable)
    shortcutDisplay.addEventListener('keydown', handleRecordKeyDown);
    // Also capture globally during recording in case focus slips
    document.addEventListener('keydown', (e) => {
        if (isRecording) handleRecordKeyDown(e);
    });

    // ── Toggle enable/disable ──
    enabledToggle.addEventListener('change', () => {
        shortcutEnabled = enabledToggle.checked;
        if (!shortcutEnabled) {
            if (isRecording) stopRecording();
            shortcutDisplay.classList.add('disabled');
            recordBtn.disabled = true;
            saveButton.disabled = true;
            renderShortcut('');
        } else {
            shortcutDisplay.classList.remove('disabled');
            recordBtn.disabled = false;
            saveButton.disabled = false;
            renderShortcut(pendingShortcut || savedShortcut);
        }
    });

    // ── Save ──
    saveButton.addEventListener('click', async () => {
        if (!shortcutEnabled) {
            // Disable the shortcut
            try {
                await browser.commands.reset('open-tab-right');
                // Then set to empty to effectively disable
                await browser.commands.update({
                    name: 'open-tab-right',
                    shortcut: ''
                });
                await browser.storage.local.set({ shortcut: '', shortcutEnabled: false });
                savedShortcut = '';
                showStatus('Shortcut disabled.', 'success');
            } catch (error) {
                console.error('Failed to disable shortcut:', error);
                showStatus(`Error: ${error.message}`, 'error');
            }
            return;
        }

        const newShortcut = pendingShortcut;
        if (!newShortcut) {
            // Clear the shortcut
            try {
                await browser.commands.update({
                    name: 'open-tab-right',
                    shortcut: ''
                });
                await browser.storage.local.set({ shortcut: '', shortcutEnabled: true });
                savedShortcut = '';
                showStatus('Shortcut cleared. You can set a new one anytime.', 'success');
            } catch (error) {
                console.error('Failed to clear shortcut:', error);
                showStatus(`Error: ${error.message}`, 'error');
            }
            return;
        }

        // Validate once more
        const validation = validateShortcut(newShortcut);
        if (!validation.valid) {
            showValidation(`Invalid shortcut: ${validation.reason}`, 'error');
            pendingShortcut = savedShortcut;
            renderShortcut(savedShortcut);
            return;
        }

        try {
            await browser.commands.update({
                name: 'open-tab-right',
                shortcut: newShortcut
            });

            // Save to storage so content scripts can use it
            await browser.storage.local.set({ shortcut: newShortcut, shortcutEnabled: true });

            savedShortcut = newShortcut;
            showStatus('Shortcut updated successfully!', 'success');
        } catch (error) {
            console.error('Failed to update shortcut:', error);
            // Revert display to previous saved shortcut
            showValidation(`Firefox rejected this shortcut: ${error.message}. Reverted to previous setting.`, 'error');
            pendingShortcut = savedShortcut;
            renderShortcut(savedShortcut);
        }
    });

    // ── Reset to default ──
    resetButton.addEventListener('click', async () => {
        try {
            await browser.commands.reset('open-tab-right');
            const commands = await browser.commands.getAll();
            const openTabCommand = commands.find(c => c.name === 'open-tab-right');
            const defaultShortcut = openTabCommand?.shortcut || '';

            savedShortcut = defaultShortcut;
            pendingShortcut = defaultShortcut;
            shortcutEnabled = true;
            enabledToggle.checked = true;
            shortcutDisplay.classList.remove('disabled');
            recordBtn.disabled = false;
            saveButton.disabled = false;

            await browser.storage.local.set({ shortcut: defaultShortcut, shortcutEnabled: true });

            renderShortcut(defaultShortcut);
            hideValidation();
            showStatus('Shortcut reset to default.', 'success');
        } catch (error) {
            console.error('Failed to reset shortcut:', error);
            showStatus(`Error: ${error.message}`, 'error');
        }
    });

    // ── Load current shortcut on page open ──
    try {
        const stored = await browser.storage.local.get(['shortcut', 'shortcutEnabled']);
        const commands = await browser.commands.getAll();
        const openTabCommand = commands.find(c => c.name === 'open-tab-right');

        // Determine enabled state
        if (stored.shortcutEnabled === false) {
            shortcutEnabled = false;
            enabledToggle.checked = false;
            shortcutDisplay.classList.add('disabled');
            recordBtn.disabled = true;
            saveButton.disabled = true;
        }

        // Prefer stored shortcut, fall back to command's shortcut
        const currentShortcut = stored.shortcut ?? openTabCommand?.shortcut ?? '';
        savedShortcut = currentShortcut;
        pendingShortcut = currentShortcut;
        renderShortcut(shortcutEnabled ? currentShortcut : '');
    } catch (e) {
        console.error('Failed to load commands:', e);
    }
});
