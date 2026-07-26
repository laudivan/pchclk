import QRCode from 'qrcode';
import { renderThemeToggle, bindThemeToggle } from './ThemeToggle.js';

export function initTV(container) {
  let currentTime = '';
  let currentDate = '';
  let token = '';
  let expiresIn = 0;
  let isOffline = false;
  
  let clockInterval = null;
  let countdownInterval = null;

  const updateClock = () => {
    const now = new Date();
    currentTime = now.toLocaleTimeString(navigator.language, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    currentDate = now.toLocaleDateString(navigator.language, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const clockEl = container.querySelector('.clock-display');
    const dateEl = container.querySelector('.date-display');
    if (clockEl) clockEl.textContent = currentTime;
    if (dateEl) dateEl.textContent = currentDate;
  };

  const renderQR = (canvas, qrText) => {
    if (canvas && qrText) {
      QRCode.toCanvas(canvas, qrText, {
        width: 280,
        margin: 1,
        color: {
          dark: '#090a0f',
          light: '#ffffff'
        }
      }, (err) => {
        if (err) console.error('Error rendering TV QR Code:', err);
      });
    }
  };

  const fetchToken = async () => {
    try {
      const response = await fetch('/api/tv/token');
      if (!response.ok) throw new Error('API unreachable');
      
      const data = await response.json();
      token = data.token;
      expiresIn = data.expires_in;
      isOffline = false;
    } catch (err) {
      console.warn('TV token API failed, using offline fallback:', err);
      isOffline = true;
      const now = Date.now();
      const block = Math.floor(now / (15 * 60 * 1000)) * (15 * 60 * 1000);
      token = `offline-${block}`;
      const nextBlock = block + (15 * 60 * 1000);
      expiresIn = Math.max(0, Math.floor((nextBlock - now) / 1000));
    }

    const punchUrl = `${window.location.origin}/punch?token=${token}`;
    const canvas = container.querySelector('#tv-qr-canvas');
    renderQR(canvas, punchUrl);

    // Update status badge
    const badgeEl = container.querySelector('.badge-status');
    if (badgeEl) {
      badgeEl.className = `badge-status ${isOffline ? 'badge-inactive bg-danger' : 'badge-active bg-success'}`;
      badgeEl.innerHTML = `<i class="bi ${isOffline ? 'bi-cloud-slash-fill' : 'bi-shield-check-fill'}"></i> ${isOffline ? 'Offline Mode' : 'Secured'}`;
    }
  };

  const formatCountdown = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const updateCountdown = () => {
    const timerEl = container.querySelector('.countdown-timer');
    if (timerEl) {
      timerEl.textContent = formatCountdown(expiresIn);
    }
  };

  const startCountdown = () => {
    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(() => {
      if (expiresIn > 0) {
        expiresIn--;
        updateCountdown();
      } else {
        fetchToken();
      }
    }, 1000);
  };

  // Render TV Template
  container.innerHTML = `
    <div class="tv-screen min-vh-100 d-flex flex-column text-white" style="background: radial-gradient(circle at top left, #1c1d29 0%, #0a0b10 100%);">
      <!-- TV Header -->
      <header class="py-3 px-4 d-flex justify-content-between align-items-center border-bottom border-glass" style="background: var(--bg-card); backdrop-filter: blur(16px);">
        <div class="d-flex align-items-center gap-2">
          <i class="bi bi-clock-fill text-primary fs-4"></i>
          <span class="fw-bold fs-5 tracking-tight text-white">PchClk TV</span>
        </div>
        ${renderThemeToggle()}
      </header>

      <div class="container flex-grow-1 d-flex align-items-center justify-content-center py-5">
        <div class="row align-items-center justify-content-center g-5 w-100">
          <!-- Left Side: Live Clock & Date -->
          <div class="col-lg-6 text-center text-lg-start">
            <div class="clock-display mb-2" style="font-size: 8rem; font-weight: 800; letter-spacing: -2px; line-height: 1; text-shadow: 0 4px 30px rgba(255, 255, 255, 0.15); color: var(--text-highlight);">--:--:--</div>
            <div class="date-display mb-4 text-muted fs-3 text-capitalize">Loading date...</div>
            
            <div class="glass-panel p-4 d-inline-block text-start border-glass" style="max-width: 500px;">
              <h4 class="text-white fw-bold mb-2 d-flex align-items-center gap-2" style="color: var(--text-highlight) !important;">
                <i class="bi bi-phone-fill text-primary"></i> PchClk Punch Point
              </h4>
              <p class="text-white-50 small mb-0" style="color: var(--text-muted) !important;">
                Open your PchClk Employee PWA, scan the QR code to register your punch clock in real-time. Pairing validation is performed automatically.
              </p>
            </div>
          </div>

          <!-- Right Side: Rotating QR Code -->
          <div class="col-lg-5 text-center">
            <div class="qr-card glass-panel p-5 d-inline-block border-glass position-relative">
              <div class="qr-pulse-wrapper mb-4" style="position: relative; display: inline-block;">
                <div class="qr-container bg-white p-3 rounded-4 shadow-lg d-inline-block">
                  <canvas id="tv-qr-canvas"></canvas>
                </div>
              </div>

              <!-- Countdown Timer & Status -->
              <div class="d-flex align-items-center justify-content-center gap-3 mt-3">
                <span class="badge-status badge-active bg-success">
                  <i class="bi bi-shield-check-fill"></i> Secured
                </span>
                <div class="small text-muted">
                  Rotates in: <strong class="text-white font-monospace countdown-timer" style="color: var(--text-highlight) !important;">00:00</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Inject pulsing animation dynamically
  if (!document.getElementById('tv-pulse-style')) {
    const style = document.createElement('style');
    style.id = 'tv-pulse-style';
    style.textContent = `
      .qr-pulse-wrapper::before {
        content: '';
        position: absolute;
        top: -15px;
        left: -15px;
        right: -15px;
        bottom: -15px;
        border-radius: 28px;
        background: rgba(140, 98, 255, 0.1);
        border: 1px solid rgba(140, 98, 255, 0.25);
        animation: qrPulse 2.5s infinite ease-in-out;
        z-index: 0;
      }
      @keyframes qrPulse {
        0% { transform: scale(0.98); opacity: 0.5; box-shadow: 0 0 0 0 rgba(140, 98, 255, 0.4); }
        70% { transform: scale(1.02); opacity: 1; box-shadow: 0 0 0 15px rgba(140, 98, 255, 0); }
        100% { transform: scale(0.98); opacity: 0.5; box-shadow: 0 0 0 0 rgba(140, 98, 255, 0); }
      }
    `;
    document.head.appendChild(style);
  }

  // Bind theme switcher
  bindThemeToggle(container, () => {
    clearInterval(clockInterval);
    clearInterval(countdownInterval);
    initTV(container);
  });

  updateClock();
  clockInterval = setInterval(updateClock, 1000);
  fetchToken();
  startCountdown();

  // Cleanup watcher
  const observer = new MutationObserver((mutations, obs) => {
    if (!document.contains(container.querySelector('.tv-screen'))) {
      clearInterval(clockInterval);
      clearInterval(countdownInterval);
      obs.disconnect();
    }
  });
  observer.observe(document, { childList: true, subtree: true });
}
