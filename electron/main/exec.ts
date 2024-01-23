import { execFile as _execFile } from "node:child_process";
import path from "node:path";
import util from "node:util";
import fs from "node:fs/promises";

const exec = util.promisify(_execFile);

function getPythonExec() {
  return process.platform === "win32" ? "python" : "python3";
}

export async function checkExistsValidatorKeys() {
  try {
    await fs.mkdir(process.env.VALIDATOR_KEY_PATH, { recursive: true });
    const files = await fs.readdir(process.env.VALIDATOR_KEY_PATH);

    const vKeys: string[] = [];
    for (const file of files) {
      const stats = await fs.stat(
        path.join(process.env.VALIDATOR_KEY_PATH, file)
      );
      if (stats.isFile() && file.startsWith("keystore-m")) {
        vKeys.push(file);
      }
    }

    // next check ....
    return vKeys;
  } catch (err) {
    console.error(err);
    return [];
  }
}

export async function checkDockerVersion(): Promise<string | undefined> {
  try {
    const { stdout } = await exec("docker", ["-v"]);
    const result = /^Docker version ([0-9\.]+)/.exec(stdout);

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
