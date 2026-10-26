import 'fake-indexeddb/auto'
import {
  addMessage,
  clearSessionByAppId,
  db,
  ensureSession,
  getMessagesByAppId,
  getSessionByAppId
} from '@/services/db'
import type { ChatMessage, ChatSession } from '@/types/ai'
import { beforeEach, describe, expect, it } from 'vitest'

function makeMessage(sessionId: string, content: string, createdAt = Date.now()): ChatMessage {
  return { id: `m-${content}`, sessionId, role: 'user', content, status: 'done', createdAt }
}

describe('db 持久层', () => {
  beforeEach(async () => {
    await db.sessions.clear()
    await db.messages.clear()
  })

  it('ensureSession 首次创建会话（title 截断），再次调用复用同一会话', async () => {
    const longTitle = '这是一条非常长的首条消息需要被截断到三十个字符以内才会存入会话标题字段'
    const first = await ensureSession('app-1', longTitle)
    expect(first.id).toBeTruthy()
    expect(first.appId).toBe('app-1')
    expect(first.title).toHaveLength(30)

    const second = await ensureSession('app-1', '第二条消息')
    expect(second.id).toBe(first.id)
    expect(second.updatedAt).toBeGreaterThanOrEqual(first.updatedAt)
  })

  it('不同 appId 会话隔离', async () => {
    const s1 = await ensureSession('app-1', 'x')
    const s2 = await ensureSession('app-2', 'y')
    expect(s1.id).not.toBe(s2.id)
    await addMessage(makeMessage(s1.id, '消息A'))
    await addMessage(makeMessage(s2.id, '消息B'))
    const m1 = await getMessagesByAppId('app-1')
    const m2 = await getMessagesByAppId('app-2')
    expect(m1.map((m) => m.content)).toEqual(['消息A'])
    expect(m2.map((m) => m.content)).toEqual(['消息B'])
  })

  it('getMessagesByAppId 按 createdAt 升序返回', async () => {
    const session = await ensureSession('app-1', 'x')
    await addMessage(makeMessage(session.id, '第二条', 200))
    await addMessage(makeMessage(session.id, '第一条', 100))
    const messages = await getMessagesByAppId('app-1')
    expect(messages.map((m) => m.content)).toEqual(['第一条', '第二条'])
  })

  it('消息含 blocks 对象时完整存取（结构化克隆）', async () => {
    const session = await ensureSession('app-1', 'x')
    const message: ChatMessage = {
      id: 'm-blocks',
      sessionId: session.id,
      role: 'assistant',
      content: '已生成 1 个物料',
      blocks: [{ id: 'b1', type: 'heroTitle', label: '标题', props: { content: 'AI 标题' } }],
      status: 'done',
      createdAt: 1
    }
    await addMessage(message)
    const [restored] = await getMessagesByAppId('app-1')
    expect(restored.blocks).toEqual(message.blocks)
  })

  it('clearSessionByAppId 级联删除会话与消息，不影响其他画布', async () => {
    const s1 = await ensureSession('app-1', 'x')
    const s2 = await ensureSession('app-2', 'y')
    await addMessage(makeMessage(s1.id, 'A'))
    await addMessage(makeMessage(s2.id, 'B'))

    await clearSessionByAppId('app-1')

    expect(await getMessagesByAppId('app-1')).toEqual([])
    expect(await getSessionByAppId('app-1')).toBeUndefined()
    expect(await getMessagesByAppId('app-2')).toHaveLength(1)
  })

  it('无会话时 getMessagesByAppId 返回空数组', async () => {
    expect(await getMessagesByAppId('not-exist')).toEqual([])
  })

  it('重复创建同 appId 会话时取 updatedAt 最新的（防御旧数据）', async () => {
    // 直接手工插入两条同 appId 会话（模拟历史脏数据）
    const stale: ChatSession = { id: 's-old', appId: 'app-1', title: '旧', createdAt: 1, updatedAt: 1 }
    const fresh: ChatSession = { id: 's-new', appId: 'app-1', title: '新', createdAt: 2, updatedAt: 2 }
    await db.sessions.bulkAdd([stale, fresh])
    const current = await getSessionByAppId('app-1')
    expect(current?.id).toBe('s-new')
  })
})
