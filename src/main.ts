import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'

const app = createApp(App)
app.use(createPinia())

app.config.errorHandler = (err, _instance, info) => {
  console.error('[Global Error]', err, info)
}

app.mount('#app')
