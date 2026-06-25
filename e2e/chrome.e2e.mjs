// End-to-end tests for the Chrome (MV3) build using Puppeteer.
//
// Drives a real Chrome instance with the unpacked extension loaded from dist/chrome/.
// Tests ensure the extension loads, UI renders correctly, and background tab actions work.

import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CHROME_EXT_DIR = path.join(ROOT, 'dist', 'chrome');

let browser;
let extensionId;
let optionsUrl;
let extPage;

// Run async code inside the extension context (options page) where chrome.* is available.
async function ext(body, namedArgs = {}) {
  try {
    return await extPage.evaluate(`
      (async () => {
        const __args = ${JSON.stringify(namedArgs)};
        ${body}
      })()
    `);
  } catch (e) {
    throw new Error('ext(): ' + e.message);
  }
}

const getCommands = () => ext('return await chrome.commands.getAll();');
const shortcutOf = async (name) => (await getCommands()).find(c => c.name === name)?.shortcut;
const getStorage = (key) => ext('return (await chrome.storage.local.get(__args.key))[__args.key];', { key });
const queryTabs = () => ext(`
  const tabs = await chrome.tabs.query({});
  return tabs
    .map(t => ({ id: t.id, index: t.index, active: t.active, pinned: t.pinned, url: t.url }))
    .sort((a, b) => a.index - b.index);
`);

async function bg(fn, ...args) {
  const target = await browser.waitForTarget(
    t => t.type() === 'service_worker' && t.url().startsWith('chrome-extension://'),
    { timeout: 5000 }
  );
  const worker = await target.worker();
  return worker.evaluate(fn, ...args);
}

// The real checkbox is visually hidden (opacity:0); click the visible slider.
const clickToggle = async (inputId) => {
  await extPage.evaluate((id) => {
    document.querySelector('#' + id + ' + .toggle-slider').click();
  }, inputId);
};

before(async () => {
  // Ensure the Chrome build exists
  execFileSync('node', ['build.mjs', 'chrome'], { cwd: ROOT, stdio: 'ignore' });

  browser = await puppeteer.launch({
    headless: process.env.HEADLESS !== '0' ? 'new' : false,
    args: [
      `--disable-extensions-except=${CHROME_EXT_DIR}`,
      `--load-extension=${CHROME_EXT_DIR}`,
      '--no-sandbox',
      '--disable-dev-shm-usage'
    ]
  });

  // Discover the extension ID by waiting for the service worker target
  const target = await browser.waitForTarget(
    t => t.type() === 'service_worker' && t.url().startsWith('chrome-extension://'),
    { timeout: 5000 }
  );
  extensionId = target.url().split('/')[2];

  if (!extensionId) {
    throw new Error('Could not discover extension ID. Ensure Chrome loaded the extension from ' + CHROME_EXT_DIR);
  }

  optionsUrl = `chrome-extension://${extensionId}/options.html`;
  console.log(`Extension ID: ${extensionId}`);
  console.log(`Options URL: ${optionsUrl}`);

  // Open the extension options page so we have a context to execute chrome.* APIs
  extPage = await browser.newPage();
  await extPage.goto(optionsUrl);
  await new Promise(r => setTimeout(r, 1000));
}, { timeout: 180000 });

after(async () => {
  if (browser) await browser.close();
});

// Restore a clean slate: clear storage, keep options page open.
async function resetState() {
  for (const page of await browser.pages()) {
    if (page !== extPage) await page.close();
  }
  await extPage.bringToFront();
  await extPage.goto(optionsUrl);
  await new Promise(r => setTimeout(r, 500));
  await ext(`await chrome.storage.local.clear(); return true;`);
  await extPage.goto(optionsUrl); // reload to reflect cleared state
  await new Promise(r => setTimeout(r, 500));
}

beforeEach(async () => {
  await resetState();
}, { timeout: 30000 });

test('extension loads and registers three commands', { timeout: 30000 }, async () => {
  const commands = await getCommands();
  const names = commands.map(c => c.name).sort();
  // Chrome includes a special "_execute_action" command; filter it out
  const ourNames = names.filter(n => !n.startsWith('_'));
  assert.deepEqual(ourNames, ['move-tab-next', 'move-tab-prev', 'open-tab-right']);

  // open-tab-right might not have a default shortcut on Chrome due to strict validation rules
  const openTabShortcut = await shortcutOf('open-tab-right');
  console.log('open-tab-right shortcut:', openTabShortcut || 'none');
});

test('options page shows Chrome shortcuts notice', { timeout: 30000 }, async () => {
  const isVisible = await extPage.evaluate(() => {
    const el = document.getElementById('chrome-shortcuts-notice');
    return el && getComputedStyle(el).display !== 'none';
  });
  assert.ok(isVisible, 'Chrome shortcuts notice should be visible');

  const btnVisible = await extPage.evaluate(() => {
    const el = document.getElementById('open-chrome-shortcuts');
    return el && getComputedStyle(el).display !== 'none';
  });
  assert.ok(btnVisible, 'Open Chrome shortcuts button should be visible');
});

test('shortcut recorder UI is hidden on Chrome', { timeout: 30000 }, async () => {
  const isHidden = await extPage.evaluate(() => {
    const el = document.getElementById('shortcuts-container');
    return !el || getComputedStyle(el).display === 'none';
  });
  assert.ok(isHidden, 'Shortcuts container should be hidden on Chrome');
});

test('child-tab toggle is hidden on Chrome', { timeout: 30000 }, async () => {
  const isHidden = await extPage.evaluate(() => {
    const el = document.getElementById('child-tab-section');
    return !el || getComputedStyle(el).display === 'none';
  });
  assert.ok(isHidden, 'Child tab section should be hidden on Chrome');
});

test('tab-wrapping toggle is visible and functional', { timeout: 30000 }, async () => {
  const isVisible = await extPage.evaluate(() => {
    const el = document.getElementById('tab-wrap-toggle');
    return el && getComputedStyle(el).display !== 'none';
  });
  assert.ok(isVisible, 'Tab wrap toggle should be visible');

  let isSelected = await extPage.evaluate(() => document.getElementById('tab-wrap-toggle').checked);
  assert.equal(isSelected, true, 'Tab wrap should default to on');

  await clickToggle('tab-wrap-toggle');
  await new Promise(r => setTimeout(r, 500));

  const val = await getStorage('tabWrapEnabled');
  assert.equal(val, false, 'Storage should reflect the toggled-off state');

  // Reload and verify persistence
  await extPage.goto(optionsUrl);
  await new Promise(r => setTimeout(r, 500));
  
  isSelected = await extPage.evaluate(() => document.getElementById('tab-wrap-toggle').checked);
  assert.equal(isSelected, false, 'Toggle state should persist after reload');
});

test('background open-tab action opens immediately to the right', { timeout: 40000 }, async () => {
  const before = await queryTabs();
  const active = before.find(t => t.active);

  await bg(() => openTabToRight());
  await extPage.waitForFunction(
    async expected => (await chrome.tabs.query({})).length === expected,
    {},
    before.length + 1
  );

  const after = await queryTabs();
  const opened = after.find(t => !before.some(old => old.id === t.id));
  assert.ok(opened, 'new tab should exist');
  assert.equal(opened.index, active.index + 1);
  assert.equal(opened.active, true);
});

test('background move action reorders real Chrome tab strip', { timeout: 40000 }, async () => {
  // Create extra tabs
  await ext(`
    for (let i = 0; i < 3; i++) await chrome.tabs.create({ url: 'about:blank', active: false });
    return true;
  `);
  await new Promise(r => setTimeout(r, 500));

  // Move-by-one: active options tab at index 0 moves 'next' → it lands at index 1.
  let tabs = await queryTabs();
  const active = tabs.find(t => t.active);
  await bg(() => moveTab('next'));
  tabs = await queryTabs();
  assert.equal(tabs.find(t => t.id === active.id).index, 1, 'active tab should move one slot right');

  // Wrap: move back to index 0, then 'prev' once more → it lands at the end.
  await bg(() => moveTab('prev'));
  await bg(() => moveTab('prev'));
  tabs = await queryTabs();
  assert.equal(tabs.find(t => t.id === active.id).index, tabs.length - 1, 'active tab should wrap to the end');
});
