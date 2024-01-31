import path from "node:path";
import fs from "node:fs/promises";

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

export async function getLighthouseApiData() {
  try {
    const buffer = await fs.readFile( path.join(process.env.VC_KEYS_PATH, "lighthouse-api-info.json"))
    return JSON.parse(buffer.toString()) as LighhouseApiData;
  } catch (err) {
    console.error(err);
    return undefined;
  }
}