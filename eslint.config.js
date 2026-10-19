// eslint.config.js
import js from '@eslint/js'
import eslintPluginVue from 'eslint-plugin-vue'
import ts from 'typescript-eslint'
import sort from 'eslint-plugin-simple-import-sort'

// ESLint v9+ Flat Config（当前项目 ESLint v10）
// - eslint-plugin-vue v10 仍提供 flat/recommended 配置数组
// - typescript-eslint v8 提供 ts.config / ts.configs.recommended
export default ts.config(
    js.configs.recommended,
    ...ts.configs.recommended,
    ...eslintPluginVue.configs['flat/recommended'],
    {
        files: ['*.vue', '**/*.vue'],
        rules: {
            'max-depth': ['error', 2],
            'sort/imports': 'error',
            'sort/exports': 'error',
            'vue/html-indent': 'off',
            // Vue + TS 项目里 no-undef 由 TypeScript 兜底，避免对 console/window 等浏览器全局误报
            'no-undef': 'off'
        },
        languageOptions: {
            parserOptions: {
                parser: '@typescript-eslint/parser'
            }
        },
        plugins: {
            sort
        }
    },
    {
        rules: {
            // 第三方库(smooth-dnd)封装允许 any，降级为警告避免阻断提交
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-unnecessary-type-constraint': 'warn'
        }
    }
)
