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

Chrome support is built from the same source with `npm run build:chrome`. Chrome Web Store publishing has a GitHub Actions pipeline (see [Automated Releases](#-automated-releases-cd) below) but requires one-time manual setup of API credentials before it can run.

---

## 🚀 Features

- **Intuitive Tab Placement**: Unlike the default browser behavior, this extension ensures the new tab opens exactly to the right of where you are working.
- **Works Entirely by Keyboard — No Pinning Required**: Every feature is driven by keyboard shortcuts through the browser's native commands system. You never need to pin the toolbar icon or click anything for daily use.
- **Child Tab Support on Firefox**: Compatible with vertical tab managers like **Tree Style Tab** and **Sidebery**. Enable the "Open as child tab" setting to automatically nest your newly created tabs under the active parent tab.
- **Customizable Shortcuts**: Change the shortcut to whatever suits your workflow. Firefox supports this in the extension options; Chrome uses `chrome://extensions/shortcuts`.
- **Toolbar Popup (Optional)**: If you'd rather click than remember shortcuts, pin the icon for quick actions (new tab to the right, move tab left/right), a live cheat sheet of your current bindings, and a one-click jump to Settings. Purely a convenience — nothing breaks if it stays unpinned.
- **Modern UI**: A clean, premium settings page for easy configuration.

## 🔒 Privacy & Permissions

This extension requests only the **`storage`** permission, used to save your settings. It does **not** request access to your browsing data and does not collect, store, or transmit anything.

Keyboard shortcuts are handled entirely through the browser's built-in [Commands API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/commands), so no content scripts run on the pages you visit.

## ⌨️ Default Shortcuts

- **Firefox: open tab to the right** — macOS: `Cmd + Option + T`, Windows / Linux: `Ctrl + Alt + T`
- **Chrome: open tab to the right** — `Alt + T` on all platforms (`Option + T` on macOS). Chrome forbids combining Alt with Ctrl/Cmd in extension shortcuts, so the Firefox default can't be used there. Change it anytime at `chrome://extensions/shortcuts`.
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
| `npm run test:e2e:all` | Runs both browser e2e suites. |
| `npm run lint` | Runs `web-ext lint` against the extension. |
| `npm run build` | Packages the extension into `web-ext-artifacts/`. |
| `npm run build:all` | Builds unpacked Firefox and Chrome extension directories under `dist/`. |

E2E notes:
- A real Firefox install is required for `npm run test:e2e` (`geckodriver` downloads its own driver binary on first run).
- A real Chrome/Chromium install is required for `npm run test:e2e:chrome`.
- Set `HEADLESS=0` to watch the tests run in a visible window; point `FIREFOX_BIN` at a specific Firefox binary if it isn't auto-detected.
- Browsers handle extension keyboard *shortcuts* in browser chrome, which WebDriver/Puppeteer can't reliably synthesize — so the open-tab/move-tab **keystrokes** aren't fired in e2e. That wiring is covered by command-registration assertions plus the `tabmove.js` unit tests.

## 🚀 Automated Releases (CD)

This repository is configured to automatically package, lint, test, and submit new versions to both the Mozilla Add-ons (AMO) portal and the Chrome Web Store via GitHub Actions, triggered by pushing a `v*` git tag.

### Firefox → Mozilla Add-ons (AMO)

`.github/workflows/release.yml` runs unit tests, Firefox e2e tests, and `web-ext lint`, then packages and submits the extension with the official `web-ext` tool. `web-ext` reads the exclusion rules in `web-ext-config.mjs` (which leaves out `README.md`, `.git`, etc.) and builds the zip itself — no manual packaging needed. Requires the `AMO_JWT_ISSUER` and `AMO_JWT_SECRET` repo secrets (from the [AMO Developer Hub](https://addons.mozilla.org/developers/addon/api/key/)).

### Chrome → Chrome Web Store

`.github/workflows/chrome-release.yml` runs unit tests and Chrome e2e tests, packages `dist/chrome` into a zip via `npm run package:chrome`, then uploads and publishes it with [`chrome-webstore-upload-cli`](https://github.com/fregante/chrome-webstore-upload-cli).

This needs a **one-time manual setup** before it can run:

1. **Publish the extension manually once** via the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) — CI can only update an *existing* listing, not create the first one. Upload the zip produced by `npm run package:chrome`. Chrome doesn't allow extensions to script its own store pages, so this step can't be automated; note the **Extension ID** shown on the item's page once it's created.
2. **Get OAuth credentials** for the Chrome Web Store API by following the [chrome-webstore-upload-keys guide](https://github.com/fregante/chrome-webstore-upload-keys):
   - Create a Google Cloud project and OAuth client (type: Desktop app), enable the Chrome Web Store API for it.
   - Run `npx chrome-webstore-upload-keys` locally — it walks you through the OAuth flow and prints a `CLIENT_ID`, `CLIENT_SECRET`, and `REFRESH_TOKEN`.
3. **Add four repo secrets** (Settings → Secrets and variables → Actions, or `gh secret set NAME` locally so the values never appear in chat/PRs):
   - `CHROME_EXTENSION_ID` — the ID from step 1
   - `CHROME_CLIENT_ID`, `CHROME_CLIENT_SECRET`, `CHROME_REFRESH_TOKEN` — from step 2

Once those secrets exist, every `v*` tag push publishes the new version to both stores automatically.

### How to release a new version

1. **Update the version**: Increment the `"version"` string in `manifest.json`, `build.mjs`, and `package.json` (e.g., from `"2.2"` to `"2.3"`).
2. **Commit and push the change** to your main branch:
   ```bash
   git add manifest.json build.mjs package.json
   git commit -m "Bump version to 2.3"
   git push origin main
   ```
3. **Create and push a Git Tag**:
   Create a release tag matching the pattern `v*` (e.g., `v2.3`) and push it:
   ```bash
   git tag v2.3
   git push origin v2.3
   ```

Pushing this tag triggers both GitHub Actions workflows to build, test, and submit the new version to the Mozilla Developer Portal and (once the secrets above are configured) the Chrome Web Store.

## 📄 License

MIT
