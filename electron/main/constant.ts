import path from "node:path";

export function isOverrideCheckFiles() {
  return typeof process.env.OVERRIDE_CHECK_FILES !== "undefined"
}

//##### config
export function programConfigPath() {
  return path.join(process.env.VC_KEYS_PATH, "config.json");
}

//##### keygen
const keygenFileMap : DownloadFileInfoMap = {
  'x64': {
    url: "https://github.com/chan1sook/jbc-deposit-cli/releases/download/1.0.0/deposit_amd64_x64",
    sha256: "3fdeb6d8db3aa465345dd33cbd50afd25b23228518566ced4067c03a4f43b2e0",
    location: "deposit"
  },

  'arm64': {
    url: "https://github.com/chan1sook/jbc-deposit-cli/releases/download/1.0.0/deposit_arm64_rpi",
    sha256: "65261815d4319299c3567f90b5664b424a35b7cab56dd301c6cf6948972e26e2",
    location: "deposit"
  },
}

export function getJbcDepositKeygenUrl() {
  const keygenFileInfo = keygenFileMap[process.arch]
  if (!keygenFileInfo) {
    throw new Error("Platform not support")
  }

  return keygenFileInfo.url;
}

export function getJbcDepositSha256Checksum() {
  const keygenFileInfo = keygenFileMap[process.arch]
  if (!keygenFileInfo) {
    throw new Error("Platform not support")
  }

  return keygenFileInfo.sha256;
}

export function getLocalJbcDepositKeygenPath() {
  const keygenFileInfo = keygenFileMap[process.arch]
  if (!keygenFileInfo) {
    throw new Error("Platform not support")
  }

  return path.join(process.env.JBC_KEYGEN_EXEC_PATH, keygenFileInfo.location);
}

//##### chain configlocation: "staking_deposit-cli-fdab65d-linux-amd64/deposit"
export function getChainConfigGitUrl() {
  return "https://github.com/jibchain-net/node.git";
}

export function getChainConfigGitSha256Checksum() {
  return "f2687cd88a0a2089cef1a9f474cfc0fd23125bfb557d45032d9e7777474249ca"
}

export function getChainConfigPath() {
  return path.join(process.env.VC_DEPLOY_TEMP, "config/config.yaml");
}

export function getChainConfigDir() {
  return path.dirname(getChainConfigPath());
}


//##### lighthouse
const lhFileMap : DownloadFileInfoMap = {
  'x64': {
    url: "https://github.com/sigp/lighthouse/releases/download/v5.1.0/lighthouse-v5.1.0-x86_64-unknown-linux-gnu-portable.tar.gz",
    sha256: "6cea0139ed2573e7d695f1df70d5770c448e164a7411ec2eef898cdeb033b8d4",
    location: "lighthouse"
  },
  'arm64': {
    url: "https://github.com/sigp/lighthouse/releases/download/v5.1.0/lighthouse-v5.1.0-aarch64-unknown-linux-gnu-portable.tar.gz",
    sha256: "cc166282f2d101563235a369216019b84b17a2049ab95158a3f2ac257c6705df",
    location: "lighthouse"
  }
}

export function getLighhouseDownloadUrl() {
  const lhFileInfo = lhFileMap[process.arch]
  if (!lhFileInfo) {
    throw new Error("Platform not support")
  }

  return lhFileInfo.url;
}

export function getLighhouseSha256Checksum() {
  const lhFileInfo = lhFileMap[process.arch]
  if (!lhFileInfo) {
    throw new Error("Platform not support")
  }

  return lhFileInfo.sha256;
}

export function getLocalLighthousePath() {
  const lhFileInfo = lhFileMap[process.arch]
  if (!lhFileInfo) {
    throw new Error("Platform not support")
  }

  return path.join(process.env.LIGHTHOUSE_EXEC_PATH, lhFileInfo.location);
}

//##### vc
export function validatorDockerComposeGroup() {
  return "jbc-validator"
}

export function validatorDockerComposePath() {
  return path.join(process.env.VC_KEYS_PATH, "validator2.yaml");
}


export function lighthouseImageTag() {
  return "sigp/lighthouse:v5.1.0"
}

//##### siren
export function jbcSirenDockerComposeGroup() {
  return "jbc-siren"
}

export function getJbcSirenDownloadUrl() {
  return "https://github.com/chan1sook/jbc-siren/releases/download/1.0.0/jbc-siren.tar";
}

export function getJbcSirenSha256Checksum() {
  return "7653ec495ce8359f6e14a38f1538a435105bc19519eea9399f7e3c4428c9f10c"
}

export function jbcSirenDockerComposePath() {
  return path.join(process.env.VC_KEYS_PATH, "jbc-siren.yaml");
}

export function getLocalJbcSirenDockerImagePath() {
  return path.join(process.env.JBC_SIREN_TEMP, "jbc-siren.tar");
}