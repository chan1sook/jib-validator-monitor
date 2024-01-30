import path from "node:path";
import fs from "node:fs/promises";
import { sudoExec } from "./utils";

export async function readKeyFiles(filePaths: string[]) {
  const contents : Record<string, string> = {};
  for(const file of filePaths) {
    try {
      const str = (await fs.readFile(path.join(file))).toString();
      contents[file] = str;
    } catch(err) {
      console.error(err);
    }
  }

  return contents;
}

export async function getLighthouseApiToken() {
  try {
    const apiKeyPath = path.join(process.env.VC_KEYS_PATH, "vc-mount/custom/validators/api-token.txt");
    const { stdout } = await sudoExec(`cat "${apiKeyPath}"`);

    return stdout;
  } catch (err) {
    console.error(err);

    return undefined;
  }
}