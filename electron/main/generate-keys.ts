import Event from "node:events";

import { checkGitVersion, checkPipVersion, checkPythonVersion } from "./check-software";
import { getPythonCmd } from "./constant";
import { basicExec, spawnProcess, sudoExec } from "./exec";
import path from "node:path";
import fs from "node:fs/promises";
import { isFileExists } from "./fs";
import { getCustomLogger } from "./logger";

export const generateKeysStatusEvent = new Event();

const generateKeyLogger = getCustomLogger("generateKeys", generateKeysStatusEvent);

export async function generateKeys(qty: number, withdrawAddress: string, keyPassword: string) {
  try {
    generateKeyLogger.emitWithLog("Check Softwares");

    // check softwares
    const [gitVersion, pythonVersion, pipVersion] = await Promise.all([
      checkGitVersion(),
      checkPythonVersion(),
      checkPipVersion(),
    ]);
    generateKeyLogger.logDebug("Git", gitVersion);
    generateKeyLogger.logDebug("Python", pythonVersion);
    generateKeyLogger.logDebug("pip", pipVersion);

    const sofewareNeeds: string[] = [];
    if (!gitVersion) {
      sofewareNeeds.push("git");
    }
    if (!pythonVersion) {
      sofewareNeeds.push(getPythonCmd());
    }
    if (!pipVersion) {
      sofewareNeeds.push(`${getPythonCmd()}-pip`);
    }

    if (sofewareNeeds.length > 0) {
      generateKeyLogger.emitWithLog("Install Softwares");

      await sudoExec(
      `apt-get update
      apt-get install ${sofewareNeeds.join(' ')} -y
      `);

      generateKeyLogger.logDebug("Softwares Installed");
    }

    generateKeyLogger.logInfo("VC_KEYGEN_TEMP", process.env.VC_KEYGEN_TEMP);

    const runFilename = "./deposit.sh"
    const hasRuntimeExits = await isFileExists(path.join(process.env.VC_KEYGEN_TEMP, runFilename));

    if(!hasRuntimeExits) {
      // download git & run python 3
      generateKeyLogger.emitWithLog("Clone Git");
  
      await fs.mkdir(process.env.VC_KEYGEN_TEMP, { recursive: true });
      await basicExec("git", [
        "clone",
        "https://github.com/jibchain-net/deposit-cli.git",
        process.env.VC_KEYGEN_TEMP,
      ]);

      generateKeyLogger.emitWithLog("Install Python Dependency");

      await basicExec("pip3", [
        "install",
        "-r",
        "requirements.txt",
      ], {
        cwd: process.env.VC_KEYGEN_TEMP,
      });

      await basicExec("pip3", [
        "install",
        ".",
      ], {
        cwd: process.env.VC_KEYGEN_TEMP,
      });

      generateKeyLogger.logDebug("Script Installed");
    } else {
      generateKeyLogger.logDebug("Use Cached Script");
    }
    
    generateKeyLogger.emitWithLog("Generate Keys");

    // Clear old generated file
    const keysPath = path.join(process.env.VC_KEYGEN_TEMP, ".keys");
    try {
      await fs.rm(keysPath, {
        recursive: true,
        force: true,
      });
    } catch(err) {

    }
    await fs.mkdir(keysPath, { recursive: true });
  
    const genKey = new Promise<GenerateKeyResponse>((resolve, reject) => {
      const genKeyProcess = spawnProcess(runFilename, [
        "--non_interactive",
        "new-mnemonic",
        `--num_validators=${qty}`,
        "--mnemonic_language=english",
        "--chain=jib",
        `--eth1_withdrawal_address=${withdrawAddress}`,
        `--keystore_password=${keyPassword}`,
        "--folder=.keys",
      ], {
        cwd: process.env.VC_KEYGEN_TEMP,
        timeout: 60 * 60 * 1000,
      })

      let step = 1;
      let out = "";
      let mnemonic = "";

      genKeyProcess.stdout.on("data", (data) => {
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
        }
      })

      genKeyProcess.stderr.on("data", (data) => {
        console.log(data.toString());
      })

      genKeyProcess.on("exit", async (code, signal) => {
        if (code === 0) {
          generateKeyLogger.logDebug("Read Keys");
          
          // read content
          const exportPath = path.join(process.env.VC_KEYGEN_TEMP, ".keys/validator_keys");
          const files = await fs.readdir(exportPath);
          const contents = {};
          for (const file of files) {
            const str = (await fs.readFile(path.join(exportPath, file))).toString();
            contents[file] = str;
          }
          resolve({ mnemonic, contents, exportPath });
        } else {
          reject(new Error(`Exit code:${code}`));
        }
      })

      genKeyProcess.on("error", reject);
    });

    const result = await genKey;
    generateKeyLogger.logSuccess("Key Files", Object.keys(result.contents));
    return result;
  } catch (err) {
    throw err;
  }
}