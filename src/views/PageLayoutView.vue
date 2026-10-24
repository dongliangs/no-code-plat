<template>
	<div class="layout-wrapper">
    <AppLeftPanel />
    <!-- <AppPreviewer /> -->
     <AppEditorRenderer />
    <AppRightPanel />
  </div>
</template>

<script setup lang="ts">
import AppEditorRenderer from '@/components/AppEditorRenderer/AppEditorRenderer.vue';
import AppLeftPanel from '@/components/AppLeftPanel/AppLeftPanel.vue'
// import AppPreviewer from '@/components/AppPreviewer/AppPreviewer.vue'
import AppRightPanel from '@/components/AppRightPanel/AppRightPanel.vue'

</script>

<style scoped>
.layout-wrapper {
  display: flex;
  height: 100%;
}

.layout-setting {
  position: relative;
  z-index: 6;
  width: var(--panel-width);
  box-shadow: var(--color-gray-300) -1px 0 0;
}
</style>