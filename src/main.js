import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './style.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import { handleRouting } from './router.js';

// DOM mount and simple SPA URL navigation router
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('app');
  if (container) {
    handleRouting(container);

    // Route dynamically on popstate (back/forward browser navigations)
    window.addEventListener('popstate', () => {
      handleRouting(container);
    });
  }
});

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
