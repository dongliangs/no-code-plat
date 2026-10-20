import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './assets/main.css'
import App from './App.vue'
import router from './router/index.ts'
 
import { setup } from './setup.ts'

const app = createApp(App)
app.use(createPinia())
app.use(router)

setup(app)
app.mount('#app')
