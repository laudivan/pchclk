import { ThemeManager, handleRouting } from '../router.js';

export function renderThemeToggle() {
  const currentTheme = ThemeManager.getTheme();
  const icon = currentTheme === 'light' ? 'bi-moon-fill' : 'bi-sun-fill';
  const label = currentTheme === 'light' ? 'Dark Mode' : 'Light Mode';
  
  return `
    <button id="global-theme-toggle" class="btn btn-outline-secondary d-flex align-items-center gap-2 border-glass rounded-3 px-3 py-2 small" style="color: var(--text-muted);">
      <i class="bi ${icon}"></i>
      <span class="d-none d-md-inline">${label}</span>
    </button>
  `;
}

export function bindThemeToggle(container, callback = null) {
  const toggleBtn = container.querySelector('#global-theme-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      ThemeManager.toggleTheme();
      if (callback) {
        callback();
      } else {
        // Redraw route
        const appContainer = document.getElementById('app');
        if (appContainer) {
          handleRouting(appContainer);
        }
      }
    });
  }
}
