import sudoPrompt from 'sudo-prompt-alt';
import util from "node:util";
import { execFile as _execFile, spawn } from "node:child_process";

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

export function spawnCustom(cmd: string, args: any[], 
  options: import("node:child_process").SpawnOptionsWithoutStdio, 
  inputs: string[] = [], 
  stdinCb: (stdout: any, step: number) => void = console.log, 
  stderrCb: (stdout: any) => void = console.log,
) {
  return new Promise((resolve, reject) => {
    const p1 = spawn(cmd, args, options);
    let step = 0;
    p1.stdout.on("data", (data) => {
      stdinCb(data.toString(), step);

      if (step >= inputs.length) {
        p1.kill();
      } else {
        const input = inputs[step].split("\n")[0] || "";
        p1.stdin.write(input + "\n");
        step += 1;
      }
    })

    p1.stderr.on("data", (data) => {
      stderrCb(data.toString());
    })
    
    p1.on("exit", (code, signal) => {
      console.log(code, signal);
      resolve(undefined);
    })
    p1.on("error", reject)
  });
}

export function getPythonCmd() {
  return "python3";
}