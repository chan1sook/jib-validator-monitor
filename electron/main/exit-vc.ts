import Event from "node:events";

import { checkGitVersion, } from "./check-software";
import { getLighhouseDownloadUrl, getLocalLighthousePath } from "./constant";
import { basicExec, spawnProcess, sudoExec } from "./exec";
import path from "node:path";
import fs from "node:fs/promises";
import { getCustomLogger } from "./logger";
import { isFileExists } from "./fs";

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

      await sudoExec(cmd);

      exitVcLogger.logDebug("Softwares Installed");
    }

    exitVcLogger.logInfo("VC_DEPLOY_TEMP", process.env.VC_DEPLOY_TEMP);

    // Get jibchain data
    const chainConfigPath = path.join(process.env.VC_DEPLOY_TEMP, "config");
    const hasChainConfigExits = await isFileExists(chainConfigPath);
    if(!hasChainConfigExits) {
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
    
      await basicExec("git", [
        "clone",
        "https://github.com/jibchain-net/node.git",
        process.env.VC_DEPLOY_TEMP,
      ]);
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


    

    const hasLighthouseExists = await isFileExists(getLocalLighthousePath());
    if(!hasLighthouseExists) {
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
      await basicExec("curl", [
        "-L",
        getLighhouseDownloadUrl(),
        "-o",
        "lighthouse.tar.gz",
      ], {
        cwd: process.env.LIGHTHOUSE_EXEC_PATH,
      });
  
      exitVcLogger.emitWithLog("Extract Lighthouse File");

      await basicExec("tar", [
        "-xvf",
        "lighthouse.tar.gz",
      ], {
        cwd: process.env.LIGHTHOUSE_EXEC_PATH,
      });

      exitVcLogger.logDebug("Lighthouse Downloaded");
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
        chainConfigPath,
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
        out += data.toString();
        exitVcLogger.logInfo(`Step : ${step}`, out);

        if (step === 1 && out.includes("Enter the keystore password for validator in")) {
          out = "";
          exitVcProcess.stdin.write(`${keyPassword}\n\n`);
          step += 1;
        }

        // if (step === 1 && out.includes("Enter the keystore password, or press enter to omit it:")) {
        //   out = "";
        //   vcExitProcess.stdin.write(`${keyPassword}\n\n`);
        //   step += 1;
        // }
      });

      exitVcProcess.stdout.on("data", (data) => {
        console.log(data);
      });

      exitVcProcess.on("exit", async (code, signal) => {
        if (code === 0) {
          // const importResult: DeployKeyResult = {
          //   imported: undefined,
          //   skipped: undefined,
          //   apiToken: undefined,
          // }
          // const captureOutText = /Successfully imported ([0-9]+) validators? \(([0-9]+) skipped\)\./.exec(out);
          // if (captureOutText) {
          //   importResult.imported = parseInt(captureOutText[1], 10);
          //   importResult.skipped = parseInt(captureOutText[2], 10);
          // }

          resolve("");
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