import path from "node:path";
import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import crypto from "node:crypto";
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

// Function to calculate the hash of a file using a specific algorithm
export function calculateHash(filePath:string, algorithm = "sha256") {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash(algorithm);
    const stream = createReadStream(filePath);

    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', (error) => reject(error));
  });
}

export async function isFileValid(pathlike:string, checksum:string) {
  if(!(await isFileExists(pathlike))) {
    return false;
  }
  return await calculateHash(pathlike) === checksum;
}

// ### read key file
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