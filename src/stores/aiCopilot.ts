import { nanoid } from 'nanoid'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { promptTemplates } from '@/constants/aiPromptTemplates'
import { generateBlocks } from '@/services/ai'
import { addMessage, clearSessionByAppId, ensureSession, getMessagesByAppId } from '@/services/db'
import { useAppEditorStore } from '@/stores/appEditor'
import type { ChatMessage, PromptTemplate } from '@/types/ai'
import type { BlockInfo } from '@/types/block'

// 当前一期为单画布编辑器，appId 固定；二期多画布时改为路由参数注入
const APP_ID = 'default-app'

/**
 * AI Copilot 会话运行态（设计文档 3.1 / 4.5）：
 * Pinia 管理内存态（运行态视图），写消息时同步落 Dexie（持久层）。
 * IndexedDB 异常时静默降级为纯内存态，不阻塞消息流（设计文档 7）。
 */
export const useAiCopilotStore = defineStore('aiCopilot', () => {
  // ---- 面板 ----
  const panelOpen = ref(false)
  const historyLoaded = ref(false)

  async function togglePanel() {
    panelOpen.value = !panelOpen.value
    // 首次展开时加载当前画布的历史消息
    if (panelOpen.value && !historyLoaded.value) {
      await loadHistory()
    }
  }

  /** 按 appId 恢复历史消息；失败时静默保持空会话，避免每次展开都重复打失败请求 */
  async function loadHistory() {
    try {
      const history = await getMessagesByAppId(APP_ID)
      messages.value = history.filter((message) => message.status !== 'pending')
      if (messages.value.length > 0) {
        // 恢复后续接历史时间戳，避免新消息与恢复的最后一条同毫秒冲突
        lastMessageTime = messages.value[messages.value.length - 1].createdAt
      }
    } catch (error) {
      console.warn('[ai] 加载历史消息失败，将以空会话继续：', error)
    } finally {
      historyLoaded.value = true
    }
  }

  // ---- 消息流（运行态） ----
  const messages = ref<ChatMessage[]>([])
  const sending = ref(false)
  const inputText = ref('')

  // ---- 指令模版与整页编排（设计文档 4.3） ----
  // 当前选中的模版：点击模版时设置，填充输入框后由用户改写并发送
  const selectedTemplateId = ref<string | null>(null)
  // 整页生成结果待确认态：非空时聊天面板渲染 diff 预览，确认 / 取消后清空
  const pendingPageBlocks = ref<BlockInfo[] | null>(null)

  let lastMessageTime = 0

  /** 消息时间戳严格递增：同毫秒内的多条消息若 createdAt 相同，IndexedDB 索引遍历顺序不确定，会导致恢复历史时消息乱序 */
  function nextTimestamp(): number {
    const now = Date.now()
    lastMessageTime = now > lastMessageTime ? now : lastMessageTime + 1
    return lastMessageTime
  }

  async function sendMessage(text?: string) {
    const content = (text ?? inputText.value).trim()
    if (!content || sending.value) {
      return
    }
    // 同步占位：防止下方 ensureSession 的 await 间隙出现并发调用
    sending.value = true
    inputText.value = ''
    const template = getSelectedTemplate()
    const granularity = template?.granularity ?? 'block'
    try {
      const sessionId = await resolveSessionId(content)

      const userMessage: ChatMessage = {
        id: nanoid(),
        sessionId,
        role: 'user',
        content,
        status: 'done',
        templateId: template?.id,
        createdAt: nextTimestamp()
      }
      messages.value.push(userMessage)
      await persistMessage(userMessage)

      const pendingMessage: ChatMessage = {
        id: nanoid(),
        sessionId,
        role: 'assistant',
        content: '',
        status: 'pending',
        templateId: template?.id,
        createdAt: nextTimestamp()
      }
      messages.value.push(pendingMessage)
      // 取数组中的 proxy 引用更新，确保触发响应式
      const pending = messages.value[messages.value.length - 1]
      try {
        const blocks = await generateBlocks(content, { granularity })
        pending.blocks = blocks
        pending.content = `已生成 ${blocks.length} 个物料`
        pending.status = 'done'
        // page 粒度：整页编排结果不直接入画布，进入 diff 预览待确认（设计文档 4.3）
        if (granularity === 'page') {
          pendingPageBlocks.value = blocks
        }
      } catch {
        pending.status = 'error'
        pending.content = '生成失败，请稍后重试'
      }
      // assistant 完成后落库（含最终 status 与 blocks）
      await persistMessage({ ...pending })
    } finally {
      sending.value = false
      // 模版只对一次发送生效；再次发送走普通 block 粒度
      selectedTemplateId.value = null
    }
  }

  /** 点击模版：记录选中态并把含 {{变量}} 的 prompt 填充进输入框，由用户改写后发送 */
  function selectTemplate(template: PromptTemplate) {
    selectedTemplateId.value = template.id
    inputText.value = template.prompt
  }

  function getSelectedTemplate(): PromptTemplate | undefined {
    return promptTemplates.find((item) => item.id === selectedTemplateId.value)
  }

  /** 确认整页写入：经 diff 预览确认后，通过 appEditor 单一写入口覆盖画布（设计文档 3.2 / 4.3） */
  function confirmPageApply() {
    if (!pendingPageBlocks.value) {
      return
    }
    const appEditor = useAppEditorStore()
    // 深拷贝写入：隔离画布后续编辑与消息流中 blocks 的引用
    appEditor.updateBlocks(JSON.parse(JSON.stringify(pendingPageBlocks.value)) as BlockInfo[])
    pendingPageBlocks.value = null
  }

  /** 取消整页写入：丢弃生成结果，不触碰画布 */
  function cancelPageApply() {
    pendingPageBlocks.value = null
  }

  /** 首条消息自动创建会话记录（title 截断）；落库失败时返回空 sessionId，消息仅在内存态 */
  async function resolveSessionId(content: string): Promise<string> {
    try {
      const session = await ensureSession(APP_ID, content)
      return session.id
    } catch (error) {
      console.warn('[ai] 会话落库失败，消息仅在内存态：', error)
      return ''
    }
  }

  async function persistMessage(message: ChatMessage) {
    try {
      // reactive proxy 无法被结构化克隆，落库前统一转纯数据
      const plain = JSON.parse(JSON.stringify(message)) as ChatMessage
      await addMessage(plain)
    } catch (error) {
      console.warn('[ai] 消息落库失败：', error)
    }
  }

  /** 清空当前画布会话（FR8）：内存态与 IndexedDB 同步清空 */
  async function clearSession() {
    messages.value = []
    try {
      await clearSessionByAppId(APP_ID)
    } catch (error) {
      console.warn('[ai] 清空会话失败：', error)
    }
  }

  return {
    panelOpen,
    togglePanel,
    messages,
    sending,
    inputText,
    sendMessage,
    clearSession,
    selectedTemplateId,
    pendingPageBlocks,
    selectTemplate,
    confirmPageApply,
    cancelPageApply
  }
})
