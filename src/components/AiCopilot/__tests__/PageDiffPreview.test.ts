// @vitest-environment happy-dom
import PageDiffPreview from '@/components/AiCopilot/PageDiffPreview.vue'
import type { BlockInfo } from '@/types/block'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

const newBlocks: BlockInfo[] = [
  { id: 'p1', type: 'heroTitle', label: '产品主标题', props: { content: 'AI 智能搭建' } },
  { id: 'p2', type: 'image', label: '产品配图', props: { url: 'https://example.com/a.png' } },
  { id: 'p3', type: 'quote', label: '产品引述', props: { content: '所见即所得', status: 'success' } }
]

function mountPreview(currentCount: number) {
  return mount(PageDiffPreview, {
    props: { newBlocks, currentCount }
  })
}

describe('PageDiffPreview 整页 diff 预览', () => {
  it('渲染统计摘要与替换 / 新增 / 移除数量（按位置对齐）', () => {
    // 当前 8 个 → 新 3 个：替换 3、新增 0、移除 5
    const wrapper = mountPreview(8)
    expect(wrapper.text()).toContain('当前画布 8 个 → 新页面 3 个')
    expect(wrapper.find('.diff-stat--replace').text()).toBe('替换 3')
    expect(wrapper.find('.diff-stat--add').text()).toBe('新增 0')
    expect(wrapper.find('.diff-stat--remove').text()).toBe('移除 5')
  })

  it('新页面多于当前画布时统计新增', () => {
    // 当前 2 个 → 新 3 个：替换 2、新增 1、移除 0
    const wrapper = mountPreview(2)
    expect(wrapper.find('.diff-stat--replace').text()).toBe('替换 2')
    expect(wrapper.find('.diff-stat--add').text()).toBe('新增 1')
    expect(wrapper.find('.diff-stat--remove').text()).toBe('移除 0')
  })

  it('渲染新物料清单（MaterialCard 逐个展示）', () => {
    const wrapper = mountPreview(8)
    const cards = wrapper.findAllComponents({ name: 'MaterialCard' })
    expect(cards).toHaveLength(3)
    expect(wrapper.text()).toContain('产品主标题')
    expect(wrapper.text()).toContain('产品引述')
  })

  it('点击确认 / 取消分别触发 confirm 与 cancel 事件', async () => {
    const wrapper = mountPreview(8)
    await wrapper.find('.diff-btn-confirm').trigger('click')
    expect(wrapper.emitted('confirm')).toHaveLength(1)

    await wrapper.find('.diff-btn-cancel').trigger('click')
    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })
})
