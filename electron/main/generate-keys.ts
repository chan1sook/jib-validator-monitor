import Event from "node:events";

import { checkCurlVersion, checkDockerVersion, checkGitVersion, getDockerInstallCmd } from "./check-software";
import { isOverrideCheckFiles, jbcKeygenDockerImagePath, jbcKeygenDockerImageSha256Checksum, jbcKeygenImageDownloadUrl } from "./constant";
import { basicExec, spawnProcess, sudoExec, sudoSpawn } from "./exec";
import path from "node:path";
import fs from "node:fs/promises";
import { calculateHash, isFileExists, isFileValid } from "./fs";
import { getCustomLogger } from "./logger";

export const generateKeysStatusEvent = new Event();

const generateKeyLogger = getCustomLogger("generateKeys", generateKeysStatusEvent);

export async function generateKeys(qty: number, withdrawAddress: string, keyPassword: string) {
  try {
    generateKeyLogger.emitWithLog("Check Softwares");

    // check softwares
    const [dockerVersion, gitVersion, curlVersion] = await Promise.all([
      checkDockerVersion(),
      checkGitVersion(),
      checkCurlVersion(),
    ]);

    generateKeyLogger.logDebug("Docker", dockerVersion);
    generateKeyLogger.logDebug("Git", gitVersion);
    generateKeyLogger.logDebug("cURL", curlVersion);


    if (!dockerVersion || !gitVersion || !curlVersion) {
      let cmd = "";

      if (!dockerVersion) {
        cmd += await getDockerInstallCmd();
      }

      const sofewareNeeds: string[] = [];
      if (!gitVersion) {
        sofewareNeeds.push("git");
      }

      if (!curlVersion) {
        sofewareNeeds.push("curl");
      }

      if (sofewareNeeds.length > 0) {
        cmd += `apt-get update
        apt-get install ${sofewareNeeds.join(' ')} -y
        `
      }

      generateKeyLogger.emitWithLog("Install Softwares");

      await sudoExec(cmd, generateKeyLogger.injectExecTerminalLogs);

      generateKeyLogger.logDebug("Softwares Installed");
    }

    generateKeyLogger.logInfo("JBC_KEYGEN_SCRIPT_PATH", process.env.JBC_KEYGEN_SCRIPT_PATH);

    const keygenImagePath = jbcKeygenDockerImagePath();
    const isKeygenImageValid = !isOverrideCheckFiles() && 
      await isFileValid(keygenImagePath, jbcKeygenDockerImageSha256Checksum());

    // Get keygen image file
    if(!isKeygenImageValid) {
      try {
        await fs.rm(process.env.JBC_KEYGEN_TEMP_PATH, {
          recursive: true,
          force: true,
        });
      } catch (err) {
  
      }
    
      await fs.mkdir(process.env.JBC_KEYGEN_TEMP_PATH, { recursive: true });

      generateKeyLogger.emitWithLog("Download Image");

      // Create files
      const downloadPromise = new Promise<void>((resolve, reject) => {
        const downloadProcess = spawnProcess("curl", [
          "-L",
          jbcKeygenImageDownloadUrl(),
          "-o",
          keygenImagePath,
        ], {
          timeout: 60 * 60 * 1000,
        })
  
        let out = "";
  
        downloadProcess.stdin.on("data", (data) => {
          generateKeyLogger.injectTerminalLog(data.toString());
          out += data.toString();
        })

        downloadProcess.stderr.on("data", (data) => {
          generateKeyLogger.injectTerminalLog(data.toString());
          out += data.toString();
        })
  
        downloadProcess.on("exit", async (code, signal) => {
          if (code === 0) {
            resolve();
          } else {
            const tokens = out.split('\n').filter((str) => !!str);
            const err = new Error(tokens[tokens.length - 1] || `Exit code:${code}`);
            reject(err);
          }
        })
  
        downloadProcess.on("error", (err) => {
          console.error(err);
          reject(err);
        })
      });

      await downloadPromise;

      generateKeyLogger.logDebug("Image Downloaded");

      generateKeyLogger.logDebug("sha256", await calculateHash(keygenImagePath));
    } else {
      generateKeyLogger.logDebug("Use Cached File");
    }

     // Clear old generated file
     const keysPath = path.join(process.env.JBC_KEYGEN_TEMP_PATH, "validator_keys");
    
     const keyFolderExists = await isFileExists(keysPath) && (await fs.readdir(keysPath)).length > 0
     if(keyFolderExists) {
       await sudoExec(`rm -rf ${keysPath}`, generateKeyLogger.injectExecTerminalLogs);
     }
 
     await fs.mkdir(keysPath, { recursive: true });
    
    // deploy docker (Yay!)
    generateKeyLogger.emitWithLog("Deploy Docker");

    const installDockerScript = `docker image rm -f jbc-keygen
      docker load -i ${keygenImagePath}
      `;

    await sudoExec(installDockerScript, generateKeyLogger.injectExecTerminalLogs);
    
    // create compose
    generateKeyLogger.emitWithLog("Generate Keys");
  
    const genKey = new Promise<GenerateKeyResponse>(async (resolve, reject) => {
      let checkfileWorker : NodeJS.Timeout | undefined;
      let cachedProcess = "";

      try {
        const genKeyProcess = await sudoSpawn("docker", [
          "run",
          "-v",
          `${keysPath}:/app/validator_keys`,
          "-i",
          "--rm",
          "jbc-keygen",
          "--non_interactive",
          "new-mnemonic",
          `--num_validators=${qty}`,
          "--mnemonic_language=english",
          "--chain=jib",
          `--eth1_withdrawal_address=${withdrawAddress}`,
          `--keystore_password=${keyPassword}`,
        ], {
          timeout: 60 * 60 * 1000,
        });

        let step = 1;
        let out = "";
        let mnemonic = "";

        genKeyProcess.stdout.on("data", (data) => {
          generateKeyLogger.injectTerminalLog(data.toString());
          out += data.toString();

          if (step === 1 && out.includes("Please choose your language ['1. العربية', '2. ελληνικά', '3. English', '4. Français', '5. Bahasa melayu', '6. Italiano', '7. 日本語', '8. 한국어', '9. Português do Brasil', '10. român', '11. Türkçe', '12. 简体中文']:  [English]:")) {
            out = "";
            genKeyProcess.stdin.write("\n");
            step += 1;
          }

          if (step === 2 && out.includes("Repeat your execution address for confirmation.:")) {
            out = "";
            genKeyProcess.stdin.write(`${withdrawAddress}\n`);
            step += 1;
          }

          if (step === 3 && out.includes("Repeat your keystore password for confirmation:")) {
            out = "";
            genKeyProcess.stdin.write(`${keyPassword}\n`);
            step += 1;
          }

          if (step === 2 && out.includes("Please type your mnemonic (separated by spaces) to confirm you have written it down. Note: you only need to enter the first 4 letters of each word if you'd prefer.")) {
            const token = out.split("This is your mnemonic (seed phrase). Write it down and store it safely. It is the ONLY way to retrieve your deposit.")[1]
            const token1 = token.split("Please type your mnemonic (separated by spaces) to confirm you have written it down. Note: you only need to enter the first 4 letters of each word if you'd prefer.")[0]
            mnemonic = token1.trim();

            generateKeyLogger.logSuccess("Key Mnemonic", mnemonic);

            out = "";
            genKeyProcess.stdin.write(`${mnemonic}\n`);
            step += 1;

            checkfileWorker = setInterval(async () => {
              try {
                const files = await fs.readdir(keysPath);
                const percents = files.length * 100 / (qty + 2);
                const processText = `Generate Keys: ${files.length}/${qty + 2} (${percents.toFixed(2)}%)`;
                if(cachedProcess !== processText) {
                  cachedProcess = processText;
                  generateKeyLogger.emitWithLog(processText);
                }
              } catch(err) {

              }
            }, 100);
          }
        })

        genKeyProcess.stderr.on("data", (data) => {
          generateKeyLogger.injectTerminalLog(data.toString());
          console.log(data.toString());
        })

        genKeyProcess.on("exit", async (code, signal) => {
          clearInterval(checkfileWorker);
          
          try {
            if (code === 0) {
              generateKeyLogger.logDebug("Read Keys");
              await sudoExec(`chmod +r -R ${keysPath}`, generateKeyLogger.injectExecTerminalLogs);

              // read content
              const files = await fs.readdir(keysPath);
              const contents : Record<string, string> = {};
              for (const file of files) {
                const str = (await fs.readFile(path.join(keysPath, file))).toString();
                contents[file] = str;
              }
              resolve({ mnemonic, contents, exportPath: keysPath });
            } else {
              const tokens = out.split('\n').filter((str) => !!str);
              const err = new Error(tokens[tokens.length - 1] || `Exit code:${code}`);
              reject(err);
            }
          } catch(err) {
            reject(err);
          }
        })

        genKeyProcess.on("error", (err) => {
          clearInterval(checkfileWorker);
          reject(err);
        });
      } catch(err) {
        reject(err);
      }
    });

    const result = await genKey;
    generateKeyLogger.logSuccess("Key Files", Object.keys(result.contents));
    return result;
  } catch (err) {
    throw err;
  }
}