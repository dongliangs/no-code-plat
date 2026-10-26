import type { BlockInfo } from '@/types/block'
import { nanoid } from 'nanoid'

/**
 * 拖拽 payload 工厂（设计文档 4.2 拖拽通路）：
 * 卡片拖出时对物料做深拷贝并生成新 id——
 * 1. 与左侧物料库 getBlocksDefaultData 的「每次拖出都是新实例」行为一致；
 * 2. 避免同一 AI 物料多次拖入画布时 id 冲突（画布按 id 选中 / 更新）；
 * 3. 深拷贝同时剥离 reactive proxy，画布拿到的是纯数据。
 */
export function createDragPayload(block: BlockInfo): BlockInfo {
  return JSON.parse(JSON.stringify({ ...block, id: nanoid() }))
}
