import util from "node:util";
import { execFile as _execFile, spawn } from "node:child_process";

export const spawnProcess = spawn;
export const basicExec = util.promisify(_execFile);

export function sudoExec(
  cmd: string,
  logCb: ({stdout, stderr} : { stdout: string, stderr: string}) => void = () => {}
): Promise<{ stdout: string, stderr: string }> {
  return new Promise(async (resolve, reject) => {
    try {
      let stdout = "";
      let stderr = "";
      const cmds = cmd.trim().split("\n");
      for(const cmdLine of cmds) {
        const tokens = cmdLine.trim().split(/[\s\t]+/);

        await new Promise(async (resolve2, reject2) => {
          const p = spawn("sudo", tokens);  
          p.stdout.on("data", (data) => {
            const dataStr = data.toString();
            logCb({ stdout: dataStr, stderr: "",});
            stdout += dataStr;
          });

          p.stderr.on("data", (data) => {
            const dataStr = data.toString();
            logCb({ stdout: "", stderr: dataStr,});
            stderr += dataStr;
          });

          p.on("exit", (code, signal) => {
            resolve2({ code, signal });
          });

          p.on("error", reject2);
        });
      };

      resolve({ stdout, stderr });
    } catch(err) {
      reject(err);
    }
  });
}
