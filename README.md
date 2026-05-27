# Open Tab on the Right - Firefox Extension

A lightweight Firefox extension that allows you to open a new tab immediately to the right of your current active tab using a customizable keyboard shortcut.

[![Install Extension](https://img.shields.io/badge/Firefox-Install%20Extension-FF7139?style=for-the-badge&logo=firefox-browser&logoColor=white)](https://addons.mozilla.org/en-US/firefox/addon/open-tab-on-the-right/)

[![Mozilla Add-on Version](https://img.shields.io/amo/v/open-tab-on-the-right?color=orange&logo=firefox-browser&logoColor=white&style=flat-square)](https://addons.mozilla.org/en-US/firefox/addon/open-tab-on-the-right/)
[![Mozilla Add-on Users](https://img.shields.io/amo/users/open-tab-on-the-right?color=blue&logo=firefox-browser&logoColor=white&style=flat-square)](https://addons.mozilla.org/en-US/firefox/addon/open-tab-on-the-right/)
[![Mozilla Add-on Weekly Downloads](https://img.shields.io/amo/dw/open-tab-on-the-right?color=green&logo=firefox-browser&logoColor=white&style=flat-square)](https://addons.mozilla.org/en-US/firefox/addon/open-tab-on-the-right/)
[![Mozilla Add-on Rating](https://img.shields.io/amo/rating/open-tab-on-the-right?color=yellow&style=flat-square)](https://addons.mozilla.org/en-US/firefox/addon/open-tab-on-the-right/)

## 📥 Installation

Get it on the official **Firefox Add-ons (AMO)** store:

👉 **[Install Open Tab on the Right](https://addons.mozilla.org/en-US/firefox/addon/open-tab-on-the-right/)**

---

## 🚀 Features

- **Intuitive Tab Placement**: Unlike the default Firefox behavior, this extension ensures the new tab opens exactly to the right of where you are working.
- **Child Tab Support**: Fully compatible with vertical tab managers like **Tree Style Tab** and **Sidebery**. Enable the "Open as child tab" setting to automatically nest your newly created tabs under the active parent tab.
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

## 🚀 Automated Releases (CD)

This repository is configured to automatically package, lint, and submit new versions of the extension to the Mozilla Add-ons (AMO) portal via GitHub Actions.

### How the Zip file is created
You do not need to manually create or upload a zip file anymore. In the GitHub Actions workflow, the official Mozilla `web-ext` tool reads the exclusion rules defined in `web-ext-config.mjs` (which ensures files like `README.md`, `.git`, etc., are left out) and packages your extension into a zip file in the background before submitting it to the Mozilla API.

### How to release a new version

1. **Update the version**: Increment the `"version"` string in your [manifest.json](file:///Users/zihaod/Library/CloudStorage/Dropbox/Dev/firefox-open-tab-on-the-right/manifest.json) (e.g., from `"1.0"` to `"1.1"`).
2. **Commit and push the change** to your main branch:
   ```bash
   git add manifest.json
   git commit -m "Bump version to 1.1"
   git push origin main
   ```
3. **Create and push a Git Tag**:
   Create a release tag matching the pattern `v*` (e.g., `v1.1`) and push it:
   ```bash
   git tag v1.1
   git push origin v1.1
   ```

Pushing this tag will automatically trigger the GitHub Actions workflow to build, lint, and submit the new version to the Mozilla Developer Portal.

## 📄 License

MIT
