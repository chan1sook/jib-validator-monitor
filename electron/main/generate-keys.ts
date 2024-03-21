import Event from "node:events";

import { checkCurlVersion, checkGitVersion, checkPipVersion, checkPythonVersion, getPipCmdName, getPythonCmdName } from "./check-software";
import { jbcDepositGitUrl } from "./constant";
import { basicExec, spawnProcess, sudoExec, sudoSpawn } from "./exec";
import path from "node:path";
import fs from "node:fs/promises";
import { compareVersions } from 'compare-versions';
import { getCustomLogger } from "./logger";

export const generateKeysStatusEvent = new Event();

const generateKeyLogger = getCustomLogger("generateKeys", generateKeysStatusEvent);

export async function generateKeys(qty: number, withdrawAddress: string, keyPassword: string) {
  try {
    generateKeyLogger.emitWithLog("Check Softwares");

    // check softwares
    const [pythonVersion, pipVersion, gitVersion, curlVersion] = await Promise.all([
      checkPythonVersion(),
      checkPipVersion(),
      checkGitVersion(),
      checkCurlVersion(),
    ]);

    generateKeyLogger.logDebug("Python", pythonVersion);
    generateKeyLogger.logDebug("pip", pipVersion);
    generateKeyLogger.logDebug("Git", gitVersion);
    generateKeyLogger.logDebug("cURL", curlVersion);


    const softwareNeeds = [];

    if (!pythonVersion) {
      softwareNeeds.push(getPythonCmdName());
    }

    if (!pipVersion) {
      softwareNeeds.push(getPythonCmdName() + "-pip");
    }

    if (!gitVersion) {
      softwareNeeds.push("git");
    }

    if (!curlVersion) {
      softwareNeeds.push("curl");
    }

    if(softwareNeeds.length > 0) {
      generateKeyLogger.emitWithLog("Install Softwares");

      await sudoExec(`apt-get update
        apt-get install ${softwareNeeds.join(' ')} -y
      `, generateKeyLogger.injectExecTerminalLogs)

      generateKeyLogger.emitWithLog("Install Softwares");
    }

    generateKeyLogger.logInfo("JBC_KEYGEN_TEMP_PATH", process.env.JBC_KEYGEN_TEMP_PATH);

    try {
      await fs.rm(process.env.JBC_KEYGEN_TEMP_PATH, {
        recursive: true,
        force: true,
      });
    } catch (err) {

    }
  
    await fs.mkdir(process.env.JBC_KEYGEN_TEMP_PATH, { recursive: true });

    generateKeyLogger.emitWithLog("Download Script");

    generateKeyLogger.injectExecTerminalLogs(
      await basicExec("git", [
        "clone",
        jbcDepositGitUrl(),
        process.env.JBC_KEYGEN_TEMP_PATH,
      ]),
    );

    // Clear old generated file
    const keysPath = path.join(process.env.JBC_KEYGEN_TEMP_PATH, "validator_keys");
    try {
      await fs.rm(keysPath, {
        recursive: true,
        force: true,
      });
    } catch (err) {

    }
  
    await fs.mkdir(keysPath, { recursive: true });
    
    // install python (Ugh)
    generateKeyLogger.emitWithLog("Install Python");

    await new Promise<void>(async (resolve, reject) => {
      try {
        const args = [
          "install",
          "-r",
          path.join(process.env.JBC_KEYGEN_TEMP_PATH, "requirements.txt"),
        ];

        if(compareVersions(pythonVersion, "3.11") >= 0) {
          args.push("--break-system-packages")
        }

        const genKeyProcess = await sudoSpawn(getPipCmdName(), args , {
          timeout: 60 * 60 * 1000,
        });
    
        let out = "";

        genKeyProcess.stdout.on("data", (data) => {
          generateKeyLogger.injectTerminalLog(data.toString());
          out += data.toString();
        })

        genKeyProcess.stderr.on("data", (data) => {
          generateKeyLogger.injectTerminalLog(data.toString());
          console.log(data.toString());
        })

        genKeyProcess.on("exit", async (code, signal) => {
          try {
            if (code === 0) {
              resolve();
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
          reject(err);
        });
      } catch(err) {
        reject(err);
      }
    });


    await new Promise<void>(async (resolve, reject) => {
      try {
        const genKeyProcess = await sudoSpawn(getPythonCmdName(), [
          path.join(process.env.JBC_KEYGEN_TEMP_PATH, "setup.py"),
          "install"
        ], {
          timeout: 60 * 60 * 1000,
        });
    
        let out = "";

        genKeyProcess.stdout.on("data", (data) => {
          generateKeyLogger.injectTerminalLog(data.toString());
          out += data.toString();
        })

        genKeyProcess.stderr.on("data", (data) => {
          generateKeyLogger.injectTerminalLog(data.toString());
          console.log(data.toString());
        })

        genKeyProcess.on("exit", async (code, signal) => {
          try {
            if (code === 0) {
              resolve();
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
          reject(err);
        });
      } catch(err) {
        reject(err);
      }
    });

    // run script (yay)
    generateKeyLogger.emitWithLog("Generate Keys");
  
    const genKey = new Promise<GenerateKeyResponse>(async (resolve, reject) => {
      let checkfileWorker : NodeJS.Timeout | undefined;
      let cachedProcess = "";

      try {
        const genKeyProcess = spawnProcess("./deposit.sh", [
          "--non_interactive",
          "new-mnemonic",
          `--num_validators=${qty}`,
          "--mnemonic_language=english",
          "--chain=jib",
          `--eth1_withdrawal_address=${withdrawAddress}`,
          `--keystore_password=${keyPassword}`,
          `--folder=${process.env.JBC_KEYGEN_TEMP_PATH}`,
        ], {
          cwd: process.env.JBC_KEYGEN_TEMP_PATH,
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