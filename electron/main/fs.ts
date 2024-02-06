import path from "node:path";
import fs from "node:fs/promises";
import { programConfigPath } from "./constant";

export async function isFileExists(pathlike:string) {
  try {
    await fs.access(pathlike);
    return true;
  } catch(err) {
    // no file detect
    return false;
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

export async function readProgramConfig() {
  try {
    const buffer = await fs.readFile(programConfigPath());
    return JSON.parse(buffer.toString()) as VcConfigData;
  } catch(err) {
    console.error(err);
    return {};
  }
}

export async function writeProgramConfig(configData: Partial<VcConfigData>, patching = false) {
  await fs.mkdir(process.env.VC_KEYS_PATH, { recursive: true });

  if(patching) {
    const oldConfig = await readProgramConfig();
    const newConfig = Object.assign(oldConfig, configData);
    
    await fs.writeFile(programConfigPath(), JSON.stringify(newConfig));
  } else {
    await fs.writeFile(programConfigPath(), JSON.stringify(configData));
  }
}

export async function getLighthouseApiData() {
  const config = await readProgramConfig();
  if(typeof config.apiPort === "undefined" || typeof config.apiToken === "undefined") {
    return undefined;
  }

  return {
    apiPort: config.apiPort,
    apiToken: config.apiToken
  };
}