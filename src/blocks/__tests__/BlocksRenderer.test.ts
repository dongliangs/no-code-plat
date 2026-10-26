// @vitest-environment happy-dom
import BlocksRenderer from '@/blocks/BlocksRenderer.vue'
import { createDragPayload } from '@/components/AiCopilot/dragPayload'
import { SmoothDndContainer } from '@/components/SmoothDnd/SmoothDndContainer'
import { useAppEditorStore } from '@/stores/appEditor'
import type { BlockInfo } from '@/types/block'
import { isReactive, nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// 存根 BlockRenderer：避免挂载真实物料组件（Tiptap / ECharts / React 物料），
// 本测试聚焦 smooth-dnd drop 事件到 store 的数据流
vi.mock('@/blocks/BlockRenderer.vue', () => ({
  default: {
    name: 'BlockRendererStub',
    props: ['block', 'i'],
    template: '<div class="block-renderer-stub" />'
  }
}))

const aiFormBlock: BlockInfo = {
  id: 'ai-form-origin',
  type: 'form',
  label: '信息收集表单',
  props: {
    fields: [
      { type: 'text', label: '姓名', placeholder: '请输入姓名', required: true },
      { type: 'text', label: '手机号', placeholder: '请输入手机号', required: true }
    ]
  }
}

describe('BlocksRenderer 拖拽入画布数据流（AI 物料通路）', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  function mountRenderer() {
    return mount(BlocksRenderer, { attachTo: document.body })
  }

  function emitDrop(wrapper: ReturnType<typeof mountRenderer>, addedIndex: number, payload: BlockInfo) {
    // 模拟 smooth-dnd 跨容器拖入的 DropResult：外部 copy 源 removedIndex 为 null
    const container = wrapper.findComponent(SmoothDndContainer)
    container.vm.$emit('drop', { removedIndex: null, addedIndex, payload })
  }

  it('AI 物料 payload 经 drop 事件插入画布指定位置', async () => {
    const wrapper = mountRenderer()
    const store = useAppEditorStore()
    const initialCount = store.blocks.length

    const payload = createDragPayload(aiFormBlock)
    emitDrop(wrapper, 2, payload)
    await nextTick()

    expect(store.blocks).toHaveLength(initialCount + 1)
    expect(store.blocks[2]).toMatchObject({ type: 'form', label: '信息收集表单' })
    // 画布保留拖拽 payload 的 id（applyDrag 的随机 id 被 payload 覆盖）
    expect(store.blocks[2].id).toBe(payload.id)
    expect(payload.id).not.toBe('ai-form-origin')

    wrapper.unmount()
  })

  it('同一 AI 物料两次拖入画布，id 不冲突', async () => {
    const wrapper = mountRenderer()
    const store = useAppEditorStore()
    const initialCount = store.blocks.length

    const first = createDragPayload(aiFormBlock)
    const second = createDragPayload(aiFormBlock)
    emitDrop(wrapper, 0, first)
    await nextTick()
    emitDrop(wrapper, 0, second)
    await nextTick()

    expect(first.id).not.toBe(second.id)
    expect(store.blocks).toHaveLength(initialCount + 2)
    const ids = store.blocks.map((block) => block.id)
    expect(new Set(ids).size).toBe(ids.length)

    wrapper.unmount()
  })

  it('拖拽 payload 为纯数据（无 reactive proxy），入画布后数据语义等价', async () => {
    const wrapper = mountRenderer()
    const store = useAppEditorStore()

    const payload = createDragPayload(aiFormBlock)
    // 拖出时已剥离 reactive proxy（结构化克隆安全）
    expect(isReactive(payload as unknown as object)).toBe(false)
    expect(isReactive(payload.props as unknown as object)).toBe(false)

    emitDrop(wrapper, store.blocks.length, payload)
    await nextTick()

    // store 读取时被 pinia 自动包裹 reactive（画布响应式渲染机制），
    // 但数据语义与 payload 深度等价
    const added = store.blocks[store.blocks.length - 1]
    expect(JSON.parse(JSON.stringify(added))).toEqual(JSON.parse(JSON.stringify(payload)))

    wrapper.unmount()
  })
})
