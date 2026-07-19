<template>
  <div class="app-container">
    <template v-if="currentView === 'tv'">
      <SmartTV />
    </template>
    <template v-else-if="currentView === 'admin'">
      <AdminLogin v-if="!isLoggedIn" @login-success="handleLoginSuccess" />
      <Dashboard v-else :token="authToken" :admin="adminData" @logout="handleLogout" />
    </template>
    <template v-else>
      <EmployeePWA />
    </template>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import AdminLogin from './components/AdminLogin.vue';
import Dashboard from './components/Dashboard.vue';
import SmartTV from './components/SmartTV.vue';
import EmployeePWA from './components/EmployeePWA.vue';

export default {
  name: 'App',
  components: {
    AdminLogin,
    Dashboard,
    SmartTV,
    EmployeePWA
  },
  setup() {
    const currentView = ref('employee'); // 'admin', 'tv', 'employee'
    const isLoggedIn = ref(false);
    const authToken = ref('');
    const adminData = ref(null);

    const handleLoginSuccess = (payload) => {
      authToken.value = payload.token;
      adminData.value = {
        username: payload.username,
        role: payload.role
      };
      isLoggedIn.value = true;
      
      // Store session data locally
      localStorage.setItem('pchclk_token', payload.token);
      localStorage.setItem('pchclk_admin', JSON.stringify(adminData.value));
    };

    const handleLogout = () => {
      isLoggedIn.value = false;
      authToken.value = '';
      adminData.value = null;
      localStorage.removeItem('pchclk_token');
      localStorage.removeItem('pchclk_admin');
    };

    onMounted(() => {
      // Basic routing detection for Smart TV and Admin
      if (window.location.pathname === '/pchclk') {
        currentView.value = 'tv';
        return;
      }
      
      if (window.location.pathname === '/admin') {
        currentView.value = 'admin';
        
        // Load admin session if available
        const storedToken = localStorage.getItem('pchclk_token');
        const storedAdmin = localStorage.getItem('pchclk_admin');
        
        if (storedToken && storedAdmin) {
          authToken.value = storedToken;
          adminData.value = JSON.parse(storedAdmin);
          isLoggedIn.value = true;
        }
      } else {
        currentView.value = 'employee';
      }
    });

    return {
      currentView,
      isLoggedIn,
      authToken,
      adminData,
      handleLoginSuccess,
      handleLogout
    };
  }
};
</script>

<style>
.app-container {
  min-height: 100vh;
}
</style>
