import Event from "node:events";
import "colors";

import { checkDockerVersion, checkGitVersion, } from "./check-software";
import { basicExec, getLighhouseDownloadUrl, sudoExec, validatorConfigPath } from "./utils";
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs/promises";
import stringReplaceAll from 'string-replace-all';
import { getLighthouseApiToken } from "./manage-keys";
export const deployValidatorsStatusEvent = new Event();

export async function deployValidators(keyFileContent: Record<string, string>,
  machinePublicIp: string,
  feeRecipientAddress: string,
  keyPassword: string,
  advanceSetting: DeployKeyAdvanceSetting,
) {
  try {
    console.log("[deployValidators]".blue, "Check Softwares");
    deployValidatorsStatusEvent.emit("status", "Check Softwares")

    // check softwares
    const [dockerVersion, gitVersion] = await Promise.all([
      checkDockerVersion(),
      checkGitVersion(),
    ])

    console.log("[deployValidators]".blue, "Docker", dockerVersion);
    console.log("[deployValidators]".blue, "Git", gitVersion);

    if (!dockerVersion || !gitVersion) {
      let cmd = "";

      if (!dockerVersion) {
        cmd += // Add Docker's official GPG key:
          `apt-get update
        apt-get install ca-certificates curl gnupg -y
        install -m 0755 -d /etc/apt/keyrings
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor --yes -o /etc/apt/keyrings/docker.gpg
        chmod a+r /etc/apt/keyrings/docker.gpg
        ` +
          // Add the repository to Apt sources:
          `echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
        $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
        tee /etc/apt/sources.list.d/docker.list > /dev/null
        apt-get update
        apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin -y
        `;
      }

      if (!gitVersion) {
        cmd += `apt-get update
        apt-get install git -y
        `;
      }

      console.log("[deployValidators]".blue, "Install Softwares");
      deployValidatorsStatusEvent.emit("status", "Install Softwares")

      await sudoExec(cmd);
      console.log("[deployValidators]".blue, "Softwares Installed");
    }

    // download git
    deployValidatorsStatusEvent.emit("status", "Clone Jibchain Script Git")
    console.log("[deployValidators]".blue, "Clone Jibchain Script Git");
    console.log("[VC_INSTALL_TEMP]".magenta, process.env.VC_INSTALL_TEMP);
    console.log("[VC_KEYS_PATH]".magenta, process.env.VC_KEYS_PATH);

    try {
      await fs.rm(process.env.VC_INSTALL_TEMP, {
        recursive: true,
        force: true,
      });
    } catch (err) {

    }
    await fs.mkdir(process.env.VC_INSTALL_TEMP, { recursive: true });
    await basicExec("git", [
      "clone",
      "https://github.com/jibchain-net/node.git",
      process.env.VC_INSTALL_TEMP,
    ]);

    // download git
    deployValidatorsStatusEvent.emit("status", "Download Lighthouse")
    console.log("[deployValidators]".blue, "Download Lighthouse");
    // Create files
    await basicExec("curl", [
      "-L",
      getLighhouseDownloadUrl(),
      "-o",
      "lighthouse.tar.gz",
    ], {
      cwd: process.env.VC_INSTALL_TEMP,
    });

    await basicExec("tar", [
      "-xvf",
      "lighthouse.tar.gz",
    ], {
      cwd: process.env.VC_INSTALL_TEMP,
    });

    // Create files
    deployValidatorsStatusEvent.emit("status", "Create Files")
    console.log("[deployValidators]".blue, "Create Files");

    const tempKeyPath = path.join(process.env.VC_INSTALL_TEMP, "keys");
    await fs.mkdir(tempKeyPath, { recursive: true });

    for (const fileKey of Object.keys(keyFileContent)) {
      const fileNameTokens = fileKey.split("/")
      const fileName = fileNameTokens[fileNameTokens.length - 1];
      const content = keyFileContent[fileKey];

      await fs.writeFile(path.join(tempKeyPath, fileName), content);
    }

    // replacement of `make env`
    const envContent = `## BOOTNODE Configuration\n` +
      `NETWORK_ID=8899\n` +
      `TARGET_PEERS=100\n` +
      `NODE_PUBLIC_IP="${machinePublicIp}"\n` +
      `\n## VALIDATOR Configuration\n` +
      `NODE_GRAFFITI="${advanceSetting.graffiti.replace(/\"/g, "_") || 'JBCValidatorClient'}"\n` +
      `PUBLIC_BEACON_NODE="https://metrabyte-cl.jibchain.net/"\n` +
      `FEE_RECIPIENT="${feeRecipientAddress}"\n`;

    await fs.writeFile(path.join(process.env.VC_KEYS_PATH, ".env"), envContent);

    // Rewrite docker compose
    const vcKeyExportPath = path.join(process.env.VC_KEYS_PATH, "vc");
    const vcKeyMountPath = path.join(process.env.VC_KEYS_PATH, "vc-mount");
    const configExportPath = path.join(process.env.VC_KEYS_PATH, "config");
    const composeContent = `version: "3.8"\n` +
      `services:\n` +
      `  jbc-validator:\n` +
      `    container_name: jbc-validator\n` +
      `    image: sigp/lighthouse\n` +
      `    user: root\n` +
      `    restart: unless-stopped\n` +
      `    ports:\n` +
      `      - ${advanceSetting.exposeLighhouseApiPort || 5062}:5062\n` +
      `    volumes:\n` +
      `      - ${vcKeyMountPath}:/root/.lighthouse/\n` +
      `      - ${configExportPath}:/config\n` +
      `    command:\n` +
      `      - lighthouse\n` +
      `      - vc\n` +
      `      - --beacon-nodes=\${PUBLIC_BEACON_NODE}\n` +
      `      - --testnet-dir=/config\n` +
      `      - --init-slashing-protection\n` +
      `      - --graffiti=\${NODE_GRAFFITI}\n` +
      `      - --suggested-fee-recipient=\${FEE_RECIPIENT}\n` +
      `      - --debug-level=info\n` +
      `      - --http\n` +
      `      - --http-address=0.0.0.0\n`+
      `      - --unencrypted-http-transport\n`;
    await fs.writeFile(validatorConfigPath(), composeContent);

    // Import key
    deployValidatorsStatusEvent.emit("status", "Import Keys")
    console.log("[deployValidators]".blue, "Import Keys");

    // do on temp path
    const importKey = new Promise<DeployKeyResult>((resolve, reject) => {
      const genKeyProcess = spawn("./lighthouse", [
        "account",
        "validator",
        "import",
        "--directory",
        "keys",
        "--testnet-dir",
        "config",
        "--datadir",
        vcKeyExportPath,
        "--reuse-password",
        "--stdin-inputs"
      ], {
        cwd: process.env.VC_INSTALL_TEMP,
        timeout: 60 * 60 * 1000,
      })

      let step = 1;
      let out = "";

      // lighthouse account imnport out as stderr
      genKeyProcess.stderr.on("data", (data) => {
        out += data.toString();
        // console.log(`${step}`.red, out);

        if (step === 1 && out.includes("Enter the keystore password, or press enter to omit it:")) {
          out = "";
          genKeyProcess.stdin.write(`${keyPassword}\n\n`);
          step += 1;
        }
      })

      genKeyProcess.on("exit", async (code, signal) => {
        if (code === 0) {
          const importResult: DeployKeyResult = {
            imported: undefined,
            skipped: undefined,
            apiToken: undefined,
          }
          const captureOutText = /Successfully imported ([0-9]+) validators? \(([0-9]+) skipped\)\./.exec(out);
          if (captureOutText) {
            importResult.imported = parseInt(captureOutText[1], 10);
            importResult.skipped = parseInt(captureOutText[2], 10);
          }

          resolve(importResult);
        } else {
          reject(new Error(`exit code:${code}`));
        }
      })

      genKeyProcess.on("error", reject)
    });
    const importedResult = await importKey;

    console.log("[Import Keys]".green, importedResult);

    // fix deploy issue when use docker
    // change path inside validator_definitions.yml
    const vcDefsFilePath = path.join(vcKeyExportPath, "/validators/validator_definitions.yml");
    const vcDefsContentBuffer = await fs.readFile(vcDefsFilePath);
    const vcDefsContentStr = vcDefsContentBuffer.toString();

    const newVcDefsContentStr = stringReplaceAll(vcDefsContentStr, vcKeyExportPath, "/root/.lighthouse/custom");

    await fs.writeFile(vcDefsFilePath, newVcDefsContentStr);

    // Finally Deploy Docker (Yay!)
    deployValidatorsStatusEvent.emit("status", "Deploy docker")
    console.log("[deployValidators]".blue, "Deploy docker");

    const vcKeysCopyTargetPath = path.join(vcKeyMountPath, "custom");

    await sudoExec(`docker compose -f "${validatorConfigPath()}" down
    cp -rf "${path.join(process.env.VC_INSTALL_TEMP, "config")}" "${process.env.VC_KEYS_PATH}"
    mkdir -p "${vcKeysCopyTargetPath}"
    cp -rf ${vcKeyExportPath}/* "${vcKeysCopyTargetPath}"
    docker compose -f "${validatorConfigPath()}" up -d
    `);

    deployValidatorsStatusEvent.emit("status", "Get API Token");
    console.log("[deployValidators]".blue, "Get API Token");

    importedResult.apiToken = await getLighthouseApiToken();
    console.log("[API Token]".green, importedResult.apiToken );

    return importedResult;
  } catch (err) {
    throw err;
  }
}