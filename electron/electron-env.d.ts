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
    VC_KEY_PATH: string
  }
}

interface GenerateKeyResponse {
  mnemonic: string, exportPath: string, contents: Record<string, string>,
}