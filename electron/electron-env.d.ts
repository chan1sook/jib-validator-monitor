/// <reference types="vite-plugin-electron/electron-env" />

declare namespace NodeJS {
  interface ProcessEnv {
    VSCODE_DEBUG?: 'true'
    DIST_ELECTRON: string
    DIST: string
    /** /dist/ or /public/ */
    VITE_PUBLIC: string
    /** extra paths */
    LIGHTHOUSE_EXEC_PATH: string
    JBC_KEYGEN_TEMP_PATH: string
    VC_DEPLOY_TEMP: string
    JBC_SIREN_TEMP: string
    VC_KEYS_PATH: string
    OVERRIDE_CHECK_FILES: undefined | string
  }
}

type DownloadFileInfoMap =  Record<string, {url:string,sha256:string,location:string}> 

interface ExecOutput {
  stdout: string,
  stderr: string,
}

type SudoExecSignature = (
  cmd: string,
  logCb: (input: ExecOutput) => void
) => Promise<ExecOutput>;

type SudoSpawnSignature = (
  command: string,
  args?: readonly string[],
  ...params: any
) => Promise<ExecOutput>;


interface GenerateKeyResponse {
  mnemonic: string
  exportPath: string
  contents: Record<string, string>
}

interface DeployKeyAdvanceSetting {
  graffiti: string
  exposeLighhouseApiPort: string
}

interface LighhouseApiData {
  apiToken: string
  apiPort: number
}

interface VcConfigData {
  apiToken?: string
  apiPort?: number
  sirenPort?: number
}

interface DeployKeyResult {
  imported: number | undefined
  skipped: number | undefined
  apiToken?: string
  apiPort?: number
}

interface ExitValidatorResult {
  currentEpoch: number | undefined
  exitEpoch: number | undefined
  withdrawableEpoch: number | undefined
  exitTs: number | undefined
}