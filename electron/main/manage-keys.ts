import path from "node:path";
import fs from "node:fs/promises";

export async function checkExistsValidatorKeys() {
  try {
    await fs.mkdir(process.env.VC_KEY_PATH, { recursive: true });
    const files = await fs.readdir(process.env.VC_KEY_PATH);

    const vKeys: string[] = [];
    for (const file of files) {
      const stats = await fs.stat(
        path.join(process.env.VC_KEY_PATH, file)
      );
      if (stats.isFile() && file.startsWith("keystore-m")) {
        vKeys.push(file);
      }
    }

    return vKeys;
  } catch (err) {
    console.error(err);
    return [];
  }
}

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