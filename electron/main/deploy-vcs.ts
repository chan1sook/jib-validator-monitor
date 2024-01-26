import Event from "node:events";
import "colors";

import { checkDockerVersion, } from "./check-software";
import { basicExec, getPythonCmd, sudoExec } from "./cmd-utils";
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs/promises";

export const deployValidatorsStatusEvent = new Event();

export async function deployValidators() {
  try {
    console.log("[deployValidators]".blue, "Check Softwares");
    deployValidatorsStatusEvent.emit("status", "Check Softwares")

    // check softwares
    const dockerVersion = await checkDockerVersion();
    console.log("[deployValidators]".blue, "Docker", dockerVersion);

    if (!dockerVersion) {
      console.log("[deployValidators]".blue, "Install Docker");
      deployValidatorsStatusEvent.emit("status", "Install Docker")

      const cmd = 
      // Add Docker's official GPG key:
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

      await sudoExec(cmd);
      console.log("[deployValidators]".blue, "Softwares Installed");
    }

    // next ...
  } catch (err) {
    throw err;
  }
}