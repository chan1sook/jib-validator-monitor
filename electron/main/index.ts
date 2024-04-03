import { app, BrowserWindow, shell, ipcMain, dialog } from "electron";
import "colors";

import { release, homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { generateKeys, generateKeysStatusEvent } from "./generate-keys";
import { deployValidators, deployValidatorsStatusEvent } from "./deploy-vcs";
import { getLighthouseApiData, readKeyFiles, readProgramConfig } from "./fs";
import { checkDockerVersion, checkVcInstalled } from "./check-software";
import { exitValidator, exitValidatorsStatusEvent } from "./exit-vc";
import { deployJbcSirenStatusEvent, deployJbcSiren } from "./deploy-siren";

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

const tempBasePath = process.env.VITE_DEV_SERVER_URL
  ? join(process.env.DIST_ELECTRON, "../.temp/") : "/tmp/";

process.env.LIGHTHOUSE_EXEC_PATH = join(tempBasePath, ".lighthouse");
process.env.JBC_KEYGEN_SCRIPT_PATH = join(tempBasePath, ".jib-keygen");
process.env.VC_DEPLOY_TEMP = join(tempBasePath, ".vc-deployer");
process.env.JBC_SIREN_TEMP = join(tempBasePath, ".jib-siren");
process.env.VC_KEYS_PATH = join(homedir(), ".jib-lighthouse");

// process.env.OVERRIDE_CHECK_FILES = "override";

// Disable GPU Acceleration for Windows 7
if (release().startsWith("6.1")) app.disableHardwareAcceleration();

// Set application name for Windows 10+ notifications
if (process.platform === "win32") app.setAppUserModelId(app.getName());

app.setName("JIB Validator Monitor");

if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}
process.env.LIGHTHOUSE_EXEC_PATH = join(tempBasePath, ".lighthouse");
process.env.JBC_KEYGEN_SCRIPT_PATH = join(tempBasePath, ".jib-keygen");
process.env.VC_DEPLOY_TEMP = join(tempBasePath, ".vc-deployer");
process.env.JBC_SIREN_TEMP = join(tempBasePath, ".jib-siren");
process.env.VC_KEYS_PATH = join(homedir(), ".jib-lighthouse");


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
    icon: join(process.env.VITE_PUBLIC, "jbc-badge.png"),
    webPreferences: {
      preload,
      devTools: true,
    },
    autoHideMenuBar: true,
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
    if (url.startsWith("https:") || url.startsWith("http://localhost")) shell.openExternal(url);
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

ipcMain.on("getPaths", async (_ev, ...args) => {
  win?.webContents.send("getPathsResponse", {
    VITE_PUBLIC: process.env.VITE_PUBLIC,
    LIGHTHOUSE_EXEC_PATH: process.env.LIGHTHOUSE_EXEC_PATH,
    JBC_KEYGEN_SCRIPT_PATH: process.env.JBC_KEYGEN_SCRIPT_PATH,
    JBC_SIREN_TEMP: process.env.JBC_SIREN_TEMP,
    VC_DEPLOY_TEMP: process.env.VC_DEPLOY_TEMP,
    VC_KEYS_PATH: process.env.VC_KEYS_PATH,
  });
});

ipcMain.on("getFeatureConfigs", async (_ev, ...args) => {
  win?.webContents.send("getFeatureConfigsResponse", {
    allowSiren: process.arch === "x64",
  });
});

ipcMain.on("loadLighthouseApiData", async (_ev, ...args) => {
  let response: LighhouseApiData | undefined;

  try {
    const [dockerVersion, vcInstalled] = await Promise.all([
      checkDockerVersion(),
      checkVcInstalled(), 
    ]);
    if(!!dockerVersion && vcInstalled) {
      response = await getLighthouseApiData();
    }
  } catch(err) {
    console.error(err);
  }
  
  win?.webContents.send("loadLighthouseApiDataResponse", response);
});


ipcMain.on("loadSirenApiData", async (_ev, ...args) => {
  let response: VcConfigData;

  try {
    response = await readProgramConfig();
  } catch(err) {
    console.error(err);
  }
  
  win?.webContents.send("loadSirenApiDataResponse", response);
});

generateKeysStatusEvent.on("status", (status) => {
  win?.webContents.send("generateKeysStatus", status);
});
generateKeysStatusEvent.on("terminalLogs", (log) => {
  win?.webContents.send("terminalLogs", log);
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

ipcMain.on("selectVcKeyFiles", async (_ev, ...args) => {
  try {
    const files = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Keystore/Deposit JSON file', extensions: ['json'] },
      ],
    });

    if(files.canceled) {
      throw new Error("User Canceled");
    }

    const content = await readKeyFiles(files.filePaths);

    win?.webContents.send("selectVcKeyFilesResponse", null, content);
  } catch (err) {
    console.error(err);
    win?.webContents.send("selectVcKeyFilesResponse", err.message);
  }
});

deployValidatorsStatusEvent.on("status", (status) => {
  win?.webContents.send("deployValidatorsStatus", status);
});
deployValidatorsStatusEvent.on("terminalLogs", (log) => {
  win?.webContents.send("terminalLogs", log);
});

ipcMain.on("deployValidators", async (_ev, ...args) => {
  const [keyFileContent, machinePublicIp, feeRecipientAddress, keyPassword, advanceSetting] = args as [string, string, string, string, string];
  try {
    const response = await deployValidators(
      JSON.parse(keyFileContent) as Record<string, string>, 
      machinePublicIp,
      feeRecipientAddress,
      keyPassword, 
      JSON.parse(advanceSetting) as DeployKeyAdvanceSetting
    );
    win?.webContents.send("deployValidatorsResponse", null, response);
  } catch (err) {
    console.error(err);
    win?.webContents.send("deployValidatorsResponse", err.message);
  }
});

exitValidatorsStatusEvent.on("status", (status) => {
  win?.webContents.send("exitValidatorStatus", status);
});
exitValidatorsStatusEvent.on("terminalLogs", (log) => {
  win?.webContents.send("terminalLogs", log);
});

ipcMain.on("exitValidator", async (_ev, ...args) => {
  const [pubkey, keyPassword] = args as [string, string];

  try {
    const result = await exitValidator(pubkey, keyPassword);
    win?.webContents.send("exitValidatorResponse", null, pubkey, result);
  } catch (err) {
    console.error(err);
    win?.webContents.send("exitValidatorResponse", err.message, pubkey);
  }
  
})

deployJbcSirenStatusEvent.on("status", (status) => {
  win?.webContents.send("deployJbcSirenStatus", status);
})
deployJbcSirenStatusEvent.on("terminalLogs", (log) => {
  win?.webContents.send("terminalLogs", log);
});

ipcMain.on("deployJbcSiren", async (_ev, ...args) => {
  const [port] = args as [string];

  try {
    await deployJbcSiren(port);
    const response = await readProgramConfig();
    win?.webContents.send("deployJbcSirenResponse", null, response);
  } catch (err) {
    console.error(err);
    win?.webContents.send("deployJbcSirenResponse", err.message);
  }
  
})