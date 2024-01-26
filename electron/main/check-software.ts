import { basicExec } from "./cmd-utils";

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
    const { stdout } = await basicExec("python3", ["--version"]);

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
