import { basicExec } from "./exec";
import { readProgramConfig } from "./fs";

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