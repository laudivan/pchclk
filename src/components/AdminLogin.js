import { handleRouting } from '../router.js';
import { renderThemeToggle, bindThemeToggle } from './ThemeToggle.js';

export function initAdminLogin(container) {
  let loading = false;
  let error = '';

  const render = () => {
    container.innerHTML = `
      <div class="tv-screen min-vh-100 d-flex flex-column" style="background: radial-gradient(circle at top left, #1c1d29 0%, #0a0b10 100%);">
        <!-- Login Header with Theme switch -->
        <header class="py-3 px-4 d-flex justify-content-between align-items-center">
          <div class="d-flex align-items-center gap-2">
            <i class="bi bi-clock-fill text-primary fs-4"></i>
            <span class="fw-bold fs-5 text-white">PchClk Admin</span>
          </div>
          <div class="theme-toggle-holder"></div>
        </header>

        <div class="container d-flex align-items-center justify-content-center flex-grow-1 py-5">
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
            <form id="admin-login-form">
              <div class="mb-3 text-start">
                <label for="username" class="form-label text-muted small fw-bold">USERNAME</label>
                <div class="input-group">
                  <span class="input-group-text bg-dark border-glass text-muted" style="border-right: none;"><i class="bi bi-person-fill"></i></span>
                  <input 
                    type="text" 
                    id="username" 
                    class="form-control" 
                    value="admin"
                    placeholder="Enter username" 
                    required
                    ${loading ? 'disabled' : ''}
                    style="border-left: none;"
                  />
                </div>
              </div>

              <div class="mb-4 text-start">
                <label for="password" class="form-label text-muted small fw-bold">PASSWORD</label>
                <div class="input-group">
                  <span class="input-group-text bg-dark border-glass text-muted" style="border-right: none;"><i class="bi bi-lock-fill"></i></span>
                  <input 
                    type="password" 
                    id="password" 
                    class="form-control" 
                    value="admin"
                    placeholder="Enter password" 
                    required
                    ${loading ? 'disabled' : ''}
                    style="border-left: none;"
                  />
                </div>
              </div>

              <!-- Feedback Messages -->
              <div id="login-error-holder"></div>

              <button type="submit" class="btn btn-primary w-100 d-flex align-items-center justify-content-center" ${loading ? 'disabled' : ''}>
                ${loading ? '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Signing in...' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>
      </div>
    `;

    // Render theme switch
    const headerHolder = container.querySelector('.theme-toggle-holder');
    if (headerHolder) {
      headerHolder.innerHTML = renderThemeToggle();
      bindThemeToggle(headerHolder, () => {
        // Redraw
        initAdminLogin(container);
      });
    }

    // Set error message if present
    const errorHolder = container.querySelector('#login-error-holder');
    if (errorHolder && error) {
      errorHolder.innerHTML = `
        <div class="alert alert-danger border-0 bg-danger bg-opacity-10 text-danger rounded-3 py-2 small mb-3 text-start">
          <i class="bi bi-exclamation-triangle-fill me-2"></i>${error}
        </div>
      `;
    }

    // Bind form submit
    const form = container.querySelector('#admin-login-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const usernameVal = container.querySelector('#username').value;
        const passwordVal = container.querySelector('#password').value;

        loading = true;
        error = '';
        render(); // redraw loading state

        try {
          const response = await fetch('/api/admin/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept-Language': navigator.language
            },
            body: JSON.stringify({
              username: usernameVal,
              password: passwordVal
            })
          });

          const data = await response.json();
          
          if (!response.ok) {
            throw new Error(data.error || 'Login failed. Please check credentials.');
          }

          // Save auth info locally
          localStorage.setItem('pchclk_token', data.token);
          localStorage.setItem('pchclk_admin', JSON.stringify({
            username: data.username,
            role: data.role
          }));

          // Route to dashboard
          handleRouting(container);
        } catch (err) {
          loading = false;
          error = err.message;
          render(); // redraw error state
        }
      });
    }
  };

  render();
}
