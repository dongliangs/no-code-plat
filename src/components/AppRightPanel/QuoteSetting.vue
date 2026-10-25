<script setup lang="ts">
import { useFieldArray, useForm } from 'vee-validate'
import { watch } from 'vue'

import type { QuoteBlockInfo } from '@/types/block'

// 怎么传入 props，在这里如何定义？
const props = defineProps<{
  blockInfo: QuoteBlockInfo
}>()
console.log('🚀 ~ file: QuoteSetting.vue:10 ~ blockInfo:', props.blockInfo)

const emit = defineEmits<{ (event: 'change', block: QuoteBlockInfo): void }>()

const { values, defineField } = useForm({
  initialValues: {
    content: props.blockInfo.props.content
  }
})
const { fields, push } = useFieldArray('blocks')

const [content, contentAttrs] = defineField('content')

watch([values], ([newValues]) => {
  console.log(
    '🚀 ~ file: QuoteSetting.vue:26 ~ watch ~ { ...props.blockInfo, props: { ...props.blockInfo.props, ...newValues } }:',
    { ...props.blockInfo, props: { ...props.blockInfo.props, ...newValues } }
  )
  emit('change', { ...props.blockInfo, props: { ...props.blockInfo.props, ...newValues } })
})

// const c = useField('content')
</script>

<template>
  <div class="quote-setting">
    <div>
      {{ props.blockInfo.type }}
    </div>
    <!-- 你在使用 v-model，一定要注意，你的实际需求到底是不是需要 input 受控 -->
    <!-- 如果用 v-model，是受控组件 1，不是受控组件 2 -->
    <!-- <input class="content-input" :defaultValue="props.blockInfo.props.content" /> -->
    <input
v-model="content"
class="content-input"
v-bind="contentAttrs"
>

    <input
v-for="field in fields"
:key="field.key"
v-model="field.value"
class="content-input"
>

    <button
class="add-button"
@click="push(new Date().toLocaleTimeString())"
>
添加
</button>

    <vue-json-pretty
show-icon
show-line-number
editable
:data="blockInfo"
/>

    <!-- 非受控 -->
    <!-- <input class="content-input" :defaultValue="value" @input="value = $event.target.value" /> -->
    <!-- 受控 -->
    <!-- <input class="content-input" :value="value" @input="value = $event.target.value" /> -->
    <!-- {{ value }} -->
    <!-- <button @click="value = '哈哈'">更改为 哈哈</button> -->

    <!--  -->
  </div>
</template>

<style scoped>
.quote-setting {
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 8px;
  font-size: var(--font-size-large);
  border-radius: 8px;

  /* background-color: ; */
}
.content-input {
  width: 100%;

  /* 在做组件库的时候，input 是有一个 size 属性，sm、md、lg */
  height: 32px;
  margin-top: 8px;
  padding: 0 8px;
  border: 1px solid var(--color-gray-300);
  border-radius: 8px;
  outline-style: none;
  color: var(--color-gray-800);
}

.add-button {
  margin-top: 6px;
  padding: 4px 12px;
  border-radius: 8px;
  background-color: var(--color-white);
  border: 1px solid var(--color-gray-300);
  cursor: pointer;
}
</style>
