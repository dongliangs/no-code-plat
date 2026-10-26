// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
import AiChatPanel from '@/components/AiCopilot/AiChatPanel.vue'
import { promptTemplates } from '@/constants/aiPromptTemplates'
import { generateBlocks } from '@/services/ai'
import { db } from '@/services/db'
import { useAiCopilotStore } from '@/stores/aiCopilot'
import { useAppEditorStore } from '@/stores/appEditor'
import type { BlockInfo } from '@/types/block'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/services/ai', () => ({
  generateBlocks: vi.fn()
}))

const mockBlocks: BlockInfo[] = [
  { id: 'b1', type: 'heroTitle', label: '主标题', props: { content: 'AI 标题' } }
]

const mockPageBlocks: BlockInfo[] = [
  { id: 'p1', type: 'heroTitle', label: '产品主标题', props: { content: 'AI 智能搭建' } },
  { id: 'p2', type: 'image', label: '产品配图', props: { url: 'https://example.com/a.png' } },
  { id: 'p3', type: 'form', label: '信息收集表单', props: { fields: [] } }
]

describe('AiChatPanel 消息流与物料卡片', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    vi.mocked(generateBlocks).mockReset()
    await db.sessions.clear()
    await db.messages.clear()
  })

  it('assistant 消息渲染物料卡片，卡片位于拖拽容器内', async () => {
    vi.mocked(generateBlocks).mockResolvedValue(mockBlocks)
    const wrapper = mount(AiChatPanel, { attachTo: document.body })
    const store = useAiCopilotStore()

    await store.togglePanel() // 展开面板（首次触发 loadHistory）
    store.inputText = '生成一个标题'
    await store.sendMessage()
    await flushPromises()

    // 卡片渲染且显示 label / 摘要
    const card = wrapper.find('.material-card')
    expect(card.exists()).toBe(true)
    expect(card.text()).toContain('主标题')
    expect(card.text()).toContain('AI 标题')
    // 卡片在消息气泡内的拖拽容器里
    expect(wrapper.find('.ai-material-list .material-card').exists()).toBe(true)
    // 拖拽容器 class 存在（smooth-dnd wrapper 由 Container 渲染）
    expect(wrapper.find('.ai-material-list').exists()).toBe(true)

    wrapper.unmount()
  })

  it('pending 状态显示生成中，完成后卡片出现', async () => {
    let resolveBlocks!: (blocks: BlockInfo[]) => void
    vi.mocked(generateBlocks).mockReturnValue(
      new Promise<BlockInfo[]>((resolve) => {
        resolveBlocks = resolve
      })
    )
    const wrapper = mount(AiChatPanel, { attachTo: document.body })
    const store = useAiCopilotStore()

    await store.togglePanel()
    const pending = store.sendMessage('生成一个标题')
    // fake-indexeddb 宏任务链路较长，等待 user/pending 两条消息落屏
    await vi.waitFor(() => expect(store.messages).toHaveLength(2))

    // pending 期间显示"生成中"，无卡片
    expect(wrapper.find('.ai-loading').exists()).toBe(true)
    expect(wrapper.find('.material-card').exists()).toBe(false)

    resolveBlocks(mockBlocks)
    await pending
    await flushPromises()

    expect(wrapper.find('.ai-loading').exists()).toBe(false)
    expect(wrapper.find('.material-card').exists()).toBe(true)

    wrapper.unmount()
  })

  it('用户消息不渲染卡片', async () => {
    vi.mocked(generateBlocks).mockResolvedValue(mockBlocks)
    const wrapper = mount(AiChatPanel, { attachTo: document.body })
    const store = useAiCopilotStore()

    await store.togglePanel()
    await store.sendMessage('生成一个标题')
    await flushPromises()

    // 卡片只出现在 assistant 消息里（2 条消息只有 1 张卡片）
    expect(wrapper.findAll('.material-card')).toHaveLength(1)

    wrapper.unmount()
  })
})

describe('AiChatPanel 指令模版与整页 diff 预览', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    vi.mocked(generateBlocks).mockReset()
    await db.sessions.clear()
    await db.messages.clear()
  })

  it('渲染 5 个模版 chip，page 粒度带「整页」标记', async () => {
    const wrapper = mount(AiChatPanel, { attachTo: document.body })
    const store = useAiCopilotStore()
    await store.togglePanel()
    await flushPromises()

    const chips = wrapper.findAll('.ai-template-chip')
    expect(chips).toHaveLength(5)
    expect(chips[0].text()).toContain('产品介绍页')
    expect(chips[2].text()).toContain('活动报名页')
    // page 粒度模版带整页徽标，block 粒度不带
    expect(chips[0].find('.ai-template-badge').exists()).toBe(true)
    expect(chips[2].find('.ai-template-badge').exists()).toBe(true)
    expect(chips[3].find('.ai-template-badge').exists()).toBe(false) // 表单收集为 block 粒度

    wrapper.unmount()
  })

  it('点击模版填充输入框并高亮选中态', async () => {
    const wrapper = mount(AiChatPanel, { attachTo: document.body })
    const store = useAiCopilotStore()
    await store.togglePanel()
    await flushPromises()

    await wrapper.findAll('.ai-template-chip')[0].trigger('click')
    const productPage = promptTemplates.find((t) => t.id === 'tpl-product-page')!
    expect(store.inputText).toBe(productPage.prompt)
    expect(store.selectedTemplateId).toBe('tpl-product-page')
    // 输入框同步显示模版 prompt（用户可改写变量后发送）
    expect((wrapper.find('.ai-input').element as HTMLTextAreaElement).value).toBe(productPage.prompt)
    expect(wrapper.find('.ai-template-chip--active').exists()).toBe(true)

    wrapper.unmount()
  })

  it('page 模版发送后出现 diff 预览，确认后画布完整替换', async () => {
    vi.mocked(generateBlocks).mockResolvedValue(mockPageBlocks)
    const wrapper = mount(AiChatPanel, { attachTo: document.body })
    const store = useAiCopilotStore()
    const appEditor = useAppEditorStore()
    await store.togglePanel()
    await flushPromises()

    // 发送前无 diff 预览
    expect(wrapper.find('.diff-preview').exists()).toBe(false)

    await wrapper.findAll('.ai-template-chip')[0].trigger('click')
    await store.sendMessage()
    await flushPromises()

    // page 粒度生成完成后 diff 预览出现，画布尚未写入
    expect(wrapper.find('.diff-preview').exists()).toBe(true)
    expect(wrapper.text()).toContain('当前画布 8 个 → 新页面 3 个')
    expect(appEditor.blocks).toHaveLength(8)

    // 确认写入：画布完整替换为 3 个新物料，预览消失
    await wrapper.find('.diff-btn-confirm').trigger('click')
    expect(appEditor.blocks).toHaveLength(3)
    expect(appEditor.blocks.map((b) => b.id)).toEqual(['p1', 'p2', 'p3'])
    expect(wrapper.find('.diff-preview').exists()).toBe(false)

    wrapper.unmount()
  })

  it('diff 预览取消后画布不变、预览消失', async () => {
    vi.mocked(generateBlocks).mockResolvedValue(mockPageBlocks)
    const wrapper = mount(AiChatPanel, { attachTo: document.body })
    const store = useAiCopilotStore()
    const appEditor = useAppEditorStore()
    await store.togglePanel()
    await flushPromises()

    await wrapper.findAll('.ai-template-chip')[0].trigger('click')
    await store.sendMessage()
    await flushPromises()

    await wrapper.find('.diff-btn-cancel').trigger('click')
    expect(appEditor.blocks).toHaveLength(8)
    expect(store.pendingPageBlocks).toBeNull()
    expect(wrapper.find('.diff-preview').exists()).toBe(false)

    wrapper.unmount()
  })
})
