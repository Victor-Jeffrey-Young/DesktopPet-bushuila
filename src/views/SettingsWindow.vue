<script setup lang="ts">
import { onMounted } from 'vue'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import SettingsPanel from '../components/SettingsPanel.vue'

const win = getCurrentWebviewWindow()

function handleClose() {
  win.hide()
}

onMounted(() => {
  document.title = '设置'
})
</script>

<template>
  <div class="w-full h-full bg-white/90 flex items-center justify-center">
    <SettingsPanel @close="handleClose" />
  </div>
</template>
