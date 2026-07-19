<template>
  <div class="app-container">
    <AdminLogin v-if="!isLoggedIn" @login-success="handleLoginSuccess" />
    <Dashboard v-else :token="authToken" :admin="adminData" @logout="handleLogout" />
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import AdminLogin from './components/AdminLogin.vue';
import Dashboard from './components/Dashboard.vue';

export default {
  name: 'App',
  components: {
    AdminLogin,
    Dashboard
  },
  setup() {
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
      const storedToken = localStorage.getItem('pchclk_token');
      const storedAdmin = localStorage.getItem('pchclk_admin');
      
      if (storedToken && storedAdmin) {
        authToken.value = storedToken;
        adminData.value = JSON.parse(storedAdmin);
        isLoggedIn.value = true;
      }
    });

    return {
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
