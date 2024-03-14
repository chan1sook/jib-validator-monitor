import { basicExec } from "./exec";
import { readProgramConfig } from "./fs";
import { getOsStr } from "./constant";

export async function checkDockerVersion(): Promise<string | undefined> {
  try {
    const { stdout } = await basicExec("docker", ["-v"]);
    const result = /^Docker version ([0-9\.]+)/.exec(stdout);

    if (result) {
      return result[1];
    } else {
      throw new Error("Not found");
    }
  } catch (err) {
    return undefined;
  }
}

const dockerOsCmd : Record<string, string> = {
  'linux-ubuntu': `apt-get update
    apt-get install ca-certificates curl
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc
    echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
    tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  `,
  'linux-debian': `apt-get update
    apt-get install ca-certificates curl
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  `
}
export async function getDockerInstallCmd() : Promise<string> {
  const os = await getOsStr();
  return dockerOsCmd[os] || dockerOsCmd['linux-debian']
} 

export async function checkCurlVersion(): Promise<string | undefined> {
  try {
    const { stdout } = await basicExec("curl", ["-V"]);
    const result = /^curl ([0-9\.]+)/.exec(stdout);

    if (result) {
      return result[1];
    } else {
      throw new Error("Not found");
    }
  } catch (err) {
    return undefined;
  }
}

export async function checkTarVersion(): Promise<string | undefined> {
  try {
    const { stdout } = await basicExec("tar", ["--version"]);
    
    const result = /^tar \(GNU tar\) ([0-9\.]+)/.exec(stdout);

    if (result) {
      return result[1];
    } else {
      throw new Error("Not found");
    }
  } catch (err) {
    return undefined;
  }
}

export async function checkGitVersion(): Promise<string | undefined> {
  try {
    const { stdout } = await basicExec("git", ["--version"]);
    const result = /^git version (.+)/.exec(stdout);

    if (result) {
      return result[1];
    } else {
      throw new Error("Not found");
    }
  } catch (err) {
    return undefined;
  }
}

export async function checkVcInstalled() {
  try {
    const config = await readProgramConfig();
    return typeof config.apiPort !== "undefined" && typeof config.apiToken !== "undefined";
  } catch (err) {
    return false;
  }
}

export async function checkSirenInstalled() {
  try {
    const config = await readProgramConfig();
    return typeof config.sirenPort !== "undefined";
  } catch (err) {
    return false;
  }
}