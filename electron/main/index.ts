import { app, BrowserWindow, shell, ipcMain } from "electron";
import "colors";

import { release } from "node:os";
import fs from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import util from "node:util";
import { execFile as _execFile, spawn } from "node:child_process";
import { checkDockerVersion, checkExistsValidatorKeys } from "./exec";

const exec = util.promisify(_execFile);

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
process.env.TEMP_PATH = join(process.env.DIST_ELECTRON, "../.temp");
process.env.VALIDATOR_KEY_PATH = join(process.env.DIST_ELECTRON, ".vc-keys");
process.env.DIST = join(process.env.DIST_ELECTRON, "../dist");
process.env.VITE_PUBLIC = process.env.VITE_DEV_SERVER_URL
  ? join(process.env.DIST_ELECTRON, "../public")
  : process.env.DIST;

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
    title: "Main window",
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

ipcMain.on("check-validators", async (_ev, ...args) => {
  // TODO actual check validators
  const [dockerVersion, vKeys] = await Promise.all([
    checkDockerVersion(),
    checkExistsValidatorKeys(),
  ]);

  console.log("Docker", dockerVersion);
  console.log("vKeys", vKeys);

  win?.webContents.send("check-validators-response", {
    validatorExists: false,
    keyExists: vKeys.length > 0,
  });
});

ipcMain.on("check-system", async (_ev, ...args) => {
  const checkType = args[0] as string;

  console.log("[Check System]".blue, checkType);

  switch (checkType) {
    case "python":
      checkPython();
      break;
    case "git":
      checkGit();
      break;
    case "docker":
      checkDocker();
      break;
    default:
      console.error("System not found".red);
      win?.webContents.send("check-system-response", {
        err: "Type invalid",
        type: checkType,
        result: "Error",
      });
  }
});

// process.env.TEMP_PATH
function getPythonExec() {
  return process.platform === "win32" ? "python" : "python3";
}

async function checkPython() {
  try {
    const { stdout, stderr } = await exec(getPythonExec(), ["--version"]);

    const result = /^Python ([0-9\.]+)/.exec(stdout);
    if (result) {
      win?.webContents.send("check-system-response", {
        err: null,
        type: "python",
        result: result[1] || "?",
      });
    } else {
      throw new Error("Not found");
    }
  } catch (err) {
    console.error(err);

    win?.webContents.send("check-system-response", {
      err: err.message,
      type: "python",
      result: "Error",
    });
  }
}

async function checkDocker() {
  try {
    const { stdout, stderr } = await exec("docker", ["-v"]);
    const result = /^Docker version ([0-9\.]+)/.exec(stdout);

    if (result) {
      win?.webContents.send("check-system-response", {
        err: null,
        type: "docker",
        result: result[1] || "?",
      });
    } else {
      throw new Error("Not found");
    }
  } catch (err) {
    console.error(err);

    win?.webContents.send("check-system-response", {
      err: err.message,
      type: "docker",
      result: "Error",
    });
  }
}

async function checkGit() {
  try {
    const { stdout, stderr } = await exec("git", ["--version"]);
    const result = /^git version (.+)/.exec(stdout);

    if (result) {
      win?.webContents.send("check-system-response", {
        err: null,
        type: "git",
        result: result[1] || "?",
      });
    } else {
      throw new Error("Not found");
    }
  } catch (err) {
    console.error(err);

    win?.webContents.send("check-system-response", {
      err: err.message,
      type: "docker",
      result: "Error",
    });
  }
}

ipcMain.on("createKeys", async (_ev, ...args) => {
  await createKeys(...args);
});

let isCreateKeysBusy = false;
async function createKeys(vcQty = 1, withdrawAddress = "", keyPassword = "") {
  if (isCreateKeysBusy) {
    return;
  }

  isCreateKeysBusy = true;

  try {
    await fs.mkdir(process.env.TEMP_PATH, { recursive: true });
    const depositPath = join(process.env.TEMP_PATH, "deposit-cli");

    await fs.rm(depositPath, {
      recursive: true,
      force: true,
    });
    console.log("[Create VC Keys]".blue, "Clone Git");

    await exec("git", [
      "clone",
      "https://github.com/jibchain-net/deposit-cli.git",
      ".temp/deposit-cli",
    ]);

    console.log("[Create VC Keys]".blue, "Install Dependency");
    await exec("pip3", ["install", "-r", "requirements.txt"], {
      cwd: depositPath,
    });
    await exec(getPythonExec(), ["setup.py", "install"], {
      cwd: depositPath,
    });

    const keysPath = join(process.env.TEMP_PATH, "vc-keys");
    await fs.mkdir(keysPath, { recursive: true });

    const createKeyOptions = [
      "new-mnemonic",
      `--num_validators=${vcQty}`,
      "--mnemonic_language=english",
      "--chain=jib",
      `--eth1_withdrawal_address=${withdrawAddress}`,
      "--folder=../vc-keys`",
    ];

    console.log("[Create VC Keys]".blue, "Install Dependency");

    const p1 = spawn("./deposit.sh", createKeyOptions, {
      cwd: depositPath,
      timeout: 20000,
    });

    p1.stdout.on("data", (data) => {
      console.log(`stdout: "${data}"`);
    });

    // p1.stdin.write(`\n${keyPassword}\n`);
    // p1.stdin.end(); // EOF

    p1.on("close", (code) => {
      console.log(`Child process exited with code ${code}.`);
    });

    // const d = new Promise((resolve, reject) => {
    //   const p = spawn("cd .temp/deposit-cli");

    //   p.on("close", (code, signal) => {
    //     resolve({ code, signal });
    //   });
    // });
    // console.log(await d);
  } catch (err) {
    console.error(err);
  } finally {
    isCreateKeysBusy = false;
  }
}
