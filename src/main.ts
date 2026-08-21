// Polyfill window.process for browser runtime
if (typeof window !== 'undefined') {
  (window as any).process = (window as any).process || {
    env: {
      NODE_ENV: import.meta.env?.MODE || 'development',
      GITLITE_DEVICE_CLIENT_ID: localStorage.getItem('memex_gitlite_client_id') || '',
      GITLITE_CLIENT_ID: localStorage.getItem('memex_gitlite_client_id') || ''
    }
  };
}

import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

createApp(App).mount('#app')
