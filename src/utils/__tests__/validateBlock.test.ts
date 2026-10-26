import { getBlocksDefaultData } from '@/constants/blocksBaseMeta'
import { validateBlocks } from '@/utils/validateBlock'
import { describe, expect, it } from 'vitest'

describe('validateBlocks 校验-修复-降级管道', () => {
  it('合法输出直通：不修复、不报错', () => {
    const legal = [
      {
        id: 'b-1',
        type: 'quote',
        label: '引述',
        props: { content: '合法内容', status: 'success' }
      }
    ]
    const result = validateBlocks(legal)
    expect(result.errors).toEqual([])
    expect(result.repairs).toEqual([])
    expect(result.blocks).toEqual(legal)
  })

  it('缺失 id / label / content 时自动修复', () => {
    const result = validateBlocks([{ type: 'heroTitle', props: {} }])
    expect(result.errors).toEqual([])
    expect(result.blocks).toHaveLength(1)
    // 缺 id 自动补
    expect(result.blocks[0].id).toBeTruthy()
    // 缺 label 用类型默认 label（物料库元数据）
    expect(result.blocks[0].label).toBe('超级标题')
    // 缺 content 用默认文案（getBlocksDefaultData）
    expect(result.blocks[0].props.content).toBe('标题')
    expect(result.repairs).toHaveLength(3)
  })

  it('非法 type 整体降级为默认物料并记录错误', () => {
    const result = validateBlocks([{ id: 'x', type: 'unknown-type', label: 'x', props: {} }])
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toContain('type 非法')
    expect(result.blocks).toHaveLength(1)
    expect(result.blocks[0].type).toBe('heroTitle')
    expect(result.blocks[0].label).toBe('标题')
  })

  it('image url 非法协议替换为默认占位图（拦截 javascript:）', () => {
    const result = validateBlocks([
      { id: 'i-1', type: 'image', label: '图片', props: { url: 'javascript:alert(1)' } }
    ])
    expect(result.errors).toEqual([])
    expect(result.blocks[0].props.url).toMatch(/^https?:\/\//)
  })

  it('quote 非法 status 降级为默认值', () => {
    const result = validateBlocks([
      { id: 'q-1', type: 'quote', label: '引述', props: { content: '内容', status: 'critical' } }
    ])
    expect(result.blocks[0].props.status).toBe('success')
  })

  it('chart 非法 chartType 降级为默认值', () => {
    const result = validateBlocks([
      { id: 'c-1', type: 'chart', label: '图表', props: { chartType: 'table' } }
    ])
    expect(result.blocks[0].props.chartType).toBe('echarts')
  })

  it('form fields 结构非法降级为默认值', () => {
    const result = validateBlocks([
      { id: 'f-1', type: 'form', label: '表单', props: { fields: 'not-an-array' } }
    ])
    expect(result.blocks[0].props.fields).toEqual(getBlocksDefaultData('form').props.fields)
  })

  it('view fields 结构非法降级为默认值', () => {
    const result = validateBlocks([
      { id: 'v-1', type: 'view', label: '视图', props: { fields: [1, 2] } }
    ])
    expect(result.blocks[0].props.fields).toEqual(getBlocksDefaultData('view').props.fields)
  })

  it('非数组输入返回空 blocks 并记录错误', () => {
    const result = validateBlocks('{"type":"quote"}')
    expect(result.blocks).toEqual([])
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toContain('必须是物料数组')
  })

  it('非对象条目剔除并记录错误，其余条目正常校验', () => {
    const result = validateBlocks([
      'garbage',
      { type: 'button', label: '按钮', props: { content: '点我' } }
    ])
    expect(result.blocks).toHaveLength(1)
    expect(result.blocks[0].type).toBe('button')
    expect(result.errors).toHaveLength(1)
    expect(result.blocks[0].id).toBeTruthy()
  })
})
