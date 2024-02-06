import { basicExec } from "./exec";
import { readProgramConfig } from "./fs";
import { getPythonCmd } from "./constant";

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

export async function checkPythonVersion(): Promise<string | undefined> {
  try {
    const { stdout } = await basicExec(getPythonCmd(), ["--version"]);

    const result = /^Python ([0-9\.]+)/.exec(stdout);
    if (result) {
      return result[1];
    } else {
      throw new Error("Not found");
    }
  } catch (err) {
    console.error(err);

    return undefined;
  }
}

// not used
// export async function checkPythonVenvExists(): Promise<boolean> {
//   try {
//     const venvPackageName = `${getPythonCmd()}-venv`;
//     const { stdout } = await basicExec("apt", ["list", "--installed", venvPackageName]);

//     if (stdout.includes(venvPackageName)) {
//       return true;
//     } else {
//       return false;
//     }
//   } catch (err) {
//     console.error(err);

//     return false;
//   }
// }


export async function checkPipVersion(): Promise<string | undefined> {
  try {
    const { stdout } = await basicExec("pip", ["--version"]);

    const result = /^pip ([0-9\.]+)/.exec(stdout);
    if (result) {
      return result[1];
    } else {
      throw new Error("Not found");
    }
  } catch (err) {
    console.error(err);

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