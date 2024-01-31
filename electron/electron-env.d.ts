/// <reference types="vite-plugin-electron/electron-env" />

declare namespace NodeJS {
  interface ProcessEnv {
    VSCODE_DEBUG?: 'true'
    DIST_ELECTRON: string
    DIST: string
    /** /dist/ or /public/ */
    VITE_PUBLIC: string
    /** extra paths */
    VC_KEYGEN_TEMP: string
    VC_INSTALL_TEMP: string
    VC_KEYS_PATH: string
  }
}

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

interface DeployKeyResult {
  imported: number | undefined
  skipped: number | undefined
  apiToken?: string
  apiPort?: number
}