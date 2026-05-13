let currentShortcut = {
    key: 't',
    ctrl: false,
    alt: true,
    shift: false,
    meta: true // Default for Mac: Command+Alt+T
};

// Initialize shortcut from storage
function updateShortcut(shortcutString) {
    if (!shortcutString) return;
    
    const parts = shortcutString.toLowerCase().split('+');
    currentShortcut = {
        key: parts[parts.length - 1],
        ctrl: parts.includes('ctrl') || parts.includes('macctrl'),
        alt: parts.includes('alt'),
        shift: parts.includes('shift'),
        meta: parts.includes('command') || parts.includes('macctrl')
    };
}

browser.storage.local.get('shortcut').then(res => {
    if (res.shortcut) {
        updateShortcut(res.shortcut);
    } else {
        // Use default based on platform if not set
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        if (isMac) {
            updateShortcut('Command+Alt+T');
        } else {
            updateShortcut('Ctrl+Alt+T');
        }
    }
});

// Listen for storage changes
browser.storage.onChanged.addListener((changes) => {
    if (changes.shortcut) {
        updateShortcut(changes.shortcut.newValue);
    }
});

// Capture the keydown event at the capture phase to override page listeners
window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    
    const isMatch = 
        key === currentShortcut.key &&
        event.ctrlKey === currentShortcut.ctrl &&
        event.altKey === currentShortcut.alt &&
        event.shiftKey === currentShortcut.shift &&
        event.metaKey === currentShortcut.meta;

    if (isMatch) {
        // Prevent the event from reaching the editor or page
        event.preventDefault();
        event.stopPropagation();
        
        // Send message to background to open the tab
        browser.runtime.sendMessage({ action: 'open-tab-right' });
    }
}, true); // Use capture phase
