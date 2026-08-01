<script setup lang="ts">
import { onMounted } from 'vue'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import SettingsPanel from '../components/SettingsPanel.vue'
import { useAppStore } from '../stores/app'
import { useTheme } from '../composables/useTheme'

const win = getCurrentWebviewWindow()
const store = useAppStore()
useTheme()

function handleClose() {
  win.hide()
}

onMounted(() => {
  document.title = '设置'
  store.loadBuiltinPets()
  store.migrateVoices()
})
</script>

<template>
  <SettingsPanel @close="handleClose" />
</template>
