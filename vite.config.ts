// import vue from '@vitejs/plugin-vue'
// import vueJsx from '@vitejs/plugin-vue-jsx'
import { defineConfig } from 'vite'
import { fileURLToPath,URL } from 'node:url'
import veauryVitePlugins from 'veaury/vite/index.js'
// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // vue(),
    // vueJsx(),
    veauryVitePlugins({
      type: 'vue'
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
    // 保证 react / react-dom 只有一份，避免 React 18/19 混用导致 ReactCurrentDispatcher 报错
    dedupe: ['react', 'react-dom']
  }
})
