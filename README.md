# Open Tab on the Right

A lightweight Firefox and Chrome extension that opens a new tab immediately to the right of your current active tab.

[![Install Extension](https://img.shields.io/badge/Firefox-Install%20Extension-FF7139?style=for-the-badge&logo=firefox-browser&logoColor=white)](https://addons.mozilla.org/en-US/firefox/addon/open-tab-on-the-right/)

[![Mozilla Add-on Version](https://img.shields.io/amo/v/open-tab-on-the-right?color=orange&logo=firefox-browser&logoColor=white&style=flat-square)](https://addons.mozilla.org/en-US/firefox/addon/open-tab-on-the-right/)
[![Mozilla Add-on Users](https://img.shields.io/amo/users/open-tab-on-the-right?color=blue&logo=firefox-browser&logoColor=white&style=flat-square)](https://addons.mozilla.org/en-US/firefox/addon/open-tab-on-the-right/)
[![Mozilla Add-on Weekly Downloads](https://img.shields.io/amo/dw/open-tab-on-the-right?color=green&logo=firefox-browser&logoColor=white&style=flat-square)](https://addons.mozilla.org/en-US/firefox/addon/open-tab-on-the-right/)
[![Mozilla Add-on Rating](https://img.shields.io/amo/rating/open-tab-on-the-right?color=yellow&style=flat-square)](https://addons.mozilla.org/en-US/firefox/addon/open-tab-on-the-right/)

## 📥 Installation

Get the Firefox version on the official **Firefox Add-ons (AMO)** store:

👉 **[Install Open Tab on the Right](https://addons.mozilla.org/en-US/firefox/addon/open-tab-on-the-right/)**

Chrome support is built from the same source with `npm run build:chrome`; Chrome Web Store publishing is not automated yet.

---

## 🚀 Features

- **Intuitive Tab Placement**: Unlike the default browser behavior, this extension ensures the new tab opens exactly to the right of where you are working.
- **Child Tab Support on Firefox**: Compatible with vertical tab managers like **Tree Style Tab** and **Sidebery**. Enable the "Open as child tab" setting to automatically nest your newly created tabs under the active parent tab.
- **Customizable Shortcuts**: Change the shortcut to whatever suits your workflow. Firefox supports this in the extension options; Chrome uses `chrome://extensions/shortcuts`.
- **Modern UI**: A clean, premium settings page for easy configuration.

## 🔒 Privacy & Permissions

This extension requests only the **`storage`** permission, used to save your settings. It does **not** request access to your browsing data and does not collect, store, or transmit anything.

Keyboard shortcuts are handled entirely through the browser's built-in [Commands API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/commands), so no content scripts run on the pages you visit.

## ⌨️ Default Shortcuts

- **Firefox: open tab to the right** — macOS: `Cmd + Option + T`, Windows / Linux: `Ctrl + Alt + T`
- **Chrome: open tab to the right** — no default; assign one at `chrome://extensions/shortcuts`.
- **Move tab left / right** — no default; assign your own in Firefox options or `chrome://extensions/shortcuts` (this avoids clashing with OS shortcuts like workspace switching).

## 🛠️ Local Installation & Testing

To test this extension locally in Firefox:

1. **Open Firefox** and type `about:debugging` in the address bar.
2. Click on **"This Firefox"** in the left-hand sidebar.
3. Click the **"Load Temporary Add-on..."** button.
4. Navigate to this project directory and select the `manifest.json` file.
5. The extension is now loaded! You can test it by pressing the default shortcut.

> [!NOTE]
> Temporary add-ons are removed when you restart Firefox. To keep it permanently, you would need to sign it via the Firefox Add-ons (AMO) developer portal.

To test locally in Chrome:

1. Run `npm run build:chrome`.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select `dist/chrome`.
5. Assign shortcuts at `chrome://extensions/shortcuts`.

## ⚙️ Customizing the Shortcut

Firefox:

1. Go to `about:addons`.
2. Click the **Gear Icon** (⚙️) in the top-right corner.
3. Select **"Manage Extension Shortcuts"** from the dropdown menu.
4. Find **"Open Tab on the Right"**.
5. Click the three dots `...` and select **"Options"**.
6. Enter your preferred shortcut (e.g., `Ctrl+Shift+Y`) and click **Save**.
   - *Valid modifiers:* `Ctrl`, `Alt`, `Shift`, `Command` (Mac Cmd), and `MacCtrl` (Mac Ctrl).

Chrome:

1. Go to `chrome://extensions/shortcuts`.
2. Find **"Open Tab on the Right"**.
3. Assign shortcuts for the commands you want.

## 🧪 Development & Testing

Install the dev dependencies once with `npm install`, then:

| Command | What it does |
| --- | --- |
| `npm test` | Fast unit tests for the tab-move logic (`tabmove.js`), no browser needed. |
| `npm run test:e2e` | End-to-end tests that launch real Firefox via **geckodriver** + **selenium-webdriver**, install the packaged extension, and exercise the options UI, settings persistence, command registration, and tab reordering. |
| `npm run test:e2e:chrome` | End-to-end tests that launch real Chrome via **puppeteer**, load `dist/chrome`, and exercise the Chrome options UI and tab reordering. |
| `npm run lint` | Runs `web-ext lint` against the extension. |
| `npm run build` | Packages the extension into `web-ext-artifacts/`. |
| `npm run build:all` | Builds unpacked Firefox and Chrome extension directories under `dist/`. |

E2E notes:
- A real Firefox install is required for `npm run test:e2e` (`geckodriver` downloads its own driver binary on first run).
- A real Chrome/Chromium install is required for `npm run test:e2e:chrome`.
- Set `HEADLESS=0` to watch the tests run in a visible window; point `FIREFOX_BIN` at a specific Firefox binary if it isn't auto-detected.
- Browsers handle extension keyboard *shortcuts* in browser chrome, which WebDriver/Puppeteer can't reliably synthesize — so the open-tab/move-tab **keystrokes** aren't fired in e2e. That wiring is covered by command-registration assertions plus the `tabmove.js` unit tests.

## 🚀 Automated Releases (CD)

This repository is configured to automatically package, lint, test, and submit new Firefox versions to the Mozilla Add-ons (AMO) portal via GitHub Actions.

### How the Zip file is created
You do not need to manually create or upload a zip file anymore. In the GitHub Actions workflow, the official Mozilla `web-ext` tool reads the exclusion rules defined in `web-ext-config.mjs` (which ensures files like `README.md`, `.git`, etc., are left out) and packages your extension into a zip file in the background before submitting it to the Mozilla API.

### How to release a new version

1. **Update the version**: Increment the `"version"` string in `manifest.json` and `build.mjs` (e.g., from `"2.1"` to `"2.2"`).
2. **Commit and push the change** to your main branch:
   ```bash
   git add manifest.json build.mjs
   git commit -m "Bump version to 2.2"
   git push origin main
   ```
3. **Create and push a Git Tag**:
   Create a release tag matching the pattern `v*` (e.g., `v2.2`) and push it:
   ```bash
   git tag v2.2
   git push origin v2.2
   ```

Pushing this tag will automatically trigger the GitHub Actions workflow to build, lint, and submit the new version to the Mozilla Developer Portal.

## 📄 License

MIT
