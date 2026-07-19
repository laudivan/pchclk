<template>
  <div class="container d-flex align-items-center justify-content-center min-vh-100">
    <div class="col-md-5 col-lg-4 glass-panel p-5 text-center">
      <!-- Icon/Brand Header -->
      <div class="mb-4">
        <div class="d-inline-flex align-items-center justify-content-center rounded-circle bg-primary bg-opacity-10 p-3 mb-3" style="width: 70px; height: 70px;">
          <i class="bi bi-clock-fill text-primary" style="font-size: 2.2rem;"></i>
        </div>
        <h2 class="mb-1 text-white fw-bold">PchClk</h2>
        <p class="text-muted small">Administration Dashboard Login</p>
      </div>

      <!-- Login Form -->
      <form @submit.prevent="handleLogin">
        <div class="mb-3 text-start">
          <label for="username" class="form-label text-muted small fw-bold">USERNAME</label>
          <div class="input-group">
            <span class="input-group-text bg-dark border-glass text-muted"><i class="bi bi-person-fill"></i></span>
            <input 
              v-model="username" 
              type="text" 
              id="username" 
              class="form-control" 
              placeholder="Enter username" 
              required
              :disabled="loading"
            />
          </div>
        </div>

        <div class="mb-4 text-start">
          <label for="password" class="form-label text-muted small fw-bold">PASSWORD</label>
          <div class="input-group">
            <span class="input-group-text bg-dark border-glass text-muted"><i class="bi bi-lock-fill"></i></span>
            <input 
              v-model="password" 
              type="password" 
              id="password" 
              class="form-control" 
              placeholder="Enter password" 
              required
              :disabled="loading"
            />
          </div>
        </div>

        <!-- Feedback Messages -->
        <div v-if="error" class="alert alert-danger border-0 bg-danger bg-opacity-10 text-danger rounded-3 py-2 small mb-3">
          <i class="bi bi-exclamation-triangle-fill me-2"></i>{{ error }}
        </div>

        <button type="submit" class="btn btn-primary w-100 d-flex align-items-center justify-content-center" :disabled="loading">
          <span v-if="loading" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
          <span>{{ loading ? 'Signing in...' : 'Sign In' }}</span>
        </button>
      </form>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';

export default {
  name: 'AdminLogin',
  emits: ['login-success'],
  setup(props, { emit }) {
    const username = ref('admin');
    const password = ref('admin');
    const loading = ref(false);
    const error = ref('');

    const handleLogin = async () => {
      loading.value = true;
      error.value = '';
      
      try {
        const response = await fetch('http://localhost:3000/api/admin/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept-Language': navigator.language
          },
          body: JSON.stringify({
            username: username.value,
            password: password.value
          })
        });

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Login failed. Please check credentials.');
        }

        emit('login-success', {
          token: data.token,
          username: data.username,
          role: data.role
        });
      } catch (err) {
        error.value = err.message;
      } finally {
        loading.value = false;
      }
    };

    return {
      username,
      password,
      loading,
      error,
      handleLogin
    };
  }
};
</script>

<style scoped>
.input-group-text {
  border: 1px solid var(--border-glass);
  border-right: none;
}
.form-control {
  border-left: none;
}
</style>
