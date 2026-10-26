<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'

import { createDragPayload } from '@/components/AiCopilot/dragPayload'
import MaterialCard from '@/components/AiCopilot/MaterialCard.vue'
import PageDiffPreview from '@/components/AiCopilot/PageDiffPreview.vue'
import { SmoothDndContainer } from '@/components/SmoothDnd/SmoothDndContainer'
import { SmoothDndDraggable } from '@/components/SmoothDnd/SmoothDndDraggable'
import { promptTemplates } from '@/constants/aiPromptTemplates'
import { useAiCopilotStore } from '@/stores/aiCopilot'
import { useAppEditorStore } from '@/stores/appEditor'
import type { BlockInfo } from '@/types/block'

const aiCopilot = useAiCopilotStore()
const appEditor = useAppEditorStore()

const messageListRef = ref<HTMLElement | null>(null)

// 新消息上屏后滚动到底部
watch(
  () => aiCopilot.messages.length,
  async () => {
    await nextTick()
    messageListRef.value?.scrollTo({ top: messageListRef.value.scrollHeight })
  }
)

// 卡片拖出时深拷贝并换新 id：与物料库行为一致，避免重复拖入画布 id 冲突
function getChildPayload(blocks: BlockInfo[] | undefined) {
  return (index: number) => {
    const block = blocks?.[index]
    return block ? createDragPayload(block) : null
  }
}

function handleKeydown(event: KeyboardEvent) {
  // Enter 发送；中文输入法组合期（isComposing）的回车不发送
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault()
    aiCopilot.sendMessage()
  }
}

function handleClear() {
  if (aiCopilot.messages.length === 0) {
    return
  }
  if (window.confirm('确定清空当前画布的 AI 会话吗？')) {
    aiCopilot.clearSession()
  }
}
</script>

<template>
  <!-- 悬浮球（面板展开时隐藏） -->
  <button
    v-show="!aiCopilot.panelOpen"
    class="ai-fab"
    type="button"
    title="AI 物料助手"
    @click="aiCopilot.togglePanel"
  >
    AI
  </button>

  <!-- 聊天面板 -->
  <div
v-if="aiCopilot.panelOpen"
class="ai-panel"
>
    <header class="ai-panel-header">
      <span class="ai-panel-title">AI 物料助手</span>
      <div class="ai-panel-actions">
        <button
          class="ai-panel-clear"
          type="button"
          title="清空会话"
          @click="handleClear"
        >
          清空
        </button>
        <button
class="ai-panel-close"
type="button"
title="收起"
@click="aiCopilot.togglePanel"
>
          ×
        </button>
      </div>
    </header>

    <div
ref="messageListRef"
class="ai-messages"
>
      <div
v-if="aiCopilot.messages.length === 0"
class="ai-empty"
>
        描述你想要的物料，AI 帮你生成后可直接加入画布
      </div>
      <div
        v-for="message in aiCopilot.messages"
        :key="message.id"
        class="ai-message"
        :class="`ai-message--${message.role}`"
      >
        <div
class="ai-bubble"
:class="{ 'ai-bubble--error': message.status === 'error' }"
>
          <template v-if="message.status === 'pending'">
            <span class="ai-loading">生成中…</span>
          </template>
          <template v-else>
{{ message.content }}
            <!-- 物料卡片：可拖拽入画布（group-name 与画布/物料库一致） -->
            <smooth-dnd-container
              v-if="message.blocks?.length"
              behaviour="copy"
              group-name="blocks"
              orientation="vertical"
              :get-child-payload="getChildPayload(message.blocks)"
              tag="div"
              class="ai-material-list"
            >
              <smooth-dnd-draggable
                v-for="block in message.blocks"
                :key="block.id"
              >
                <MaterialCard :block="block" />
              </smooth-dnd-draggable>
            </smooth-dnd-container>
</template>
        </div>
      </div>
    </div>

    <footer class="ai-input-bar">
      <!-- 整页编排 diff 预览（page 粒度生成完成后出现，确认 / 取消后消失） -->
      <PageDiffPreview
        v-if="aiCopilot.pendingPageBlocks"
        :new-blocks="aiCopilot.pendingPageBlocks"
        :current-count="appEditor.blocks.length"
        @confirm="aiCopilot.confirmPageApply"
        @cancel="aiCopilot.cancelPageApply"
      />

      <!-- 指令模版：点击填充输入框（page 粒度整页编排，block 粒度单物料） -->
      <div class="ai-templates">
        <button
          v-for="template in promptTemplates"
          :key="template.id"
          type="button"
          class="ai-template-chip"
          :class="{ 'ai-template-chip--active': aiCopilot.selectedTemplateId === template.id }"
          :title="template.description"
          @click="aiCopilot.selectTemplate(template)"
        >
          {{ template.title }}<span
            v-if="template.granularity === 'page'"
            class="ai-template-badge"
>整页</span>
        </button>
      </div>

      <textarea
        v-model="aiCopilot.inputText"
        class="ai-input"
        rows="2"
        placeholder="描述你想要的物料，Enter 发送"
        :disabled="aiCopilot.sending"
        @keydown="handleKeydown"
      />
    </footer>
  </div>
</template>

<style scoped>
.ai-fab {
  position: fixed;
  right: 32px;
  bottom: 32px;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  font-size: var(--font-size-normal);
  font-weight: var(--font-weight-bolder);
  color: var(--color-white);
  cursor: pointer;
  border: none;
  border-radius: 50%;
  background-color: var(--color-primary);
  box-shadow: 0 4px 16px rgb(62 65 86 / 25%);
}

.ai-fab:hover {
  opacity: 0.9;
}

.ai-panel {
  position: fixed;
  right: 32px;
  bottom: 32px;
  z-index: 100;
  display: flex;
  flex-direction: column;
  width: 360px;
  height: 480px;
  overflow: hidden;
  border-radius: 12px;
  background-color: var(--color-white);
  box-shadow: 0 12px 32px rgb(62 65 86 / 20%);
}

.ai-panel-header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  height: 44px;
  padding: 0 12px 0 16px;
  color: var(--color-white);
  background-color: var(--color-primary);
}

.ai-panel-title {
  font-size: var(--font-size-normal);
  font-weight: var(--font-weight-bold);
}

.ai-panel-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.ai-panel-clear {
  font-size: var(--font-size-small);
  color: var(--color-white);
  cursor: pointer;
  border: none;
  background: none;
}

.ai-panel-clear:hover {
  opacity: 0.8;
}

.ai-panel-close {
  font-size: var(--font-size-large);
  color: var(--color-white);
  cursor: pointer;
  border: none;
  background: none;
}

.ai-panel-close:hover {
  opacity: 0.8;
}

.ai-messages {
  flex: 1;
  padding: 12px;
  overflow-y: auto;
  background-color: var(--color-gray-100);
}

.ai-empty {
  margin-top: 24px;
  font-size: var(--font-size-normal);
  color: var(--color-gray-700);
  text-align: center;
}

.ai-message {
  display: flex;
  margin-bottom: 8px;
}

.ai-message--user {
  justify-content: flex-end;
}

.ai-message--assistant {
  justify-content: flex-start;
}

.ai-bubble {
  max-width: 80%;
  padding: 8px 12px;
  font-size: var(--font-size-normal);
  overflow-wrap: break-word;
  border-radius: 10px;
  background-color: var(--color-white);
  box-shadow: 0 1px 2px rgb(62 65 86 / 8%);
}

.ai-message--user .ai-bubble {
  color: var(--color-white);
  background-color: var(--color-primary);
}

.ai-bubble--error {
  color: #d4380d;
  background-color: #fff2e8;
}

.ai-material-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
}

.ai-loading {
  color: var(--color-gray-700);
}

.ai-input-bar {
  flex-shrink: 0;
  padding: 8px;
  border-top: 1px solid var(--color-gray-300);
}

.ai-input {
  width: 100%;
  box-sizing: border-box;
  padding: 8px;
  font-size: var(--font-size-normal);
  font-family: inherit;
  resize: none;
  border: 1px solid var(--color-gray-300);
  border-radius: 8px;
  outline: none;
}

.ai-input:focus {
  border-color: var(--color-primary);
}

.ai-input:disabled {
  cursor: not-allowed;
  background-color: var(--color-gray-100);
}

.ai-templates {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 6px;
}

.ai-template-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  font-size: var(--font-size-small);
  color: var(--color-text);
  cursor: pointer;
  border: 1px solid var(--color-gray-300);
  border-radius: 999px;
  background-color: var(--color-white);
}

.ai-template-chip:hover {
  border-color: var(--color-primary);
}

.ai-template-chip--active {
  color: var(--color-primary);
  border-color: var(--color-primary);
}

.ai-template-badge {
  padding: 0 4px;
  font-size: var(--font-size-small);
  color: var(--color-white);
  border-radius: 4px;
  background-color: var(--color-primary);
}
</style>
