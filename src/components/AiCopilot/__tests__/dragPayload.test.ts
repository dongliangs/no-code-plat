import { createDragPayload } from '@/components/AiCopilot/dragPayload'
import type { BlockInfo } from '@/types/block'
import { isReactive, reactive } from 'vue'
import { describe, expect, it } from 'vitest'

const block: BlockInfo = {
  id: 'origin-1',
  type: 'quote',
  label: '引述',
  props: { content: '内容', status: 'success' }
}

describe('createDragPayload', () => {
  it('返回深拷贝并生成新 id，其余字段保持一致', () => {
    const payload = createDragPayload(block)
    expect(payload.id).toBeTruthy()
    expect(payload.id).not.toBe('origin-1')
    expect(payload).toEqual({ ...block, id: payload.id })
  })

  it('不污染原物料数据', () => {
    createDragPayload(block)
    expect(block.id).toBe('origin-1')
    expect(block.props).toEqual({ content: '内容', status: 'success' })
  })

  it('连续两次调用生成不同 id（同一物料可重复拖入画布）', () => {
    const first = createDragPayload(block)
    const second = createDragPayload(block)
    expect(first.id).not.toBe(second.id)
  })

  it('剥离 reactive proxy，payload 为纯数据', () => {
    const reactiveBlock = reactive(block)
    const payload = createDragPayload(reactiveBlock)
    expect(isReactive(payload)).toBe(false)
    expect(JSON.stringify(payload)).toBe(JSON.stringify({ ...block, id: payload.id }))
  })
})
