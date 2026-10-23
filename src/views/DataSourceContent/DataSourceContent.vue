<script setup lang="ts">
import { createRoot } from 'react-dom/client'
import { applyPureReactInVue, setVeauryOptions } from 'veaury'

// react-dom 19 不再提供 render，需要手动告诉 veaury 使用 createRoot
setVeauryOptions({
  react: {
    createRoot
  }
})

// @ts-ignore
import ReactDataSource from './react_app/ReactDataSource'
const RDataSource = applyPureReactInVue(ReactDataSource)
</script>
<template>
  <div class="data-source-content-wrapper">
    <div class="data-source-render">
      <r-dataSource />
    </div>
  </div>
</template>

<style scoped>
.data-source-content-wrapper {
  width: 100%;
  background-color: var(--color-gray-100);
}

.data-source-render {
  height: calc(100% - 40px);
  margin: 20px;
  padding: 12px;
  background-color: var(--color-white);
  border-radius: 8px;
  overflow: hidden;
}
</style>
