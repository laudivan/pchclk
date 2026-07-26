import * as XLSX from 'xlsx';
import { handleRouting } from '../router.js';
import { renderThemeToggle, bindThemeToggle } from './ThemeToggle.js';

export function initDashboard(container, props) {
  let activeTab = 'employees';
  
  // State
  let employees = [];
  let logs = [];
  let admins = [];
  let config = { globalStartDay: 20 };
  
  let filterMonth = new Date().getMonth() + 1;
  let filterYear = new Date().getFullYear();
  let exportMonth = new Date().getMonth() + 1;
  let exportYear = new Date().getFullYear();
  
  let loading = false;
  let errorMsg = '';
  
  // Active period display info
  let logPeriod = { start: '', end: '', startDay: 20 };

  const getMonthName = (monthNum) => {
    const date = new Date(2000, monthNum - 1, 1);
    return date.toLocaleString(navigator.language, { month: 'long' });
  };

  const handleLogout = () => {
    localStorage.removeItem('pchclk_token');
    localStorage.removeItem('pchclk_admin');
    handleRouting(container);
  };

  // Helper for requests
  const apiRequest = async (url, options = {}) => {
    const headers = {
      'Authorization': `Bearer ${props.token}`,
      'Accept-Language': navigator.language,
      ...options.headers
    };
    if (options.body && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    const response = await fetch(url, { ...options, headers });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }
    return data;
  };

  // Data Fetchers
  const fetchEmployees = async () => {
    loading = true;
    errorMsg = '';
    renderContent();
    try {
      employees = await apiRequest(`/api/admin/employees?month=${filterMonth}&year=${filterYear}`);
    } catch (err) {
      errorMsg = err.message;
    } finally {
      loading = false;
      renderContent();
    }
  };

  const fetchLogs = async () => {
    loading = true;
    errorMsg = '';
    renderContent();
    try {
      const data = await apiRequest(`/api/admin/logs?month=${filterMonth}&year=${filterYear}`);
      logs = data.logs;
      logPeriod = data.period;
    } catch (err) {
      errorMsg = err.message;
    } finally {
      loading = false;
      renderContent();
    }
  };

  const fetchAdmins = async () => {
    loading = true;
    errorMsg = '';
    renderContent();
    try {
      admins = await apiRequest('/api/admin/admins');
    } catch (err) {
      errorMsg = err.message;
    } finally {
      loading = false;
      renderContent();
    }
  };

  const fetchConfig = async () => {
    loading = true;
    errorMsg = '';
    renderContent();
    try {
      const data = await apiRequest('/api/admin/config');
      config = data;
    } catch (err) {
      errorMsg = err.message;
    } finally {
      loading = false;
      renderContent();
    }
  };

  // Main UI Renderer
  const renderLayout = () => {
    container.innerHTML = `
      <div class="d-flex min-vh-100 flex-column flex-md-row" style="background: var(--bg-dark);">
        <!-- Sidebar Navigation -->
        <aside class="col-md-3 col-lg-2 p-4 border-end border-glass d-flex flex-column gap-4" style="background: var(--bg-sidebar); backdrop-filter: blur(10px);">
          <div class="d-flex align-items-center gap-2 mb-2">
            <i class="bi bi-clock-fill text-primary fs-3"></i>
            <span class="fw-bold fs-5 tracking-tight text-white">PchClk Admin</span>
          </div>

          <div class="nav flex-column nav-pills gap-2" id="sidebar-nav">
            <button class="nav-link text-start d-flex align-items-center gap-2 ${activeTab === 'employees' ? 'active' : ''}" data-tab="employees">
              <i class="bi bi-people-fill"></i> Employees
            </button>
            <button class="nav-link text-start d-flex align-items-center gap-2 ${activeTab === 'logs' ? 'active' : ''}" data-tab="logs">
              <i class="bi bi-journal-text"></i> Punch Logs
            </button>
            <button class="nav-link text-start d-flex align-items-center gap-2 ${activeTab === 'admins' ? 'active' : ''}" data-tab="admins">
              <i class="bi bi-shield-lock-fill"></i> Administrators
            </button>
            <button class="nav-link text-start d-flex align-items-center gap-2 ${activeTab === 'config' ? 'active' : ''}" data-tab="config">
              <i class="bi bi-gear-fill"></i> System Config
            </button>
            <button class="nav-link text-start d-flex align-items-center gap-2 ${activeTab === 'export' ? 'active' : ''}" data-tab="export">
              <i class="bi bi-file-earmark-spreadsheet-fill"></i> Export Report
            </button>
          </div>

          <div class="mt-auto d-flex flex-column gap-2">
            <div class="small text-muted mb-2">Logged in: <strong class="text-white">${props.admin.username}</strong></div>
            <div class="theme-toggle-holder-dashboard"></div>
            <button class="btn btn-outline-danger w-100 rounded-3 mt-2" id="btn-logout">
              <i class="bi bi-box-arrow-left me-2"></i>Logout
            </button>
          </div>
        </aside>

        <!-- Main Content Area -->
        <main class="flex-grow-1 p-4 p-md-5 overflow-auto">
          <!-- Top alert for error feedback -->
          <div id="dashboard-alert-holder"></div>
          
          <div id="dashboard-content"></div>
        </main>
      </div>

      <!-- Modals Container -->
      <div id="dashboard-modals"></div>
    `;

    // Bind Sidebar Navigation Click handlers
    const navButtons = container.querySelectorAll('#sidebar-nav button');
    navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        navButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeTab = btn.getAttribute('data-tab');
        loadTab();
      });
    });

    // Theme Switch
    const themeHolder = container.querySelector('.theme-toggle-holder-dashboard');
    if (themeHolder) {
      themeHolder.innerHTML = renderThemeToggle();
      bindThemeToggle(themeHolder, () => {
        // Just refresh the theme variables globally
      });
    }

    // Logout
    container.querySelector('#btn-logout').addEventListener('click', handleLogout);

    loadTab();
  };

  const loadTab = () => {
    errorMsg = '';
    container.querySelector('#dashboard-alert-holder').innerHTML = '';

    if (activeTab === 'employees') {
      fetchEmployees();
    } else if (activeTab === 'logs') {
      fetchLogs();
    } else if (activeTab === 'admins') {
      fetchAdmins();
    } else if (activeTab === 'config') {
      fetchConfig();
    } else if (activeTab === 'export') {
      renderContent();
    }
  };

  const renderContent = () => {
    const content = container.querySelector('#dashboard-content');
    if (!content) return;

    if (loading) {
      content.innerHTML = `
        <div class="d-flex align-items-center justify-content-center py-5">
          <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;"></div>
        </div>
      `;
      return;
    }

    // Handle Error alerts
    const alertHolder = container.querySelector('#dashboard-alert-holder');
    if (errorMsg) {
      alertHolder.innerHTML = `
        <div class="alert alert-danger border-0 bg-danger bg-opacity-10 text-danger rounded-3 py-3 small mb-4">
          <i class="bi bi-exclamation-triangle-fill me-2"></i>${errorMsg}
        </div>
      `;
    } else {
      alertHolder.innerHTML = '';
    }

    if (activeTab === 'employees') {
      renderEmployeesTab(content);
    } else if (activeTab === 'logs') {
      renderLogsTab(content);
    } else if (activeTab === 'admins') {
      renderAdminsTab(content);
    } else if (activeTab === 'config') {
      renderConfigTab(content);
    } else if (activeTab === 'export') {
      renderExportTab(content);
    }
  };

  // Render Employees Tab
  const renderEmployeesTab = (el) => {
    el.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 class="text-white fw-bold m-0">Employee Directory</h2>
          <p class="text-muted small m-0">Manage employee directories, devices authorizations, and worked hours</p>
        </div>
        <button class="btn btn-primary rounded-3" id="btn-add-employee">
          <i class="bi bi-plus-lg me-2"></i>Add Employee
        </button>
      </div>

      <!-- Month Filter for Directory Worked Hours -->
      <div class="card bg-dark bg-opacity-25 border-glass p-3 rounded-3 mb-4 text-start">
        <div class="row align-items-center g-2">
          <div class="col-md-auto">
            <span class="text-muted small fw-bold"><i class="bi bi-funnel-fill me-1 text-primary"></i>Period Filter:</span>
          </div>
          <div class="col-md-2">
            <select id="select-filter-month" class="form-select bg-dark border-glass text-white py-1 px-3 small">
              ${Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}" ${filterMonth === i + 1 ? 'selected' : ''}>${getMonthName(i + 1)}</option>`).join('')}
            </select>
          </div>
          <div class="col-md-2">
            <select id="select-filter-year" class="form-select bg-dark border-glass text-white py-1 px-3 small">
              ${[2025, 2026, 2027].map(y => `<option value="${y}" ${filterYear === y ? 'selected' : ''}>${y}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>

      <div class="glass-panel p-4 border-glass text-start">
        <div class="table-responsive">
          <table class="table custom-table">
            <thead>
              <tr>
                <th>Registration</th>
                <th>Employee Name</th>
                <th>Worked Hours</th>
                <th>Status</th>
                <th>Device Key</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${employees.map(emp => `
                <tr>
                  <td><code>${emp.registration_number}</code></td>
                  <td class="fw-bold text-white">${emp.name}</td>
                  <td>
                    <span class="badge bg-primary bg-opacity-15 text-primary border border-primary border-opacity-25 px-2 py-1 rounded">
                      ${(emp.worked_hours || 0).toFixed(2)}h
                    </span>
                  </td>
                  <td>
                    <span class="badge-status ${emp.status === 'active' ? 'badge-active' : 'badge-inactive'}">
                      ${emp.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    ${emp.paired ? `
                      <span class="text-success small"><i class="bi bi-check-circle-fill me-1"></i>Paired</span>
                    ` : `
                      <span class="text-muted small"><i class="bi bi-dash-circle me-1"></i>Unpaired</span>
                    `}
                  </td>
                  <td>
                    <div class="d-flex gap-2">
                      <button class="btn btn-sm btn-outline-secondary btn-edit-emp" data-id="${emp.id}" title="Edit Profile">
                        <i class="bi bi-pencil-fill"></i>
                      </button>
                      <button class="btn btn-sm btn-edit-emp-status" data-id="${emp.id}" data-status="${emp.status}" title="Toggle status">
                        <i class="bi ${emp.status === 'active' ? 'bi-lock-fill text-warning' : 'bi-unlock-fill text-success'}"></i>
                      </button>
                      <button class="btn btn-sm ${emp.paired ? 'btn-danger bg-opacity-10 text-danger border-danger' : 'btn-primary'} btn-pair-emp" data-id="${emp.id}" data-paired="${emp.paired ? '1' : '0'}">
                        ${emp.paired ? 'Unpair' : 'Pair'}
                      </button>
                      <button class="btn btn-sm btn-danger bg-opacity-10 text-danger border-danger btn-delete-emp" data-id="${emp.id}" title="Delete Employee">
                        <i class="bi bi-trash-fill"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
              ${employees.length === 0 ? '<tr><td colspan="6" class="text-center py-4 text-muted">No employees registered.</td></tr>' : ''}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Bind Event listeners
    container.querySelector('#select-filter-month').addEventListener('change', (e) => {
      filterMonth = parseInt(e.target.value);
      fetchEmployees();
    });
    container.querySelector('#select-filter-year').addEventListener('change', (e) => {
      filterYear = parseInt(e.target.value);
      fetchEmployees();
    });

    // Add Employee
    container.querySelector('#btn-add-employee').addEventListener('click', showAddEmployeeModal);

    // Edit Employee
    container.querySelectorAll('.btn-edit-emp').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'));
        const emp = employees.find(e => e.id === id);
        showEditEmployeeModal(emp);
      });
    });

    // Toggle Employee Status
    container.querySelectorAll('.btn-edit-emp-status').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.getAttribute('data-id'));
        const status = btn.getAttribute('data-status');
        const newStatus = status === 'active' ? 'inactive' : 'active';
        try {
          const emp = employees.find(e => e.id === id);
          await apiRequest(`/api/admin/employees/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ name: emp.name, registration_number: emp.registration_number, status: newStatus })
          });
          fetchEmployees();
        } catch (err) {
          alert('Error: ' + err.message);
        }
      });
    });

    // Delete Employee
    container.querySelectorAll('.btn-delete-emp').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.getAttribute('data-id'));
        if (confirm('Are you sure you want to delete this employee? This will permanently delete all associated punch logs.')) {
          try {
            await apiRequest(`/api/admin/employees/${id}`, { method: 'DELETE' });
            fetchEmployees();
          } catch (err) {
            alert('Error: ' + err.message);
          }
        }
      });
    });

    // Pair/Unpair Device
    container.querySelectorAll('.btn-pair-emp').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.getAttribute('data-id'));
        const paired = btn.getAttribute('data-paired') === '1';
        if (paired) {
          if (confirm('Unpair this device? The employee will not be able to scan QR codes on this device until repaired.')) {
            try {
              await apiRequest(`/api/admin/employees/${id}/unpair`, { method: 'POST' });
              fetchEmployees();
            } catch (err) {
              alert('Error: ' + err.message);
            }
          }
        } else {
          try {
            const data = await apiRequest(`/api/admin/employees/${id}/authorize`, { method: 'POST' });
            showPairingCodeModal(data);
            fetchEmployees();
          } catch (err) {
            alert('Error: ' + err.message);
          }
        }
      });
    });
  };

  // Render Logs Tab
  const renderLogsTab = (el) => {
    el.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 class="text-white fw-bold m-0">Punch Records</h2>
          <p class="text-muted small m-0">Active Period: <strong class="text-white">${getMonthName(filterMonth)} ${filterYear}</strong> (${logPeriod.start ? new Date(logPeriod.start).toLocaleDateString() : ''} to ${logPeriod.end ? new Date(logPeriod.end).toLocaleDateString() : ''})</p>
        </div>
        <button class="btn btn-primary rounded-3" id="btn-add-log">
          <i class="bi bi-plus-lg me-2"></i>Add Punch Record
        </button>
      </div>

      <!-- Month Filter logs -->
      <div class="card bg-dark bg-opacity-25 border-glass p-3 rounded-3 mb-4 text-start">
        <div class="row align-items-center g-2">
          <div class="col-md-auto">
            <span class="text-muted small fw-bold"><i class="bi bi-funnel-fill me-1 text-primary"></i>Period:</span>
          </div>
          <div class="col-md-2">
            <select id="select-filter-month" class="form-select bg-dark border-glass text-white py-1 px-3 small">
              ${Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}" ${filterMonth === i + 1 ? 'selected' : ''}>${getMonthName(i + 1)}</option>`).join('')}
            </select>
          </div>
          <div class="col-md-2">
            <select id="select-filter-year" class="form-select bg-dark border-glass text-white py-1 px-3 small">
              ${[2025, 2026, 2027].map(y => `<option value="${y}" ${filterYear === y ? 'selected' : ''}>${y}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>

      <div class="glass-panel p-4 border-glass text-start">
        <div class="table-responsive">
          <table class="table custom-table">
            <thead>
              <tr>
                <th>Punch Date & Hour</th>
                <th>Employee Name</th>
                <th>Punch Type</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${logs.map(log => `
                <tr>
                  <td class="text-white font-monospace">${new Date(log.timestamp).toLocaleString()}</td>
                  <td class="fw-bold text-white">${log.employee_name}</td>
                  <td>
                    <span class="badge ${log.type === 'punch_in' ? 'bg-success bg-opacity-15 text-success border border-success border-opacity-25' : 'bg-danger bg-opacity-15 text-danger border border-danger border-opacity-25'} px-3 py-1 rounded">
                      ${log.type === 'punch_in' ? 'Punch In' : 'Punch Out'}
                    </span>
                  </td>
                  <td>
                    <div class="d-flex gap-2">
                      <button class="btn btn-sm btn-outline-secondary btn-edit-log" data-id="${log.id}">
                        <i class="bi bi-pencil-fill"></i>
                      </button>
                      <button class="btn btn-sm btn-danger bg-opacity-10 text-danger border-danger btn-delete-log" data-id="${log.id}">
                        <i class="bi bi-trash-fill"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
              ${logs.length === 0 ? '<tr><td colspan="4" class="text-center py-4 text-muted">No punch records registered in this period.</td></tr>' : ''}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Bind events
    container.querySelector('#select-filter-month').addEventListener('change', (e) => {
      filterMonth = parseInt(e.target.value);
      fetchLogs();
    });
    container.querySelector('#select-filter-year').addEventListener('change', (e) => {
      filterYear = parseInt(e.target.value);
      fetchLogs();
    });

    // Add manual log
    container.querySelector('#btn-add-log').addEventListener('click', showAddLogModal);

    // Edit log
    container.querySelectorAll('.btn-edit-log').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'));
        const log = logs.find(l => l.id === id);
        showEditLogModal(log);
      });
    });

    // Delete log
    container.querySelectorAll('.btn-delete-log').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.getAttribute('data-id'));
        if (confirm('Are you sure you want to delete this punch record?')) {
          try {
            await apiRequest(`/api/admin/logs/${id}`, { method: 'DELETE' });
            fetchLogs();
          } catch (err) {
            alert('Error: ' + err.message);
          }
        }
      });
    });
  };

  // Render Admins Tab
  const renderAdminsTab = (el) => {
    el.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 class="text-white fw-bold m-0">Administrators</h2>
          <p class="text-muted small m-0">Manage security credentials and superadmin configurations</p>
        </div>
        <button class="btn btn-primary rounded-3" id="btn-add-admin">
          <i class="bi bi-plus-lg me-2"></i>Add Admin
        </button>
      </div>

      <div class="glass-panel p-4 border-glass text-start">
        <div class="table-responsive">
          <table class="table custom-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Role</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${admins.map(adm => `
                <tr>
                  <td class="text-white fw-bold">${adm.username}</td>
                  <td>
                    <span class="badge bg-primary bg-opacity-15 text-primary border border-primary border-opacity-25 px-2 py-1 rounded">
                      ${adm.role}
                    </span>
                  </td>
                  <td class="text-muted font-monospace">${new Date(adm.created_at).toLocaleString()}</td>
                  <td>
                    <div class="d-flex gap-2">
                      <button class="btn btn-sm btn-outline-secondary btn-edit-admin" data-id="${adm.id}">
                        <i class="bi bi-pencil-fill"></i>
                      </button>
                      <button class="btn btn-sm btn-danger bg-opacity-10 text-danger border-danger btn-delete-admin" data-id="${adm.id}">
                        <i class="bi bi-trash-fill"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Bind events
    container.querySelector('#btn-add-admin').addEventListener('click', showAddAdminModal);

    container.querySelectorAll('.btn-edit-admin').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'));
        const admin = admins.find(a => a.id === id);
        showEditAdminModal(admin);
      });
    });

    container.querySelectorAll('.btn-delete-admin').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.getAttribute('data-id'));
        if (confirm('Delete this admin credential?')) {
          try {
            await apiRequest(`/api/admin/admins/${id}`, { method: 'DELETE' });
            fetchAdmins();
          } catch (err) {
            alert('Error: ' + err.message);
          }
        }
      });
    });
  };

  // Render Config Tab
  const renderConfigTab = (el) => {
    el.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-4 text-start">
        <div>
          <h2 class="text-white fw-bold m-0">Evaluation Settings</h2>
          <p class="text-muted small m-0">Configure calculations, shifts, and boundaries for clock registers</p>
        </div>
      </div>

      <div class="col-md-6 text-start">
        <div class="glass-panel p-4 border-glass">
          <form id="config-form">
            <div class="mb-4">
              <label for="globalStartDay" class="form-label text-muted small fw-bold mb-2">PERIOD STARTING DAY (1-28)</label>
              <input 
                type="number" 
                id="globalStartDay" 
                class="form-control" 
                min="1" 
                max="28" 
                value="${config.globalStartDay}" 
                required
              />
              <div class="form-text text-white-50 small mt-2">
                Evaluations will calculate cumulative worked hours starting from this day. E.g. setting 20 means evaluations span from the 20th of a month to the 19th of the next.
              </div>
            </div>
            
            <button type="submit" class="btn btn-primary rounded-3 w-100 py-3 fw-bold">
              <i class="bi bi-save2-fill me-2"></i>Save Configuration
            </button>
          </form>
        </div>
      </div>
    `;

    // Bind event
    container.querySelector('#config-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const val = parseInt(container.querySelector('#globalStartDay').value);
      try {
        await apiRequest('/api/admin/config', {
          method: 'POST',
          body: JSON.stringify({ globalStartDay: val })
        });
        alert('Configuration saved successfully!');
        fetchConfig();
      } catch (err) {
        alert('Error: ' + err.message);
      }
    });
  };

  // Render Export Tab
  const renderExportTab = (el) => {
    el.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-4 text-start">
        <div>
          <h2 class="text-white fw-bold m-0">Export Periodic Report</h2>
          <p class="text-muted small m-0">Download a multi-sheet ODS spreadsheet containing punch records for all employees during the selected period.</p>
        </div>
      </div>

      <div class="col-md-7 text-start">
        <div class="card bg-dark bg-opacity-25 border-glass p-4 rounded-3 mb-4">
          <h5 class="text-white fw-bold mb-3 small"><i class="bi bi-gear-fill me-2 text-primary"></i>Export Configurations</h5>
          
          <div class="mb-4">
            <label class="form-label text-muted small fw-bold mb-2">SELECT PERIOD</label>
            <div class="row g-2">
              <div class="col-md-6">
                <select id="export-month" class="form-select bg-dark border-glass text-white py-2 px-3 small">
                  ${Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}" ${exportMonth === i + 1 ? 'selected' : ''}>${getMonthName(i + 1)}</option>`).join('')}
                </select>
              </div>
              <div class="col-md-6">
                <select id="export-year" class="form-select bg-dark border-glass text-white py-2 px-3 small">
                  ${[2025, 2026, 2027].map(y => `<option value="${y}" ${exportYear === y ? 'selected' : ''}>${y}</option>`).join('')}
                </select>
              </div>
            </div>
          </div>
        </div>

        <button id="btn-trigger-export" class="btn btn-primary w-100 py-3 rounded-3 fw-bold d-flex align-items-center justify-content-center gap-2">
          <i class="bi bi-download fs-5"></i> Download ODS Report
        </button>
      </div>
    `;

    // Bind selectors
    container.querySelector('#export-month').addEventListener('change', (e) => {
      exportMonth = parseInt(e.target.value);
    });
    container.querySelector('#export-year').addEventListener('change', (e) => {
      exportYear = parseInt(e.target.value);
    });

    // Trigger download
    container.querySelector('#btn-trigger-export').addEventListener('click', async () => {
      const btn = container.querySelector('#btn-trigger-export');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Generating...';
      
      try {
        // Fetch logs
        const logsData = await apiRequest(`/api/admin/logs?month=${exportMonth}&year=${exportYear}`);
        const allLogs = logsData.logs;
        const periodStart = logsData.period.start;
        const periodEnd = logsData.period.end;

        // Fetch employees
        const employeesList = await apiRequest(`/api/admin/employees?month=${exportMonth}&year=${exportYear}`);

        // Generate ODS using SheetJS
        const wb = XLSX.utils.book_new();

        for (const emp of employeesList) {
          const empLogs = allLogs
            .filter(l => l.employee_id === emp.id)
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

          const rows = [];
          let currentIn = null;

          for (const log of empLogs) {
            if (log.type === 'punch_in') {
              currentIn = log;
            } else if (log.type === 'punch_out' && currentIn) {
              const inTime = new Date(currentIn.timestamp);
              const outTime = new Date(log.timestamp);
              const diffMs = outTime - inTime;
              const hours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
              
              rows.push({
                date: inTime.toLocaleDateString(navigator.language),
                punchIn: inTime.toLocaleTimeString(navigator.language),
                punchOut: outTime.toLocaleTimeString(navigator.language),
                workedHours: hours
              });
              currentIn = null;
            }
          }

          const periodName = `${getMonthName(exportMonth)} ${exportYear}`;
          const periodString = `${new Date(periodStart).toLocaleDateString(navigator.language)} to ${new Date(periodEnd).toLocaleDateString(navigator.language)} (${periodName})`;

          const wsData = [
            ["Registration:", emp.registration_number],
            ["Employee Name:", emp.name],
            ["Period:", periodString],
            [],
            ["Date", "Punch In", "Punch Out", "Worked Hours"]
          ];

          for (const r of rows) {
            wsData.push([r.date, r.punchIn, r.punchOut, r.workedHours]);
          }

          const ws = XLSX.utils.aoa_to_sheet(wsData);
          const cleanSheetName = emp.name.replace(/[\\/?*\[\]]/g, '').substring(0, 30) || `Employee_${emp.id}`;
          XLSX.utils.book_append_sheet(wb, ws, cleanSheetName);
        }

        const wbout = XLSX.write(wb, { bookType: 'ods', type: 'array' });
        const blob = new Blob([wbout], { type: 'application/vnd.oasis.opendocument.spreadsheet' });
        const link = document.createElement('a');
        const dateStr = `${exportYear}_${String(exportMonth).padStart(2, '0')}`;
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `Punch_Records_${dateStr}.ods`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
        alert('Export failed: ' + err.message);
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-download fs-5"></i> Download ODS Report';
      }
    });
  };

  // Modals Logic Helpers
  const showModal = (title, bodyHtml, footerHtml) => {
    const modalsDiv = container.querySelector('#dashboard-modals');
    modalsDiv.innerHTML = `
      <div class="modal fade" id="dashboard-modal-el" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title fw-bold text-white">${title}</h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body text-start">
              ${bodyHtml}
            </div>
            <div class="modal-footer">
              ${footerHtml}
            </div>
          </div>
        </div>
      </div>
    `;

    const modalEl = modalsDiv.querySelector('#dashboard-modal-el');
    const modalInstance = new bootstrap.Modal(modalEl);
    modalInstance.show();
    return { modalEl, modalInstance };
  };

  const showAddEmployeeModal = () => {
    const body = `
      <form id="modal-employee-form">
        <div class="mb-3">
          <label for="emp-name" class="form-label text-muted small fw-bold mb-2">EMPLOYEE NAME</label>
          <input type="text" id="emp-name" class="form-control" placeholder="Enter full name" required />
        </div>
        <div class="mb-3">
          <label for="emp-reg" class="form-label text-muted small fw-bold mb-2">REGISTRATION CODE</label>
          <input type="text" id="emp-reg" class="form-control" placeholder="Enter code" required />
        </div>
      </form>
    `;
    const footer = `
      <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
      <button type="button" class="btn btn-primary" id="btn-modal-save-emp">Save Employee</button>
    `;

    const { modalEl, modalInstance } = showModal('Add New Employee', body, footer);

    modalEl.querySelector('#btn-modal-save-emp').addEventListener('click', async () => {
      const name = modalEl.querySelector('#emp-name').value;
      const reg = modalEl.querySelector('#emp-reg').value;
      if (!name || !reg) return;

      try {
        await apiRequest('/api/admin/employees', {
          method: 'POST',
          body: JSON.stringify({ name, registration_number: reg })
        });
        modalInstance.hide();
        fetchEmployees();
      } catch (err) {
        alert('Error: ' + err.message);
      }
    });
  };

  const showEditEmployeeModal = (emp) => {
    const body = `
      <form id="modal-employee-form">
        <div class="mb-3">
          <label for="emp-name" class="form-label text-muted small fw-bold mb-2">EMPLOYEE NAME</label>
          <input type="text" id="emp-name" class="form-control" value="${emp.name}" required />
        </div>
        <div class="mb-3">
          <label for="emp-reg" class="form-label text-muted small fw-bold mb-2">REGISTRATION CODE</label>
          <input type="text" id="emp-reg" class="form-control" value="${emp.registration_number}" required />
        </div>
      </form>
    `;
    const footer = `
      <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
      <button type="button" class="btn btn-primary" id="btn-modal-save-emp">Save Changes</button>
    `;

    const { modalEl, modalInstance } = showModal('Edit Employee Profile', body, footer);

    modalEl.querySelector('#btn-modal-save-emp').addEventListener('click', async () => {
      const name = modalEl.querySelector('#emp-name').value;
      const reg = modalEl.querySelector('#emp-reg').value;
      if (!name || !reg) return;

      try {
        await apiRequest(`/api/admin/employees/${emp.id}`, {
          method: 'PUT',
          body: JSON.stringify({ name, registration_number: reg, status: emp.status })
        });
        modalInstance.hide();
        fetchEmployees();
      } catch (err) {
        alert('Error: ' + err.message);
      }
    });
  };

  const showPairingCodeModal = (data) => {
    const body = `
      <div class="text-center py-3">
        <div class="auth-number-code mb-4">${data.auth_code}</div>
        <p class="text-muted small">Give this code to the employee to pair their device on the PWA registration view. Expires in 10 minutes.</p>
      </div>
    `;
    const footer = `
      <button type="button" class="btn btn-primary w-100" data-bs-dismiss="modal">Done</button>
    `;
    showModal('Device Pairing Code', body, footer);
  };

  const showAddLogModal = () => {
    const body = `
      <form id="modal-log-form">
        <div class="mb-3">
          <label for="log-emp" class="form-label text-muted small fw-bold mb-2">EMPLOYEE</label>
          <select id="log-emp" class="form-select bg-dark border-glass text-white" required>
            ${employees.map(e => `<option value="${e.id}">${e.name}</option>`).join('')}
          </select>
        </div>
        <div class="mb-3">
          <label for="log-date" class="form-label text-muted small fw-bold mb-2">DATE</label>
          <input type="date" id="log-date" class="form-control" required />
        </div>
        <div class="mb-3">
          <label for="log-time" class="form-label text-muted small fw-bold mb-2">TIME</label>
          <input type="time" id="log-time" class="form-control" required />
        </div>
        <div class="mb-3">
          <label for="log-type" class="form-label text-muted small fw-bold mb-2">TYPE</label>
          <select id="log-type" class="form-select bg-dark border-glass text-white" required>
            <option value="punch_in">Punch In</option>
            <option value="punch_out">Punch Out</option>
          </select>
        </div>
      </form>
    `;
    const footer = `
      <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
      <button type="button" class="btn btn-primary" id="btn-modal-save-log">Add Punch</button>
    `;

    const { modalEl, modalInstance } = showModal('Add Manual Punch Record', body, footer);

    // Set default date input value to today
    const today = new Date().toISOString().split('T')[0];
    modalEl.querySelector('#log-date').value = today;

    modalEl.querySelector('#btn-modal-save-log').addEventListener('click', async () => {
      const empId = modalEl.querySelector('#log-emp').value;
      const date = modalEl.querySelector('#log-date').value;
      const time = modalEl.querySelector('#log-time').value;
      const type = modalEl.querySelector('#log-type').value;
      
      if (!empId || !date || !time || !type) return;

      const timestamp = new Date(`${date}T${time}:00`).toISOString();

      try {
        await apiRequest('/api/admin/logs', {
          method: 'POST',
          body: JSON.stringify({ employee_id: parseInt(empId), timestamp, type })
        });
        modalInstance.hide();
        fetchLogs();
      } catch (err) {
        alert('Error: ' + err.message);
      }
    });
  };

  const showEditLogModal = (log) => {
    // Separate ISO timestamp back to local date/time components
    const dt = new Date(log.timestamp);
    const pad = (num) => String(num).padStart(2, '0');
    const localDate = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
    const localTime = `${pad(dt.getHours())}:${pad(dt.getMinutes())}`;

    const body = `
      <form id="modal-log-form">
        <div class="mb-3">
          <label class="form-label text-muted small fw-bold mb-1">EMPLOYEE</label>
          <div class="fw-bold text-white mb-2">${log.employee_name}</div>
        </div>
        <div class="mb-3">
          <label for="log-date" class="form-label text-muted small fw-bold mb-2">DATE</label>
          <input type="date" id="log-date" class="form-control" value="${localDate}" required />
        </div>
        <div class="mb-3">
          <label for="log-time" class="form-label text-muted small fw-bold mb-2">TIME</label>
          <input type="time" id="log-time" class="form-control" value="${localTime}" required />
        </div>
        <div class="mb-3">
          <label for="log-type" class="form-label text-muted small fw-bold mb-2">TYPE</label>
          <select id="log-type" class="form-select bg-dark border-glass text-white" required>
            <option value="punch_in" ${log.type === 'punch_in' ? 'selected' : ''}>Punch In</option>
            <option value="punch_out" ${log.type === 'punch_out' ? 'selected' : ''}>Punch Out</option>
          </select>
        </div>
      </form>
    `;
    const footer = `
      <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
      <button type="button" class="btn btn-primary" id="btn-modal-save-log">Save Changes</button>
    `;

    const { modalEl, modalInstance } = showModal('Edit Punch Record', body, footer);

    modalEl.querySelector('#btn-modal-save-log').addEventListener('click', async () => {
      const date = modalEl.querySelector('#log-date').value;
      const time = modalEl.querySelector('#log-time').value;
      const type = modalEl.querySelector('#log-type').value;
      
      if (!date || !time || !type) return;

      const timestamp = new Date(`${date}T${time}:00`).toISOString();

      try {
        await apiRequest(`/api/admin/logs/${log.id}`, {
          method: 'PUT',
          body: JSON.stringify({ timestamp, type })
        });
        modalInstance.hide();
        fetchLogs();
      } catch (err) {
        alert('Error: ' + err.message);
      }
    });
  };

  const showAddAdminModal = () => {
    const body = `
      <form id="modal-admin-form">
        <div class="mb-3">
          <label for="adm-user" class="form-label text-muted small fw-bold mb-2">USERNAME</label>
          <input type="text" id="adm-user" class="form-control" placeholder="Enter username" required />
        </div>
        <div class="mb-3">
          <label for="adm-pass" class="form-label text-muted small fw-bold mb-2">PASSWORD</label>
          <input type="password" id="adm-pass" class="form-control" placeholder="Enter password" required />
        </div>
        <div class="mb-3">
          <label for="adm-role" class="form-label text-muted small fw-bold mb-2">ROLE</label>
          <select id="adm-role" class="form-select bg-dark border-glass text-white" required>
            <option value="admin">Admin</option>
            <option value="superadmin">Superadmin</option>
          </select>
        </div>
      </form>
    `;
    const footer = `
      <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
      <button type="button" class="btn btn-primary" id="btn-modal-save-adm">Save Admin</button>
    `;

    const { modalEl, modalInstance } = showModal('Add New Administrator', body, footer);

    modalEl.querySelector('#btn-modal-save-adm').addEventListener('click', async () => {
      const username = modalEl.querySelector('#adm-user').value;
      const password = modalEl.querySelector('#adm-pass').value;
      const role = modalEl.querySelector('#adm-role').value;
      
      if (!username || !password || !role) return;

      try {
        await apiRequest('/api/admin/admins', {
          method: 'POST',
          body: JSON.stringify({ username, password, role })
        });
        modalInstance.hide();
        fetchAdmins();
      } catch (err) {
        alert('Error: ' + err.message);
      }
    });
  };

  const showEditAdminModal = (admin) => {
    const body = `
      <form id="modal-admin-form">
        <div class="mb-3">
          <label class="form-label text-muted small fw-bold mb-1">USERNAME</label>
          <div class="fw-bold text-white mb-2">${admin.username}</div>
        </div>
        <div class="mb-3">
          <label for="adm-pass" class="form-label text-muted small fw-bold mb-2">NEW PASSWORD (LEAVE EMPTY TO KEEP CURRENT)</label>
          <input type="password" id="adm-pass" class="form-control" placeholder="Enter new password" />
        </div>
        <div class="mb-3">
          <label for="adm-role" class="form-label text-muted small fw-bold mb-2">ROLE</label>
          <select id="adm-role" class="form-select bg-dark border-glass text-white" required>
            <option value="admin" ${admin.role === 'admin' ? 'selected' : ''}>Admin</option>
            <option value="superadmin" ${admin.role === 'superadmin' ? 'selected' : ''}>Superadmin</option>
          </select>
        </div>
      </form>
    `;
    const footer = `
      <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
      <button type="button" class="btn btn-primary" id="btn-modal-save-adm">Save Changes</button>
    `;

    const { modalEl, modalInstance } = showModal('Edit Admin Credentials', body, footer);

    modalEl.querySelector('#btn-modal-save-adm').addEventListener('click', async () => {
      const password = modalEl.querySelector('#adm-pass').value;
      const role = modalEl.querySelector('#adm-role').value;
      
      if (!role) return;

      const bodyObj = { role };
      if (password) bodyObj.password = password;

      try {
        await apiRequest(`/api/admin/admins/${admin.id}`, {
          method: 'PUT',
          body: JSON.stringify(bodyObj)
        });
        modalInstance.hide();
        fetchAdmins();
      } catch (err) {
        alert('Error: ' + err.message);
      }
    });
  };

  renderLayout();
}
