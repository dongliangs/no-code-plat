<script setup lang="ts">
import { computed } from 'vue'

import MaterialCard from '@/components/AiCopilot/MaterialCard.vue'
import type { BlockInfo } from '@/types/block'

const props = defineProps<{
  /** 整页生成的新物料（待写入画布） */
  newBlocks: BlockInfo[]
  /** 当前画布物料数量 */
  currentCount: number
}>()

const emit = defineEmits<{
  /** 确认写入：updateBlocks 覆盖画布 */
  confirm: []
  /** 取消：丢弃生成结果，不写入 */
  cancel: []
}>()

// diff 统计（按位置对齐）：updateBlocks 为覆盖式写入，
// 前段位置一一替换，新页面多出的算新增，当前画布多出的算移除
const replacedCount = computed(() => Math.min(props.currentCount, props.newBlocks.length))
const addedCount = computed(() => Math.max(0, props.newBlocks.length - props.currentCount))
const removedCount = computed(() => Math.max(0, props.currentCount - props.newBlocks.length))
</script>

<template>
  <div class="diff-preview">
    <div class="diff-preview-header">
      <span class="diff-preview-title">整页编排预览</span>
      <span class="diff-preview-summary">
        当前画布 {{ currentCount }} 个 → 新页面 {{ newBlocks.length }} 个
      </span>
    </div>

    <div class="diff-preview-stats">
      <span class="diff-stat diff-stat--replace">替换 {{ replacedCount }}</span>
      <span class="diff-stat diff-stat--add">新增 {{ addedCount }}</span>
      <span class="diff-stat diff-stat--remove">移除 {{ removedCount }}</span>
    </div>

    <div class="diff-preview-list">
      <MaterialCard
        v-for="block in newBlocks"
        :key="block.id"
        :block="block"
      />
    </div>

    <p class="diff-preview-tip">
      确认后将替换当前画布全部物料；取消则丢弃本次生成结果（消息流中仍可单独拖拽物料）
    </p>

    <div class="diff-preview-actions">
      <button
        class="diff-btn diff-btn-cancel"
        type="button"
        @click="emit('cancel')"
      >
        取消
      </button>
      <button
        class="diff-btn diff-btn-confirm"
        type="button"
        @click="emit('confirm')"
      >
        确认写入画布
      </button>
    </div>
  </div>
</template>

<style scoped>
.diff-preview {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 4px 0 8px;
  padding: 12px;
  border: 1px solid var(--color-primary);
  border-radius: 10px;
  background-color: var(--color-white);
}

.diff-preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.diff-preview-title {
  font-size: var(--font-size-normal);
  font-weight: var(--font-weight-bolder);
  color: var(--color-text);
}

.diff-preview-summary {
  font-size: var(--font-size-small);
  color: var(--color-gray-700);
}

.diff-preview-stats {
  display: flex;
  gap: 8px;
}

.diff-stat {
  padding: 2px 8px;
  font-size: var(--font-size-small);
  border-radius: 4px;
}

.diff-stat--replace {
  color: #1d39c4;
  background-color: #f0f5ff;
}

.diff-stat--add {
  color: #389e0d;
  background-color: #f6ffed;
}

.diff-stat--remove {
  color: #cf1322;
  background-color: #fff1f0;
}

.diff-preview-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 220px;
  overflow-y: auto;
}

.diff-preview-tip {
  margin: 0;
  font-size: var(--font-size-small);
  color: var(--color-gray-700);
}

.diff-preview-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.diff-btn {
  padding: 4px 12px;
  font-size: var(--font-size-small);
  cursor: pointer;
  border-radius: 6px;
  border: 1px solid var(--color-gray-300);
  background-color: var(--color-white);
}

.diff-btn-cancel:hover {
  border-color: var(--color-gray-700);
}

.diff-btn-confirm {
  color: var(--color-white);
  border-color: var(--color-primary);
  background-color: var(--color-primary);
}

.diff-btn-confirm:hover {
  opacity: 0.9;
}
</style>
