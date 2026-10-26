import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

// 独立于 vite.config.ts：避免 veaury / visualizer 等构建插件干扰测试环境，
// 仅保留测试所需的 @ 别名解析与 vue SFC 支持
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  test: {
    environment: 'node'
  }
})
