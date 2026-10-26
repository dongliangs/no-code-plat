import { nanoid } from 'nanoid'
import Dexie, { type EntityTable } from 'dexie'
import type { ChatMessage, ChatSession } from '@/types/ai'

/**
 * AI Copilot 持久层（设计文档 4.5 / 5.1）：
 * - Dexie 封装 IndexedDB，sessions / messages 两张表，messages 以 sessionId 索引；
 * - 一个画布（appId）一个会话，首次发消息时自动创建 session 记录；
 * - 消息体的 blocks 以对象形式直接存入（IndexedDB 原生结构化克隆）。
 *
 * IndexedDB 异常兜底策略（设计文档 7）：调用方需自行 try/catch 静默处理，
 * 持久化失败不阻塞消息流、不导致面板崩溃。
 */

class CopilotDB extends Dexie {
  sessions!: EntityTable<ChatSession, 'id'>
  messages!: EntityTable<ChatMessage, 'id'>

  constructor() {
    super('lowcode-ai-copilot')
    // 仅索引需要查询的字段，其余字段不建索引
    this.version(1).stores({
      sessions: 'id, appId, updatedAt',
      messages: 'id, sessionId, createdAt'
    })
  }
}

export const db = new CopilotDB()

/** 取画布当前会话（updatedAt 最新的一条），无则返回 undefined */
export async function getSessionByAppId(appId: string): Promise<ChatSession | undefined> {
  const sessions = await db.sessions.where('appId').equals(appId).sortBy('updatedAt')
  return sessions[sessions.length - 1]
}

/** 无会话则创建（title 为首条用户消息截断），有则复用并刷新 updatedAt */
export async function ensureSession(appId: string, title: string): Promise<ChatSession> {
  const existing = await getSessionByAppId(appId)
  if (existing) {
    const updated: ChatSession = { ...existing, updatedAt: Date.now() }
    await db.sessions.put(updated)
    return updated
  }
  const now = Date.now()
  const session: ChatSession = {
    id: nanoid(),
    appId,
    title: title.slice(0, 30),
    createdAt: now,
    updatedAt: now
  }
  await db.sessions.add(session)
  return session
}

/** 加载画布当前会话的全部消息（按 createdAt 升序） */
export async function getMessagesByAppId(appId: string): Promise<ChatMessage[]> {
  const session = await getSessionByAppId(appId)
  if (!session) {
    return []
  }
  return db.messages.where('sessionId').equals(session.id).sortBy('createdAt')
}

/** 追加一条消息 */
export async function addMessage(message: ChatMessage): Promise<void> {
  await db.messages.add(message)
}

/** 清空画布会话：删除 session 与级联 messages（FR8） */
export async function clearSessionByAppId(appId: string): Promise<void> {
  const session = await getSessionByAppId(appId)
  if (!session) {
    return
  }
  await db.transaction('rw', db.sessions, db.messages, async () => {
    await db.messages.where('sessionId').equals(session.id).delete()
    await db.sessions.delete(session.id)
  })
}
