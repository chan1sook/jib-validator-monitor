import sudoPrompt from 'sudo-prompt-alt';
import util from "node:util";
import { execFile as _execFile } from "node:child_process";

export const basicExec = util.promisify(_execFile);

export function sudoExec(cmd: string): Promise<{ stdout: string, stderr: string }> {
  return new Promise((resolve, reject) => {
    sudoPrompt.exec(cmd, {
      name: 'Electron',
      icns: '/Applications/Electron.app/Contents/Resources/Electron.icns',
    },
      (error: Error | undefined, stdout: string, stderr: string) => {
        if (error) { return reject(error); };
        resolve({ stdout, stderr });
      }
    );
  });
}

export function getPythonCmd() {
  return "python3";
}

export function getLighhouseDownloadUrl() {
  if (!['x64', 'arm64'].includes(process.arch)) {
    throw new Error("Platform not support")
  }

  return process.arch === 'arm64' ? "https://github.com/sigp/lighthouse/releases/download/v4.6.0/lighthouse-v4.6.0-aarch64-unknown-linux-gnu-portable.tar.gz" :
        "https://github.com/sigp/lighthouse/releases/download/v4.6.0/lighthouse-v4.6.0-x86_64-unknown-linux-gnu-portable.tar.gz";
}