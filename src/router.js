import { initTV } from './components/SmartTV.js';
import { initAdminLogin } from './components/AdminLogin.js';
import { initDashboard } from './components/Dashboard.js';
import { initEmployeePWA } from './components/EmployeePWA.js';

export const ThemeManager = {
  getTheme() {
    return localStorage.getItem('pchclk_theme') || 'black';
  },
  setTheme(theme) {
    localStorage.setItem('pchclk_theme', theme);
    this.applyTheme();
  },
  applyTheme() {
    const theme = this.getTheme();
    if (theme === 'light') {
      document.body.classList.add('theme-light');
      document.body.classList.remove('theme-black');
    } else {
      document.body.classList.add('theme-black');
      document.body.classList.remove('theme-light');
    }
  },
  toggleTheme() {
    const newTheme = this.getTheme() === 'light' ? 'black' : 'light';
    this.setTheme(newTheme);
  }
};

export function handleRouting(container) {
  // Apply current theme on load
  ThemeManager.applyTheme();

  const path = window.location.pathname;
  container.innerHTML = ''; // Clear main container

  if (path === '/pchclk') {
    initTV(container);
  } else if (path === '/admin') {
    const token = localStorage.getItem('pchclk_token');
    const adminData = localStorage.getItem('pchclk_admin');
    
    if (token && adminData) {
      initDashboard(container, { token, admin: JSON.parse(adminData) });
    } else {
      initAdminLogin(container);
    }
  } else {
    initEmployeePWA(container);
  }
}
