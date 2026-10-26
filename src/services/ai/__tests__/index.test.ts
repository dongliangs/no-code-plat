import { buildSystemPrompt, generateBlocks, getAiProvider, mockProvider } from '@/services/ai/index'
import type { AiProvider } from '@/services/ai/index'
import { describe, expect, it, vi } from 'vitest'

function createFakeProvider() {
  const generateRaw = vi.fn()
  const provider: AiProvider = { name: 'fake', generateRaw }
  return { provider, generateRaw }
}

describe('generateBlocks 统一管道', () => {
  it('Mock Provider：表单关键词返回固定表单物料（含管道补齐的 id）', async () => {
    const blocks = await generateBlocks('帮我生成一个信息收集表单', { provider: mockProvider })
    expect(blocks).toHaveLength(1)
    expect(blocks[0].type).toBe('form')
    expect(blocks[0].label).toBe('信息收集表单')
    expect(blocks[0].id).toBeTruthy()
    expect(blocks[0].props.fields).toHaveLength(3)
  })

  it('Mock Provider：标题关键词返回固定标题物料', async () => {
    const blocks = await generateBlocks('生成一个大标题', { provider: mockProvider })
    expect(blocks).toHaveLength(1)
    expect(blocks[0].type).toBe('heroTitle')
    expect(blocks[0].props.content).toBe('AI 智能搭建，让创意即刻成型')
  })

  it('Mock Provider：无命中关键词时兜底返回主标题物料', async () => {
    const blocks = await generateBlocks('随便来点什么', { provider: mockProvider })
    expect(blocks[0].type).toBe('heroTitle')
  })

  it('校验失败携错误重试 1 次，第二次合法则直接采用', async () => {
    const { provider, generateRaw } = createFakeProvider()
    generateRaw
      .mockResolvedValueOnce([{ type: 'unknown-type', label: 'x', props: {} }])
      .mockResolvedValueOnce([
        { type: 'quote', label: '引述', props: { content: '重试成功', status: 'warning' } }
      ])
    const blocks = await generateBlocks('生成引述', { provider })
    expect(generateRaw).toHaveBeenCalledTimes(2)
    expect(blocks).toHaveLength(1)
    expect(blocks[0].type).toBe('quote')
    expect(blocks[0].props.content).toBe('重试成功')
    // 重试 prompt 携带第一次校验的错误信息
    const retryPrompt = generateRaw.mock.calls[1][0] as string
    expect(retryPrompt).toContain('type 非法')
  })

  it('两次输出均含非法 type 时，返回降级默认物料', async () => {
    const { provider, generateRaw } = createFakeProvider()
    generateRaw.mockResolvedValue([{ type: 'unknown-type', label: 'x', props: {} }])
    const blocks = await generateBlocks('随便生成点啥', { provider })
    expect(generateRaw).toHaveBeenCalledTimes(2)
    expect(blocks).toHaveLength(1)
    expect(blocks[0].type).toBe('heroTitle')
    expect(blocks[0].label).toBe('标题')
  })

  it('provider 连续抛异常时，降级返回兜底默认物料', async () => {
    const { provider, generateRaw } = createFakeProvider()
    generateRaw.mockRejectedValue(new Error('network down'))
    const blocks = await generateBlocks('随便生成点啥', { provider })
    expect(generateRaw).toHaveBeenCalledTimes(2)
    expect(blocks).toHaveLength(1)
    expect(blocks[0].type).toBe('heroTitle')
  })

  it('用户取消（AbortError）时向上抛出，不降级产出物料', async () => {
    const { provider, generateRaw } = createFakeProvider()
    const abortError = new Error('The operation was aborted')
    abortError.name = 'AbortError'
    generateRaw.mockRejectedValue(abortError)
    await expect(generateBlocks('随便生成点啥', { provider })).rejects.toThrow('aborted')
    expect(generateRaw).toHaveBeenCalledTimes(1)
  })
})

describe('generateBlocks page 粒度（整页编排，设计文档 4.3）', () => {
  it('page 粒度：产品介绍页模版返回整页组合（4 个合法物料）', async () => {
    const blocks = await generateBlocks('生成「云协作」的产品介绍页：包含超级标题、产品图片、产品引述和信息收集表单', {
      provider: mockProvider,
      granularity: 'page'
    })
    expect(blocks).toHaveLength(4)
    expect(blocks.map((b) => b.type)).toEqual(['heroTitle', 'image', 'quote', 'form'])
    // 管道补齐唯一 id
    expect(new Set(blocks.map((b) => b.id)).size).toBe(4)
  })

  it('page 粒度：数据看板关键词返回看板组合', async () => {
    const blocks = await generateBlocks('生成「销售」的数据看板：包含看板标题、数据图表和数据明细视图', {
      provider: mockProvider,
      granularity: 'page'
    })
    expect(blocks.map((b) => b.type)).toEqual(['heroTitle', 'chart', 'view'])
  })

  it('page 粒度：活动报名页关键词返回报名组合', async () => {
    const blocks = await generateBlocks('生成「云协作发布会」的活动报名页：包含活动标题、活动引述、活动海报图和报名表单', {
      provider: mockProvider,
      granularity: 'page'
    })
    expect(blocks.map((b) => b.type)).toEqual(['heroTitle', 'quote', 'image', 'form'])
  })

  it('page 粒度：granularity 透传给 provider', async () => {
    const { provider, generateRaw } = createFakeProvider()
    generateRaw.mockResolvedValue([{ type: 'heroTitle', label: '标题', props: { content: 'x' } }])
    await generateBlocks('整页生成', { provider, granularity: 'page' })
    expect(generateRaw).toHaveBeenCalledWith('整页生成', {
      signal: undefined,
      granularity: 'page'
    })
  })
})

describe('getAiProvider', () => {
  it('未配置 API Key 时返回 Mock 兜底', () => {
    vi.stubEnv('VITE_AI_API_BASE_URL', '')
    vi.stubEnv('VITE_AI_API_KEY', '')
    vi.stubEnv('VITE_AI_MODEL', '')
    expect(getAiProvider().name).toBe('mock')
    vi.unstubAllEnvs()
  })

  it('三个环境变量配置齐全时返回 OpenAI 兼容 Provider（真实 LLM 链路，设计文档 7.2.1）', () => {
    vi.stubEnv('VITE_AI_API_BASE_URL', 'https://api.deepseek.com')
    vi.stubEnv('VITE_AI_API_KEY', 'sk-test-key')
    vi.stubEnv('VITE_AI_MODEL', 'deepseek-flash')
    expect(getAiProvider().name).toBe('openai-compatible')
    vi.unstubAllEnvs()
  })
})

describe('buildSystemPrompt', () => {
  it('系统提示包含 8 种物料类型与 few-shot 示例', () => {
    const prompt = buildSystemPrompt()
    expect(prompt).toContain('heroTitle')
    expect(prompt).toContain('仅输出 JSON')
    // few-shot：复用 getBlocksDefaultData 输出，应包含具体默认内容
    expect(prompt).toContain('"content":"标题"')
  })

  it('page 粒度附加整页编排约束，block 粒度不含', () => {
    expect(buildSystemPrompt('page')).toContain('整页编排任务')
    expect(buildSystemPrompt()).not.toContain('整页编排任务')
  })
})
