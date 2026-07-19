<template>
  <div class="pwa-screen min-vh-100 text-white d-flex flex-column">
    <!-- Header -->
    <header class="pwa-header py-3 px-4 border-bottom border-glass d-flex align-items-center justify-content-between glass-panel sticky-top">
      <div class="d-flex align-items-center gap-2">
        <i class="bi bi-clock-fill text-primary fs-4"></i>
        <span class="fw-bold fs-5 tracking-tight">PchClk PWA</span>
      </div>
      
      <!-- Reactive Connectivity Indicator -->
      <span class="badge" :class="isOffline ? 'bg-danger bg-opacity-15 text-danger border border-danger border-opacity-25' : 'bg-success bg-opacity-15 text-success border border-success border-opacity-25'">
        <i class="bi" :class="isOffline ? 'bi-wifi-off me-1' : 'bi-wifi me-1'"></i>
        {{ isOffline ? 'Offline' : 'Online' }}
      </span>
    </header>

    <main class="flex-grow-1 container py-4 px-3 d-flex flex-column gap-4 max-w-md">
      <!-- 1. UNPAIRED STATE (REGISTRATION FORM) -->
      <div v-if="!deviceKey" class="glass-panel p-4 text-center my-auto border-glass">
        <i class="bi bi-phone-vibrate text-primary mb-3 d-block" style="font-size: 3.5rem;"></i>
        <h3 class="fw-bold text-white mb-2">Pair Your Device</h3>
        <p class="text-white-50 small mb-4">
          To pair this device, ask your administrator to generate an authorization code.
        </p>

        <form @submit.prevent="pairDevice">
          <div class="mb-4">
            <label for="authCode" class="form-label text-muted small fw-bold d-block text-start mb-2">6-DIGIT AUTHORIZATION CODE</label>
            <input 
              v-model="inputAuthCode" 
              type="text" 
              id="authCode" 
              class="form-control text-center fs-3 fw-bold font-monospace tracking-wide py-2" 
              placeholder="000000" 
              maxlength="10"
              required 
            />
          </div>

          <div v-if="pairingError" class="alert alert-danger bg-danger bg-opacity-10 border-0 text-danger rounded-3 py-2 small mb-3 text-start">
            <i class="bi bi-exclamation-triangle-fill me-2"></i>{{ pairingError }}
          </div>

          <button type="submit" class="btn btn-primary w-100 py-3 rounded-3 fw-bold d-flex align-items-center justify-content-center gap-2" :disabled="pairingLoading">
            <span v-if="pairingLoading" class="spinner-border spinner-border-sm"></span>
            <i v-else class="bi bi-link-45deg fs-5"></i>
            Register Device
          </button>
        </form>
      </div>

      <!-- 2. PAIRED STATE (MAIN ACTIONS) -->
      <div v-else class="d-flex flex-column gap-4 flex-grow-1">
        <!-- Profile Card -->
        <div class="glass-panel p-4 border-glass">
          <div class="d-flex align-items-center gap-3">
            <div class="profile-avatar bg-primary bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center">
              <i class="bi bi-person-fill text-primary fs-3"></i>
            </div>
            <div>
              <h5 class="text-white fw-bold m-0">{{ employee?.name }}</h5>
              <div class="text-muted small">Registration: <code class="text-white-50">{{ employee?.registration_number }}</code></div>
            </div>
          </div>
        </div>

        <!-- Punch Button Card -->
        <div class="glass-panel p-4 text-center border-glass d-flex flex-column align-items-center gap-3">
          <h5 class="text-white fw-bold mb-1 w-100 text-start">Clock In</h5>
          <p class="text-white-50 small text-start mb-2">
            Scan the active QR Code on the Smart TV screen to record your attendance.
          </p>

          <!-- Offline Queue Indicator -->
          <div v-if="offlineQueue.length > 0" class="alert alert-warning bg-warning bg-opacity-10 border-0 text-warning rounded-3 py-2 small text-start w-100">
            <i class="bi bi-cloud-arrow-up-fill me-2"></i>
            {{ offlineQueue.length }} punch(es) queued offline. They will sync automatically when online.
          </div>

          <button 
            @click="openScanner" 
            class="punch-btn rounded-circle d-flex flex-column align-items-center justify-content-center"
            :class="isOffline ? 'punch-btn-offline' : 'punch-btn-online'"
          >
            <i class="bi bi-qr-code-scan mb-2"></i>
            <span class="fw-bold tracking-wide">{{ isOffline ? 'Offline Punch' : 'Scan TV Code' }}</span>
          </button>
        </div>

        <!-- History Log Card (Last 3 Months) -->
        <div class="glass-panel p-4 border-glass flex-grow-1 d-flex flex-column">
          <h5 class="text-white fw-bold mb-3 d-flex align-items-center justify-content-between">
            <span>Punch History</span>
            <span class="fs-8 text-muted fw-normal">Last 3 Months</span>
          </h5>

          <!-- Logs list -->
          <div v-if="logs.length > 0 || offlineQueue.length > 0" class="logs-scroller flex-grow-1 overflow-auto pe-1" style="max-height: 250px;">
            <div class="d-flex flex-column gap-2">
              <!-- Offline Queued items -->
              <div v-for="(item, index) in offlineQueue" :key="'off-' + index" class="log-item p-3 rounded-3 d-flex justify-content-between align-items-center bg-warning bg-opacity-5 border border-warning border-opacity-15">
                <div>
                  <div class="small fw-bold text-warning">Offline Punch</div>
                  <div class="text-muted fs-8">{{ formatTimestamp(item.timestamp) }}</div>
                </div>
                <span class="badge bg-warning text-dark fs-9 px-2 py-1 rounded">
                  <i class="bi bi-hourglass-split me-1"></i>Pending Sync
                </span>
              </div>

              <!-- Synced logs -->
              <div v-for="log in logs" :key="log.id" class="log-item p-3 rounded-3 d-flex justify-content-between align-items-center border border-glass bg-dark bg-opacity-25">
                <div>
                  <div class="small fw-bold text-white">Punch Registered</div>
                  <div class="text-muted fs-8">{{ formatTimestamp(log.timestamp) }}</div>
                </div>
                <span v-if="log.hash_validated === 1" class="badge bg-success bg-opacity-15 text-success border border-success border-opacity-25 fs-9 px-2 py-1 rounded">
                  <i class="bi bi-qr-code me-1"></i>QR Verified
                </span>
                <span v-else class="badge bg-secondary bg-opacity-15 text-white-50 border border-glass fs-9 px-2 py-1 rounded">
                  <i class="bi bi-exclamation-circle me-1"></i>Bypass
                </span>
              </div>
            </div>
          </div>

          <div v-else class="text-center py-5 my-auto text-muted small">
            <i class="bi bi-calendar-x fs-2 d-block mb-2"></i>
            No punch records logged.
          </div>
        </div>
      </div>
    </main>

    <!-- QR CODE SCANNER OVERLAY -->
    <div v-if="showScanner" class="scanner-overlay d-flex flex-column text-white">
      <div class="scanner-header py-3 px-4 d-flex align-items-center justify-content-between">
        <h5 class="fw-bold m-0"><i class="bi bi-camera-fill me-2"></i>Align QR Code</h5>
        <button @click="closeScanner" class="btn btn-outline-light btn-sm rounded-circle p-2 border-0">
          <i class="bi bi-x-lg fs-5"></i>
        </button>
      </div>

      <!-- QR Video Container -->
      <div class="scanner-viewport flex-grow-1 position-relative d-flex align-items-center justify-content-center bg-black">
        <div id="qr-reader" style="width: 100%; height: 100%;"></div>
        <div class="scanner-guide"></div>
      </div>

      <div class="scanner-footer p-4 text-center glass-panel border-top border-glass">
        <p class="small text-white-50 mb-0">
          Point your device camera at the rotating QR code on the Smart TV screen.
        </p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue';
import { Html5Qrcode } from 'html5-qrcode';

export default {
  name: 'EmployeePWA',
  setup() {
    const deviceKey = ref('');
    const employee = ref(null);
    const logs = ref([]);
    const isOffline = ref(!navigator.onLine);
    const offlineQueue = ref([]);
    
    // UI states
    const inputAuthCode = ref('');
    const pairingLoading = ref(false);
    const pairingError = ref('');
    const showScanner = ref(false);
    
    let html5QrcodeScanner = null;

    // Pairing registration handler
    const pairDevice = async () => {
      pairingLoading.value = true;
      pairingError.value = '';

      try {
        const response = await fetch('/api/device/pair', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ auth_code: inputAuthCode.value })
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Pairing registration failed');
        }

        const data = await response.json();
        
        // Save pair info locally
        deviceKey.value = data.device_key;
        employee.value = data.employee;
        
        localStorage.setItem('pchclk_pwa_key', data.device_key);
        localStorage.setItem('pchclk_pwa_emp', JSON.stringify(data.employee));
        
        fetchHistory();
      } catch (err) {
        pairingError.value = err.message;
      } finally {
        pairingLoading.value = false;
      }
    };

    // Load logs history (online = fetch API, offline = load local cache)
    const fetchHistory = async () => {
      if (!deviceKey.value) return;

      if (isOffline.value) {
        const cachedLogs = localStorage.getItem('pchclk_pwa_logs');
        if (cachedLogs) {
          logs.value = JSON.parse(cachedLogs);
        }
        return;
      }

      try {
        const response = await fetch(`/api/device/logs?device_key=${deviceKey.value}`);
        if (response.ok) {
          const data = await response.json();
          logs.value = data.logs;
          // Cache logs locally
          localStorage.setItem('pchclk_pwa_logs', JSON.stringify(data.logs));
        }
      } catch (err) {
        console.warn('Failed to fetch punch history:', err);
      }
    };

    // Register employee clock-in (either online push or offline queue)
    const registerPunch = async (scannedToken) => {
      const nowIso = new Date().toISOString();

      if (isOffline.value) {
        // Enqueue offline punch
        const offlinePunch = {
          device_key: deviceKey.value,
          token: scannedToken,
          timestamp: nowIso
        };
        offlineQueue.value.push(offlinePunch);
        localStorage.setItem('pchclk_pwa_queue', JSON.stringify(offlineQueue.value));
        alert('Offline punch registered! It will sync automatically once internet access is restored.');
        return;
      }

      try {
        const response = await fetch('/api/punch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            device_key: deviceKey.value,
            token: scannedToken
          })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to submit punch');

        alert(data.hash_validated === 1 ? 'Punch clock-in registered successfully!' : 'Punch registered via manual bypass!');
        fetchHistory();
      } catch (err) {
        alert('Error: ' + err.message);
      }
    };

    // Automated Offline Queue Sync
    const syncOfflineQueue = async () => {
      if (isOffline.value || offlineQueue.value.length === 0) return;

      console.log(`Syncing ${offlineQueue.value.length} queued offline punches...`);
      const queueCopy = [...offlineQueue.value];

      for (const punch of queueCopy) {
        try {
          const response = await fetch('/api/punch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              device_key: punch.device_key,
              token: punch.token
            })
          });

          if (response.ok) {
            // Remove successfully synced item from queue
            offlineQueue.value = offlineQueue.value.filter(item => item.timestamp !== punch.timestamp);
            localStorage.setItem('pchclk_pwa_queue', JSON.stringify(offlineQueue.value));
          }
        } catch (err) {
          console.error('Failed to sync offline punch, will retry later:', err);
          break; // Stop syncing to keep ordering in case of network issue
        }
      }

      fetchHistory();
    };

    // Camera HTML5-QRCode Scanner Controls
    const openScanner = async () => {
      // If online, check if device is still paired on the backend
      if (!isOffline.value) {
        try {
          const response = await fetch(`/api/device/verify?device_key=${deviceKey.value}`);
          if (response.ok) {
            const data = await response.json();
            if (!data.paired) {
              deviceKey.value = '';
              employee.value = null;
              localStorage.removeItem('pchclk_pwa_key');
              localStorage.removeItem('pchclk_pwa_emp');
              localStorage.removeItem('pchclk_pwa_logs');
              alert('This device is no longer paired. Please register again.');
              return;
            }
          }
        } catch (err) {
          console.warn('Failed to verify pairing status online:', err);
        }
      }

      showScanner.value = true;
      
      // Allow slight UI render delay before starting camera
      setTimeout(() => {
        html5QrcodeScanner = new Html5Qrcode('qr-reader');
        html5QrcodeScanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 }
          },
          (decodedText) => {
            // QR Code scanned successfully
            closeScanner();
            
            // Extract token parameter from scanned URL (e.g. http://domain/punch?token=xyz)
            try {
              const url = new URL(decodedText);
              const qrToken = url.searchParams.get('token');
              if (qrToken) {
                registerPunch(qrToken);
              } else {
                alert('Invalid QR code format. Missing token parameter.');
              }
            } catch (err) {
              // Fallback to treat raw decoded text as token
              registerPunch(decodedText);
            }
          },
          (errorMessage) => {
            // Verbose debug frame log, ignore
          }
        ).catch(err => {
          console.error('Camera initialization failed:', err);
          alert('Could not open camera stream. Please allow permissions.');
          closeScanner();
        });
      }, 100);
    };

    const closeScanner = () => {
      showScanner.value = false;
      if (html5QrcodeScanner) {
        html5QrcodeScanner.stop().catch(err => console.warn('Scanner stop failed:', err));
        html5QrcodeScanner = null;
      }
    };

    // Connection changes handlers
    const setOnline = () => {
      isOffline.value = false;
      syncOfflineQueue();
    };

    const setOffline = () => {
      isOffline.value = true;
    };

    const formatTimestamp = (timestamp) => {
      if (!timestamp) return '';
      const d = new Date(timestamp);
      return d.toLocaleDateString(navigator.language, {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    };

    onMounted(() => {
      // Load PWA states
      const cachedKey = localStorage.getItem('pchclk_pwa_key');
      const cachedEmp = localStorage.getItem('pchclk_pwa_emp');
      const cachedQueue = localStorage.getItem('pchclk_pwa_queue');

      if (cachedKey && cachedEmp) {
        deviceKey.value = cachedKey;
        employee.value = JSON.parse(cachedEmp);
      }

      if (cachedQueue) {
        offlineQueue.value = JSON.parse(cachedQueue);
      }

      fetchHistory();

      // Register connection status listeners
      window.addEventListener('online', setOnline);
      window.addEventListener('offline', setOffline);

      // Trigger automatic sync on mount if online
      if (!isOffline.value) {
        syncOfflineQueue();
      }
    });

    onUnmounted(() => {
      window.removeEventListener('online', setOnline);
      window.removeEventListener('offline', setOffline);
      if (html5QrcodeScanner) {
        html5QrcodeScanner.stop().catch(err => {});
      }
    });

    return {
      deviceKey,
      employee,
      logs,
      isOffline,
      offlineQueue,
      inputAuthCode,
      pairingLoading,
      pairingError,
      showScanner,
      pairDevice,
      openScanner,
      closeScanner,
      formatTimestamp
    };
  }
};
</script>

<style scoped>
.pwa-screen {
  background: radial-gradient(circle at top left, #1c1d29 0%, #0a0b10 100%);
  font-family: 'Outfit', sans-serif;
  min-height: 100vh;
}

.profile-avatar {
  width: 56px;
  height: 56px;
}

.punch-btn {
  width: 170px;
  height: 170px;
  border: none;
  font-size: 1.1rem;
  transition: all 0.3s ease;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
}

.punch-btn-online {
  background: linear-gradient(135deg, #8c62ff 0%, #703bf5 100%);
  color: white;
  box-shadow: 0 4px 25px rgba(140, 98, 255, 0.4);
}

.punch-btn-online:hover {
  transform: scale(1.05);
  box-shadow: 0 8px 30px rgba(140, 98, 255, 0.6);
}

.punch-btn-offline {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
  box-shadow: 0 4px 25px rgba(245, 158, 11, 0.4);
}

.punch-btn-offline:hover {
  transform: scale(1.05);
  box-shadow: 0 8px 30px rgba(245, 158, 11, 0.6);
}

.logs-scroller {
  scrollbar-width: thin;
}

.log-item {
  transition: transform 0.2s ease;
}

.log-item:hover {
  transform: translateX(4px);
}

/* Scanner Overlay styles */
.scanner-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2000;
  background-color: #000;
}

.scanner-header {
  background: rgba(10, 11, 16, 0.85);
  backdrop-filter: blur(10px);
  position: relative;
  z-index: 2;
}

.scanner-viewport {
  overflow: hidden;
}

.scanner-guide {
  position: absolute;
  width: 250px;
  height: 250px;
  border: 4px solid #8c62ff;
  border-radius: 20px;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.65);
  pointer-events: none;
  z-index: 2005;
  box-shadow: 0 0 15px rgba(140, 98, 255, 0.5), 0 0 0 9999px rgba(0, 0, 0, 0.6);
}

.scanner-guide::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: red;
  box-shadow: 0 0 8px red;
  animation: scanLaser 2s infinite ease-in-out;
}

@keyframes scanLaser {
  0% { top: 0%; }
  50% { top: 100%; }
  100% { top: 0%; }
}
</style>
