// @vitest-environment happy-dom
import MaterialCard from '@/components/AiCopilot/MaterialCard.vue'
import type { BlockInfo } from '@/types/block'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

function mountCard(block: BlockInfo) {
  return mount(MaterialCard, { props: { block } })
}

describe('MaterialCard 物料卡片', () => {
  it('渲染物料 label 与文本摘要', () => {
    const wrapper = mountCard({
      id: 'b1',
      type: 'heroTitle',
      label: '主标题',
      props: { content: 'AI 生成的大标题' }
    })
    expect(wrapper.find('.material-card-label').text()).toBe('主标题')
    expect(wrapper.find('.material-card-summary').text()).toBe('AI 生成的大标题')
  })

  it('notes 富文本剥掉 HTML 标签后显示摘要', () => {
    const wrapper = mountCard({
      id: 'b2',
      type: 'notes',
      label: '使用说明',
      props: { content: '<p>在输入框中描述需求</p>' }
    })
    expect(wrapper.find('.material-card-summary').text()).toBe('在输入框中描述需求')
  })

  it('form 物料显示字段数量', () => {
    const wrapper = mountCard({
      id: 'b3',
      type: 'form',
      label: '信息收集表单',
      props: {
        fields: [
          { type: 'text', label: '姓名' },
          { type: 'text', label: '手机号' }
        ]
      }
    })
    expect(wrapper.find('.material-card-summary').text()).toBe('表单（2 个字段）')
  })

  it('chart 物料显示图表类型', () => {
    const wrapper = mountCard({
      id: 'b4',
      type: 'chart',
      label: '销量趋势',
      props: { chartType: 'echarts' }
    })
    expect(wrapper.find('.material-card-summary').text()).toBe('图表（echarts）')
  })

  it('image 物料渲染占位摘要', () => {
    const wrapper = mountCard({
      id: 'b5',
      type: 'image',
      label: '产品配图',
      props: { url: 'https://example.com/a.jpg' }
    })
    expect(wrapper.find('.material-card-summary').text()).toBe('图片')
  })
})
