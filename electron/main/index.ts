import { app, BrowserWindow, shell, ipcMain, dialog } from "electron";
import "colors";

import { release } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { checkDockerVersion } from "./check-software";
import { generateKeys, generateKeysStatusEvent } from "./generate-keys";
import { checkExistsValidatorKeys, readKeyFiles } from "./manage-keys";
import { deployValidators, deployValidatorsStatusEvent } from "./deploy-vcs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js    > Electron-Main
// │ └─┬ preload
// │   └── index.mjs    > Preload-Scripts
// ├─┬ dist
// │ └── index.html    > Electron-Renderer
//
process.env.DIST_ELECTRON = join(__dirname, "..");
process.env.DIST = join(process.env.DIST_ELECTRON, "../dist");
process.env.VITE_PUBLIC = process.env.VITE_DEV_SERVER_URL
  ? join(process.env.DIST_ELECTRON, "../public")
  : process.env.DIST;
process.env.VC_KEYGEN_TEMP = process.env.VITE_DEV_SERVER_URL
  ? join(process.env.DIST_ELECTRON, ".vc-keygen")
  : "/tmp/.vc-keygen";
process.env.VC_KEY_PATH = process.env.VITE_DEV_SERVER_URL
  ? join(process.env.DIST_ELECTRON, "../.config/keys")
  : "/usr/jib-vc/keys";

process.env.VALIDATOR_KEY_PATH = join(process.env.DIST_ELECTRON, ".vc-keys");

// Disable GPU Acceleration for Windows 7
if (release().startsWith("6.1")) app.disableHardwareAcceleration();

// Set application name for Windows 10+ notifications
if (process.platform === "win32") app.setAppUserModelId(app.getName());

if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

// Remove electron security warnings
// This warning only shows in development mode
// Read more on https://www.electronjs.org/docs/latest/tutorial/security
// process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'

let win: BrowserWindow | null = null;
// Here, you can also use other preload
const preload = join(__dirname, "../preload/index.mjs");
const url = process.env.VITE_DEV_SERVER_URL;
const indexHtml = join(process.env.DIST, "index.html");

async function createWindow() {
  win = new BrowserWindow({
    title: "JIB Validator Monitor",
    icon: join(process.env.VITE_PUBLIC, "favicon.ico"),
    webPreferences: {
      preload,
      // Warning: Enable nodeIntegration and disable contextIsolation is not secure in production
      // nodeIntegration: true,

      // Consider using contextBridge.exposeInMainWorld
      // Read more on https://www.electronjs.org/docs/latest/tutorial/context-isolation
      // contextIsolation: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    // electron-vite-vue#298
    win.loadURL(url);
    // Open devTool if the app is not packaged
    win.webContents.openDevTools();
  } else {
    win.loadFile(indexHtml);
  }

  // Test actively push message to the Electron-Renderer
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", new Date().toLocaleString());
  });

  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https:")) shell.openExternal(url);
    return { action: "deny" };
  });
  // win.webContents.on('will-navigate', (event, url) => { }) #344
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  win = null;
  if (process.platform !== "darwin") app.quit();
});

app.on("second-instance", () => {
  if (win) {
    // Focus on the main window if the user tried to open another
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

app.on("activate", () => {
  const allWindows = BrowserWindow.getAllWindows();
  if (allWindows.length) {
    allWindows[0].focus();
  } else {
    createWindow();
  }
});

// New window example arg: new windows url
ipcMain.handle("open-win", (_, arg) => {
  const childWindow = new BrowserWindow({
    webPreferences: {
      preload,
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    childWindow.loadURL(`${url}#${arg}`);
  } else {
    childWindow.loadFile(indexHtml, { hash: arg });
  }
});

ipcMain.on("checkValidators", async (_ev, ...args) => {
  // TODO actual check validators
  const dockerVersion = await checkDockerVersion();

  console.log("Docker", dockerVersion);
  
  win?.webContents.send("checkValidatorsResponse", {
    validatorExists: false,
  });

  win?.webContents.send("paths", {
    VITE_PUBLIC: process.env.VITE_PUBLIC,
    VC_KEYGEN_TEMP: process.env.VC_KEYGEN_TEMP,
  });
});

generateKeysStatusEvent.on("status", (status) => {
  win?.webContents.send("generateKeysStatus", status);
});

ipcMain.on("generateKeys", async (_ev, ...args) => {
  const [vcQty, withdrawAddress, keyPassword] = args as [number, string, string];
  try {
    const response = await generateKeys(vcQty, withdrawAddress, keyPassword);
    win?.webContents.send("generateKeysResponse", null, response);
  } catch (err) {
    console.error(err);
    win?.webContents.send("generateKeysResponse", err.message);
  }
});

deployValidatorsStatusEvent.on("status", (status) => {
  win?.webContents.send("deployValidatorsStatus", status);
});

ipcMain.on("deployValidators", async (_ev, ...args) => {
  // const [vcQty, withdrawAddress, keyPassword] = args as [number, string, string];
  try {
    const response = await deployValidators();
    win?.webContents.send("deployValidatorsResponse", null, response);
  } catch (err) {
    console.error(err);
    win?.webContents.send("deployValidatorsResponse", err.message);
  }
});