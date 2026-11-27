const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');

// Hands the staged Sable 1.x store to the renderer before it starts, so the
// upgrade path does not depend on when the page finishes loading.
let raw = null;
const arg = process.argv.find(a => a.startsWith('--legacy-store='));
if (arg) {
  try {
    raw = fs.readFileSync(arg.slice('--legacy-store='.length), 'utf8');
  } catch (e) {
    raw = null;
  }
}

contextBridge.exposeInMainWorld('wisespendLegacy', raw);
// tells main.js the staged store was adopted, so it can be removed and the
// one-time migration check can be closed
contextBridge.exposeInMainWorld('wisespendLegacyAdopted', () => ipcRenderer.send('legacy-store-adopted'));
