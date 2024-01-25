import Event from "node:events";
import "colors";

import { checkGitVersion, checkPipVersion, checkPythonVersion } from "./check-software";
import { basicExec, getPythonCmd, sudoExec } from "./cmd-utils";
import { spawn } from "node:child_process";
import { join } from "node:path";
import fs from "node:fs/promises";

export const generateKeysStatusEvent = new Event();

let cancel = false;

async function awaitOrCancel<T>(a: Promise<T>) {
  let innerCancel = false;

  const result = await Promise.race([
    a,
    new Promise<never>((resolve, reject) => {
      while(cancel || innerCancel) {
        reject(new Error("User Cancel"));
      }
    })
  ]);

  innerCancel= true;

  return result;
}
export async function generateKeys(qty: number, withdrawAddress: string, keyPassword: string) {
  try {
    console.log("[generateKeys]".blue, "Check git");

    // check git
    const gitVersion = await awaitOrCancel(checkGitVersion());
    const pythonVersion = await awaitOrCancel(checkPythonVersion());
    const pipVersion = await awaitOrCancel(checkPipVersion());
    console.log("[generateKeys]".blue, "Git", gitVersion);
    console.log("[generateKeys]".blue, "Python", pythonVersion);
    console.log("[generateKeys]".blue, "pip", pipVersion);

    const sofewareNeeds: string[] = [];
    if (!gitVersion) {
      sofewareNeeds.push("git");
    }
    if (!pythonVersion) {
      sofewareNeeds.push(getPythonCmd());
    }
    if (!pipVersion) {
      sofewareNeeds.push("python3-pip");
    }

    generateKeysStatusEvent.emit("status", "Check Softwares")

    if (sofewareNeeds.length > 0) {
      console.log("[generateKeys]".blue, "Install Softwares");
      generateKeysStatusEvent.emit("status", "Install Softwares")

      await awaitOrCancel(sudoExec(`apt-get install ${sofewareNeeds.join(' ')} -y`));
      console.log("[generateKeys]".blue, "Softwares Installed");
    }

    // download git & run python 3
    generateKeysStatusEvent.emit("status", "Clone Git")
    console.log("[generateKeys]".blue, "Clone Git");
    console.log("[VCKEYGEN_PATH]".magenta, process.env.VCKEYGEN_PATH);

    await awaitOrCancel(fs.rm(process.env.VCKEYGEN_PATH, {
      recursive: true,
      force: true,
    }));
    await awaitOrCancel(fs.mkdir(process.env.VCKEYGEN_PATH, { recursive: true, mode: "777" }));
    await awaitOrCancel(basicExec("git", [
      "clone",
      "https://github.com/jibchain-net/deposit-cli.git",
      ".",
    ], {
      cwd: process.env.VCKEYGEN_PATH,
    }));

    generateKeysStatusEvent.emit("status", "Install Python Dependency")
    console.log("[generateKeys]".blue, "Install Python Dependency");
    await awaitOrCancel(basicExec("pip3", [
      "install",
      "-r",
      "requirements.txt",
    ], {
      cwd: process.env.VCKEYGEN_PATH,
    }));
    await awaitOrCancel(basicExec("pip3", [
      "install",
      ".",
    ], {
      cwd: process.env.VCKEYGEN_PATH,
    }));

    generateKeysStatusEvent.emit("status", "Generate Keys")
    console.log("[generateKeys]".blue, "Generate Keys");
    const keysPath = join(process.env.VCKEYGEN_PATH, ".keys");
    await fs.mkdir(keysPath, { recursive: true });

    const genKey = new Promise<GenerateKeyResponse>((resolve, reject) => {
      const genKeyProcess = spawn("./deposit.sh", [
        "--non_interactive",
        "new-mnemonic",
        `--num_validators=${qty}`,
        '--mnemonic_language=english',
        '--chain=jib',
        `--eth1_withdrawal_address=${withdrawAddress}`,
        `--keystore_password=${keyPassword}`,
        '--folder=.keys',
      ], {
        cwd: process.env.VCKEYGEN_PATH,
        timeout: 5 * 60 * 1000,
      })

      let step = 1;
      let out = "";
      let mnemonic = "";

      genKeyProcess.stdout.on("data", (data) => {
        out += data.toString();
        // console.log(`${step}`.red, out);

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

          console.log("[mnemonic]".red, mnemonic);

          out = "";
          genKeyProcess.stdin.write(`${mnemonic}\n`);
          step += 1;
        }
      })

      genKeyProcess.stderr.on("data", (data) => {
        console.log(data.toString());
      })

      genKeyProcess.on("exit", async (code, signal) => {
        if(code === 0) {
          console.log("[generateKeys]".blue, "Finalize");
          // next det files paths
          const exportPath = join(process.env.VCKEYGEN_PATH, ".keys", "validator_keys");
          const files = await fs.readdir(exportPath);
          const contents = {};
          for (const file of files) {
            const str = (await fs.readFile(join(exportPath, file))).toString();
            contents[file] = str;
          }
          resolve({ mnemonic, contents, exportPath });
        } else {
          reject(new Error(`exit code:${code}`));
        }
      })

      genKeyProcess.on("error", reject)
    });
    // process.env.TEMP_PATH
    return await awaitOrCancel(genKey);
  } catch (err) {
    throw err;
  }
}

export function cancelGenerateKeys() {
  cancel = true;
}