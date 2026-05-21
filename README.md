# Open Tab on the Right - Firefox Extension

A lightweight Firefox extension that allows you to open a new tab immediately to the right of your current active tab using a customizable keyboard shortcut.

## 🚀 Features

- **Intuitive Tab Placement**: Unlike the default Firefox behavior, this extension ensures the new tab opens exactly to the right of where you are working.
- **Customizable Shortcuts**: Change the shortcut to whatever suits your workflow via the extension preferences.
- **Modern UI**: A clean, premium settings page for easy configuration.

## 🔒 Privacy & Permissions

This extension requires the **"Access your data for all websites"** permission solely to ensure your keyboard shortcuts work reliably everywhere. 

Without it, complex web apps (like Google Docs) could intercept and "swallow" your keystrokes, breaking the shortcuts. To prevent this, the extension listens for keystrokes early to guarantee they always trigger. **It does not collect or store any of your browsing data.**

## ⌨️ Default Shortcuts

- **macOS**: `Cmd + Option + T`
- **Windows / Linux**: `Ctrl + Alt + T`

## 🛠️ Local Installation & Testing

To test this extension locally in your Firefox browser, follow these steps:

1. **Open Firefox** and type `about:debugging` in the address bar.
2. Click on **"This Firefox"** in the left-hand sidebar.
3. Click the **"Load Temporary Add-on..."** button.
4. Navigate to this project directory and select the `manifest.json` file.
5. The extension is now loaded! You can test it by pressing the default shortcut.

> [!NOTE]
> Temporary add-ons are removed when you restart Firefox. To keep it permanently, you would need to sign it via the Firefox Add-ons (AMO) developer portal.

## ⚙️ Customizing the Shortcut

1. Go to `about:addons` in Firefox.
2. Click the **Gear Icon** (⚙️) in the top-right corner.
3. Select **"Manage Extension Shortcuts"** from the dropdown menu.
4. Find **"Open Tab on the Right"**.
5. Click the three dots `...` and select **"Options"**.
6. Enter your preferred shortcut (e.g., `Ctrl+Shift+Y`) and click **Save**.
   - *Valid modifiers:* `Ctrl`, `Alt`, `Shift`, `MacCtrl` (for Command on Mac).

## 📄 License

MIT
