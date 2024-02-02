import Event from "node:events";
import "colors";

import { checkGitVersion, } from "./check-software";
import { basicExec, getLighhouseDownloadUrl, sudoExec } from "./utils";
import path from "node:path";
import fs from "node:fs/promises";

export const exitValidatorsStatusEvent = new Event();

// TODO work here
export async function vcExit(keyFileContent: Record<string, string>,
  keyPassword: string,
) {
  try {
    console.log("[exitValidator]".blue, "Check Softwares");
    exitValidatorsStatusEvent.emit("status", "Check Softwares")

    // check softwares
    const [gitVersion] = await Promise.all([
      checkGitVersion(),
    ])

    console.log("[deployValidators]".blue, "Git", gitVersion);

    if (!gitVersion) {
      let cmd = "";
      if (!gitVersion) {
        cmd += `apt-get update
        apt-get install git -y
        `;
      }

      console.log("[exitValidator]".blue, "Install Softwares");
      exitValidatorsStatusEvent.emit("status", "Install Softwares")

      await sudoExec(cmd);
      console.log("[exitValidator]".blue, "Softwares Installed");
    }

    // download git
    exitValidatorsStatusEvent.emit("status", "Clone Jibchain Script Git")
    console.log("[exitValidator]".blue, "Clone Jibchain Script Git");
    console.log("[VC_EXIT_TEMP]".magenta, process.env.VC_EXIT_TEMP);

    
    try {
      await fs.rm(process.env.VC_EXIT_TEMP, {
        recursive: true,
        force: true,
      });
    } catch (err) {

    }
    await fs.mkdir(process.env.VC_EXIT_TEMP, { recursive: true });

    await basicExec("git", [
      "clone",
      "https://github.com/jibchain-net/node.git",
      process.env.VC_EXIT_TEMP,
    ]);

    // download git
    exitValidatorsStatusEvent.emit("status", "Download Lighthouse")
    console.log("[exitValidator]".blue, "Download Lighthouse");

    // Create files
    await basicExec("curl", [
      "-L",
      getLighhouseDownloadUrl(),
      "-o",
      "lighthouse.tar.gz",
    ], {
      cwd: process.env.VC_EXIT_TEMP,
    });

    await basicExec("tar", [
      "-xvf",
      "lighthouse.tar.gz",
    ], {
      cwd: process.env.VC_EXIT_TEMP,
    });

    // Create files
    exitValidatorsStatusEvent.emit("status", "Create Files")
    console.log("[exitValidator]".blue, "Create Files");

    const tempKeyPath = path.join(process.env.VC_EXIT_TEMP, "keys");
    await fs.mkdir(tempKeyPath, { recursive: true });

    const fullKeyPaths = [];
    for (const fileKey of Object.keys(keyFileContent)) {
      const fileNameTokens = fileKey.split("/")
      const fileName = fileNameTokens[fileNameTokens.length - 1];
      const content = keyFileContent[fileKey];

      const filePath = path.join(tempKeyPath, fileName);
      fullKeyPaths.push(filePath);

      await fs.writeFile(filePath, content);
    }

    // TODO run lighthouse account exit
    // ./lighthouse account validator exit

    for(const file of fullKeyPaths) {
    // const genKeyProcess = spawn("./lighthouse", [
    //     "account",
    //     "validator",
    //     "exit",
    //     "--keystore",
    //     `${file}`,
    //     "--testnet-dir",
    //     "config",
    //     "--beacon-node",
    //     "https://metrabyte-cl.jibchain.net/,
    //     "--stdin-inputs"
    //   ], {
    //     cwd: process.env.VC_EXIT_TEMP,
    //     timeout: 60 * 60 * 1000,
    //   })

    //   let step = 1;
    //   let out = "";

    //   // lighthouse account imnport out as stderr
    //   genKeyProcess.stderr.on("data", (data) => {
    //     out += data.toString();
    //     // console.log(`${step}`.red, out);

    //     if (step === 1 && out.includes("Enter the keystore password, or press enter to omit it:")) {
    //       out = "";
    //       genKeyProcess.stdin.write(`${keyPassword}\n\n`);
    //       step += 1;
    //     }
    //   })

    //   genKeyProcess.on("exit", async (code, signal) => {
    //     if (code === 0) {
    //       const importResult: DeployKeyResult = {
    //         imported: undefined,
    //         skipped: undefined,
    //         apiToken: undefined,
    //       }
    //       const captureOutText = /Successfully imported ([0-9]+) validators? \(([0-9]+) skipped\)\./.exec(out);
    //       if (captureOutText) {
    //         importResult.imported = parseInt(captureOutText[1], 10);
    //         importResult.skipped = parseInt(captureOutText[2], 10);
    //       }

    //       resolve(importResult);
    //     } else {
    //       reject(new Error(`exit code:${code}`));
    //     }
    //   })

    //   genKeyProcess.on("error", reject)
    // });
      
    }

    // return;
  } catch (err) {
    throw err;
  }
}