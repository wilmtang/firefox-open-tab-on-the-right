// Cross-browser API shim.
// Firefox exposes `browser` (WebExtension standard, Promise-based).
// Chrome exposes `chrome` (MV3 also returns Promises for most APIs).
// This shim provides a unified `browserAPI` global so the rest of the code
// can call a single namespace regardless of the browser.
//
// NOTE: We intentionally do NOT use Mozilla's heavyweight webextension-polyfill.
// Our extension only uses: tabs, storage.local, commands — all of which already
// return Promises on both browsers in their current API versions.

const browserAPI = (typeof browser !== 'undefined') ? browser : chrome;
