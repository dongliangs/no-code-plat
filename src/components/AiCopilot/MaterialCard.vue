<script setup lang="ts">
import { computed } from 'vue'

import { blocksBaseMeta } from '@/constants/blocksBaseMeta'
import type { BlockInfo } from '@/types/block'

/**
 * AI 生成物料的卡片（设计文档 4.2）：
 * 在 assistant 消息内渲染，卡片整体可拖拽（smooth-dnd），拖入画布即添加物料。
 */
const props = defineProps<{
  block: BlockInfo
}>()

const meta = computed(() => blocksBaseMeta[props.block.type])

// 内容摘要（notes 的富文本剥掉 HTML 标签后截断）
const summary = computed(() => {
  const blockProps = props.block.props as unknown as Record<string, unknown>
  switch (props.block.type) {
    case 'quote':
    case 'heroTitle':
    case 'button':
    case 'notes':
      return stripHtml(String(blockProps.content ?? '')).slice(0, 40)
    case 'image':
      return '图片'
    case 'chart':
      return `图表（${String(blockProps.chartType ?? '')}）`
    case 'form':
      return `表单（${countFields(blockProps.fields)} 个字段）`
    case 'view':
      return '数据视图'
    default:
      return ''
  }
})

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').trim()
}

function countFields(fields: unknown): number {
  return Array.isArray(fields) ? fields.length : 0
}
</script>

<template>
  <div
class="material-card"
title="按住拖入画布"
>
    <div class="material-card-icon">
      <component :is="meta?.icon" />
    </div>
    <div class="material-card-info">
      <div class="material-card-label">
{{ block.label }}
</div>
      <div class="material-card-summary">
{{ summary }}
</div>
    </div>
  </div>
</template>

<style scoped>
.material-card {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px;
  cursor: grab;
  user-select: none;
  border: 1px solid var(--color-gray-300);
  border-radius: 8px;
  background-color: var(--color-white);
  transition: border-color 0.125s ease 0s, box-shadow 0.125s ease 0s;
}

.material-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 2px 8px rgb(62 65 86 / 12%);
}

.material-card:active {
  cursor: grabbing;
}

.material-card-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  color: var(--color-white);
  font-size: var(--font-size-large);
  border-radius: 8px;
  background-color: var(--color-primary);
}

.material-card-info {
  flex: 1;
  min-width: 0;
}

.material-card-label {
  font-size: var(--font-size-normal);
  font-weight: var(--font-weight-bold);
  color: var(--color-gray-900);
}

.material-card-summary {
  overflow: hidden;
  font-size: var(--font-size-small);
  color: var(--color-gray-700);
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
