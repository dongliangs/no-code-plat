// import vue from '@vitejs/plugin-vue'
// import vueJsx from '@vitejs/plugin-vue-jsx'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import { visualizer } from 'rollup-plugin-visualizer'
import veauryVitePlugins from 'veaury/vite/index.js'

// 判断某个模块路径是否属于 node_modules 下的指定包（精确匹配包边界，避免误伤 vue-echarts / @vue/* 等）
function isPackage(id: string, pkg: string): boolean {
  return id.includes(`/node_modules/${pkg}/`) || id.includes(`\\node_modules\\${pkg}\\`)
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // vue(),
    // vueJsx(),
    visualizer({
      filename: './bundle-analysis.html'
    }),
    veauryVitePlugins({
      type: 'vue'
    })
  ],
  build: {
    rollupOptions: {
      output: {
        // Rolldown 的 manualChunks 只支持函数形式（不支持 Rollup 的对象形式）
        manualChunks(id) {
          if (isPackage(id, 'vue') || isPackage(id, 'vue-router') || isPackage(id, 'pinia')) {
            return 'vue-common-lib'
          }
          if (
            isPackage(id, 'react') ||
            isPackage(id, 'react-dom') ||
            isPackage(id, '@glideapps/glide-data-grid')
          ) {
            return 'react-common-lib'
          }
          return null
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
    // 保证 react / react-dom 只有一份，避免 React 18/19 混用导致 ReactCurrentDispatcher 报错
    dedupe: ['react', 'react-dom']
  }
})
