/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface Window {
  // expose in the `electron/preload/index.ts`
  ipcRenderer: import('electron').IpcRenderer
}

interface ValidatorsInfoResponse {
  installed: boolean
  running?: boolean,
  apiKey?: string | undefined
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

interface DeployKeyResult {
  imported: number | undefined
  skipped: number | undefined
  apiToken: string | undefined
}