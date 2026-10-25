declare module 'veaury/vite/index.js' {
  import type { Plugin } from 'vite'

  interface VeauryVitePluginsOptions {
    isNuxt?: boolean
    type?: 'react' | 'vue' | 'custom'
    vueJsxInclude?: RegExp[]
    vueJsxExclude?: RegExp[]
    vueOptions?: Record<string, unknown>
    vueJsxOptions?: Record<string, unknown>
    reactOptions?: Record<string, unknown>
  }

  export default function veauryVitePlugins(options?: VeauryVitePluginsOptions): Plugin[]
}
