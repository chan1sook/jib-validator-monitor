import util from "node:util";
import { execFile as _execFile, spawn } from "node:child_process";
import Sudoer from '@nathanielks/electron-sudo';
import { getOsStr } from "./constant";

const options = {name: 'electron sudo application'}
const sudoer = new Sudoer.default(options);

export const spawnProcess = spawn;
export const basicExec = util.promisify(_execFile);

function splitCommandTokens(cmd: string) {
  const cmds = cmd.trim().split("\n");
  return cmds.map((line) => line.trim().split(/[\s\t]+/));
}

function realSudoExec(
  cmd: string,
  logCb: ({stdout, stderr} : ExecOutput) => void = () => {}
) {
  return new Promise<ExecOutput>(async (resolve, reject) => {
    try {
      let stdout = "";
      let stderr = "";
      const cmds = splitCommandTokens(cmd);
      for(const tokens of cmds) {
        if(tokens.length > 0 && tokens[0]) {
          await new Promise(async (resolve2, reject2) => {
            try {
              const p = await sudoer.spawn(
                tokens[0], [tokens.slice(1).join(" ")],
              );

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
            } catch(err) {
              reject2(err);
            }
          });
        }
      };

      resolve({ stdout, stderr });
    } catch(err) {
      reject(err);
    }
  });
}

function fakeSudoExec(
  cmd: string,
  logCb: ({stdout, stderr} : ExecOutput) => void = () => {}
) {
  return new Promise<ExecOutput>(async (resolve, reject) => {
    try {
      let stdout = "";
      let stderr = "";
      const cmds = splitCommandTokens(cmd);
      for(const tokens of cmds) {
        if(tokens.length > 0 && tokens[0]) {
          await new Promise(async (resolve2, reject2) => {
            try {
              const p = spawn(
                tokens[0], [tokens.slice(1).join(" ")],
              );

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
            } catch(err) {
              reject2(err);
            }
          });
        }
      };

      resolve({ stdout, stderr });
    } catch(err) {
      reject(err);
    }
  });
}

const sudoExecMap : Record<string, SudoExecSignature> = {
  "linux-ubuntu": realSudoExec,
};

export async function sudoExec(
  cmd: string,
  logCb: ({stdout, stderr} : ExecOutput) => void = () => {}
): Promise<ExecOutput> {
  const osName = await getOsStr();
  
  return await (sudoExecMap[osName] || fakeSudoExec)(cmd, logCb);
}

function realSudoSpawn(
  command: string,
  args?: readonly string[],
  ...params: any
) {
  return sudoer.spawn(command, [args.join(" ")], ...params);
}

function fakeSudoSpawn(
  command: string,
  args?: readonly string[],
  ...params: any
) {
  return spawn(command, args, ...params);
}

const sudoSpawnMap : Record<string, SudoSpawnSignature> = {
  "linux-ubuntu": realSudoSpawn,
};

export async function sudoSpawn(
  command: string,
  args?: readonly string[],
  ...params: any
) : Promise<any> {
  const osName = await getOsStr();
  
  console.log(osName);
  
  return await (sudoSpawnMap[osName] || fakeSudoSpawn)(command, args, ...params);
}