import { Html5Qrcode } from 'html5-qrcode';
import { renderThemeToggle, bindThemeToggle } from './ThemeToggle.js';

export function initEmployeePWA(container) {
  // PWA State
  let deviceKey = localStorage.getItem('pchclk_pwa_key') || '';
  let employee = null;
  let logs = [];
  let isOffline = !navigator.onLine;
  let offlineQueue = [];
  
  // UI states
  let currentTab = 'home';
  let pairingLoading = false;
  let pairingError = '';
  let showScanner = false;
  
  // Clock widget state
  let currentTime = '';
  let currentDate = '';
  
  // Period configurations
  let globalStartDay = 20;
  let selectedHistoryPeriod = null;
  
  let html5QrcodeScanner = null;
  let clockInterval = null;

  // Load PWA credentials from localStorage cache
  const cachedEmp = localStorage.getItem('pchclk_pwa_emp');
  if (cachedEmp) {
    employee = JSON.parse(cachedEmp);
  }
  const cachedQueue = localStorage.getItem('pchclk_pwa_queue');
  if (cachedQueue) {
    offlineQueue = JSON.parse(cachedQueue);
  }
  const cachedStartDay = localStorage.getItem('pchclk_pwa_start_day');
  if (cachedStartDay) {
    globalStartDay = parseInt(cachedStartDay, 10);
  }

  // Running clock updater
  const updateClock = () => {
    const now = new Date();
    currentTime = now.toLocaleTimeString(navigator.language, { hour12: false });
    currentDate = now.toLocaleDateString(navigator.language, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    const clockEl = container.querySelector('.pwa-clock');
    const dateEl = container.querySelector('.pwa-date');
    if (clockEl) clockEl.textContent = currentTime;
    if (dateEl) dateEl.textContent = currentDate;
  };

  // Helper to get month name
  const getMonthName = (monthNum) => {
    const d = new Date(2000, monthNum - 1, 1);
    return d.toLocaleString(navigator.language, { month: 'long' });
  };

  // Calculate dates for custom periodic evaluation
  const getPeriodDatesForMonth = (year, month, startDay) => {
    let startYear = year;
    let startMonth = month;
    let endYear = year;
    let endMonth = month;

    if (startDay > 15) {
      startMonth = month - 1;
      if (startMonth === 0) {
        startMonth = 12;
        startYear = year - 1;
      }
    } else {
      endMonth = month + 1;
      if (endMonth === 13) {
        endMonth = 1;
        endYear = year + 1;
      }
    }

    const startDate = new Date(Date.UTC(startYear, startMonth - 1, startDay, 0, 0, 0, 0));
    const nextStart = new Date(Date.UTC(endYear, endMonth - 1, startDay, 0, 0, 0, 0));
    const endDate = new Date(nextStart.getTime() - 1);

    return { startDate, endDate };
  };

  // Sum worked hours between consecutive Clock In/Out events
  const getHoursForRange = (startDate, endDate) => {
    const rangeLogs = logs
      .filter(log => {
        const t = new Date(log.timestamp);
        return t >= startDate && t <= endDate;
      })
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    let totalMs = 0;
    let lastIn = null;

    for (const log of rangeLogs) {
      if (log.type === 'punch_in') {
        lastIn = new Date(log.timestamp);
      } else if (log.type === 'punch_out' && lastIn) {
        totalMs += new Date(log.timestamp) - lastIn;
        lastIn = null;
      }
    }

    return totalMs / (1000 * 60 * 60);
  };

  // Current period properties
  const getCurrentPeriodInfo = () => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const startDay = globalStartDay;

    const { startDate, endDate } = getPeriodDatesForMonth(currentYear, currentMonth, startDay);
    return {
      name: `${getMonthName(currentMonth)} ${currentYear}`,
      range: `${startDate.toLocaleDateString(navigator.language)} to ${endDate.toLocaleDateString(navigator.language)}`,
      startDate,
      endDate
    };
  };

  // Generate last three periods
  const getHistoryPeriods = () => {
    const list = [];
    const now = new Date();
    let currentMonth = now.getMonth() + 1;
    let currentYear = now.getFullYear();

    for (let i = 0; i < 3; i++) {
      let m = currentMonth - i;
      let y = currentYear;
      if (m <= 0) {
        m += 12;
        y -= 1;
      }
      list.push({ month: m, year: y, name: `${getMonthName(m)} ${y}` });
    }
    return list;
  };

  // Filter logs for selected history period
  const getFilteredLogs = () => {
    if (!selectedHistoryPeriod) return [];
    const { startDate, endDate } = getPeriodDatesForMonth(
      selectedHistoryPeriod.year,
      selectedHistoryPeriod.month,
      globalStartDay
    );
    return logs.filter(log => {
      const t = new Date(log.timestamp);
      return t >= startDate && t <= endDate;
    });
  };

  const getSelectedPeriodHours = () => {
    if (!selectedHistoryPeriod) return 0;
    const { startDate, endDate } = getPeriodDatesForMonth(
      selectedHistoryPeriod.year,
      selectedHistoryPeriod.month,
      globalStartDay
    );
    return getHoursForRange(startDate, endDate);
  };

  // Group logs by Day
  const getGroupedFilteredLogs = () => {
    const groups = {};
    const filtered = getFilteredLogs();
    const sorted = [...filtered].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    sorted.forEach(log => {
      const dateObj = new Date(log.timestamp);
      const localDate = dateObj.toLocaleDateString(navigator.language, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
      if (!groups[localDate]) {
        groups[localDate] = [];
      }
      groups[localDate].push(log);
    });
    return groups;
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

  // Load logs history (API or Local cache)
  const fetchHistory = async () => {
    if (!deviceKey) return;

    if (isOffline) {
      const cachedLogs = localStorage.getItem('pchclk_pwa_logs');
      if (cachedLogs) {
        logs = JSON.parse(cachedLogs);
      }
      render();
      return;
    }

    try {
      const response = await fetch(`/api/device/logs?device_key=${deviceKey}`);
      if (response.ok) {
        const data = await response.json();
        logs = data.logs;
        if (data.globalStartDay) {
          globalStartDay = data.globalStartDay;
          localStorage.setItem('pchclk_pwa_start_day', String(data.globalStartDay));
        }
        localStorage.setItem('pchclk_pwa_logs', JSON.stringify(data.logs));
      }
    } catch (err) {
      console.warn('Failed to fetch punch history:', err);
    }
    render();
  };

  // Sync Offline queue
  const syncOfflineQueue = async () => {
    if (isOffline || offlineQueue.length === 0) return;

    console.log(`Syncing ${offlineQueue.length} queued offline punches...`);
    const queueCopy = [...offlineQueue];

    for (const punch of queueCopy) {
      try {
        const response = await fetch('/api/punch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            device_key: punch.device_key,
            token: punch.token,
            timestamp: punch.timestamp
          })
        });

        if (response.ok) {
          offlineQueue = offlineQueue.filter(item => item.timestamp !== punch.timestamp);
          localStorage.setItem('pchclk_pwa_queue', JSON.stringify(offlineQueue));
        }
      } catch (err) {
        console.error('Failed to sync offline punch, will retry later:', err);
        break;
      }
    }
    fetchHistory();
  };

  // register new punch clock In/Out
  const registerPunch = async (scannedToken) => {
    const nowIso = new Date().toISOString();

    if (isOffline) {
      const offlinePunch = {
        device_key: deviceKey,
        token: scannedToken,
        timestamp: nowIso
      };
      offlineQueue.push(offlinePunch);
      localStorage.setItem('pchclk_pwa_queue', JSON.stringify(offlineQueue));
      alert('Offline punch registered! It will sync automatically once internet access is restored.');
      render();
      return;
    }

    try {
      const response = await fetch('/api/punch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_key: deviceKey,
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

  // HTML5-QR Code Scanner trigger
  const openScanner = async () => {
    if (!isOffline) {
      try {
        const response = await fetch(`/api/device/verify?device_key=${deviceKey}`);
        if (response.ok) {
          const data = await response.json();
          if (!data.paired) {
            deviceKey = '';
            employee = null;
            localStorage.removeItem('pchclk_pwa_key');
            localStorage.removeItem('pchclk_pwa_emp');
            localStorage.removeItem('pchclk_pwa_logs');
            alert('This device is no longer paired. Please register again.');
            render();
            return;
          }
        }
      } catch (err) {
        console.warn('Failed to verify pairing status online:', err);
      }
    }

    showScanner = true;
    render();

    setTimeout(() => {
      html5QrcodeScanner = new Html5Qrcode('pwa-qr-reader');
      html5QrcodeScanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          closeScanner();
          try {
            const url = new URL(decodedText);
            const qrToken = url.searchParams.get('token');
            if (qrToken) {
              registerPunch(qrToken);
            } else {
              alert('Invalid QR code format. Missing token parameter.');
            }
          } catch (err) {
            registerPunch(decodedText);
          }
        },
        (errorMessage) => {}
      ).catch(err => {
        console.error('Camera initialization failed:', err);
        alert('Could not open camera stream. Please allow permissions.');
        closeScanner();
      });
    }, 100);
  };

  const closeScanner = () => {
    showScanner = false;
    if (html5QrcodeScanner) {
      html5QrcodeScanner.stop().catch(err => console.warn('Scanner stop failed:', err));
      html5QrcodeScanner = null;
    }
    render();
  };

  // Main UI Renderer
  const render = () => {
    container.innerHTML = `
      <div class="pwa-screen min-vh-100 text-white d-flex flex-column" style="background: radial-gradient(circle at top left, #1c1d29 0%, #0a0b10 100%);">
        <!-- Header -->
        <header class="pwa-header py-3 px-4 border-bottom border-glass d-flex align-items-center justify-content-between glass-panel sticky-top">
          <div class="d-flex align-items-center gap-2">
            <i class="bi bi-clock-fill text-primary fs-4"></i>
            <span class="fw-bold fs-5 tracking-tight text-white">PchClk PWA</span>
          </div>
          
          <div class="d-flex align-items-center gap-3">
            <span class="badge ${isOffline ? 'bg-danger bg-opacity-15 text-danger border border-danger border-opacity-25' : 'bg-success bg-opacity-15 text-success border border-success border-opacity-25'}">
              <i class="bi ${isOffline ? 'bi-wifi-off me-1' : 'bi-wifi me-1'}"></i>
              ${isOffline ? 'Offline' : 'Online'}
            </span>
            <div class="pwa-theme-switch"></div>
          </div>
        </header>

        <main class="flex-grow-1 container py-4 px-3 d-flex flex-column gap-4 max-w-md" style="max-width: 480px;">
          ${!deviceKey ? renderPairingForm() : renderMainTabs()}
        </main>

        <!-- Bottom navigation menu bar -->
        ${deviceKey ? `
          <nav class="fixed-bottom pwa-nav py-2 border-top border-glass glass-panel d-flex justify-content-around align-items-center" style="z-index: 1000;">
            <button class="nav-btn d-flex flex-column align-items-center border-0 bg-transparent py-1 ${currentTab === 'home' ? 'text-primary' : 'text-white-50'}" data-tab="home">
              <i class="bi bi-house-door-fill fs-5 mb-1"></i>
              <span class="fs-9 fw-semibold">Home</span>
            </button>
            <button class="nav-btn d-flex flex-column align-items-center border-0 bg-transparent py-1 ${currentTab === 'clock' ? 'text-primary' : 'text-white-50'}" data-tab="clock">
              <i class="bi bi-qr-code-scan fs-4 mb-1"></i>
              <span class="fs-9 fw-semibold">Clock In</span>
            </button>
            <button class="nav-btn d-flex flex-column align-items-center border-0 bg-transparent py-1 ${currentTab === 'history' ? 'text-primary' : 'text-white-50'}" data-tab="history">
              <i class="bi bi-clock-history fs-5 mb-1"></i>
              <span class="fs-9 fw-semibold">History</span>
            </button>
          </nav>
        ` : ''}

        <!-- Camera overlay -->
        ${showScanner ? `
          <div class="scanner-overlay d-flex flex-column text-white" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 2000; background-color: #000;">
            <div class="scanner-header py-3 px-4 d-flex align-items-center justify-content-between" style="background: rgba(10, 11, 16, 0.85); backdrop-filter: blur(10px); position: relative; z-index: 2;">
              <h5 class="fw-bold m-0"><i class="bi bi-camera-fill me-2"></i>Align QR Code</h5>
              <button id="btn-close-scanner" class="btn btn-outline-light btn-sm rounded-circle p-2 border-0">
                <i class="bi bi-x-lg fs-5"></i>
              </button>
            </div>
            
            <div class="scanner-viewport flex-grow-1 position-relative d-flex align-items-center justify-content-center bg-black">
              <div id="pwa-qr-reader" style="width: 100%; height: 100%;"></div>
              <div class="scanner-guide" style="position: absolute; width: 250px; height: 250px; border: 4px solid #8c62ff; border-radius: 20px; box-shadow: 0 0 15px rgba(140, 98, 255, 0.5), 0 0 0 9999px rgba(0, 0, 0, 0.6); pointer-events: none; z-index: 2005;"></div>
            </div>

            <div class="scanner-footer p-4 text-center glass-panel border-top border-glass">
              <p class="small text-white-50 mb-0">
                Point your device camera at the rotating QR code on the Smart TV screen.
              </p>
            </div>
          </div>
        ` : ''}
      </div>
    `;

    // Bind theme switcher
    const pwaThemeHolder = container.querySelector('.pwa-theme-switch');
    if (pwaThemeHolder) {
      pwaThemeHolder.innerHTML = renderThemeToggle();
      bindThemeToggle(pwaThemeHolder, () => {
        render();
      });
    }

    // Bind scanner close button
    const closeBtn = container.querySelector('#btn-close-scanner');
    if (closeBtn) closeBtn.addEventListener('click', closeScanner);

    // Bind pairing form submits
    const pairingForm = container.querySelector('#pwa-pairing-form');
    if (pairingForm) {
      pairingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const codeVal = container.querySelector('#authCode').value;
        pairingLoading = true;
        pairingError = '';
        render();

        try {
          const response = await fetch('/api/device/pair', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ auth_code: codeVal })
          });

          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'Pairing registration failed');

          deviceKey = data.device_key;
          employee = data.employee;

          localStorage.setItem('pchclk_pwa_key', data.device_key);
          localStorage.setItem('pchclk_pwa_emp', JSON.stringify(data.employee));

          fetchHistory();
        } catch (err) {
          pairingLoading = false;
          pairingError = err.message;
          render();
        }
      });
    }

    // Bind navigation buttons
    const navButtons = container.querySelectorAll('.pwa-nav button');
    navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        currentTab = btn.getAttribute('data-tab');
        render();
      });
    });

    // Clock action triggers
    const triggerScanBtn = container.querySelector('#btn-pwa-trigger-scan');
    if (triggerScanBtn) triggerScanBtn.addEventListener('click', openScanner);

    // History selectors triggers
    const historyButtons = container.querySelectorAll('.btn-pwa-history-period');
    historyButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const month = parseInt(btn.getAttribute('data-month'));
        const year = parseInt(btn.getAttribute('data-year'));
        selectedHistoryPeriod = getHistoryPeriods().find(p => p.month === month && p.year === year);
        render();
      });
    });

    if (deviceKey) {
      updateClock();
    }
  };

  const renderPairingForm = () => {
    return `
      <div class="glass-panel p-4 text-center my-auto border-glass">
        <i class="bi bi-phone-vibrate text-primary mb-3 d-block" style="font-size: 3.5rem;"></i>
        <h3 class="fw-bold text-white mb-2">Pair Your Device</h3>
        <p class="text-white-50 small mb-4">
          To pair this device, ask your administrator to generate an authorization code.
        </p>

        <form id="pwa-pairing-form">
          <div class="mb-4">
            <label for="authCode" class="form-label text-muted small fw-bold d-block text-start mb-2">6-DIGIT AUTHORIZATION CODE</label>
            <input 
              type="text" 
              id="authCode" 
              class="form-control text-center fs-3 fw-bold font-monospace tracking-wide py-2" 
              placeholder="000000" 
              maxlength="10"
              required 
              ${pairingLoading ? 'disabled' : ''}
            />
          </div>

          ${pairingError ? `
            <div class="alert alert-danger bg-danger bg-opacity-10 border-0 text-danger rounded-3 py-2 small mb-3 text-start">
              <i class="bi bi-exclamation-triangle-fill me-2"></i>${pairingError}
            </div>
          ` : ''}

          <button type="submit" class="btn btn-primary w-100 py-3 rounded-3 fw-bold d-flex align-items-center justify-content-center gap-2" ${pairingLoading ? 'disabled' : ''}>
            ${pairingLoading ? '<span class="spinner-border spinner-border-sm"></span>' : '<i class="bi bi-link-45deg fs-5"></i> Register Device'}
          </button>
        </form>
      </div>
    `;
  };

  const renderMainTabs = () => {
    if (currentTab === 'home') {
      const info = getCurrentPeriodInfo();
      return `
        <!-- Profile Card -->
        <div class="glass-panel p-4 border-glass text-start">
          <div class="d-flex align-items-center gap-3">
            <div class="profile-avatar bg-primary bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center" style="width:56px; height:56px;">
              <i class="bi bi-person-fill text-primary fs-3"></i>
            </div>
            <div>
              <h5 class="text-white fw-bold m-0">${employee?.name}</h5>
              <div class="text-muted small">Registration: <code class="text-white-50">${employee?.registration_number}</code></div>
            </div>
          </div>
        </div>

        <!-- Worked Hours summary card -->
        <div class="glass-panel p-4 border-glass text-center d-flex flex-column align-items-center gap-3">
          <h5 class="text-white fw-bold mb-1 w-100 text-start">Periodic Summary</h5>
          
          <div class="d-flex justify-content-between align-items-center w-100 bg-dark bg-opacity-20 p-3 rounded-3 border border-glass text-start">
            <div>
              <div class="text-muted small mb-1">Active Period</div>
              <div class="fw-bold text-white small">${info.name}</div>
              <div class="text-white-50 fs-9 mt-1">${info.range}</div>
            </div>
            <span class="badge bg-primary px-3 py-2 rounded-pill fs-8">Start Day: ${globalStartDay}th</span>
          </div>

          <div class="worked-hours-display my-3 p-4 rounded-circle border border-primary border-3 border-opacity-20 bg-primary bg-opacity-5 d-flex flex-column align-items-center justify-content-center" style="width: 160px; height: 160px; box-shadow: 0 0 20px rgba(140, 98, 255, 0.15);">
            <span class="fs-1 fw-bold text-primary">${getHoursForRange(info.startDate, info.endDate).toFixed(2)}</span>
            <span class="fs-9 text-muted text-uppercase tracking-wider fw-bold">Hours Worked</span>
          </div>

          <p class="text-white-50 small text-start mb-0">
            <i class="bi bi-info-circle me-1 text-primary"></i>
            Worked hours are calculated by summing completed Clock In/Clock Out intervals in this period.
          </p>
        </div>
      `;
    }

    if (currentTab === 'clock') {
      return `
        <!-- Running clock widget -->
        <div class="text-center mb-2">
          <div class="display-3 fw-bold tracking-tight text-white font-monospace mb-1 pwa-clock">${currentTime}</div>
          <div class="text-primary small fw-semibold text-uppercase tracking-wider pwa-date">${currentDate}</div>
        </div>

        <div class="glass-panel p-4 text-center border-glass d-flex flex-column align-items-center gap-3 w-100">
          <p class="text-white-50 small mb-2">
            Scan the active QR Code on the Smart TV screen to record your attendance.
          </p>

          <!-- Offline Queue Indicator -->
          ${offlineQueue.length > 0 ? `
            <div class="alert alert-warning bg-warning bg-opacity-10 border-0 text-warning rounded-3 py-2 small text-start w-100">
              <i class="bi bi-cloud-arrow-up-fill me-2"></i>
              ${offlineQueue.length} punch(es) queued offline. They will sync automatically.
            </div>
          ` : ''}

          <button 
            id="btn-pwa-trigger-scan" 
            class="punch-btn rounded-circle d-flex flex-column align-items-center justify-content-center my-3"
            style="width: 170px; height: 170px; border: none; transition: all 0.3s ease; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4); ${isOffline ? 'background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);' : 'background: linear-gradient(135deg, #8c62ff 0%, #703bf5 100%);'} color: white;"
          >
            <i class="bi bi-qr-code-scan mb-2 fs-2"></i>
            <span class="fw-bold tracking-wide">${isOffline ? 'Offline Punch' : 'Scan TV Code'}</span>
          </button>
        </div>
      `;
    }

    if (currentTab === 'history') {
      const periods = getHistoryPeriods();
      if (!selectedHistoryPeriod) {
        selectedHistoryPeriod = periods[0];
      }

      const grouped = getGroupedFilteredLogs();
      const periodHours = getSelectedPeriodHours();

      return `
        <!-- History Period selector -->
        <div class="glass-panel p-3 border-glass d-flex flex-column gap-2 text-start">
          <span class="text-muted small fw-bold text-start"><i class="bi bi-funnel-fill me-1 text-primary"></i>SELECT PERIOD</span>
          <div class="d-flex gap-2 overflow-auto pb-1">
            ${periods.map(p => `
              <button 
                class="btn btn-sm px-3 py-2 rounded-3 text-nowrap flex-grow-1 btn-pwa-history-period ${selectedHistoryPeriod.name === p.name ? 'btn-primary text-white fw-bold' : 'btn-outline-secondary text-white-50 border-glass'}"
                data-month="${p.month}"
                data-year="${p.year}"
              >
                ${p.name}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- History Logs list -->
        <div class="glass-panel p-4 border-glass flex-grow-1 d-flex flex-column">
          <h5 class="text-white fw-bold mb-3 d-flex align-items-center justify-content-between">
            <span>Punch Records</span>
            <span class="badge bg-primary bg-opacity-15 text-primary border border-primary border-opacity-25 px-2 py-1 fs-9">
              ${periodHours.toFixed(2)}h worked
            </span>
          </h5>

          <!-- Grouped Logs Scroller -->
          <div class="logs-scroller flex-grow-1 overflow-auto pe-1" style="max-height: 380px;">
            <div class="d-flex flex-column gap-3">
              <!-- Offline Queued items -->
              ${selectedHistoryPeriod.name === periods[0].name && offlineQueue.length > 0 ? `
                <div>
                  <div class="text-warning small fw-bold mb-2 text-start">Offline Queued</div>
                  <div class="d-flex flex-column gap-2 mb-3">
                    ${offlineQueue.map((item, index) => `
                      <div class="log-item p-3 rounded-3 d-flex justify-content-between align-items-center bg-warning bg-opacity-5 border border-warning border-opacity-15">
                        <div>
                          <div class="small fw-bold text-warning">Offline Punch</div>
                          <div class="text-muted fs-8">${formatTimestamp(item.timestamp)}</div>
                        </div>
                        <span class="badge bg-warning text-dark fs-9 px-2 py-1 rounded">
                          <i class="bi bi-hourglass-split me-1"></i>Pending Sync
                        </span>
                      </div>
                    `).join('')}
                  </div>
                </div>
              ` : ''}

              <!-- Grouped log entries -->
              ${Object.keys(grouped).map(day => `
                <div class="text-start">
                  <div class="text-muted small fw-semibold mb-2">${day}</div>
                  <div class="d-flex flex-column gap-2">
                    ${grouped[day].map(log => `
                      <div class="log-item p-3 rounded-3 d-flex justify-content-between align-items-center border border-glass bg-dark bg-opacity-25">
                        <div>
                          <div class="small fw-bold text-white">Punch Registered</div>
                          <div class="text-muted fs-8">${formatTimestamp(log.timestamp)}</div>
                        </div>
                        ${log.type === 'punch_in' ? `
                          <span class="badge bg-success bg-opacity-15 text-success border border-success border-opacity-25 fs-9 px-2 py-1 rounded">
                            <i class="bi bi-box-arrow-in-right me-1"></i>Punch In
                          </span>
                        ` : `
                          <span class="badge bg-danger bg-opacity-15 text-danger border border-danger border-opacity-25 fs-9 px-2 py-1 rounded">
                            <i class="bi bi-box-arrow-left me-1"></i>Punch Out
                          </span>
                        `}
                      </div>
                    `).join('')}
                  </div>
                </div>
              `).join('')}

              ${Object.keys(grouped).length === 0 && !(selectedHistoryPeriod.name === periods[0].name && offlineQueue.length > 0) ? `
                <div class="text-center py-5 my-auto text-muted small">
                  <i class="bi bi-calendar-x fs-2 d-block mb-2"></i>
                  No punch records logged in this period.
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    }
  };

  // Connection changes handlers
  const setOnline = () => {
    isOffline = false;
    syncOfflineQueue();
    render();
  };

  const setOffline = () => {
    isOffline = true;
    render();
  };

  // Start initialization
  updateClock();
  clockInterval = setInterval(updateClock, 1000);
  fetchHistory();

  // Selected history defaults
  const periods = getHistoryPeriods();
  if (periods.length > 0) {
    selectedHistoryPeriod = periods[0];
  }

  // Register online/offline event listeners
  window.addEventListener('online', setOnline);
  window.addEventListener('offline', setOffline);

  // Sync if online initially
  if (!isOffline) {
    syncOfflineQueue();
  }

  render();

  // Cleanup watcher
  const observer = new MutationObserver((mutations, obs) => {
    if (!document.contains(container.querySelector('.pwa-screen'))) {
      clearInterval(clockInterval);
      window.removeEventListener('online', setOnline);
      window.removeEventListener('offline', setOffline);
      if (html5QrcodeScanner) {
        html5QrcodeScanner.stop().catch(err => {});
      }
      obs.disconnect();
    }
  });
  observer.observe(document, { childList: true, subtree: true });
}
