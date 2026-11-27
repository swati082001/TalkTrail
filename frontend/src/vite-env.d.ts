/// <reference types="vite/client" />

// Types for import.meta.env. Values come from frontend/.env (local) or Render env vars (build time).
// They are baked into the public JS bundle, so never put secrets here.
interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_WS_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
