import Event from "node:events";

import { checkGitVersion, } from "./check-software";
import { getChainConfigDir, getChainConfigGitSha256Checksum, getChainConfigPath, getLighhouseDownloadUrl, getLighhouseSha256Checksum, getLocalLighthousePath, isOverrideCheckFiles } from "./constant";
import { basicExec, spawnProcess, sudoExec } from "./exec";
import path from "node:path";
import fs from "node:fs/promises";
import { getCustomLogger } from "./logger";
import { calculateHash, isFileExists, isFileValid } from "./fs";

export const exitValidatorsStatusEvent = new Event();

const exitVcLogger = getCustomLogger("exitValidator", exitValidatorsStatusEvent);

export async function exitValidator(pubKey: string, keyPassword: string) {
  try {
    exitVcLogger.emitWithLog("Check Softwares");

    // check softwares
    const [gitVersion] = await Promise.all([
      checkGitVersion(),
    ])

    exitVcLogger.logDebug("Git", gitVersion);

    if (!gitVersion) {
      let cmd = "";
      if (!gitVersion) {
        cmd += `apt-get update
        apt-get install git -y
        `;
      }

      exitVcLogger.emitWithLog("Install Softwares");

      exitVcLogger.injectExecTerminalLogs(
        await sudoExec(cmd)
      );

      exitVcLogger.logDebug("Softwares Installed");
    }

    exitVcLogger.logInfo("VC_DEPLOY_TEMP", process.env.VC_DEPLOY_TEMP);

    // Get jibchain data
    const chainConfigPath = getChainConfigPath();
    const isChainConfigFileValid = !isOverrideCheckFiles() && await isFileValid(chainConfigPath, getChainConfigGitSha256Checksum());

    if(!isChainConfigFileValid) {
      try {
        await fs.rm(process.env.VC_DEPLOY_TEMP, {
          recursive: true,
          force: true,
        });
      } catch (err) {
  
      }
    
      await fs.mkdir(process.env.VC_DEPLOY_TEMP, { recursive: true });

      // download git
      exitVcLogger.emitWithLog("Clone Jibchain Script Git");
      
      exitVcLogger.injectExecTerminalLogs(
        await basicExec("git", [
          "clone",
          "https://github.com/jibchain-net/node.git",
          process.env.VC_DEPLOY_TEMP,
        ]),
      );

      exitVcLogger.logDebug("sha256", await calculateHash(chainConfigPath));
    } else {
      exitVcLogger.logDebug("Use Cached Script");
    }

    exitVcLogger.logInfo("VC_KEYS_PATH", process.env.VC_KEYS_PATH);
    exitVcLogger.emitWithLog("Find Keystore File");
    
    const vcGeneratedPath = path.join(process.env.VC_KEYS_PATH, "vc/validators");
    const vcGeneratedFileNames = await fs.readdir(vcGeneratedPath);
    
    if(!vcGeneratedFileNames.includes(pubKey)) {
      exitVcLogger.logFailed("Keystore not found");
      throw new Error("Keystore not found");
    }

    const vcKeyFolderPath = path.join(vcGeneratedPath, pubKey);
    const vcKeyFileNames = await fs.readdir(vcKeyFolderPath);

    console.log(vcKeyFileNames);
    if(vcKeyFileNames.length <= 0) {
      exitVcLogger.logFailed("Keystore not found");
      throw new Error("Keystore not found");
    }

    const vcKeyPath = path.join(vcKeyFolderPath, vcKeyFileNames[0]);
    exitVcLogger.logInfo("vcKeyPath", vcKeyPath);

    const lhFilePath = getLocalLighthousePath();
    const isLhFileValid = !isOverrideCheckFiles() && await isFileValid(lhFilePath, getLighhouseSha256Checksum());
  
    if(!isLhFileValid) {
      try {
        await fs.rm(process.env.LIGHTHOUSE_EXEC_PATH, {
          recursive: true,
          force: true,
        });
      } catch (err) {
  
      }
    
      await fs.mkdir(process.env.LIGHTHOUSE_EXEC_PATH, { recursive: true });

      exitVcLogger.emitWithLog("Download Lighthouse");

      // Create files
      exitVcLogger.injectExecTerminalLogs(
        await basicExec("curl", [
          "-L",
          getLighhouseDownloadUrl(),
          "-o",
          "lighthouse.tar.gz",
        ], {
          cwd: process.env.LIGHTHOUSE_EXEC_PATH,
        })
      );
  
      exitVcLogger.emitWithLog("Extract Lighthouse File");
      
      exitVcLogger.injectExecTerminalLogs(
        await basicExec("tar", [
          "-xvf",
          "lighthouse.tar.gz",
        ], {
          cwd: process.env.LIGHTHOUSE_EXEC_PATH,
        }),
      );

      exitVcLogger.logDebug("Lighthouse Downloaded");

      exitVcLogger.logDebug("sha256", await calculateHash(lhFilePath));
    } else {
      exitVcLogger.logDebug("Use Cached File");
    }

    exitVcLogger.emitWithLog("Exiting Validator");

    // TODO run lighthouse account exit
    // ./lighthouse account validator exit

    const exitVcPromise = new Promise((resolve, reject) => {
    const exitVcProcess = spawnProcess("./lighthouse", [
        "account",
        "validator",
        "exit",
        "--keystore",
        vcKeyPath,
        "--testnet-dir",
        getChainConfigDir(),
        "--beacon-node",
        "https://metrabyte-cl.jibchain.net/",
        "--stdin-inputs"
      ], {
        cwd: process.env.LIGHTHOUSE_EXEC_PATH,
        timeout: 60 * 60 * 1000,
      })

      let step = 1;
      let out = "";

      // lighthouse account imnport out as stderr
      exitVcProcess.stderr.on("data", (data) => {
        exitVcLogger.injectTerminalLog(data.toString());
        out += data.toString();
        exitVcLogger.logInfo(`Step : ${step}`, out);

        if (step === 1 && out.includes("Enter the keystore password for validator in")) {
          out = "";
          exitVcProcess.stdin.write(`${keyPassword}\n`);
          step += 1;
        }

        if (step === 2 && out.includes("Enter the exit phrase from the above URL to confirm the voluntary exit:")) {
          out = "";
          exitVcProcess.stdin.write(`Exit my validator\n`);
          step += 1;
        }
      });

      exitVcProcess.stdout.on("data", (data) => {
        console.log(data);
      });

      exitVcProcess.on("exit", async (code, signal) => {
        if (code === 0) {
          const result : ExitValidatorResult = {
            currentEpoch: undefined,
            exitEpoch: undefined,
            withdrawableEpoch: undefined,
            exitTs: undefined,
          }

          const epochRegexResult = /Current epoch: ([1-9][0-9]*), Exit epoch: ([1-9][0-9]*), Withdrawable epoch: ([1-9][0-9]*)/.exec(out);
          
          if(epochRegexResult) {
            result.currentEpoch = parseInt(epochRegexResult[1], 10);
            result.exitEpoch = parseInt(epochRegexResult[2], 10);
            result.withdrawableEpoch = parseInt(epochRegexResult[3], 10);
          }

          const exitTimeResult = /Exit epoch in approximately ([1-9][0-9]*) secs/.exec(out);

          if(exitTimeResult) {
            result.exitTs = Date.now() + parseInt(exitTimeResult[1], 10) * 1000;
          }

          resolve(result);
        } else {
          const tokens = out.split('\n').filter((str) => !!str);
          const err = new Error(tokens[tokens.length - 1] || `Exit code:${code}`);
          reject(err);
        }
      })

      exitVcProcess.on("error", (err) => {
        console.error(err);
        reject(err);
      })
    });

    const result = await exitVcPromise;
    return result;

  } catch (err) {
    throw err;
  }
}