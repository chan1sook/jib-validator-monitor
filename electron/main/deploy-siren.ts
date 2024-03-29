import Event from "node:events";

import { checkDockerVersion, checkGitVersion, } from "./check-software";
import { getJbcSirenDownloadUrl, getJbcSirenSha256Checksum, getLocalJbcSirenDockerImagePath, isOverrideCheckFiles, jbcSirenDockerComposeGroup, jbcSirenDockerComposePath } from "./constant";
import { basicExec, sudoExec } from "./exec";
import fs from "node:fs/promises";
import { getCustomLogger } from "./logger";
import { calculateHash, isFileValid, writeProgramConfig } from "./fs";

export const deployJbcSirenStatusEvent = new Event();

const deployJbcSirenLogger = getCustomLogger("deployJbcSiren", deployJbcSirenStatusEvent);

export async function deployJbcSiren(sirenPort: string) {
  try {
    deployJbcSirenLogger.emitWithLog("Check Softwares");

    // check softwares
    const [dockerVersion, gitVersion] = await Promise.all([
      checkDockerVersion(),
      checkGitVersion(),
    ])

    deployJbcSirenLogger.logDebug("Docker", dockerVersion);
    deployJbcSirenLogger.logDebug("Git", gitVersion);

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

      deployJbcSirenLogger.emitWithLog("Install Softwares");

      deployJbcSirenLogger.injectExecTerminalLogs(
        await sudoExec(cmd)
      );

      deployJbcSirenLogger.logDebug("Softwares Installed");
    };

    const sirenImagePath = getLocalJbcSirenDockerImagePath();
    const isSirenImageValid = !isOverrideCheckFiles() && 
      await isFileValid(sirenImagePath, getJbcSirenSha256Checksum());

    if(!isSirenImageValid) {
      try {
        await fs.rm(process.env.JBC_SIREN_TEMP, {
          recursive: true,
          force: true,
        });
      } catch (err) {
  
      }
    
      await fs.mkdir(process.env.JBC_SIREN_TEMP, { recursive: true });

      deployJbcSirenLogger.emitWithLog("Download Image");

      // Create files
      deployJbcSirenLogger.injectExecTerminalLogs(
        await basicExec("curl", [
          "-L",
          getJbcSirenDownloadUrl(),
          "-o",
          "jbc-siren.tar",
        ], {
          cwd: process.env.JBC_SIREN_TEMP,
        }),
      );

      deployJbcSirenLogger.logDebug("Image Downloaded");

      deployJbcSirenLogger.logDebug("sha256", await calculateHash(sirenImagePath));
    } else {
      deployJbcSirenLogger.logDebug("Use Cached File");
    }

    // deploy docker (Yay!)
    deployJbcSirenLogger.emitWithLog("Deploy Docker");

    let _sirenPort = parseInt(sirenPort, 10);
    if(!Number.isInteger(_sirenPort) || _sirenPort <= 1024) {
      _sirenPort = 8080;
    }

    const composePath = jbcSirenDockerComposePath();
    const composeContent = `version: "3.8"\n` +
      `services:\n` +
      `  jbc-siren:\n` +
      `    container_name: jbc-siren\n` +
      `    image: jbc-siren\n` +
      `    user: root\n` +
      `    restart: unless-stopped\n` +
      `    logging:\n` +
      `      driver: "json-file"\n` +
      `      options:\n` +
      `        max-size: "50m"\n` +
      `    ports:\n` +
      `      - ${_sirenPort}:80\n`;
    await fs.writeFile(composePath, composeContent);

    const dockerComposeProjectGroup = jbcSirenDockerComposeGroup();
    const installDockerScript = `docker compose -p "${dockerComposeProjectGroup}" -f "${composePath}" down
    docker container rm -f jbc-siren
    docker image rm -f jbc-siren
    docker load -i "${getLocalJbcSirenDockerImagePath()}"
    docker compose -p "${dockerComposeProjectGroup}" -f "${composePath}" up -d
    `;

    deployJbcSirenLogger.injectExecTerminalLogs(
      await sudoExec(installDockerScript)
    );

    const deployResult = {
      sirenPort: _sirenPort,
    }
    await writeProgramConfig(deployResult, true);

    deployJbcSirenLogger.logSuccess("JBC Siren Deployed", deployResult);

    return deployResult;
  } catch (err) {
    throw err;
  }
}