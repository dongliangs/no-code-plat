import { promptTemplates } from '@/constants/aiPromptTemplates'
import { describe, expect, it } from 'vitest'

// 指令模版初始集（设计文档 5.3）：5 个模版、id 唯一、page 粒度含 {{变量}} 插槽
describe('promptTemplates 指令模版初始集', () => {
  it('包含 5 个模版且 id 唯一', () => {
    expect(promptTemplates).toHaveLength(5)
    const ids = promptTemplates.map((t) => t.id)
    expect(new Set(ids).size).toBe(5)
  })

  it('每个模版字段完整且 granularity 合法', () => {
    for (const template of promptTemplates) {
      expect(template.title).toBeTruthy()
      expect(template.description).toBeTruthy()
      expect(template.prompt).toBeTruthy()
      expect(['block', 'page']).toContain(template.granularity)
    }
  })

  it('page 粒度模版的 prompt 含 {{变量}} 插槽', () => {
    const pageTemplates = promptTemplates.filter((t) => t.granularity === 'page')
    expect(pageTemplates.length).toBe(3)
    for (const template of pageTemplates) {
      expect(template.prompt).toMatch(/\{\{.+?\}\}/)
    }
  })

  it('page 粒度 prompt 可被用户改写插槽后直接发送（模拟填充）', () => {
    const productPage = promptTemplates.find((t) => t.id === 'tpl-product-page')!
    const filled = productPage.prompt.replace('{{产品名}}', '云协作平台')
    expect(filled).not.toContain('{{')
    expect(filled).toContain('云协作平台')
  })
})
