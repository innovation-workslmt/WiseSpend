const { app, BrowserWindow, Menu, shell } = require('electron');
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
  const marker = path.join(userData, LEGACY_MARKER);
  if (fs.existsSync(marker)) return null;

  const appData = app.getPath('appData');
  let source = null;
  for (const name of LEGACY_PROFILES) {
    const dir = path.join(appData, name);
    if (path.resolve(dir) === path.resolve(userData)) continue;
    if (profileHasStore(dir)) { source = dir; break; }
  }

  let raw = null;
  if (source) {
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
      raw = await probe.webContents.executeJavaScript(
        `(() => { try { return localStorage.getItem(${JSON.stringify(LEGACY_KEY)}); } catch (e) { return null; } })()`
      );
      probe.destroy();
    } catch (e) {
      console.error('WiseSpend: could not read the Sable store', e);
    }
  }

  let recoveryPath = null;
  if (raw) {
    try {
      recoveryPath = path.join(userData, RECOVERY_FILE);
      fs.mkdirSync(userData, { recursive: true });
      fs.writeFileSync(recoveryPath, raw);
      console.log('WiseSpend: found a Sable store at ' + source + ' (' + raw.length + ' characters)');
    } catch (e) {
      console.error('WiseSpend: could not stage the Sable store', e);
      recoveryPath = null;
    }
  }

  try {
    fs.mkdirSync(userData, { recursive: true });
    fs.writeFileSync(marker, JSON.stringify({ checkedAt: new Date().toISOString(), source, recovered: !!raw }));
  } catch (e) {
    console.error('WiseSpend: could not write the migration marker', e);
  }

  return recoveryPath;
}

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
