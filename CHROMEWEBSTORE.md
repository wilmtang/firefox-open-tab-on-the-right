# Chrome Web Store Listing — Open Tab on the Right

> Last Updated: 2026-07-06

## Store Listing

**Extension Name** [REQUIRED]
Open Tab on the Right

**Short Description** [REQUIRED]
Opens a new tab to the right of your current tab with a customizable keyboard shortcut. Also move tabs left/right.

**Detailed Description** [REQUIRED]
Open Tab on the Right ensures every new tab appears exactly where you expect — immediately to the right of the tab you're working in.

Features:
- Open a new tab to the right of the active tab with a single keyboard shortcut (default: Alt+T, or Option+T on Mac)
- Move tabs left or right with customizable shortcuts for quick tab reordering
- Works entirely by keyboard — no need to pin the icon for daily use
- Optional toolbar popup with quick actions, your current shortcuts at a glance, and one-click access to Settings
- Tab wrapping: when moving a tab past the end of the tab bar, it wraps to the other side (configurable)
- Supports moving multiple selected tabs as a block
- Pinned tabs stay within the pinned range when moved
- Lightweight — no content scripts, no page access, no background resource usage

How to use:
1. Install the extension
2. Press Alt+T (Option+T on Mac) to open a new tab to the right
3. To customize shortcuts, go to chrome://extensions/shortcuts
4. Click the extension icon to access Settings for tab wrapping options

Privacy:
This extension only uses the "storage" permission to save your tab wrapping preference. It does not access, read, or modify any web page content. No data is collected, transmitted, or shared.

For support or feedback, visit the GitHub repository.

**Category** [REQUIRED]
Productivity

**Single Purpose** [REQUIRED]
Opens new tabs to the right of the current tab and moves tabs left or right with keyboard shortcuts.

**Primary Language** [REQUIRED]
English

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon [REQUIRED] | 128×128 PNG | ✅ Ready | icon-128.png |
| Screenshot 1 [REQUIRED] | 1280×800 exactly | ✅ Ready | `store-assets/screenshot-1-options-light.png` (dark variant also generated; pick whichever matches your store theme preference). **Note:** Chrome checks pixel dimensions exactly — if regenerating via Puppeteer, `setViewport({width:1280, height:800, deviceScaleFactor:1})` (deviceScaleFactor >1 will double the output size and get rejected). |
| Screenshot 2 [RECOMMENDED] | 1280×800 or 640×400 | ⬜ Not created | |
| Small Promo Tile [RECOMMENDED] | 440×280 | ⬜ Not created | |

### Screenshot Notes
- Screenshot 1: Options page with the tab wrapping toggle visible — generated directly from the real `dist/chrome` build via Puppeteer, not a mockup.
- Screenshot 2: Show a browser window with a tab being opened to the right of the active tab (annotated). This needs a real OS-level screenshot of the browser chrome (tab strip) while triggering the action, so it has to be captured manually — open two tabs, put focus on the left one, press the shortcut (or use the popup), and screenshot the window.

## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| `storage` | permissions | Stores user preferences: the "tab wrapping" on/off toggle setting. No user data, browsing history, or personal information is stored. |

## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** No

| Data Type | Collected? | Transmitted Off-Device? | Purpose | Shared with Third Parties? |
|-----------|-----------|------------------------|---------|---------------------------|
| Personally identifiable info | No | No | — | No |
| Health info | No | No | — | No |
| Financial info | No | No | — | No |
| Authentication info | No | No | — | No |
| Personal communications | No | No | — | No |
| Location | No | No | — | No |
| Web history | No | No | — | No |
| User activity | No | No | — | No |
| Website content | No | No | — | No |

### Data Use Certification
- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

## Privacy Policy

**Privacy Policy URL** [RECOMMENDED]
https://github.com/wilmtang/firefox-open-tab-on-the-right/blob/main/PRIVACY.md

## Distribution

**Visibility**: Public
**Regions**: All regions
**Pricing**: Free

## Developer Info

**Publisher Name** [REQUIRED]
<!-- Fill in your developer/publisher name -->

**Contact Email** [REQUIRED]
<!-- Fill in your public contact email -->

**Support URL / Email** [RECOMMENDED]
https://github.com/wilmtang/firefox-open-tab-on-the-right/issues

**Homepage URL** [RECOMMENDED]
https://github.com/wilmtang/firefox-open-tab-on-the-right

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 2.1 | 2026-06-24 | Initial Chrome release — cross-browser port from Firefox. Features: open tab to the right, move tabs left/right, tab wrapping toggle. | Draft |
| 2.3 | 2026-07-06 | Adds the optional toolbar popup (quick actions + shortcut cheat sheet + Settings shortcut). | Pending first submission |

## Review Notes

### Known Issues / Limitations
- Chrome does not support runtime shortcut customization (`chrome.commands.update` is not available). Users must change shortcuts via `chrome://extensions/shortcuts`.
- The "Open as child tab" feature (Tree Style Tab / Sidebery integration) is Firefox-only and is hidden on Chrome.
- `chrome.tabs.group()` is used to add new tabs to the active tab's group, guarded by a feature check.

### Rejection History
<!-- No rejections yet -->
