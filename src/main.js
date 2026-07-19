import { createApp } from 'vue';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './style.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import App from './App.vue';

createApp(App).mount('#app');

// Register PWA service worker for offline capabilities
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        console.log('PWA Service Worker registered with scope:', reg.scope);
      })
      .catch((err) => {
        console.error('PWA Service Worker registration failed:', err);
      });
  });
}
