<script setup lang="ts">
import { computed } from 'vue'

import type { ChartBlockInfo, ChartType } from '@/types/block'
import SegmentedControl from '@/ui/SegmentedControl/SegmentedControl.vue'

// 怎么传入 props，在这里如何定义？
const props = defineProps<{
  blockInfo: ChartBlockInfo
}>()

const data = [
  {
    label: 'Echarts-Echarts',
    value: 'echarts'
  },
  {
    label: 'Canvas',
    value: 'canvas'
  },
  {
    label: 'SVG',
    value: 'svg'
  }
]

const emit = defineEmits<{ (event: 'change', block: ChartBlockInfo): void }>()

// chartType 直接以 store 中的 blockInfo.props.chartType 为准（受控），
// 切换时通过 emit change 回写，而不是用 useForm 的本地状态，
// 否则切走再切回时 useForm 会重新按 initialValues 初始化为默认值，导致选中状态丢失
const chartType = computed(() => props.blockInfo.props.chartType)

function handleChange(val: string) {
  emit('change', {
    ...props.blockInfo,
    props: { ...props.blockInfo.props, chartType: val as ChartType }
  })
}
</script>

<template>
  <div>
    {{ props.blockInfo.type }}
  </div>
  <segmented-control
    :value="chartType"
    :data="data"
    @input="handleChange"
  />
</template>

<style scoped>
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
</style>
