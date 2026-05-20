document.addEventListener('DOMContentLoaded', async () => {
    const statusDiv = document.getElementById('status');

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

    function isMac() {
        return navigator.platform?.toLowerCase().includes('mac') ||
            navigator.userAgent?.toLowerCase().includes('mac');
    }

    // ── Per-command storage key helpers ──
    function storageKeyForCommand(commandName, suffix) {
        if (commandName === 'open-tab-right') return suffix; // backwards compat
        return `${suffix}_${commandName}`;
    }

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

    const KEY_MAP = {
        'Control': null, 'Alt': null, 'Meta': null, 'Shift': null, 'Tab': null, 'CapsLock': null,
        'Escape': 'Escape', 'Backspace': 'Backspace',
        ',': 'Comma', '.': 'Period', ' ': 'Space',
        'ArrowUp': 'Up', 'ArrowDown': 'Down', 'ArrowLeft': 'Left', 'ArrowRight': 'Right',
        'PageUp': 'PageUp', 'PageDown': 'PageDown', 'Home': 'Home', 'End': 'End',
        'Insert': 'Insert', 'Delete': 'Delete',
    };

    function validateShortcut(shortcutString) {
        if (!shortcutString) return { valid: true }; // empty is valid (cleared)
        const parts = shortcutString.split('+');
        if (parts.length < 2 || parts.length > 3) return { valid: false, reason: 'Must have 2 or 3 keys (e.g. modifier + key).' };
        const key = parts[parts.length - 1];
        const mods = parts.slice(0, -1);
        if (!VALID_KEYS.has(key)) return { valid: false, reason: `"${key}" is not a valid shortcut key.` };
        if (mods.length === 0) return { valid: false, reason: 'At least one modifier key is required.' };
        const hasPrimary = mods.some(m => PRIMARY_MODIFIERS.has(m));
        if (!hasPrimary) return { valid: false, reason: 'Must include Ctrl, Alt, Command, or MacCtrl.' };
        for (const m of mods) {
            if (!VALID_MODIFIERS.has(m)) return { valid: false, reason: `"${m}" is not a valid modifier.` };
        }
        if (mods.length === 2 && mods[0] === mods[1]) return { valid: false, reason: 'Cannot use the same modifier twice.' };
        return { valid: true };
    }

    function eventToShortcutParts(e) {
        const modifiers = [];
        if (e.metaKey) modifiers.push('Command');
        if (e.ctrlKey) modifiers.push(isMac() ? 'MacCtrl' : 'Ctrl');
        if (e.altKey) modifiers.push('Alt');
        if (e.shiftKey) modifiers.push('Shift');

        let key = e.key;
        if (['Control', 'Alt', 'Meta', 'Shift', 'CapsLock', 'Tab'].includes(key)) return { modifiers, key: null };
        if (KEY_MAP[key] !== undefined) key = KEY_MAP[key];
        else if (key.length === 1) key = key.toUpperCase();
        else if (key.startsWith('F') && !isNaN(key.slice(1)) && key.length <= 3) { }
        else key = null;

        return { modifiers, key };
    }

    function normalizeTypedString(typed) {
        if (!typed) return '';
        let parts = typed.toLowerCase().split(/[\s\+\-]+/).filter(Boolean);
        let mods = [];
        let key = null;

        for (let p of parts) {
            if (['ctrl', 'control', 'macctrl'].includes(p)) mods.push(isMac() ? 'MacCtrl' : 'Ctrl');
            else if (['cmd', 'command', 'meta', 'win', 'windows'].includes(p)) mods.push('Command');
            else if (['alt', 'opt', 'option'].includes(p)) mods.push('Alt');
            else if (['shift'].includes(p)) mods.push('Shift');
            else if (p.length === 1) key = p.toUpperCase();
            else if (p.match(/^f\d{1,2}$/)) key = p.toUpperCase();
            else {
                const cap = p.charAt(0).toUpperCase() + p.slice(1);
                if (VALID_KEYS.has(cap)) key = cap;
                else if (p === 'space') key = 'Space';
                else if (p === 'up') key = 'Up';
                else if (p === 'down') key = 'Down';
                else if (p === 'left') key = 'Left';
                else if (p === 'right') key = 'Right';
            }
        }
        mods = [...new Set(mods)];
        if (key) return [...mods, key].join('+');
        return mods.join('+');
    }

    class ShortcutItem {
        constructor(el, commandData) {
            this.el = el;
            this.commandName = el.dataset.command;
            this.defaultShortcut = commandData?.shortcut || '';
            this.currentShortcut = '';

            this.container = el.querySelector('.shortcut-input-container');
            this.input = el.querySelector('.shortcut-text-input');
            this.displayLayer = el.querySelector('.shortcut-display-layer');
            this.recordBtn = el.querySelector('.btn-record');
            this.resetBtn = el.querySelector('.btn-reset');
            this.clearBtn = el.querySelector('.btn-clear');
            this.validationMsg = el.querySelector('.validation-msg');

            this.isRecording = false;
            this.pendingShortcut = '';

            this.initEvents();
            this.load();
        }

        get shortcutKey() {
            return storageKeyForCommand(this.commandName, 'shortcut');
        }

        get enabledKey() {
            return storageKeyForCommand(this.commandName, 'shortcutEnabled');
        }

        async load() {
            const stored = await browser.storage.local.get([this.shortcutKey, this.enabledKey]);
            const cmds = await browser.commands.getAll();
            const cmd = cmds.find(c => c.name === this.commandName);

            // Backwards compatibility with previous disabled state
            if (stored[this.enabledKey] === false) {
                this.currentShortcut = '';
            } else {
                this.currentShortcut = stored[this.shortcutKey] ?? cmd?.shortcut ?? '';
            }
            this.updateUI(this.currentShortcut);
        }

        updateUI(shortcutString, isRecordingLive = false) {
            this.input.value = shortcutString ? shortcutString.replace(/MacCtrl/g, 'Ctrl') : '';

            if (isRecordingLive) {
                this.input.classList.remove('has-badges');
            } else if (shortcutString) {
                this.input.classList.add('has-badges');
            } else {
                this.input.classList.remove('has-badges');
            }

            if (!shortcutString && !isRecordingLive) {
                this.displayLayer.innerHTML = '';
                return;
            }

            const parts = shortcutString.split('+');
            const html = parts.map((part, i) => {
                if (!part) return '';
                let displayPart = part;
                if (isMac()) {
                    if (part === 'Command') displayPart = '⌘ Cmd';
                    else if (part === 'Alt') displayPart = '⌥ Option';
                    else if (part === 'MacCtrl') displayPart = '⌃ Ctrl';
                    else if (part === 'Shift') displayPart = '⇧ Shift';
                }
                const badge = `<span class="key-badge">${displayPart}</span>`;
                const sep = i < parts.length - 1 && parts[i + 1] ? '<span class="key-separator">+</span>' : '';
                return badge + sep;
            }).join('');

            this.displayLayer.innerHTML = html;
        }

        showError(msg) {
            this.validationMsg.textContent = msg;
            this.validationMsg.className = 'validation-msg show error';
        }

        hideError() {
            this.validationMsg.className = 'validation-msg';
            this.validationMsg.textContent = '';
        }

        async saveShortcut(newShortcut) {
            try {
                await browser.commands.update({
                    name: this.commandName,
                    shortcut: newShortcut
                });
                await browser.storage.local.set({
                    [this.shortcutKey]: newShortcut,
                    [this.enabledKey]: newShortcut !== ''
                });
                this.currentShortcut = newShortcut;
                this.updateUI(newShortcut);
                showStatus(newShortcut ? 'Shortcut saved successfully.' : 'Shortcut cleared.', 'success');
            } catch (error) {
                this.showError(`Firefox rejected this shortcut: ${error.message}`);
                this.updateUI(this.currentShortcut); // Revert
            }
        }

        handleBlur = () => {
            if (this.isRecording) return; // Blur during recording is ignored
            const typed = this.input.value;
            const normalized = normalizeTypedString(typed);

            if (normalized === this.currentShortcut) {
                this.updateUI(this.currentShortcut);
                this.hideError();
                return;
            }

            const val = validateShortcut(normalized);
            if (!val.valid) {
                this.showError(val.reason);
                this.updateUI(this.currentShortcut); // Revert to old value visually
            } else {
                this.hideError();
                this.saveShortcut(normalized);
            }
        }

        startRecording() {
            this.isRecording = true;
            this.recordBtn.textContent = 'Stop';
            this.recordBtn.classList.add('is-recording');
            this.container.classList.add('recording');
            this.hideError();
            this.input.focus();
            this.input.value = '';
            this.displayLayer.innerHTML = '<span class="recording-label">Press keys...</span>';
            this.input.classList.add('has-badges'); // Show display layer visually correctly
        }

        stopRecording(save = false) {
            this.isRecording = false;
            this.recordBtn.textContent = 'Record';
            this.recordBtn.classList.remove('is-recording');
            this.container.classList.remove('recording');

            if (save) {
                this.saveShortcut(this.pendingShortcut);
            } else {
                this.updateUI(this.currentShortcut);
            }
        }

        handleKeyDown = (e) => {
            if (!this.isRecording) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.input.blur();
                }
                return;
            }

            e.preventDefault();
            e.stopPropagation();

            if (e.key === 'Escape') {
                this.stopRecording(false);
                return;
            }
            if (e.key === 'Backspace' && !e.ctrlKey && !e.altKey && !e.metaKey) {
                this.pendingShortcut = '';
                this.stopRecording(true);
                return;
            }

            const res = eventToShortcutParts(e);
            if (!res.key) {
                const tmp = res.modifiers.join('+');
                this.updateUI(tmp, true);
                this.displayLayer.innerHTML = '<span class="recording-label">Press keys...</span>';
                return;
            }

            const shortcutString = [...res.modifiers, res.key].join('+');
            const val = validateShortcut(shortcutString);
            if (!val.valid) {
                this.showError(val.reason);
                this.stopRecording(false);
                return;
            }

            this.pendingShortcut = shortcutString;
            this.hideError();
            this.stopRecording(true);
        }

        initEvents() {
            this.input.addEventListener('blur', this.handleBlur);
            this.input.addEventListener('keydown', this.handleKeyDown);

            this.recordBtn.addEventListener('click', () => {
                if (this.isRecording) this.stopRecording(false);
                else this.startRecording();
            });

            this.clearBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (this.isRecording) this.stopRecording(false);
                this.hideError();
                this.saveShortcut('');
            });

            this.resetBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                if (this.isRecording) this.stopRecording(false);
                this.hideError();
                await browser.commands.reset(this.commandName);
                const cmds = await browser.commands.getAll();
                const cmd = cmds.find(c => c.name === this.commandName);
                const def = cmd?.shortcut || '';
                this.saveShortcut(def);
            });
        }
    }

    // Initialize all shortcuts
    const commands = await browser.commands.getAll();
    document.querySelectorAll('.shortcut-item').forEach(el => {
        const cmdName = el.dataset.command;
        const cmdData = commands.find(c => c.name === cmdName);
        new ShortcutItem(el, cmdData);
    });

    // ── Tab wrapping toggle ──
    const wrapToggle = document.getElementById('tab-wrap-toggle');
    if (wrapToggle) {
        // Load current state safely
        const stored = await browser.storage.local.get({ tabWrapEnabled: true });
        wrapToggle.checked = stored && stored.tabWrapEnabled !== false;

        wrapToggle.addEventListener('change', async () => {
            await browser.storage.local.set({ tabWrapEnabled: wrapToggle.checked });
            showStatus(
                wrapToggle.checked ? 'Tab wrapping enabled.' : 'Tab wrapping disabled.',
                'success'
            );
        });
    }
});
