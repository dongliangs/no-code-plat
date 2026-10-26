// @vitest-environment happy-dom
import OutlineDrawer from '@/components/AppLeftPanel/OutlineDrawer.vue'
import { useAppEditorStore } from '@/stores/appEditor'
import type { BlockInfo } from '@/types/block'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('OutlineDrawer 大纲渲染', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('渲染画布全部物料，每实例一行', () => {
    const store = useAppEditorStore()
    const wrapper = mount(OutlineDrawer)

    const items = wrapper.findAll('.outline-item')
    expect(items).toHaveLength(store.blocks.length)
    // 首行为画布第一个物料（引述）
    expect(items[0].text()).toContain('引述')

    wrapper.unmount()
  })

  it('同类型物料重复进画布后，大纲各渲染一行且无 duplicate key 警告', async () => {
    const store = useAppEditorStore()
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const wrapper = mount(OutlineDrawer)
    const initialCount = store.blocks.length
    // 画布初始已含一个 heroTitle（"标题"）

    // 模拟 AI 物料拖入：同类型 heroTitle 插入中间位置（index 2）
    const duplicate: BlockInfo = {
      id: 'ai-hero',
      type: 'heroTitle',
      label: '卡片标题',
      props: { content: 'hero title block' }
    }
    const newBlocks = [...store.blocks]
    newBlocks.splice(2, 0, duplicate)
    store.updateBlocks(newBlocks)
    await nextTick()

    const items = wrapper.findAll('.outline-item')
    expect(items).toHaveLength(initialCount + 1)

    // 新行位于拖入位置，类型名与实例 label 均正确
    expect(items[2].text()).toContain('超级标题')
    expect(items[2].text()).toContain('卡片标题')

    // 原有 heroTitle 行保留，两行互不干扰
    const heroRows = items.filter((item) => item.text().includes('超级标题'))
    expect(heroRows).toHaveLength(2)
    expect(heroRows.some((row) => row.text().includes('标题'))).toBe(true)

    // v-for 使用 block.id 作 key，不触发 duplicate key 警告
    expect(
      warnSpy.mock.calls.some((call) => String(call[0]).includes('Duplicate keys'))
    ).toBe(false)

    wrapper.unmount()
  })
})
