import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import SettingsWindow from './views/SettingsWindow.vue'
import DebugWindow from './views/DebugWindow.vue'

const view = new URLSearchParams(window.location.search).get('view')

const rootComponent = view === 'settings' ? SettingsWindow : view === 'debug' ? DebugWindow : App

const app = createApp(rootComponent)
app.use(createPinia())

app.config.errorHandler = (err, _instance, info) => {
  console.error('[Global Error]', err, info)
}

app.mount('#app')
