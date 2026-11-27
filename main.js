const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Sable 1.x kept everything in localStorage under the "Sable" user data folder.
// Renaming the app to WiseSpend changed app.getPath('userData'), so on first
// launch we read the old store from a throwaway partition and hand it to the
// renderer through a preload bridge, which adopts it into the new store.
const LEGACY_PROFILES = ['Sable', 'sable-finance'];
const LEGACY_KEY = 'sable-v1';
const LEGACY_MARKER = '.legacy-store-checked';
const RECOVERY_FILE = 'sable-recovered.json';

let migrating = true;
let stagedSource = null;
let migrationPending = false;

function writeMarker(source, recovered) {
  const userData = app.getPath('userData');
  try {
    fs.mkdirSync(userData, { recursive: true });
    fs.writeFileSync(
      path.join(userData, LEGACY_MARKER),
      JSON.stringify({ checkedAt: new Date().toISOString(), source, recovered })
    );
  } catch (e) {
    console.error('WiseSpend: could not write the migration marker', e);
  }
}

function profileHasStore(dir) {
  try {
    const ls = path.join(dir, 'Local Storage', 'leveldb');
    if (!fs.existsSync(ls)) return false;
    return fs.readdirSync(ls).some(f => {
      if (!f.endsWith('.ldb') && !f.endsWith('.log')) return false;
      try { return fs.statSync(path.join(ls, f)).size > 0; } catch (e) { return false; }
    });
  } catch (e) {
    return false;
  }
}

async function readLegacyStore() {
  const userData = app.getPath('userData');
  if (fs.existsSync(path.join(userData, LEGACY_MARKER))) return null;

  const appData = app.getPath('appData');
  let source = null;
  for (const name of LEGACY_PROFILES) {
    const dir = path.join(appData, name);
    if (path.resolve(dir) === path.resolve(userData)) continue;
    if (profileHasStore(dir)) { source = dir; break; }
  }

  // No 1.x profile at all, so there is nothing to carry over: the check is done.
  if (!source) {
    writeMarker(null, false);
    return null;
  }

  let read = null;
  try {
    const partition = path.join(userData, 'Partitions', 'sable-legacy', 'Local Storage');
    if (!fs.existsSync(partition)) {
      fs.mkdirSync(path.dirname(partition), { recursive: true });
      fs.cpSync(path.join(source, 'Local Storage'), partition, { recursive: true });
    }
    const probe = new BrowserWindow({
      show: false,
      width: 420,
      height: 280,
      backgroundColor: '#08080A',
      webPreferences: { partition: 'persist:sable-legacy', backgroundThrottling: false }
    });
    await probe.loadFile(path.join(__dirname, 'legacy-read.html'));
    read = await probe.webContents.executeJavaScript(
      `(() => { try { return { ok: true, value: localStorage.getItem(${JSON.stringify(LEGACY_KEY)}) }; } catch (e) { return { ok: false, value: null }; } })()`
    );
    probe.destroy();
  } catch (e) {
    console.error('WiseSpend: could not read the Sable store', e);
    read = null;
  }

  // A failed read (Sable still running and holding its store, an unreadable
  // leveldb, ...) must not burn the one-time check: retry on the next launch.
  if (!read || !read.ok) {
    console.error('WiseSpend: the Sable store could not be read; retrying on the next launch');
    return null;
  }

  // The profile exists but never stored Sable data, so there is nothing to import.
  if (!read.value) {
    writeMarker(source, false);
    return null;
  }

  try {
    const recoveryPath = path.join(userData, RECOVERY_FILE);
    fs.mkdirSync(userData, { recursive: true });
    fs.writeFileSync(recoveryPath, read.value);
    console.log('WiseSpend: found a Sable store at ' + source + ' (' + read.value.length + ' characters)');
    stagedSource = source;
    migrationPending = true;
    return recoveryPath;
  } catch (e) {
    console.error('WiseSpend: could not stage the Sable store', e);
    return null;
  }
}

// The renderer sends this once it has adopted the staged store, which is the
// only point where the import counts as done: drop the staged copy and close
// the one-time check. Without it the next launch tries again.
ipcMain.on('legacy-store-adopted', () => {
  if (!migrationPending) return;
  migrationPending = false;
  try {
    fs.rmSync(path.join(app.getPath('userData'), RECOVERY_FILE), { force: true });
  } catch (e) {
    console.error('WiseSpend: could not remove the staged Sable store', e);
  }
  writeMarker(stagedSource, true);
});

function createWindow(recoveryPath) {
  const win = new BrowserWindow({
    width: 1280,
    height: 880,
    minWidth: 420,
    minHeight: 560,
    backgroundColor: '#08080A',
    title: 'WiseSpend',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      // the preload reads the staged Sable store from disk (no Node in the page itself)
      sandbox: false,
      preload: path.join(__dirname, 'preload.js'),
      additionalArguments: recoveryPath ? ['--legacy-store=' + recoveryPath] : []
    }
  });
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, 'index.html'), { query: { v: app.getVersion() } });
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
}

app.whenReady().then(async () => {
  const recoveryPath = await readLegacyStore();
  migrating = false;
  createWindow(recoveryPath);
});

// The probe window used to read the Sable store closes before the real window
// exists, so quitting on window-all-closed has to wait until migration is done.
app.on('window-all-closed', () => { if (!migrating && process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (!migrating && BrowserWindow.getAllWindows().length === 0) createWindow(null); });
