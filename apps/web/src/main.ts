import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import { vReveal } from './motion/reveal'
import './styles/main.css'
import 'leaflet/dist/leaflet.css'

createApp(App).use(createPinia()).use(router).directive('reveal', vReveal).mount('#app')
