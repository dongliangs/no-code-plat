import type { BlockInfo } from './block'

// AI Copilot 会话：一个画布（appId）一个会话
export interface ChatSession {
  id: string // nanoid
  appId: string // 关联画布
  title: string // 首条用户消息截断
  createdAt: number // 时间戳
  updatedAt: number
}

// 聊天消息：user 为用户输入，assistant 为 AI 回复（可携带生成的物料）
export interface ChatMessage {
  id: string
  sessionId: string
  role: 'user' | 'assistant'
  content: string
  blocks?: BlockInfo[] // 本条消息生成的物料
  status: 'pending' | 'done' | 'error'
  templateId?: string // 触发的指令模版
  createdAt: number
}

// 指令模版：block 粒度生成单物料，page 粒度生成整页编排
export interface PromptTemplate {
  id: string
  title: string
  description: string
  prompt: string // 含 {{变量}} 插槽
  granularity: 'block' | 'page'
}
