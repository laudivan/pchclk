<template>
  <div class="min-vh-100 d-flex flex-column">
    <!-- Navbar Header -->
    <header class="navbar navbar-expand-lg border-bottom border-glass py-3 px-4 glass-panel rounded-0 mb-4">
      <div class="container-fluid">
        <a class="navbar-brand d-flex align-items-center text-white fw-bold fs-4 gap-2" href="#">
          <i class="bi bi-clock-fill text-primary"></i> PchClk <span class="badge bg-primary fs-7 px-2">Admin</span>
        </a>
        <div class="d-flex align-items-center gap-3">
          <div class="text-end d-none d-md-block">
            <div class="text-white small fw-bold">{{ admin.username }}</div>
            <div class="text-muted small fs-8">{{ admin.role.toUpperCase() }}</div>
          </div>
          <button @click="$emit('logout')" class="btn btn-outline-danger btn-sm rounded-3 px-3 py-2">
            <i class="bi bi-box-arrow-right me-1"></i> Sign Out
          </button>
        </div>
      </div>
    </header>

    <main class="container flex-grow-1 mb-5">
      <div class="row g-4">
        <!-- Sidebar Navigation -->
        <div class="col-lg-3">
          <div class="glass-panel p-3 d-flex flex-column gap-2">
            <button 
              @click="activeTab = 'employees'" 
              class="nav-link text-start w-100 btn py-3 px-4 rounded-3 border-0 d-flex align-items-center gap-3"
              :class="activeTab === 'employees' ? 'btn-primary active text-white' : 'text-muted'"
            >
              <i class="bi bi-people-fill"></i> Employees
            </button>
            <button 
              @click="activeTab = 'logs'" 
              class="nav-link text-start w-100 btn py-3 px-4 rounded-3 border-0 d-flex align-items-center gap-3"
              :class="activeTab === 'logs' ? 'btn-primary active text-white' : 'text-muted'"
            >
              <i class="bi bi-file-earmark-spreadsheet-fill"></i> Punch Logs
            </button>
            <button 
              @click="activeTab = 'config'" 
              class="nav-link text-start w-100 btn py-3 px-4 rounded-3 border-0 d-flex align-items-center gap-3"
              :class="activeTab === 'config' ? 'btn-primary active text-white' : 'text-muted'"
            >
              <i class="bi bi-sliders"></i> Configurations
            </button>
          </div>
        </div>

        <!-- Tab Contents -->
        <div class="col-lg-9">
          <!-- 1. EMPLOYEES TAB -->
          <div v-if="activeTab === 'employees'" class="glass-panel p-4 h-100">
            <div class="d-flex align-items-center justify-content-between mb-4">
              <div>
                <h3 class="text-white fw-bold mb-1">Employees Directory</h3>
                <p class="text-muted small m-0">Create employee profiles and authorize punching devices.</p>
              </div>
              <button @click="showAddModal = true" class="btn btn-primary btn-sm d-flex align-items-center gap-2">
                <i class="bi bi-plus-circle-fill"></i> Add Employee
              </button>
            </div>

            <!-- Error message if any -->
            <div v-if="employeesError" class="alert alert-danger bg-danger bg-opacity-10 border-0 text-danger rounded-3 py-3 small mb-4">
              <i class="bi bi-exclamation-triangle-fill me-2"></i>{{ employeesError }}
            </div>

            <!-- Loader -->
            <div v-if="employeesLoading" class="text-center py-5">
              <div class="spinner-border text-primary" role="status"></div>
              <div class="text-muted mt-2">Loading employee records...</div>
            </div>

            <!-- Table list -->
            <div v-else-if="employees.length > 0" class="table-responsive">
              <table class="table custom-table text-white">
                <thead>
                  <tr>
                    <th>NAME</th>
                    <th>REGISTRATION</th>
                    <th>DEVICE KEY</th>
                    <th>DEVICE STATUS</th>
                    <th class="text-end">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="emp in employees" :key="emp.id">
                    <td class="fw-bold">{{ emp.name }}</td>
                    <td><code class="text-white-50 bg-dark px-2 py-1 rounded">{{ emp.registration_number }}</code></td>
                    <td>
                      <span v-if="emp.device_key" class="text-white-50 small text-truncate d-inline-block" style="max-width: 130px;">
                        {{ emp.device_key }}
                      </span>
                      <span v-else class="text-muted italic small">Not paired</span>
                    </td>
                    <td>
                      <span v-if="emp.is_device_active === 1" class="badge-status badge-active">
                        <i class="bi bi-check-circle-fill"></i> Paired
                      </span>
                      <span v-else-if="emp.auth_code" class="badge-status badge-inactive bg-warning bg-opacity-15 text-warning border-warning border-opacity-25">
                        <i class="bi bi-hourglass-split"></i> Pending Pairing
                      </span>
                      <span v-else class="badge-status badge-inactive">
                        <i class="bi bi-x-circle-fill"></i> Unauthorized
                      </span>
                    </td>
                    <td class="text-end">
                      <div class="d-inline-flex gap-2">
                        <button @click="editEmployee(emp)" class="btn btn-outline-warning btn-sm px-2 py-2" title="Edit Employee">
                          <i class="bi bi-pencil-fill"></i>
                        </button>
                        <button @click="confirmDeleteEmployee(emp)" class="btn btn-outline-danger btn-sm px-2 py-2" title="Remove Employee">
                          <i class="bi bi-trash-fill"></i>
                        </button>
                        <button @click="authorizeDevice(emp)" class="btn btn-outline-secondary btn-sm px-3 py-2">
                          <i class="bi bi-phone-fill me-1"></i> Authorize Device
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div v-else class="text-center py-5">
              <i class="bi bi-people text-muted" style="font-size: 3rem;"></i>
              <h5 class="text-white-50 mt-3">No employees found</h5>
              <p class="text-muted small">Get started by creating your first employee profile.</p>
            </div>
          </div>

          <!-- 2. PUNCH LOGS TAB -->
          <div v-if="activeTab === 'logs'" class="glass-panel p-4 h-100">
            <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
              <div>
                <h3 class="text-white fw-bold mb-1">Punch Records</h3>
                <p class="text-muted small m-0">View registered employee clock-in actions.</p>
              </div>
              
              <!-- Filter Controls -->
              <div class="d-flex gap-2">
                <select v-model="filterMonth" class="form-select bg-dark border-glass text-white py-2 px-3 small">
                  <option v-for="m in 12" :key="m" :value="m">{{ getMonthName(m) }}</option>
                </select>
                <select v-model="filterYear" class="form-select bg-dark border-glass text-white py-2 px-3 small">
                  <option v-for="y in [2025, 2026, 2027]" :key="y" :value="y">{{ y }}</option>
                </select>
                <button @click="fetchLogs" class="btn btn-primary btn-sm px-3 py-2">
                  <i class="bi bi-filter"></i> Filter
                </button>
              </div>
            </div>

            <!-- Active Frequency period calculated helper -->
            <div v-if="logPeriod" class="alert alert-info bg-primary bg-opacity-10 border-0 text-white-50 rounded-3 py-3 small mb-4 d-flex align-items-center justify-content-between">
              <div>
                <i class="bi bi-calendar-event-fill text-primary me-2"></i>
                Active Period: <strong class="text-white">{{ formatDateRange(logPeriod.start, logPeriod.end) }}</strong>
              </div>
              <span class="badge bg-primary">Start Day: {{ logPeriod.startDay }}th</span>
            </div>

            <!-- Error message -->
            <div v-if="logsError" class="alert alert-danger bg-danger bg-opacity-10 border-0 text-danger rounded-3 py-3 small mb-4">
              <i class="bi bi-exclamation-triangle-fill me-2"></i>{{ logsError }}
            </div>

            <!-- Loader -->
            <div v-if="logsLoading" class="text-center py-5">
              <div class="spinner-border text-primary" role="status"></div>
              <div class="text-muted mt-2">Retrieving clock-in records...</div>
            </div>

            <!-- Logs list -->
            <div v-else-if="logs.length > 0" class="table-responsive">
              <table class="table custom-table text-white">
                <thead>
                  <tr>
                    <th>EMPLOYEE</th>
                    <th>REGISTRATION</th>
                    <th>PUNCH DATE & TIME</th>
                    <th>VERIFICATION</th>
                    <th>IP ADDRESS</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="log in logs" :key="log.id">
                    <td class="fw-bold text-white">{{ log.employee_name }}</td>
                    <td><code class="text-white-50 bg-dark px-2 py-1 rounded">{{ log.registration_number }}</code></td>
                    <td class="small">{{ formatTimestamp(log.timestamp) }}</td>
                    <td>
                      <span v-if="log.hash_validated === 1" class="badge-status badge-active bg-success bg-opacity-15 text-success border-success border-opacity-25">
                        <i class="bi bi-qr-code"></i> Dynamic QR Verified
                      </span>
                      <span v-else class="badge-status badge-inactive bg-danger bg-opacity-15 text-danger border-danger border-opacity-25">
                        <i class="bi bi-exclamation-octagon-fill"></i> Manual Bypass
                      </span>
                    </td>
                    <td><code class="text-white-50 bg-dark px-2 py-1 rounded small">{{ log.ip_address || 'Unknown' }}</code></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div v-else class="text-center py-5">
              <i class="bi bi-file-earmark-spreadsheet text-muted" style="font-size: 3rem;"></i>
              <h5 class="text-white-50 mt-3">No records found</h5>
              <p class="text-muted small">No punch clocks were registered in the selected frequency range.</p>
            </div>
          </div>

          <!-- 3. CONFIGURATIONS TAB -->
          <div v-if="activeTab === 'config'" class="glass-panel p-4 h-100">
            <h3 class="text-white fw-bold mb-1">System Settings</h3>
            <p class="text-muted small mb-4">Edit global system boundaries and punch rules.</p>

            <form @submit.prevent="updateConfig" class="col-md-7">
              <div class="mb-4">
                <label for="startDay" class="form-label text-muted small fw-bold">FREQUENCY PERIOD STARTING DAY</label>
                <div class="input-group mb-2">
                  <input 
                    v-model.number="configStartDay" 
                    type="number" 
                    id="startDay" 
                    class="form-control" 
                    min="1" 
                    max="28" 
                    required
                  />
                  <span class="input-group-text bg-dark border-glass text-muted">of month</span>
                </div>
                <div class="text-muted fs-8">
                  Configures the start day of periodic evaluation. For example, setting this to <strong>{{ configStartDay }}</strong> sets ranges like: 
                  <span class="text-white">Month {{ filterMonth - 1 || 12 }} {{ configStartDay }}th</span> to <span class="text-white">Month {{ filterMonth }} {{ configStartDay - 1 }}th</span>.
                </div>
              </div>

              <!-- Message feedback -->
              <div v-if="configSuccessMessage" class="alert alert-success bg-success bg-opacity-10 border-0 text-success rounded-3 py-3 small mb-3">
                <i class="bi bi-check-circle-fill me-2"></i>{{ configSuccessMessage }}
              </div>
              <div v-if="configError" class="alert alert-danger bg-danger bg-opacity-10 border-0 text-danger rounded-3 py-3 small mb-3">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>{{ configError }}
              </div>

              <button type="submit" class="btn btn-primary" :disabled="configSaving">
                <span v-if="configSaving" class="spinner-border spinner-border-sm me-2" role="status"></span>
                Save Configurations
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>

    <!-- MODAL 1: ADD EMPLOYEE -->
    <div v-if="showAddModal" class="modal d-block" tabindex="-1" style="background: rgba(0,0,0,0.7); backdrop-filter: blur(4px);">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header border-glass">
            <h5 class="modal-title text-white fw-bold">Add New Employee</h5>
            <button type="button" @click="closeAddModal" class="btn-close btn-close-white" aria-label="Close"></button>
          </div>
          <form @submit.prevent="createEmployee">
            <div class="modal-body p-4 text-start">
              <div class="mb-3">
                <label for="empName" class="form-label text-muted small fw-bold">FULL NAME</label>
                <input v-model="newEmpName" type="text" id="empName" class="form-control" placeholder="José da Silva" required />
              </div>
              <div class="mb-3">
                <label for="empReg" class="form-label text-muted small fw-bold">REGISTRATION NUMBER (UNIQUE)</label>
                <input v-model="newEmpReg" type="text" id="empReg" class="form-control" placeholder="EMP1024" required />
              </div>

              <div v-if="addError" class="alert alert-danger bg-danger bg-opacity-10 border-0 text-danger rounded-3 py-2 small mb-0">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>{{ addError }}
              </div>
            </div>
            <div class="modal-footer border-glass">
              <button type="button" @click="closeAddModal" class="btn btn-outline-secondary px-4">Cancel</button>
              <button type="submit" class="btn btn-primary px-4" :disabled="addLoading">
                <span v-if="addLoading" class="spinner-border spinner-border-sm me-2"></span>
                Save Employee
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- MODAL 2: AUTHORIZE DEVICE (QR CODE) -->
    <div v-if="showAuthModal" class="modal d-block" tabindex="-1" style="background: rgba(0,0,0,0.7); backdrop-filter: blur(4px);">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header border-glass">
            <h5 class="modal-title text-white fw-bold">Device Authorization</h5>
            <button type="button" @click="showAuthModal = false" class="btn-close btn-close-white" aria-label="Close"></button>
          </div>
          <div class="modal-body p-4 text-center">
            <p class="text-muted small">Ask the employee to open their PchClk PWA and scan the QR Code below, or manually enter the numeric code.</p>
            
            <h4 class="text-white fw-bold mb-3">{{ selectedEmployeeName }}</h4>

            <!-- QR Code Canvas -->
            <div class="mb-4">
              <div class="qr-container bg-white p-3 d-inline-block rounded-4">
                <canvas ref="qrCanvas"></canvas>
              </div>
            </div>

            <!-- 6-digit Code -->
            <div class="mb-2">
              <span class="text-muted small fw-bold d-block mb-1">NUMERIC AUTHORIZATION CODE</span>
              <div class="auth-number-code">{{ authCode }}</div>
            </div>

            <div class="text-warning small fs-8 mt-3 bg-warning bg-opacity-10 py-2 px-3 rounded border-warning border-opacity-15">
              <i class="bi bi-exclamation-circle-fill me-1"></i>
              Valid for 24 hours. Pairing a new device invalidates previous ones automatically.
            </div>
          </div>
          <div class="modal-footer border-glass justify-content-center">
            <button type="button" @click="showAuthModal = false" class="btn btn-primary px-5">Done</button>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL 3: EDIT EMPLOYEE -->
    <div v-if="showEditModal" class="modal d-block" tabindex="-1" style="background: rgba(0,0,0,0.7); backdrop-filter: blur(4px);">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header border-glass">
            <h5 class="modal-title text-white fw-bold">Edit Employee</h5>
            <button type="button" @click="closeEditModal" class="btn-close btn-close-white" aria-label="Close"></button>
          </div>
          <form @submit.prevent="updateEmployee">
            <div class="modal-body p-4 text-start">
              <div class="mb-3">
                <label for="editEmpName" class="form-label text-muted small fw-bold">FULL NAME</label>
                <input v-model="editEmpName" type="text" id="editEmpName" class="form-control" required />
              </div>
              <div class="mb-3">
                <label for="editEmpReg" class="form-label text-muted small fw-bold">REGISTRATION NUMBER (UNIQUE)</label>
                <input v-model="editEmpReg" type="text" id="editEmpReg" class="form-control" required />
              </div>

              <div v-if="editError" class="alert alert-danger bg-danger bg-opacity-10 border-0 text-danger rounded-3 py-2 small mb-0">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>{{ editError }}
              </div>
            </div>
            <div class="modal-footer border-glass">
              <button type="button" @click="closeEditModal" class="btn btn-outline-secondary px-4">Cancel</button>
              <button type="submit" class="btn btn-primary px-4" :disabled="editLoading">
                <span v-if="editLoading" class="spinner-border spinner-border-sm me-2"></span>
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- MODAL 4: CONFIRM DELETE -->
    <div v-if="showDeleteModal" class="modal d-block" tabindex="-1" style="background: rgba(0,0,0,0.7); backdrop-filter: blur(4px);">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header border-glass">
            <h5 class="modal-title text-white fw-bold">Remove Employee</h5>
            <button type="button" @click="showDeleteModal = false" class="btn-close btn-close-white" aria-label="Close"></button>
          </div>
          <div class="modal-body p-4 text-start">
            <p class="text-white-50">Are you sure you want to remove <strong>{{ employeeToDelete?.name }}</strong> (Registration: <code>{{ employeeToDelete?.registration_number }}</code>)?</p>
            <p class="text-danger small bg-danger bg-opacity-10 py-2 px-3 rounded border border-danger border-opacity-15 mb-0">
              <i class="bi bi-exclamation-octagon-fill me-1"></i>
              Warning: This action is permanent and will delete all paired device authorizations and punch records for this employee.
            </p>
          </div>
          <div class="modal-footer border-glass">
            <button type="button" @click="showDeleteModal = false" class="btn btn-outline-secondary px-4">Cancel</button>
            <button type="button" @click="deleteEmployee" class="btn btn-danger px-4" :disabled="deleteLoading">
              <span v-if="deleteLoading" class="spinner-border spinner-border-sm me-2"></span>
              Remove Employee
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, watch, nextTick } from 'vue';
import QRCode from 'qrcode';

export default {
  name: 'Dashboard',
  props: {
    token: {
      type: String,
      required: true
    },
    admin: {
      type: Object,
      required: true
    }
  },
  setup(props) {
    const activeTab = ref('employees');

    // Employees state
    const employees = ref([]);
    const employeesLoading = ref(false);
    const employeesError = ref('');
    const showAddModal = ref(false);
    const newEmpName = ref('');
    const newEmpReg = ref('');
    const addLoading = ref(false);
    const addError = ref('');

    // Edit Employee state
    const showEditModal = ref(false);
    const selectedEmployeeId = ref(null);
    const editEmpName = ref('');
    const editEmpReg = ref('');
    const editLoading = ref(false);
    const editError = ref('');

    // Delete Employee state
    const showDeleteModal = ref(false);
    const employeeToDelete = ref(null);
    const deleteLoading = ref(false);

    // Device Auth state
    const showAuthModal = ref(false);
    const selectedEmployeeName = ref('');
    const authCode = ref('');
    const qrCanvas = ref(null);

    // Logs state
    const logs = ref([]);
    const logsLoading = ref(false);
    const logsError = ref('');
    const logPeriod = ref(null);
    const filterMonth = ref(new Date().getMonth() + 1); // 1-12
    const filterYear = ref(new Date().getFullYear());

    // Config state
    const configStartDay = ref(20);
    const configSaving = ref(false);
    const configSuccessMessage = ref('');
    const configError = ref('');

    // Fetch config
    const fetchConfig = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/admin/config', {
          headers: {
            'Authorization': `Bearer ${props.token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          configStartDay.value = data.globalStartDay;
        }
      } catch (err) {
        console.error('Failed to load config:', err);
      }
    };

    // Update config
    const updateConfig = async () => {
      configSaving.value = true;
      configSuccessMessage.value = '';
      configError.value = '';
      
      try {
        const response = await fetch('http://localhost:3000/api/admin/config', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${props.token}`
          },
          body: JSON.stringify({
            globalStartDay: configStartDay.value
          })
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to update start day');
        }

        configSuccessMessage.value = 'Configurations updated successfully!';
        // Reload logs to update calculation ranges
        fetchLogs();
      } catch (err) {
        configError.value = err.message;
      } finally {
        configSaving.value = false;
      }
    };

    // Fetch employees list
    const fetchEmployees = async () => {
      employeesLoading.value = true;
      employeesError.value = '';

      try {
        const response = await fetch('http://localhost:3000/api/admin/employees', {
          headers: {
            'Authorization': `Bearer ${props.token}`,
            'Accept-Language': navigator.language
          }
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to load employees list');
        }

        const data = await response.json();
        employees.value = data;
      } catch (err) {
        employeesError.value = err.message;
      } finally {
        employeesLoading.value = false;
      }
    };

    // Create employee
    const createEmployee = async () => {
      addLoading.value = true;
      addError.value = '';

      try {
        const response = await fetch('http://localhost:3000/api/admin/employees', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${props.token}`,
            'Accept-Language': navigator.language
          },
          body: JSON.stringify({
            name: newEmpName.value,
            registration_number: newEmpReg.value
          })
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to create employee profile');
        }

        closeAddModal();
        fetchEmployees();
      } catch (err) {
        addError.value = err.message;
      } finally {
        addLoading.value = false;
      }
    };

    const closeAddModal = () => {
      showAddModal.value = false;
      newEmpName.value = '';
      newEmpReg.value = '';
      addError.value = '';
    };

    // Edit Employee methods
    const editEmployee = (emp) => {
      selectedEmployeeId.value = emp.id;
      editEmpName.value = emp.name;
      editEmpReg.value = emp.registration_number;
      editError.value = '';
      showEditModal.value = true;
    };

    const closeEditModal = () => {
      showEditModal.value = false;
      selectedEmployeeId.value = null;
      editEmpName.value = '';
      editEmpReg.value = '';
      editError.value = '';
    };

    const updateEmployee = async () => {
      editLoading.value = true;
      editError.value = '';

      try {
        const response = await fetch(`http://localhost:3000/api/admin/employees/${selectedEmployeeId.value}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${props.token}`,
            'Accept-Language': navigator.language
          },
          body: JSON.stringify({
            name: editEmpName.value,
            registration_number: editEmpReg.value
          })
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to update employee profile');
        }

        closeEditModal();
        fetchEmployees();
      } catch (err) {
        editError.value = err.message;
      } finally {
        editLoading.value = false;
      }
    };

    // Delete Employee methods
    const confirmDeleteEmployee = (emp) => {
      employeeToDelete.value = emp;
      showDeleteModal.value = true;
    };

    const deleteEmployee = async () => {
      deleteLoading.value = true;

      try {
        const response = await fetch(`http://localhost:3000/api/admin/employees/${employeeToDelete.value.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${props.token}`,
            'Accept-Language': navigator.language
          }
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to delete employee');
        }

        showDeleteModal.value = false;
        employeeToDelete.value = null;
        fetchEmployees();
      } catch (err) {
        alert(err.message);
      } finally {
        deleteLoading.value = false;
      }
    };

    // Authorize Device code generation
    const authorizeDevice = async (emp) => {
      try {
        const response = await fetch(`http://localhost:3000/api/admin/employees/${emp.id}/authorize`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${props.token}`,
            'Accept-Language': navigator.language
          }
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to generate code');
        }

        const data = await response.json();
        selectedEmployeeName.value = emp.name;
        authCode.value = data.authCode;
        showAuthModal.value = true;

        // Render QR Code canvas in modal next tick
        await nextTick();
        if (qrCanvas.value) {
          QRCode.toCanvas(qrCanvas.value, data.qrUrl, {
            width: 190,
            margin: 1,
            color: {
              dark: '#000000',
              light: '#ffffff'
            }
          }, (err) => {
            if (err) console.error('QR rendering error:', err);
          });
        }

        // Refresh list to show pending auth code status
        fetchEmployees();
      } catch (err) {
        alert(err.message);
      }
    };

    // Fetch clocking logs
    const fetchLogs = async () => {
      logsLoading.value = true;
      logsError.value = '';

      try {
        const response = await fetch(`http://localhost:3000/api/admin/logs?month=${filterMonth.value}&year=${filterYear.value}`, {
          headers: {
            'Authorization': `Bearer ${props.token}`,
            'Accept-Language': navigator.language
          }
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to load records');
        }

        const data = await response.json();
        logs.value = data.logs;
        logPeriod.value = data.period;
      } catch (err) {
        logsError.value = err.message;
      } finally {
        logsLoading.value = false;
      }
    };

    // Date/Time helper formatters
    const formatTimestamp = (timestamp) => {
      const d = new Date(timestamp);
      return d.toLocaleDateString(navigator.language, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    };

    const formatDateRange = (start, end) => {
      const s = new Date(start);
      const e = new Date(end);
      const opt = { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' };
      return `${s.toLocaleDateString(navigator.language, opt)} - ${e.toLocaleDateString(navigator.language, opt)}`;
    };

    const getMonthName = (mIndex) => {
      const date = new Date(2000, mIndex - 1, 1);
      return date.toLocaleDateString(navigator.language, { month: 'long' });
    };

    // Fetch tab switches
    watch(activeTab, (newTab) => {
      if (newTab === 'employees') {
        fetchEmployees();
      } else if (newTab === 'logs') {
        fetchLogs();
      } else if (newTab === 'config') {
        fetchConfig();
      }
    });

    onMounted(() => {
      fetchConfig();
      fetchEmployees();
    });

    return {
      activeTab,
      employees,
      employeesLoading,
      employeesError,
      showAddModal,
      newEmpName,
      newEmpReg,
      addLoading,
      addError,
      createEmployee,
      closeAddModal,
      authorizeDevice,
      showAuthModal,
      selectedEmployeeName,
      authCode,
      qrCanvas,
      logs,
      logsLoading,
      logsError,
      logPeriod,
      filterMonth,
      filterYear,
      fetchLogs,
      formatTimestamp,
      formatDateRange,
      getMonthName,
      configStartDay,
      configSaving,
      configSuccessMessage,
      configError,
      updateConfig,
      // Edit Employee exports
      showEditModal,
      selectedEmployeeId,
      editEmpName,
      editEmpReg,
      editLoading,
      editError,
      editEmployee,
      closeEditModal,
      updateEmployee,
      // Delete Employee exports
      showDeleteModal,
      employeeToDelete,
      deleteLoading,
      confirmDeleteEmployee,
      deleteEmployee
    };
  }
};
</script>

<style scoped>
.modal-header .btn-close {
  box-shadow: none;
}
.italic {
  font-style: italic;
}
.fs-7 {
  font-size: 0.8rem;
}
.fs-8 {
  font-size: 0.7rem;
}
</style>
