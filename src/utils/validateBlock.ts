import { blocksBaseMeta, getBlocksDefaultData } from '@/constants/blocksBaseMeta'
import type { BlockInfo, BlockType } from '@/types/block'
import { nanoid } from 'nanoid'
import { sanitizeHtml } from '@/utils/sanitize'

/**
 * AI 生成物料的「校验 - 修复 - 降级」管道（权威实现，见设计文档 4.4）。
 *
 * 分级策略：
 * - 可修复项（id / label / content / url / fields 等）：管道内直接修复，记入 repairs；
 * - 不可修复项（type 非法）：该条整体降级为默认物料，记入 errors（由上层携错误重试）；
 * - 输出永远保证 blocks 中的物料可直接入画布。
 */

// 与 BlockType 全集保持一致（8 种）
const VALID_BLOCK_TYPES: readonly BlockType[] = [
  'quote',
  'notes',
  'heroTitle',
  'image',
  'view',
  'chart',
  'button',
  'form'
]

// type 非法时的整体降级类型（最通用、无外部依赖的物料）
const FALLBACK_TYPE: BlockType = 'heroTitle'

const QUOTE_STATUSES = ['success', 'warning', 'error'] as const

const CHART_TYPES = ['echarts', 'canvas', 'svg'] as const

export interface ValidateBlocksResult {
  /** 校验修复后的合法物料（含降级项），可直接入画布 */
  blocks: BlockInfo[]
  /** 不可自动修复的问题（type 非法 / 结构非法等），用于携错重试与 UI 提示 */
  errors: string[]
  /** 已执行的自动修复记录（可观察性） */
  repairs: string[]
}

export function validateBlocks(raw: unknown): ValidateBlocksResult {
  if (!Array.isArray(raw)) {
    return { blocks: [], errors: [`AI 输出必须是物料数组，实际类型：${describeType(raw)}`], repairs: [] }
  }
  const errors: string[] = []
  const repairs: string[] = []
  const blocks: BlockInfo[] = []
  raw.forEach((item, index) => {
    const block = validateBlockItem(item, index, errors, repairs)
    if (block) blocks.push(block)
  })
  return { blocks, errors, repairs }
}

function validateBlockItem(
  item: unknown,
  index: number,
  errors: string[],
  repairs: string[]
): BlockInfo | null {
  const where = `第 ${index + 1} 项物料`
  if (!isPlainObject(item)) {
    errors.push(`${where}不是对象，已剔除`)
    return null
  }
  if (!isValidBlockType(item.type)) {
    errors.push(`${where}的 type 非法：${String(item.type)}，已整体降级为默认物料`)
    return getBlocksDefaultData(FALLBACK_TYPE)
  }
  return repairBlock(item, item.type, where, repairs)
}

function repairBlock(item: Record<string, unknown>, type: BlockType, where: string, repairs: string[]): BlockInfo {
  const def = getBlocksDefaultData(type)
  const defProps = def.props as unknown as Record<string, unknown>
  const block: Record<string, unknown> = { type }
  block.id = isNonEmptyString(item.id)
    ? item.id
    : repair(repairs, `${where}缺失 id，已自动生成`, () => nanoid())
  block.label = isNonEmptyString(item.label)
    ? item.label
    : repair(repairs, `${where}缺失 label，已使用类型默认 label`, () => blocksBaseMeta[type].label)
  const props = isPlainObject(item.props) ? item.props : {}
  block.props = repairProps(type, props, defProps, where, repairs)
  return block as unknown as BlockInfo
}

function repairProps(
  type: BlockType,
  props: Record<string, unknown>,
  defProps: Record<string, unknown>,
  where: string,
  repairs: string[]
): Record<string, unknown> {
  switch (type) {
    case 'heroTitle':
    case 'button':
      return { content: withContent(props, defProps, where, repairs) }
    case 'notes':
      return { content: withSanitizedContent(props, defProps, where, repairs) }
    case 'quote':
      return {
        content: withContent(props, defProps, where, repairs),
        status: withEnum(props.status, QUOTE_STATUSES, 'success', 'status', where, repairs)
      }
    case 'image':
      return { url: withImageUrl(props, defProps, where, repairs) }
    case 'chart':
      return {
        chartType: withEnum(props.chartType, CHART_TYPES, 'echarts', 'chartType', where, repairs)
      }
    case 'form':
      return { fields: withFormFields(props, defProps, where, repairs) }
    case 'view':
      return {
        fields: withViewFields(props, defProps, where, repairs),
        fieldProps: withArrayProp(props, defProps, 'fieldProps', where, repairs),
        data: withArrayProp(props, defProps, 'data', where, repairs)
      }
  }
}

function withContent(
  props: Record<string, unknown>,
  defProps: Record<string, unknown>,
  where: string,
  repairs: string[]
): string {
  return isNonEmptyString(props.content)
    ? props.content
    : repair(repairs, `${where}缺失 content，已使用默认文案`, () => defProps.content as string)
}

/** notes 物料 content 为 HTML：DOMPurify 清洗后放行，防 XSS 注入（设计文档 7.2.3） */
function withSanitizedContent(
  props: Record<string, unknown>,
  defProps: Record<string, unknown>,
  where: string,
  repairs: string[]
): string {
  const content = withContent(props, defProps, where, repairs)
  const sanitized = sanitizeHtml(content)
  if (sanitized !== content) {
    repairs.push(`${where}的 content 含不安全 HTML，已清洗`)
  }
  return sanitized
}

function withImageUrl(
  props: Record<string, unknown>,
  defProps: Record<string, unknown>,
  where: string,
  repairs: string[]
): string {
  if (isHttpUrl(props.url)) return props.url
  return repair(repairs, `${where}的 url 非法（仅允许 http/https），已替换为默认占位图`, () => defProps.url as string)
}

function withEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
  key: string,
  where: string,
  repairs: string[]
): T {
  return allowed.includes(value as T)
    ? (value as T)
    : repair(repairs, `${where}的 ${key} 非法，已降级为默认值 ${fallback}`, () => fallback)
}

function withFormFields(
  props: Record<string, unknown>,
  defProps: Record<string, unknown>,
  where: string,
  repairs: string[]
): unknown {
  const isValid =
    Array.isArray(props.fields) &&
    (props.fields as unknown[]).every(
      (field) => isPlainObject(field) && isNonEmptyString(field.type) && isNonEmptyString(field.label)
    )
  return isValid
    ? props.fields
    : repair(repairs, `${where}的 fields 结构非法，已降级为默认值`, () => defProps.fields)
}

function withViewFields(
  props: Record<string, unknown>,
  defProps: Record<string, unknown>,
  where: string,
  repairs: string[]
): unknown {
  const isValid =
    isPlainObject(props.fields) &&
    Object.values(props.fields).every((field) => isPlainObject(field) && isNonEmptyString(field.type))
  return isValid
    ? props.fields
    : repair(repairs, `${where}的 fields 结构非法，已降级为默认值`, () => defProps.fields)
}

function withArrayProp(
  props: Record<string, unknown>,
  defProps: Record<string, unknown>,
  key: string,
  where: string,
  repairs: string[]
): unknown {
  return Array.isArray(props[key])
    ? props[key]
    : repair(repairs, `${where}的 ${key} 非法，已降级为默认值`, () => defProps[key])
}

/** 记录一条修复日志并返回兜底值 */
function repair<T>(repairs: string[], message: string, fallback: () => T): T {
  repairs.push(message)
  return fallback()
}

function isValidBlockType(value: unknown): value is BlockType {
  return typeof value === 'string' && VALID_BLOCK_TYPES.includes(value as BlockType)
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== ''
}

function isHttpUrl(value: unknown): value is string {
  if (!isNonEmptyString(value)) return false
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function describeType(value: unknown): string {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  return typeof value
}
