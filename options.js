document.addEventListener('DOMContentLoaded', async () => {
    const shortcutInput = document.getElementById('shortcut');
    const saveButton = document.getElementById('save');
    const statusDiv = document.getElementById('status');

    function showStatus(message, type) {
        statusDiv.textContent = message;
        statusDiv.className = type;
        setTimeout(() => {
            statusDiv.textContent = '';
            statusDiv.className = '';
        }, 3000);
    }

    // Load current shortcut
    try {
        const commands = await browser.commands.getAll();
        const openTabCommand = commands.find(c => c.name === 'open-tab-right');
        if (openTabCommand && openTabCommand.shortcut) {
            shortcutInput.value = openTabCommand.shortcut;
        }
    } catch (e) {
        console.error('Failed to load commands:', e);
    }

    saveButton.addEventListener('click', async () => {
        const newShortcut = shortcutInput.value.trim();
        if (!newShortcut) {
            showStatus('Please enter a valid shortcut.', 'error');
            return;
        }

        try {
            await browser.commands.update({
                name: 'open-tab-right',
                shortcut: newShortcut
            });
            
            // Save to storage so content scripts can use it
            await browser.storage.local.set({ shortcut: newShortcut });
            
            showStatus('Shortcut updated successfully!', 'success');
        } catch (error) {
            console.error('Failed to update shortcut:', error);
            showStatus(`Error: ${error.message}`, 'error');
        }
    });
});
