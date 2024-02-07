import path from "node:path";

//##### config
export function programConfigPath() {
  return path.join(process.env.VC_KEYS_PATH, "config.json");
}

//##### keygen
export function getJbcDepositKeygenUrl() {
  return "https://github.com/chan1sook/jbc-deposit-cli/releases/download/1.0.0/deposit";
}

export function getLocalJbcDepositKeygenPath() {
  return path.join(process.env.JBC_KEYGEN_EXEC_PATH, "deposit");
}

//##### lighthouse
export function getLighhouseDownloadUrl() {
  if (!['x64', 'arm64'].includes(process.arch)) {
    throw new Error("Platform not support")
  }

  return process.arch === 'arm64' ? "https://github.com/sigp/lighthouse/releases/download/v4.6.0/lighthouse-v4.6.0-aarch64-unknown-linux-gnu-portable.tar.gz" :
        "https://github.com/sigp/lighthouse/releases/download/v4.6.0/lighthouse-v4.6.0-x86_64-unknown-linux-gnu-portable.tar.gz";
}

export function getLocalLighthousePath() {
  return path.join(process.env.LIGHTHOUSE_EXEC_PATH, "lighthouse");
}

//##### vc
export function validatorDockerComposeGroup() {
  return "jbc-validator"
}

export function validatorDockerComposePath() {
  return path.join(process.env.VC_KEYS_PATH, "validator2.yaml");
}

//##### siren
export function jbcSirenDockerComposeGroup() {
  return "jbc-siren"
}

export function getJbcSirenDownloadUrl() {
  return "https://github.com/chan1sook/jbc-siren/releases/download/1.0.0/jbc-siren.tar";
}

export function jbcSirenDockerComposePath() {
  return path.join(process.env.VC_KEYS_PATH, "jbc-siren.yaml");
}

export function getLocalJbcSirenDockerImagePath() {
  return path.join(process.env.JBC_SIREN_TEMP, "jbc-siren.tar");
}