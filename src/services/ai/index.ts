import { getBlocksDefaultData } from '@/constants/blocksBaseMeta'
import type { BlockInfo, BlockType } from '@/types/block'
import { validateBlocks } from '@/utils/validateBlock'

/**
 * AI 服务层（设计文档 3.1 / 4.1）：
 * - Provider 抽象：Mock 与 OpenAI 兼容双轨，可替换（GLM / DeepSeek / Qwen 等）；
 * - generateBlocks 统一入口：原始输出 -> 校验修复管道 -> 携错重试 1 次 -> 降级兜底，
 *   任何情况下都返回可直接入画布的合法 BlockInfo[]。
 */

const BLOCK_TYPES: readonly BlockType[] = [
  'quote',
  'notes',
  'heroTitle',
  'image',
  'view',
  'chart',
  'button',
  'form'
]

// 整体重试仍失败、且管道降级后仍无可用物料时的最终兜底类型
const FALLBACK_TYPE: BlockType = 'heroTitle'

export interface AiProvider {
  /** provider 标识（mock / openai-compatible） */
  name: string
  /** 返回原始 JSON 输出（未经校验） */
  generateRaw(
    prompt: string,
    options?: { signal?: AbortSignal; granularity?: 'block' | 'page' }
  ): Promise<unknown>
}

export interface GenerateOptions {
  signal?: AbortSignal
  /** 生成粒度：block 单物料，page 整页编排（设计文档 4.3） */
  granularity?: 'block' | 'page'
  /** 注入自定义 provider（测试用），缺省按环境变量自动选择 */
  provider?: AiProvider
}

export interface OpenAICompatibleConfig {
  /** 如 https://api.deepseek.com/v1 */
  baseURL: string
  apiKey: string
  model: string
}

// ---------------------------------------------------------------------------
// Mock Provider（FR9：无 API Key 时兜底，链路与真实 Provider 完全一致）
// ---------------------------------------------------------------------------

// 固定演示物料：刻意不带 id，由校验管道统一补齐，保证与真实链路行为一致
const MOCK_HERO_TITLE = {
  type: 'heroTitle',
  label: '主标题',
  props: { content: 'AI 智能搭建，让创意即刻成型' }
}

const MOCK_QUOTE = {
  type: 'quote',
  label: '产品主张',
  props: { content: '所见即所得，所想即所建', status: 'success' }
}

const MOCK_NOTES = {
  type: 'notes',
  label: '使用说明',
  props: { content: '<p>在输入框中描述需求，例如：生成一个产品介绍页，AI 将自动生成对应物料。</p>' }
}

const MOCK_IMAGE = {
  type: 'image',
  label: '产品配图',
  props: {
    url: 'https://images.pexels.com/photos/2577274/pexels-photo-2577274.jpeg?auto=compress&cs=tinysrgb&w=1600'
  }
}

const MOCK_VIEW = {
  type: 'view',
  label: '销售数据',
  props: {
    fields: {
      product: { type: 'text' },
      amount: { type: 'number' }
    },
    fieldProps: [],
    data: []
  }
}

const MOCK_CHART = {
  type: 'chart',
  label: '销量趋势',
  props: { chartType: 'echarts' }
}

const MOCK_BUTTON = {
  type: 'button',
  label: '转化按钮',
  props: { content: '立即开始搭建' }
}

const MOCK_FORM = {
  type: 'form',
  label: '信息收集表单',
  props: {
    fields: [
      { type: 'text', label: '姓名', placeholder: '请输入姓名', required: true },
      { type: 'text', label: '手机号', placeholder: '请输入手机号', required: true },
      { type: 'textarea', label: '留言', placeholder: '想对我们说点什么' }
    ]
  }
}

// 具体关键词在前，避免被宽泛规则抢先命中
const MOCK_RULES: { pattern: RegExp; material: Record<string, unknown> }[] = [
  { pattern: /表单|收集|留言|报名|反馈|预约/, material: MOCK_FORM },
  { pattern: /表格|视图|列表|明细|数据表/, material: MOCK_VIEW },
  { pattern: /图表|趋势|看板|销量/, material: MOCK_CHART },
  { pattern: /图片|照片|图像|配图|封面/, material: MOCK_IMAGE },
  { pattern: /引述|引用|名言|金句|口号/, material: MOCK_QUOTE },
  { pattern: /笔记|说明|备注/, material: MOCK_NOTES },
  { pattern: /按钮|操作|提交/, material: MOCK_BUTTON },
  { pattern: /标题|头图/, material: MOCK_HERO_TITLE }
]

// 整页编排组合（page 粒度，设计文档 5.3）：与单物料一致，刻意不带 id 由校验管道补齐
const MOCK_PRODUCT_PAGE: Record<string, unknown>[] = [
  MOCK_HERO_TITLE,
  MOCK_IMAGE,
  MOCK_QUOTE,
  MOCK_FORM
]

const MOCK_DASHBOARD_PAGE: Record<string, unknown>[] = [MOCK_HERO_TITLE, MOCK_CHART, MOCK_VIEW]

const MOCK_SIGNUP_PAGE: Record<string, unknown>[] = [MOCK_HERO_TITLE, MOCK_QUOTE, MOCK_IMAGE, MOCK_FORM]

export const mockProvider: AiProvider = {
  name: 'mock',
  async generateRaw(prompt: string, options): Promise<unknown> {
    // page 粒度：返回整页编排组合
    if (options?.granularity === 'page') {
      let page = MOCK_PRODUCT_PAGE
      if (/看板|大屏|仪表盘/.test(prompt)) {
        page = MOCK_DASHBOARD_PAGE
      } else if (/报名|活动/.test(prompt)) {
        page = MOCK_SIGNUP_PAGE
      }
      return structuredClone(page)
    }
    const rule = MOCK_RULES.find((item) => item.pattern.test(prompt))
    return [structuredClone(rule?.material ?? MOCK_HERO_TITLE)]
  }
}

// ---------------------------------------------------------------------------
// OpenAI 兼容 Provider（调用骨架，Step 7 接入真实 API）
// ---------------------------------------------------------------------------

export function createOpenAICompatibleProvider(config: OpenAICompatibleConfig): AiProvider {
  return {
    name: 'openai-compatible',
    async generateRaw(prompt: string, options): Promise<unknown> {
      const res = await fetch(`${config.baseURL.replace(/\/+$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: 'system', content: buildSystemPrompt(options?.granularity) },
            { role: 'user', content: prompt }
          ],
          // json_object 兼容面最广；接入真实服务后可按能力升级为 json_schema 严格约束
          response_format: { type: 'json_object' }
        }),
        signal: options?.signal
      })
      if (!res.ok) {
        throw new Error(`AI 接口请求失败：HTTP ${res.status}`)
      }
      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[]
      }
      return parseAiJson(data.choices?.[0]?.message?.content ?? '')
    }
  }
}

/** 系统提示：角色 + 任务约束 + few-shot 示例（直接复用 getBlocksDefaultData 输出，见设计文档 4.1）；page 粒度附加整页编排约束 */
export function buildSystemPrompt(granularity: 'block' | 'page' = 'block'): string {
  const examples = BLOCK_TYPES.map((type) => JSON.stringify(getBlocksDefaultData(type))).join('\n')
  const lines = [
    '你是低代码平台的物料生成助手，根据用户描述生成页面物料数组。',
    '输出规则：',
    '1. 仅输出 JSON 数组，不要输出 markdown 代码块标记或任何解释文字；',
    `2. 每个物料的 type 必须是以下 8 种之一：${BLOCK_TYPES.join('、')}；`,
    '3. 每个物料必须包含唯一非空 id、label、type、props 四个字段；',
    '4. 数组长度为 1 到 12。'
  ]
  if (granularity === 'page') {
    lines.push('5. 本次为整页编排任务：物料数组将作为完整页面覆盖画布，请按合理的页面叙事顺序组织（如标题在上、表单在下）。')
  }
  lines.push('以下是各类型物料的完整合法示例：', examples)
  return lines.join('\n')
}

/** 解析 LLM 返回内容：剥掉模型偶尔附带的 markdown 代码块围栏后 JSON.parse */
function parseAiJson(content: string): unknown {
  const text = content
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim()
  return JSON.parse(text)
}

// ---------------------------------------------------------------------------
// Provider 选择与统一入口
// ---------------------------------------------------------------------------

/** 未配置 API Key 时自动降级为 Mock Provider（FR9） */
export function getAiProvider(): AiProvider {
  const env = import.meta.env as unknown as Record<string, string | undefined>
  const { VITE_AI_API_BASE_URL: baseURL, VITE_AI_API_KEY: apiKey, VITE_AI_MODEL: model } = env
  if (baseURL && apiKey && model) {
    return createOpenAICompatibleProvider({ baseURL, apiKey, model })
  }
  return mockProvider
}

/**
 * 生成物料统一入口（设计文档 4.1 步骤 3-6 / 3.2 失败降级链）：
 * 调用 -> 校验修复 -> 有错误则携错误重试 1 次 -> 仍失败返回降级结果。
 */
export async function generateBlocks(prompt: string, options?: GenerateOptions): Promise<BlockInfo[]> {
  const provider = options?.provider ?? getAiProvider()
  const signal = options?.signal
  const granularity = options?.granularity ?? 'block'

  const firstRaw = await safeGenerateRaw(provider, prompt, signal, granularity)
  const first = validateBlocks(firstRaw)
  if (first.errors.length === 0) {
    return first.blocks
  }

  // 携错误信息重试 1 次
  const retryPrompt = [
    prompt,
    '',
    '上一次输出存在以下问题，请修正后重新输出：',
    ...first.errors.map((error) => `- ${error}`)
  ].join('\n')
  const secondRaw = await safeGenerateRaw(provider, retryPrompt, signal, granularity)
  const second = validateBlocks(secondRaw)

  // 仍失败：返回管道降级结果（type 非法项已替换为默认物料）；全空时兜底默认物料
  return second.blocks.length > 0 ? second.blocks : [getBlocksDefaultData(FALLBACK_TYPE)]
}

/** provider 调用失败（网络 / 解析异常）时不抛出，返回 null 交给校验管道记错，统一走重试与降级链 */
async function safeGenerateRaw(
  provider: AiProvider,
  prompt: string,
  signal?: AbortSignal,
  granularity: 'block' | 'page' = 'block'
): Promise<unknown> {
  try {
    return await provider.generateRaw(prompt, { signal, granularity })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error // 用户主动取消，不降级产出物料
    }
    console.warn('[ai] provider 调用失败，将走重试 / 降级链：', error)
    return null
  }
}
