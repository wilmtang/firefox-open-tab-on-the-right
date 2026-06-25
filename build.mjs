#!/usr/bin/env node
// build.mjs — Cross-browser build script for "Open Tab on the Right"
//
// Usage:
//   node build.mjs firefox    → dist/firefox/
//   node build.mjs chrome     → dist/chrome/
//   node build.mjs all        → both
//
// Firefox: Manifest V2 (background.scripts, browser_specific_settings)
// Chrome:  Manifest V3 (background.service_worker, no browser_specific_settings)

import { mkdirSync, cpSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = import.meta.dirname;

// ── Shared manifest fields ────────────────────────────────────────────────────
const shared = {
  name: 'Open Tab on the Right',
  version: '2.1',
  description:
    'Opens a new tab to the right of the current active tab with a customizable shortcut.',
  icons: {
    48: 'icon-48.png',
    128: 'icon-128.png',
  },
  permissions: ['storage'],
  commands: {
    'open-tab-right': {
      suggested_key: {
        default: 'Ctrl+Alt+T',
        mac: 'Command+Alt+T',
      },
      description: 'Open new tab to the right',
    },
    'move-tab-prev': {
      description: 'Move tab to the left',
    },
    'move-tab-next': {
      description: 'Move tab to the right',
    },
  },
  options_ui: {
    page: 'options.html',
  },
};

// ── Firefox manifest (MV2) ───────────────────────────────────────────────────
function firefoxManifest() {
  return {
    manifest_version: 2,
    ...shared,
    background: {
      scripts: ['browser-polyfill.js', 'tabmove.js', 'background.js'],
    },
    browser_specific_settings: {
      gecko: {
        id: '{61a45ae9-6056-42fc-b02b-44c36005271d}',
        data_collection_permissions: {
          required: ['none'],
        },
      },
    },
  };
}

// ── Chrome manifest (MV3) ────────────────────────────────────────────────────
function chromeManifest() {
  const manifest = {
    ...shared,
    manifest_version: 3,
    options_ui: {
      ...shared.options_ui,
      open_in_tab: true,
    },
    background: {
      service_worker: 'service-worker.js',
    },
  };
  
  // Chrome strictly validates Mac shortcuts and will fail to load the unpacked extension
  // if it suspects a conflict with reserved keys or has unsupported modifier combinations.
  // Since we already direct Chrome users to chrome://extensions/shortcuts, it's safer
  // to omit the default suggested keys and let them configure it manually.
  manifest.commands = JSON.parse(JSON.stringify(shared.commands));
  delete manifest.commands['open-tab-right'].suggested_key;
  
  return manifest;
}

// ── Shared files to copy ─────────────────────────────────────────────────────
const SHARED_FILES = [
  'browser-polyfill.js',
  'tabmove.js',
  'background.js',
  'options.html',
  'options.js',
  'icon-48.png',
  'icon-128.png',
];

// ── Build one target ─────────────────────────────────────────────────────────
function build(target) {
  const outDir = join(ROOT, 'dist', target);

  // Clean
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  if (target === 'firefox') {
    // Copy shared files
    for (const file of SHARED_FILES) {
      cpSync(join(ROOT, file), join(outDir, file));
    }
    writeFileSync(
      join(outDir, 'manifest.json'),
      JSON.stringify(firefoxManifest(), null, 2) + '\n'
    );
  } else if (target === 'chrome') {
    // Copy files (skip tabmove.js and background.js — they'll be concatenated)
    for (const file of SHARED_FILES) {
      if (file === 'tabmove.js' || file === 'background.js') continue;
      cpSync(join(ROOT, file), join(outDir, file));
    }

    // Concatenate browser-polyfill.js + tabmove.js + background.js into service-worker.js
    // Chrome MV3 service workers only support a single entry point.
    const polyfill = readFileSync(join(ROOT, 'browser-polyfill.js'), 'utf8');
    const tabmove = readFileSync(join(ROOT, 'tabmove.js'), 'utf8');
    const bg = readFileSync(join(ROOT, 'background.js'), 'utf8');
    writeFileSync(
      join(outDir, 'service-worker.js'),
      `// Auto-generated service worker — do not edit directly.\n// Source: browser-polyfill.js + tabmove.js + background.js\n\n${polyfill}\n\n${tabmove}\n\n${bg}\n`
    );

    writeFileSync(
      join(outDir, 'manifest.json'),
      JSON.stringify(chromeManifest(), null, 2) + '\n'
    );
  } else {
    console.error(`Unknown target: ${target}`);
    process.exit(1);
  }

  console.log(`✓ Built ${target} → dist/${target}/`);
}

// ── CLI ──────────────────────────────────────────────────────────────────────
const targets = process.argv[2] || 'all';
if (targets === 'all') {
  build('firefox');
  build('chrome');
} else {
  build(targets);
}
