// End-to-end tests: drive a real Firefox via geckodriver with the actual
// packaged extension installed, and exercise everything that is reachable
// through WebDriver.
//
// NOTE ON SCOPE: Firefox handles the `commands` keyboard shortcuts in browser
// chrome, which WebDriver cannot synthesize (verified headless and headful).
// So the open-tab / move-tab *keystrokes* themselves can't be fired here; that
// wiring is covered by asserting the commands are registered (below) plus the
// pure-logic unit tests in tabmove.test.js. What we CAN test end-to-end — and
// do — is the options UI, real storage/commands persistence, and the move
// algorithm applied against a real Firefox tab strip.

import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Builder, By, Key, until } from 'selenium-webdriver';
import firefox from 'selenium-webdriver/firefox.js';
import { download } from 'geckodriver';
import { execFileSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ADDON_ID = '{61a45ae9-6056-42fc-b02b-44c36005271d}';
// Pinning the internal UUID makes moz-extension:// URLs deterministic.
const UUID = '5e3a8f10-2b4c-4d6e-8a90-1c2d3e4f5a6b';
const OPTIONS_URL = `moz-extension://${UUID}/options.html`;

let driver;

// Build the real signed-style package with web-ext and return the newest zip.
function buildZip() {
  execFileSync('npx', ['web-ext', 'build', '--overwrite-dest'], { cwd: ROOT, stdio: 'ignore' });
  const dir = path.join(ROOT, 'web-ext-artifacts');
  const zips = readdirSync(dir)
    .filter(f => f.endsWith('.zip'))
    .map(f => ({ f, t: statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  if (zips.length === 0) throw new Error('web-ext build produced no zip');
  return path.join(dir, zips[0].f);
}

// Run async code inside the extension (options page) context, where the full
// `browser.*` API is available. Returns the resolved value.
async function ext(body, namedArgs = {}) {
  const result = await driver.executeAsyncScript(
    `const __args = arguments[0];
     const cb = arguments[arguments.length - 1];
     (async () => { ${body} })()
       .then(cb)
       .catch(e => cb({ __e2e_error: String((e && e.message) || e) }));`,
    namedArgs
  );
  if (result && result.__e2e_error) throw new Error('ext(): ' + result.__e2e_error);
  return result;
}

const getCommands = () => ext('return await browser.commands.getAll();');
const shortcutOf = async (name) => (await getCommands()).find(c => c.name === name)?.shortcut;
const getStorage = (key) => ext('return (await browser.storage.local.get(__args.key))[__args.key];', { key });
const queryTabs = () => ext(`
  const tabs = await browser.tabs.query({});
  return tabs
    .map(t => ({ id: t.id, index: t.index, active: t.active, pinned: t.pinned, url: t.url }))
    .sort((a, b) => a.index - b.index);
`);
const bg = (body, namedArgs = {}) => ext(`
  const bg = await browser.runtime.getBackgroundPage();
  ${body}
`, namedArgs);

// Restore a clean slate: one tab on the options page, empty storage, default commands.
async function resetState() {
  const handles = await driver.getAllWindowHandles();
  for (let i = 1; i < handles.length; i++) {
    await driver.switchTo().window(handles[i]);
    await driver.close();
  }
  await driver.switchTo().window(handles[0]);
  await driver.get(OPTIONS_URL);
  await ext(`
    await browser.storage.local.clear();
    for (const c of await browser.commands.getAll()) {
      await browser.commands.reset(c.name);
    }
    return true;
  `);
  await driver.get(OPTIONS_URL); // reload so the UI reflects the cleared state
}

const rowFor = (command) => driver.findElement(By.css(`.shortcut-item[data-command="${command}"]`));

// The real checkbox is visually hidden (opacity:0); click the visible slider instead.
const clickToggle = (inputId) => driver.findElement(By.css(`#${inputId} + .toggle-slider`)).click();

before(async () => {
  const zip = buildZip();
  const geckoPath = await download();

  const options = new firefox.Options();
  if (process.env.HEADLESS !== '0') options.addArguments('-headless');
  if (process.env.FIREFOX_BIN) options.setBinary(process.env.FIREFOX_BIN);
  options.setPreference('extensions.webextensions.uuids', JSON.stringify({ [ADDON_ID]: UUID }));

  driver = await new Builder()
    .forBrowser('firefox')
    .setFirefoxOptions(options)
    .setFirefoxService(new firefox.ServiceBuilder(geckoPath))
    .build();

  await driver.installAddon(zip, true);
}, { timeout: 180000 });

after(async () => {
  if (driver) await driver.quit();
});

beforeEach(async () => {
  await resetState();
}, { timeout: 30000 });

test('installs and registers the three commands with expected defaults', { timeout: 30000 }, async () => {
  const names = (await getCommands()).map(c => c.name).sort();
  assert.deepEqual(names, ['move-tab-next', 'move-tab-prev', 'open-tab-right']);

  // open-tab ships a platform default; the move commands are intentionally unbound.
  assert.match(await shortcutOf('open-tab-right'), /Alt\+T$/);
  assert.equal(await shortcutOf('move-tab-prev'), '');
  assert.equal(await shortcutOf('move-tab-next'), '');
});

test('options page renders all shortcut rows and toggles', { timeout: 30000 }, async () => {
  assert.equal((await driver.findElements(By.css('.shortcut-item'))).length, 3);
  assert.ok(await driver.findElement(By.id('tab-wrap-toggle')));
  assert.ok(await driver.findElement(By.id('child-tab-toggle')));
});

test('tab-wrapping toggle persists to storage and survives reload', { timeout: 30000 }, async () => {
  const toggle = await driver.findElement(By.id('tab-wrap-toggle'));
  assert.equal(await toggle.isSelected(), true); // default on
  await clickToggle('tab-wrap-toggle');

  assert.equal(await getStorage('tabWrapEnabled'), false);

  await driver.get(OPTIONS_URL);
  assert.equal(await driver.findElement(By.id('tab-wrap-toggle')).isSelected(), false);
});

test('open-as-child toggle persists to storage and survives reload', { timeout: 30000 }, async () => {
  const toggle = await driver.findElement(By.id('child-tab-toggle'));
  assert.equal(await toggle.isSelected(), false); // default off
  await clickToggle('child-tab-toggle');

  assert.equal(await getStorage('openAsChildTab'), true);

  await driver.get(OPTIONS_URL);
  assert.equal(await driver.findElement(By.id('child-tab-toggle')).isSelected(), true);
});

test('toolbar popup renders actions and Settings opens the add-ons manager', { timeout: 30000 }, async () => {
  await driver.get(`moz-extension://${UUID}/popup.html`);

  assert.equal((await driver.findElements(By.css('.action-row'))).length, 3);

  // The open-tab row shows the live binding as per-key chips
  // ([⌘][⌥][T] on Mac, [Ctrl][Alt][T] elsewhere).
  const chips = await driver.findElements(By.css('#action-open-tab-right .key-chip'));
  assert.ok(chips.length >= 2, 'bound command should render key chips');
  assert.equal(await chips[chips.length - 1].getText(), 'T');

  // Settings opens about:addons (Firefox embeds options_ui there) in a new tab.
  const before = (await driver.getAllWindowHandles()).length;
  await driver.findElement(By.id('open-settings')).click();
  await driver.wait(async () => (await driver.getAllWindowHandles()).length === before + 1, 4000);
});

test('toolbar popup quick action opens a tab via the background message path', { timeout: 30000 }, async () => {
  await driver.get(`moz-extension://${UUID}/popup.html`);
  const before = await queryTabs();

  await driver.findElement(By.id('action-open-tab-right')).click();
  await driver.wait(async () => (await queryTabs()).length === before.length + 1, 4000);

  const after = await queryTabs();
  const opened = after.find(t => !before.some(old => old.id === t.id));
  assert.ok(opened, 'new tab should exist');
  assert.equal(opened.index, before.find(t => t.active).index + 1, 'opens right of the popup tab');
  assert.equal(opened.active, true);
});

test('background open-tab action opens immediately to the right', { timeout: 40000 }, async () => {
  const before = await queryTabs();
  const active = before.find(t => t.active);

  await bg('await bg.openTabToRight(); return true;');
  await driver.wait(async () => (await queryTabs()).length === before.length + 1, 4000);

  const after = await queryTabs();
  const opened = after.find(t => !before.some(old => old.id === t.id));
  assert.ok(opened, 'new tab should exist');
  assert.equal(opened.index, active.index + 1);
  assert.equal(opened.active, true);
});

test('recorder rejects an invalid typed shortcut and keeps the previous value', { timeout: 30000 }, async () => {
  const before = await shortcutOf('open-tab-right');
  const row = await rowFor('open-tab-right');
  const input = await row.findElement(By.css('.shortcut-text-input'));

  await input.click();
  await input.sendKeys(Key.chord(Key.CONTROL, 'a'), Key.DELETE);
  await input.sendKeys('Y'); // no modifier → invalid
  await driver.findElement(By.css('h1')).click(); // blur

  const msg = await row.findElement(By.css('.validation-msg'));
  await driver.wait(until.elementIsVisible(msg), 3000);

  assert.equal(await shortcutOf('open-tab-right'), before); // unchanged
});

test('recorder saves a valid typed shortcut and updates browser.commands', { timeout: 30000 }, async () => {
  const row = await rowFor('move-tab-next');
  const input = await row.findElement(By.css('.shortcut-text-input'));

  await input.click();
  await input.sendKeys(Key.chord(Key.CONTROL, 'a'), Key.DELETE);
  await input.sendKeys('Ctrl+Shift+Y');
  await driver.findElement(By.css('h1')).click(); // blur to save

  await driver.wait(async () => /Shift\+Y$/.test((await shortcutOf('move-tab-next')) || ''), 4000);
  // "Ctrl" maps to MacCtrl on macOS in Firefox's shortcut syntax.
  assert.match(await shortcutOf('move-tab-next'), /(Ctrl|MacCtrl)\+Shift\+Y/);
});

test('clear button unbinds a command', { timeout: 30000 }, async () => {
  assert.notEqual(await shortcutOf('open-tab-right'), ''); // has a default
  const row = await rowFor('open-tab-right');
  await row.findElement(By.css('.btn-clear')).click();

  await driver.wait(async () => (await shortcutOf('open-tab-right')) === '', 4000);
  assert.equal(await shortcutOf('open-tab-right'), '');
});

test('reset button restores the manifest default shortcut', { timeout: 30000 }, async () => {
  const row = await rowFor('open-tab-right');
  await row.findElement(By.css('.btn-clear')).click();
  await driver.wait(async () => (await shortcutOf('open-tab-right')) === '', 4000);

  await row.findElement(By.css('.btn-reset')).click();
  await driver.wait(async () => (await shortcutOf('open-tab-right')) !== '', 4000);
  assert.match(await shortcutOf('open-tab-right'), /Alt\+T$/);
});

test('background move action reorders a real Firefox tab strip', { timeout: 40000 }, async () => {
  // Arrange a known layout: options tab (index 0) + three blanks (1,2,3).
  await ext(`
    for (let i = 0; i < 3; i++) await browser.tabs.create({ url: 'about:blank', active: false });
    return true;
  `);

  // Move-by-one: active options tab at index 0 moves 'next' → it lands at index 1.
  let tabs = await queryTabs();
  const active = tabs.find(t => t.active);
  await bg("await bg.moveTab('next'); return true;");
  tabs = await queryTabs();
  assert.equal(tabs.find(t => t.id === active.id).index, 1, 'active tab should move one slot right');

  // Wrap: move back to index 0, then 'prev' once more → it lands at the end.
  await bg("await bg.moveTab('prev'); return true;");
  await bg("await bg.moveTab('prev'); return true;");
  tabs = await queryTabs();
  assert.equal(tabs.find(t => t.id === active.id).index, tabs.length - 1, 'active tab should wrap to the end');
});
