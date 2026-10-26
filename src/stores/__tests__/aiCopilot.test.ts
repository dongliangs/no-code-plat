import 'fake-indexeddb/auto'
import { promptTemplates } from '@/constants/aiPromptTemplates'
import { generateBlocks } from '@/services/ai'
import { db, getMessagesByAppId } from '@/services/db'
import { useAiCopilotStore } from '@/stores/aiCopilot'
import { useAppEditorStore } from '@/stores/appEditor'
import type { BlockInfo } from '@/types/block'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// mock 掉 AI 服务层，聚焦 store 运行态逻辑；Dexie 走 fake-indexeddb 真实链路
vi.mock('@/services/ai', () => ({
  generateBlocks: vi.fn()
}))

const mockBlocks: BlockInfo[] = [
  { id: 'b1', type: 'heroTitle', label: '标题', props: { content: 'AI 生成标题' } }
]

const mockPageBlocks: BlockInfo[] = [
  { id: 'p1', type: 'heroTitle', label: '产品主标题', props: { content: 'AI 智能搭建' } },
  { id: 'p2', type: 'image', label: '产品配图', props: { url: 'https://example.com/a.png' } },
  { id: 'p3', type: 'quote', label: '产品引述', props: { content: '所见即所得', status: 'success' } },
  { id: 'p4', type: 'form', label: '信息收集表单', props: { fields: [] } }
]

describe('aiCopilot store', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    vi.mocked(generateBlocks).mockReset()
    await db.sessions.clear()
    await db.messages.clear()
  })

  it('togglePanel 切换面板展开状态', () => {
    const store = useAiCopilotStore()
    expect(store.panelOpen).toBe(false)
    store.togglePanel()
    expect(store.panelOpen).toBe(true)
    store.togglePanel()
    expect(store.panelOpen).toBe(false)
  })

  it('sendMessage：空白输入不发送', async () => {
    const store = useAiCopilotStore()
    store.inputText = '   '
    await store.sendMessage()
    expect(store.messages).toHaveLength(0)
    expect(generateBlocks).not.toHaveBeenCalled()
  })

  it('sendMessage：用户消息上屏，assistant 成功后写入 blocks', async () => {
    vi.mocked(generateBlocks).mockResolvedValue(mockBlocks)
    const store = useAiCopilotStore()
    store.inputText = '生成一个标题'
    await store.sendMessage()

    expect(generateBlocks).toHaveBeenCalledWith('生成一个标题', { granularity: 'block' })
    expect(store.messages).toHaveLength(2)
    expect(store.messages[0]).toMatchObject({ role: 'user', content: '生成一个标题', status: 'done' })
    expect(store.messages[1]).toMatchObject({
      role: 'assistant',
      status: 'done',
      content: '已生成 1 个物料'
    })
    expect(store.messages[1].blocks).toEqual(mockBlocks)
    expect(store.sending).toBe(false)
    expect(store.inputText).toBe('')
  })

  it('sendMessage：生成失败时 assistant 标记 error', async () => {
    vi.mocked(generateBlocks).mockRejectedValue(new Error('boom'))
    const store = useAiCopilotStore()
    await store.sendMessage('生成点啥')
    expect(store.messages).toHaveLength(2)
    expect(store.messages[1]).toMatchObject({ role: 'assistant', status: 'error', content: '生成失败，请稍后重试' })
    expect(store.sending).toBe(false)
  })

  it('sending 期间重复发送被忽略', async () => {
    let resolveBlocks!: (blocks: BlockInfo[]) => void
    vi.mocked(generateBlocks).mockReturnValue(
      new Promise<BlockInfo[]>((resolve) => {
        resolveBlocks = resolve
      })
    )
    const store = useAiCopilotStore()
    const first = store.sendMessage('第一条')
    await store.sendMessage('第二条') // sending 中，应被忽略
    // 第一条消息经 fake-indexeddb 异步落屏
    await vi.waitFor(() => expect(store.messages).toHaveLength(2))

    resolveBlocks(mockBlocks)
    await first
    expect(store.messages).toHaveLength(2)
    expect(store.messages[1].blocks).toEqual(mockBlocks)
  })
})

describe('aiCopilot store 持久化', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    vi.mocked(generateBlocks).mockReset()
    await db.sessions.clear()
    await db.messages.clear()
  })

  it('sendMessage 后消息（含 blocks）写入 IndexedDB', async () => {
    vi.mocked(generateBlocks).mockResolvedValue(mockBlocks)
    const store = useAiCopilotStore()
    await store.sendMessage('生成一个标题')

    const stored = await getMessagesByAppId('default-app')
    expect(stored).toHaveLength(2)
    expect(stored[0]).toMatchObject({ role: 'user', content: '生成一个标题' })
    expect(stored[1]).toMatchObject({ role: 'assistant', status: 'done' })
    expect(stored[1].blocks).toEqual(mockBlocks)
  })

  it('首次展开面板时加载历史消息（模拟刷新恢复）', async () => {
    vi.mocked(generateBlocks).mockResolvedValue(mockBlocks)
    const storeA = useAiCopilotStore()
    await storeA.sendMessage('历史消息')

    // 全新 pinia + store 实例，模拟页面刷新后的状态
    setActivePinia(createPinia())
    const storeB = useAiCopilotStore()
    expect(storeB.messages).toHaveLength(0)

    await storeB.togglePanel() // 首次展开触发加载
    expect(storeB.panelOpen).toBe(true)
    expect(storeB.messages).toHaveLength(2)
    expect(storeB.messages[0]).toMatchObject({ role: 'user', content: '历史消息' })
    expect(storeB.messages[1].blocks).toEqual(mockBlocks)
  })

  it('clearSession 清空内存态与 IndexedDB', async () => {
    vi.mocked(generateBlocks).mockResolvedValue(mockBlocks)
    const store = useAiCopilotStore()
    await store.sendMessage('消息')
    expect(await getMessagesByAppId('default-app')).toHaveLength(2)

    await store.clearSession()
    expect(store.messages).toHaveLength(0)
    expect(await getMessagesByAppId('default-app')).toEqual([])
  })
})

describe('aiCopilot store 指令模版与整页编排', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    vi.mocked(generateBlocks).mockReset()
    await db.sessions.clear()
    await db.messages.clear()
  })

  it('selectTemplate 记录选中态并填充输入框', () => {
    const store = useAiCopilotStore()
    const productPage = promptTemplates.find((t) => t.id === 'tpl-product-page')!
    store.selectTemplate(productPage)
    expect(store.selectedTemplateId).toBe('tpl-product-page')
    expect(store.inputText).toBe(productPage.prompt)
  })

  it('page 粒度发送：pendingPageBlocks 进入待确认态，消息带 templateId，不直接写画布', async () => {
    vi.mocked(generateBlocks).mockResolvedValue(mockPageBlocks)
    const appEditor = useAppEditorStore()
    const beforeCanvas = [...appEditor.blocks]
    const store = useAiCopilotStore()

    const productPage = promptTemplates.find((t) => t.id === 'tpl-product-page')!
    store.selectTemplate(productPage)
    await store.sendMessage()

    // 以 page 粒度调用 AI 服务
    expect(generateBlocks).toHaveBeenCalledWith(productPage.prompt, { granularity: 'page' })
    // 消息流：user 与 assistant 均携带 templateId
    expect(store.messages).toHaveLength(2)
    expect(store.messages[0]).toMatchObject({ role: 'user', templateId: 'tpl-product-page' })
    expect(store.messages[1]).toMatchObject({ role: 'assistant', templateId: 'tpl-product-page', status: 'done' })
    // 整页结果进入 diff 预览待确认态，画布未被直接写入
    expect(store.pendingPageBlocks).toEqual(mockPageBlocks)
    expect(appEditor.blocks).toEqual(beforeCanvas)
    // 模版只对一次发送生效
    expect(store.selectedTemplateId).toBeNull()
  })

  it('confirmPageApply：经 appEditor 写入口覆盖画布，并清空待确认态', async () => {
    vi.mocked(generateBlocks).mockResolvedValue(mockPageBlocks)
    const appEditor = useAppEditorStore()
    const store = useAiCopilotStore()
    const productPage = promptTemplates.find((t) => t.id === 'tpl-product-page')!
    store.selectTemplate(productPage)
    await store.sendMessage()

    store.confirmPageApply()
    expect(appEditor.blocks).toHaveLength(mockPageBlocks.length)
    expect(appEditor.blocks.map((b) => b.id)).toEqual(mockPageBlocks.map((b) => b.id))
    expect(store.pendingPageBlocks).toBeNull()
    // 写入的是深拷贝：画布后续编辑不影响消息流中的 blocks
    appEditor.updateBlock(appEditor.blocks[0].id, { ...appEditor.blocks[0], label: '改过的标题' })
    expect(store.messages[1].blocks?.[0].label).toBe('产品主标题')
  })

  it('cancelPageApply：丢弃生成结果，画布保持不变', async () => {
    vi.mocked(generateBlocks).mockResolvedValue(mockPageBlocks)
    const appEditor = useAppEditorStore()
    const beforeCanvas = [...appEditor.blocks]
    const store = useAiCopilotStore()
    const productPage = promptTemplates.find((t) => t.id === 'tpl-product-page')!
    store.selectTemplate(productPage)
    await store.sendMessage()

    store.cancelPageApply()
    expect(store.pendingPageBlocks).toBeNull()
    expect(appEditor.blocks).toEqual(beforeCanvas)
  })

  it('block 粒度模版发送：不进入整页待确认态', async () => {
    vi.mocked(generateBlocks).mockResolvedValue(mockBlocks)
    const store = useAiCopilotStore()
    const formTpl = promptTemplates.find((t) => t.id === 'tpl-form')!
    store.selectTemplate(formTpl)
    await store.sendMessage()

    expect(generateBlocks).toHaveBeenCalledWith(formTpl.prompt, { granularity: 'block' })
    expect(store.pendingPageBlocks).toBeNull()
    expect(store.messages[1].blocks).toEqual(mockBlocks)
  })
})
