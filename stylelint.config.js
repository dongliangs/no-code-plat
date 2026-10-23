/** @type {import('stylelint').Config} */
export default {
    // stylelint-config-recommended-vue v2 内部通过 overrides 对 .vue 文件
    // 接入 stylelint-config-html(postcss-html) 与 stylelint-config-recommended
    extends: 'stylelint-config-recommended-vue',
    // stylelint v17 要求顶层必须存在 rules 属性（override-only 配置在预解析阶段会报错）
    rules: {},
    overrides: [
        {
            files: ['*.vue', '**/*.vue'],
            rules: {
                'unit-allowed-list': ['px', '%', 'em', 'rem', 's', 'fr', 'vh'],
                // 脚手架生成的 .vue 常带空 <style> 占位块，关闭该提示
                'no-empty-source': null
            }
        }
    ]
}
