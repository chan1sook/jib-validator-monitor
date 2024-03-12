import Event from "node:events";

import { checkCurlVersion, checkGitVersion, checkTarVersion } from "./check-software";
import { getJbcDepositKeygenUrl, getJbcDepositSha256Checksum, getLocalJbcDepositKeygenPath, getLocalJbcFileName, isOverrideCheckFiles } from "./constant";
import { basicExec, spawnProcess, sudoExec } from "./exec";
import path from "node:path";
import fs from "node:fs/promises";
import { calculateHash, isFileValid } from "./fs";
import { getCustomLogger } from "./logger";

export const generateKeysStatusEvent = new Event();

const generateKeyLogger = getCustomLogger("generateKeys", generateKeysStatusEvent);

export async function generateKeys(qty: number, withdrawAddress: string, keyPassword: string) {
  try {
    generateKeyLogger.emitWithLog("Check Softwares");

    // check softwares
    const [gitVersion, curlVersion] = await Promise.all([
      checkGitVersion(),
      checkCurlVersion(),
    ]);
    generateKeyLogger.logDebug("Git", gitVersion);
    generateKeyLogger.logDebug("cURL", curlVersion);

    const sofewareNeeds: string[] = [];
    if (!gitVersion) {
      sofewareNeeds.push("git");
    }

    if (!curlVersion) {
      sofewareNeeds.push("curl");
    }

    if (sofewareNeeds.length > 0) {
      generateKeyLogger.emitWithLog("Install Softwares");

      generateKeyLogger.injectExecTerminalLogs(
        await sudoExec(
        `apt-get update
        apt-get install ${sofewareNeeds.join(' ')} -y
        `),
      );

      generateKeyLogger.logDebug("Softwares Installed");
    }

    generateKeyLogger.logInfo("JBC_KEYGEN_EXEC_PATH", process.env.JBC_KEYGEN_EXEC_PATH);

    const keygenFilePath = getLocalJbcDepositKeygenPath();
    const isKeygenFileValid = !isOverrideCheckFiles() && 
      await isFileValid(keygenFilePath, getJbcDepositSha256Checksum());

    if(!isKeygenFileValid) {
      generateKeyLogger.emitWithLog("Download Keygen File");
      try {
        await fs.rm(process.env.JBC_KEYGEN_EXEC_PATH, { recursive: true, force: true })
      } catch (err) {

      }
      await fs.mkdir(process.env.JBC_KEYGEN_EXEC_PATH, { recursive: true });

      // download File
      generateKeyLogger.injectExecTerminalLogs(
        await basicExec("curl", [
          "-L",
          getJbcDepositKeygenUrl(),
          "-o",
          getLocalJbcFileName(),
        ], {
          cwd: process.env.JBC_KEYGEN_EXEC_PATH,
        }),
      );

      // set it excutable
      generateKeyLogger.injectExecTerminalLogs(
        await basicExec("chmod", [
          "+x",
          keygenFilePath,
        ]),
      );

      generateKeyLogger.logDebug("File Downloaded");

      generateKeyLogger.logDebug("sha256", await calculateHash(keygenFilePath));
    } else {
      generateKeyLogger.logDebug("Use Cached File");
    }

    generateKeyLogger.emitWithLog("Generate Keys");

    // Clear old generated file
    const keysPath = path.join(process.env.JBC_KEYGEN_EXEC_PATH, ".keys");
    try {
      await fs.rm(keysPath, {
        recursive: true,
        force: true,
      });
    } catch(err) {

    }
    await fs.mkdir(keysPath, { recursive: true });
  
    const genKey = new Promise<GenerateKeyResponse>((resolve, reject) => {
      let checkfileWorker : NodeJS.Timeout | undefined;
      let cachedProcess = "";
      const exportPath = path.join(process.env.JBC_KEYGEN_EXEC_PATH, ".keys/validator_keys");
      
      const genKeyProcess = spawnProcess(keygenFilePath, [
        "--non_interactive",
        "new-mnemonic",
        `--num_validators=${qty}`,
        "--mnemonic_language=english",
        "--chain=jib",
        `--eth1_withdrawal_address=${withdrawAddress}`,
        `--keystore_password=${keyPassword}`,
        `--folder=${keysPath}`,
      ], {
        cwd: process.env.JBC_KEYGEN_EXEC_PATH,
        timeout: 60 * 60 * 1000,
      })

      let step = 1;
      let out = "";
      let mnemonic = "";

      genKeyProcess.stdout.on("data", (data) => {
        generateKeyLogger.injectTerminalLog(data.toString());
        out += data.toString();

        // generateKeyLogger.logInfo(`Step : ${step}`, out);

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
              const files = await fs.readdir(exportPath);
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
  
        if (code === 0) {
          generateKeyLogger.logDebug("Read Keys");
          
          // read content
          const files = await fs.readdir(exportPath);
          const contents = {};
          for (const file of files) {
            const str = (await fs.readFile(path.join(exportPath, file))).toString();
            contents[file] = str;
          }
          resolve({ mnemonic, contents, exportPath });
        } else {
          const tokens = out.split('\n').filter((str) => !!str);
          const err = new Error(tokens[tokens.length - 1] || `Exit code:${code}`);
          reject(err);
        }
      })

      genKeyProcess.on("error", (err) => {
        clearInterval(checkfileWorker);
        reject(err);
      });
    });

    const result = await genKey;
    generateKeyLogger.logSuccess("Key Files", Object.keys(result.contents));
    return result;
  } catch (err) {
    throw err;
  }
}