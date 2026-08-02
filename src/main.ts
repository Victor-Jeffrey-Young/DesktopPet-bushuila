import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'

const view = new URLSearchParams(window.location.search).get('view')

/** 按 view 动态导入视图组件，Vite 自动代码分割：主窗口不加载设置/调试/提醒窗口的代码与 jszip */
async function bootstrap() {
  const rootComponent = view === 'settings'
    ? (await import('./views/SettingsWindow.vue')).default
    : view === 'debug'
      ? (await import('./views/DebugWindow.vue')).default
      : view === 'reminder'
        ? (await import('./views/ReminderWindow.vue')).default
        : App

  const app = createApp(rootComponent)
  app.use(createPinia())

  app.config.errorHandler = (err, _instance, info) => {
    console.error('[Global Error]', err, info)
  }

  app.mount('#app')
}

void bootstrap()
