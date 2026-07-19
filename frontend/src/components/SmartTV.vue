<template>
  <div class="tv-screen min-vh-100 d-flex align-items-center justify-content-center text-white">
    <div class="container py-5">
      <div class="row align-items-center justify-content-center g-5">
        <!-- Left Side: Live Clock & Date -->
        <div class="col-lg-6 text-center text-lg-start">
          <div class="clock-display mb-2">{{ currentTime }}</div>
          <div class="date-display mb-4 text-muted">{{ currentDate }}</div>
          
          <div class="glass-panel p-4 d-inline-block text-start border-glass max-w-lg">
            <h4 class="text-white fw-bold mb-2 d-flex align-items-center gap-2">
              <i class="bi bi-phone-fill text-primary"></i> PchClk Punch Point
            </h4>
            <p class="text-white-50 small mb-0">
              Open your PchClk Employee PWA, scan the QR code to register your punch clock in real-time. Pairing validation is performed automatically.
            </p>
          </div>
        </div>

        <!-- Right Side: Rotating QR Code -->
        <div class="col-lg-5 text-center">
          <div class="qr-card glass-panel p-5 d-inline-block border-glass position-relative">
            <div class="qr-pulse-wrapper mb-4">
              <div class="qr-container bg-white p-3 rounded-4 shadow-lg d-inline-block">
                <canvas ref="qrCanvas"></canvas>
              </div>
            </div>

            <!-- Countdown Timer & Status -->
            <div class="d-flex align-items-center justify-content-center gap-3 mt-3">
              <span class="badge-status" :class="isOffline ? 'badge-inactive bg-danger' : 'badge-active bg-success'">
                <i class="bi" :class="isOffline ? 'bi-cloud-slash-fill' : 'bi-shield-check-fill'"></i>
                {{ isOffline ? 'Offline Mode' : 'Secured' }}
              </span>
              <div class="small text-muted">
                Rotates in: <strong class="text-white font-monospace">{{ formatCountdown(expiresIn) }}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue';
import QRCode from 'qrcode';

export default {
  name: 'SmartTV',
  setup() {
    const currentTime = ref('');
    const currentDate = ref('');
    const token = ref('');
    const expiresIn = ref(0);
    const isOffline = ref(false);
    const qrCanvas = ref(null);
    
    let clockInterval = null;
    let countdownInterval = null;

    // Build clock time
    const updateClock = () => {
      const now = new Date();
      currentTime.value = now.toLocaleTimeString(navigator.language, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      currentDate.value = now.toLocaleDateString(navigator.language, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    };

    // Calculate endpoint punch URL
    const punchUrl = computed(() => {
      return `${window.location.origin}/punch?token=${token.value}`;
    });

    // Renders the QR code canvas
    const renderQR = () => {
      if (qrCanvas.value && token.value) {
        QRCode.toCanvas(qrCanvas.value, punchUrl.value, {
          width: 300,
          margin: 1,
          color: {
            dark: '#0b0c10',
            light: '#ffffff'
          }
        }, (err) => {
          if (err) console.error('Error rendering TV QR Code:', err);
        });
      }
    };

    // Fetches rotating validation token from public endpoint
    const fetchToken = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/tv/token');
        if (!response.ok) throw new Error('API unreachable');
        
        const data = await response.json();
        token.value = data.token;
        expiresIn.value = data.expires_in;
        isOffline.value = false;
      } catch (err) {
        console.warn('TV token API failed, falling back to offline token validation:', err);
        isOffline.value = true;
        
        // Offline Fallback: calculate client-side 15-minute block
        const now = Date.now();
        const block = Math.floor(now / (15 * 60 * 1000)) * (15 * 60 * 1000);
        token.value = `offline-${block}`;
        
        // Calculate remaining seconds in current 15m block
        const nextBlock = block + (15 * 60 * 1000);
        expiresIn.value = Math.max(0, Math.floor((nextBlock - now) / 1000));
      }
    };

    const startCountdown = () => {
      if (countdownInterval) clearInterval(countdownInterval);
      
      countdownInterval = setInterval(() => {
        if (expiresIn.value > 0) {
          expiresIn.value--;
        } else {
          fetchToken();
        }
      }, 1000);
    };

    const formatCountdown = (secs) => {
      const mins = Math.floor(secs / 60);
      const remainingSecs = secs % 60;
      return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
    };

    watch(token, () => {
      nextTick(() => {
        renderQR();
      });
    });

    onMounted(() => {
      updateClock();
      clockInterval = setInterval(updateClock, 1000);
      fetchToken();
      startCountdown();
    });

    onUnmounted(() => {
      if (clockInterval) clearInterval(clockInterval);
      if (countdownInterval) clearInterval(countdownInterval);
    });

    return {
      currentTime,
      currentDate,
      token,
      expiresIn,
      isOffline,
      qrCanvas,
      formatCountdown
    };
  }
};
</script>

<style scoped>
.tv-screen {
  background: radial-gradient(circle at 30% 30%, #161822 0%, #06070a 100%);
  font-family: 'Outfit', sans-serif;
  overflow: hidden;
}

.clock-display {
  font-size: 8rem;
  font-weight: 800;
  letter-spacing: -2px;
  line-height: 1;
  background: linear-gradient(180deg, #ffffff 0%, #c4c9e2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 4px 30px rgba(255, 255, 255, 0.15);
}

.date-display {
  font-size: 2.2rem;
  font-weight: 400;
  text-transform: capitalize;
}

.max-w-lg {
  max-width: 500px;
}

.qr-card {
  padding: 3rem;
  border-radius: 24px;
}

.qr-pulse-wrapper {
  position: relative;
  display: inline-block;
}

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

.qr-container {
  position: relative;
  z-index: 1;
}

@keyframes qrPulse {
  0% {
    transform: scale(0.98);
    opacity: 0.5;
    box-shadow: 0 0 0 0 rgba(140, 98, 255, 0.4);
  }
  70% {
    transform: scale(1.02);
    opacity: 1;
    box-shadow: 0 0 0 15px rgba(140, 98, 255, 0);
  }
  100% {
    transform: scale(0.98);
    opacity: 0.5;
    box-shadow: 0 0 0 0 rgba(140, 98, 255, 0);
  }
}
</style>
