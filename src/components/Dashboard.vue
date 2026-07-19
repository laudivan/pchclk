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
          
          <!-- Mobile Menu Toggler -->
          <button @click="showMobileMenu = !showMobileMenu" class="btn btn-outline-light d-lg-none btn-sm px-2 py-1 mobile-menu-btn">
            <i class="bi" :class="showMobileMenu ? 'bi-x-lg' : 'bi-list'" style="font-size: 1.25rem;"></i>
          </button>

          <button @click="$emit('logout')" class="btn btn-outline-danger btn-sm rounded-3 px-3 py-2">
            <i class="bi bi-box-arrow-right me-1"></i> Sign Out
          </button>
        </div>
      </div>
    </header>

    <main class="container flex-grow-1 mb-5">
      <div class="row g-4">
        <!-- Sidebar Navigation -->
        <div class="col-lg-3" :class="{'d-none d-lg-block': !showMobileMenu}">
          <div class="glass-panel p-3 d-flex flex-column gap-2">
            <button 
              @click="selectTab('employees')" 
              class="nav-link text-start w-100 btn py-3 px-4 rounded-3 border-0 d-flex align-items-center gap-3"
              :class="activeTab === 'employees' ? 'btn-primary active text-white' : 'text-muted'"
            >
              <i class="bi bi-people-fill"></i> Employees
            </button>
            <button 
              @click="selectTab('logs')" 
              class="nav-link text-start w-100 btn py-3 px-4 rounded-3 border-0 d-flex align-items-center gap-3"
              :class="activeTab === 'logs' ? 'btn-primary active text-white' : 'text-muted'"
            >
              <i class="bi bi-file-earmark-spreadsheet-fill"></i> Punch Logs
            </button>
            <button 
              @click="selectTab('config')" 
              class="nav-link text-start w-100 btn py-3 px-4 rounded-3 border-0 d-flex align-items-center gap-3"
              :class="activeTab === 'config' ? 'btn-primary active text-white' : 'text-muted'"
            >
              <i class="bi bi-sliders"></i> Configurations
            </button>
            <!-- Manage Admins (Superadmin Only) -->
            <button 
              v-if="admin.role === 'superadmin'"
              @click="selectTab('admins')" 
              class="nav-link text-start w-100 btn py-3 px-4 rounded-3 border-0 d-flex align-items-center gap-3"
              :class="activeTab === 'admins' ? 'btn-primary active text-white' : 'text-muted'"
            >
              <i class="bi bi-shield-lock-fill"></i> Administrators
            </button>
          </div>
        </div>

        <!-- Tab Contents -->
        <div class="col-lg-9">
          <!-- 1. EMPLOYEES TAB -->
          <div v-if="activeTab === 'employees'" class="glass-panel p-4 h-100">
            <!-- A. EMPLOYEE FORMULARY (DETAILS VIEW) -->
            <div v-if="activeEmployee">
              <div class="d-flex align-items-center justify-content-between mb-4">
                <button @click="clearActiveEmployee" class="btn btn-outline-secondary btn-sm d-flex align-items-center gap-2">
                  <i class="bi bi-arrow-left"></i> Back to Directory
                </button>
                <span class="badge bg-secondary fs-7 px-3 py-2 text-uppercase">Employee details</span>
              </div>
              
              <h3 class="text-white fw-bold mb-1">Employee Details</h3>
              <p class="text-muted small mb-4">View profile info, edit registration details, or access frequency reports.</p>
              
              <form @submit.prevent="triggerSaveConfirm">
                <div class="row g-3 mb-4">
                  <div class="col-md-6">
                    <label for="formName" class="form-label text-muted small fw-bold">FULL NAME</label>
                    <input 
                      v-model="formEmpName" 
                      type="text" 
                      id="formName" 
                      class="form-control" 
                      :disabled="!isEditingEmployee" 
                      required 
                    />
                  </div>
                  <div class="col-md-6">
                    <label for="formReg" class="form-label text-muted small fw-bold">REGISTRATION NUMBER (UNIQUE)</label>
                    <input 
                      v-model="formEmpReg" 
                      type="text" 
                      id="formReg" 
                      class="form-control" 
                      :disabled="!isEditingEmployee" 
                      required 
                    />
                  </div>
                </div>

                <!-- Feedback -->
                <div v-if="formularyError" class="alert alert-danger bg-danger bg-opacity-10 border-0 text-danger rounded-3 py-2 small mb-3">
                  <i class="bi bi-exclamation-triangle-fill me-2"></i>{{ formularyError }}
                </div>

                <!-- Action Buttons -->
                <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 pt-3 border-top border-glass">
                  <div class="d-flex gap-2">
                    <!-- Non-editing Actions -->
                    <template v-if="!isEditingEmployee">
                      <button type="button" @click="startEditEmployee" class="btn btn-outline-warning d-flex align-items-center gap-2">
                        <i class="bi bi-pencil-fill"></i> Edit
                      </button>
                      <button type="button" @click="confirmDeleteEmployee(activeEmployee)" class="btn btn-outline-danger d-flex align-items-center gap-2">
                        <i class="bi bi-trash-fill"></i> Remove
                      </button>
                    </template>
                    <!-- Editing Actions -->
                    <template v-else>
                      <button type="submit" class="btn btn-success d-flex align-items-center gap-2">
                        <i class="bi bi-check-circle-fill"></i> Save
                      </button>
                      <button type="button" @click="cancelEditEmployee" class="btn btn-outline-secondary d-flex align-items-center gap-2">
                        <i class="bi bi-x-circle-fill"></i> Cancel
                      </button>
                    </template>
                  </div>
                  
                  <!-- Frequency Report Button -->
                  <button type="button" @click="openEmployeeFrequencyReport(activeEmployee)" class="btn btn-outline-primary d-flex align-items-center gap-2">
                    <i class="bi bi-calendar-check-fill"></i> View Frequency Report
                  </button>
                </div>
              </form>
            </div>

            <!-- B. DIRECTORY LIST VIEW (DEFAULT) -->
            <div v-else>
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
                  <tbody>
                    <tr v-for="emp in employees" :key="emp.id">
                      <td>
                        <a href="#" @click.prevent="viewEmployee(emp)" class="employee-link text-decoration-none">
                          {{ emp.name }}
                        </a>
                      </td>
                      <td><code class="text-white-50 bg-dark px-2 py-1 rounded">{{ emp.registration_number }}</code></td>
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
                        <button @click="authorizeDevice(emp)" class="btn btn-outline-primary btn-sm px-3 py-1 d-flex align-items-center gap-1" title="Get Pairing Code">
                          <i class="bi bi-key-fill"></i> <span class="small">Pair</span>
                        </button>
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

          <!-- 4. ADMINISTRATORS TAB (SUPERADMIN ONLY) -->
          <div v-if="activeTab === 'admins' && admin.role === 'superadmin'" class="glass-panel p-4 h-100">
            <div class="d-flex align-items-center justify-content-between mb-4">
              <div>
                <h3 class="text-white fw-bold mb-1">System Administrators</h3>
                <p class="text-muted small m-0">Add, edit, or revoke administrator accounts.</p>
              </div>
              <button @click="openAddAdminModal" class="btn btn-primary btn-sm d-flex align-items-center gap-2">
                <i class="bi bi-plus-circle-fill"></i> Add Administrator
              </button>
            </div>

            <!-- Error message if any -->
            <div v-if="adminsError" class="alert alert-danger bg-danger bg-opacity-10 border-0 text-danger rounded-3 py-3 small mb-4">
              <i class="bi bi-exclamation-triangle-fill me-2"></i>{{ adminsError }}
            </div>

            <!-- Loader -->
            <div v-if="adminsLoading" class="text-center py-5">
              <div class="spinner-border text-primary" role="status"></div>
              <div class="text-muted mt-2">Retrieving administrator records...</div>
            </div>

            <!-- Table list -->
            <div v-else-if="admins.length > 0" class="table-responsive">
              <table class="table custom-table text-white">
                <thead>
                  <tr>
                    <th>USERNAME</th>
                    <th>ROLE</th>
                    <th>CREATED AT</th>
                    <th class="text-end">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="adm in admins" :key="adm.id">
                    <td class="fw-bold">{{ adm.username }}</td>
                    <td>
                      <span class="badge bg-secondary px-2 py-1 fs-8 text-uppercase">
                        {{ adm.role }}
                      </span>
                    </td>
                    <td class="small">{{ formatTimestamp(adm.created_at) }}</td>
                    <td class="text-end">
                      <div class="d-inline-flex gap-2">
                        <button @click="openEditAdminModal(adm)" class="btn btn-outline-warning btn-sm px-2 py-2" title="Edit Admin">
                          <i class="bi bi-pencil-fill"></i>
                        </button>
                        <button 
                          @click="confirmDeleteAdmin(adm)" 
                          class="btn btn-outline-danger btn-sm px-2 py-2" 
                          title="Remove Admin"
                          :disabled="adm.id === admin.id"
                        >
                          <i class="bi bi-trash-fill"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
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

    <!-- MODAL 2: AUTHORIZE DEVICE (PAIRING CODE) -->
    <div v-if="showAuthModal" class="modal d-block" tabindex="-1" style="background: rgba(0,0,0,0.7); backdrop-filter: blur(4px);">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header border-glass">
            <h5 class="modal-title text-white fw-bold"><i class="bi bi-key-fill text-primary me-2"></i>Device Pairing Code</h5>
            <button type="button" @click="showAuthModal = false" class="btn-close btn-close-white" aria-label="Close"></button>
          </div>
          <div class="modal-body p-4 text-center">
            <p class="text-muted small mb-1">Share this code with the employee.</p>
            <p class="text-muted small mb-4">They must enter it in the <strong class="text-white">PchClk Employee PWA</strong> to pair their device.</p>

            <h4 class="text-white fw-bold mb-4">{{ selectedEmployeeName }}</h4>

            <!-- Prominent pairing code display -->
            <div class="pairing-code-block mb-4">
              <div class="pairing-code-label">PAIRING CODE</div>
              <div class="pairing-code-digits">{{ authCode }}</div>
              <button
                type="button"
                class="btn btn-sm btn-outline-secondary mt-3 px-4"
                @click="copyAuthCode"
              >
                <i class="bi" :class="codeCopied ? 'bi-check-lg text-success' : 'bi-clipboard'"></i>
                {{ codeCopied ? 'Copied!' : 'Copy Code' }}
              </button>
            </div>

            <div class="text-warning small fs-8 bg-warning bg-opacity-10 py-2 px-3 rounded border-warning border-opacity-15">
              <i class="bi bi-exclamation-circle-fill me-1"></i>
              Valid for 24 hours. Issuing a new code invalidates the previous one automatically.
            </div>
          </div>
          <div class="modal-footer border-glass justify-content-center">
            <button type="button" @click="showAuthModal = false" class="btn btn-primary px-5">Done</button>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL 3: CONFIRM SAVE EMPLOYEE -->
    <div v-if="showSaveConfirmModal" class="modal d-block" tabindex="-1" style="background: rgba(0,0,0,0.7); backdrop-filter: blur(4px);">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header border-glass">
            <h5 class="modal-title text-white fw-bold">Confirm Modifications</h5>
            <button type="button" @click="showSaveConfirmModal = false" class="btn-close btn-close-white" aria-label="Close"></button>
          </div>
          <div class="modal-body p-4 text-start text-white-50">
            <p>Are you sure you want to save the changes to this employee profile?</p>
          </div>
          <div class="modal-footer border-glass">
            <button type="button" @click="showSaveConfirmModal = false" class="btn btn-outline-secondary px-4">Cancel</button>
            <button type="button" @click="saveEmployeeChanges" class="btn btn-success px-4" :disabled="editLoading">
              <span v-if="editLoading" class="spinner-border spinner-border-sm me-2"></span>
              Confirm Save
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL 4: CONFIRM DELETE EMPLOYEE -->
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

    <!-- MODAL 5: EMPLOYEE FREQUENCY REPORT -->
    <div v-if="showFreqReportModal" class="modal d-block" tabindex="-1" style="background: rgba(0,0,0,0.7); backdrop-filter: blur(4px);">
      <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header border-glass">
            <h5 class="modal-title text-white fw-bold">Frequency Report - {{ activeEmployee?.name }}</h5>
            <button type="button" @click="showFreqReportModal = false" class="btn-close btn-close-white" aria-label="Close"></button>
          </div>
          <div class="modal-body p-4">
            <!-- Filter Controls -->
            <div class="d-flex gap-2 mb-4 justify-content-end">
              <select v-model="freqMonth" class="form-select bg-dark border-glass text-white py-2 px-3 small" style="width: auto;">
                <option v-for="m in 12" :key="m" :value="m">{{ getMonthName(m) }}</option>
              </select>
              <select v-model="freqYear" class="form-select bg-dark border-glass text-white py-2 px-3 small" style="width: auto;">
                <option v-for="y in [2025, 2026, 2027]" :key="y" :value="y">{{ y }}</option>
              </select>
              <button @click="fetchEmployeeLogs" class="btn btn-primary btn-sm px-3">
                <i class="bi bi-filter"></i> Filter
              </button>
            </div>

            <!-- Loader -->
            <div v-if="freqLoading" class="text-center py-5">
              <div class="spinner-border text-primary" role="status"></div>
            </div>

            <!-- Punch Records Table -->
            <div v-else-if="freqLogs.length > 0" class="table-responsive" style="max-height: 350px; overflow-y: auto;">
              <table class="table custom-table text-white mb-0">
                <thead>
                  <tr>
                    <th>DATE & TIME</th>
                    <th>VERIFICATION</th>
                    <th>IP ADDRESS</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="log in freqLogs" :key="log.id">
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

            <div v-else class="text-center py-5 text-muted small">
              <i class="bi bi-calendar-x" style="font-size: 2rem;"></i>
              <div class="mt-2">No punch records found for this frequency period.</div>
            </div>
          </div>
          <div class="modal-footer border-glass justify-content-center">
            <button type="button" @click="showFreqReportModal = false" class="btn btn-primary px-5">Done</button>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL 6: ADD/EDIT ADMINISTRATOR -->
    <div v-if="showAdminModal" class="modal d-block" tabindex="-1" style="background: rgba(0,0,0,0.7); backdrop-filter: blur(4px);">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header border-glass">
            <h5 class="modal-title text-white fw-bold">{{ isEditingAdmin ? 'Edit Administrator' : 'Add Administrator' }}</h5>
            <button type="button" @click="closeAdminModal" class="btn-close btn-close-white" aria-label="Close"></button>
          </div>
          <form @submit.prevent="triggerAdminSaveConfirm">
            <div class="modal-body p-4 text-start">
              <div class="mb-3">
                <label for="adminUsername" class="form-label text-muted small fw-bold">USERNAME</label>
                <input v-model="adminFormUsername" type="text" id="adminUsername" class="form-control" required />
              </div>
              <div class="mb-3">
                <label for="adminPassword" class="form-label text-muted small fw-bold">
                  PASSWORD <span v-if="isEditingAdmin" class="text-muted font-monospace">(LEAVE BLANK TO KEEP UNCHANGED)</span>
                </label>
                <input v-model="adminFormPassword" type="password" id="adminPassword" class="form-control" :required="!isEditingAdmin" />
              </div>
              <div class="mb-3">
                <label for="adminRole" class="form-label text-muted small fw-bold">ROLE</label>
                <select v-model="adminFormRole" id="adminRole" class="form-select bg-dark border-glass text-white" required>
                  <option value="admin">Admin</option>
                  <option value="superadmin">Superadmin</option>
                </select>
              </div>

              <div v-if="adminFormError" class="alert alert-danger bg-danger bg-opacity-10 border-0 text-danger rounded-3 py-2 small mb-0">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>{{ adminFormError }}
              </div>
            </div>
            <div class="modal-footer border-glass">
              <button type="button" @click="closeAdminModal" class="btn btn-outline-secondary px-4">Cancel</button>
              <button type="submit" class="btn btn-primary px-4" :disabled="adminFormSaving">
                <span v-if="adminFormSaving" class="spinner-border spinner-border-sm me-2"></span>
                Save
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- MODAL 7: CONFIRM SAVE ADMINISTRATOR -->
    <div v-if="showAdminSaveConfirmModal" class="modal d-block" tabindex="-1" style="background: rgba(0,0,0,0.7); backdrop-filter: blur(4px);">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header border-glass">
            <h5 class="modal-title text-white fw-bold">Confirm Account Changes</h5>
            <button type="button" @click="showAdminSaveConfirmModal = false" class="btn-close btn-close-white" aria-label="Close"></button>
          </div>
          <div class="modal-body p-4 text-start text-white-50">
            <p>Are you sure you want to save this administrator account?</p>
          </div>
          <div class="modal-footer border-glass">
            <button type="button" @click="showAdminSaveConfirmModal = false" class="btn btn-outline-secondary px-4">Cancel</button>
            <button type="button" @click="saveAdminAccount" class="btn btn-primary px-4" :disabled="adminFormSaving">
              <span v-if="adminFormSaving" class="spinner-border spinner-border-sm me-2"></span>
              Confirm Save
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL 8: CONFIRM DELETE ADMINISTRATOR -->
    <div v-if="showAdminDeleteModal" class="modal d-block" tabindex="-1" style="background: rgba(0,0,0,0.7); backdrop-filter: blur(4px);">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header border-glass">
            <h5 class="modal-title text-white fw-bold">Remove Administrator</h5>
            <button type="button" @click="showAdminDeleteModal = false" class="btn-close btn-close-white" aria-label="Close"></button>
          </div>
          <div class="modal-body p-4 text-start">
            <p class="text-white-50">Are you sure you want to delete administrator <strong>{{ adminToDelete?.username }}</strong>?</p>
            <p class="text-danger small bg-danger bg-opacity-10 py-2 px-3 rounded border border-danger border-opacity-15 mb-0">
              <i class="bi bi-exclamation-octagon-fill me-1"></i>
              Warning: This will permanently remove their admin session privileges.
            </p>
          </div>
          <div class="modal-footer border-glass">
            <button type="button" @click="showAdminDeleteModal = false" class="btn btn-outline-secondary px-4">Cancel</button>
            <button type="button" @click="deleteAdminAccount" class="btn btn-danger px-4" :disabled="adminDeleteSaving">
              <span v-if="adminDeleteSaving" class="spinner-border spinner-border-sm me-2"></span>
              Remove Administrator
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Floating Add Employee Button (FAB) -->
    <button 
      v-if="activeTab === 'employees' && !activeEmployee" 
      @click="showAddModal = true" 
      class="fab-btn" 
      title="Add Employee"
    >
      <i class="bi bi-plus-lg"></i>
    </button>
  </div>
</template>

<script>
import { ref, onMounted, watch } from 'vue';

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
    const showMobileMenu = ref(false);

    // Employees state
    const employees = ref([]);
    const employeesLoading = ref(false);
    const employeesError = ref('');
    const showAddModal = ref(false);
    const newEmpName = ref('');
    const newEmpReg = ref('');
    const addLoading = ref(false);
    const addError = ref('');

    // Detail/Formulary View state
    const activeEmployee = ref(null);
    const isEditingEmployee = ref(false);
    const formEmpName = ref('');
    const formEmpReg = ref('');
    const formularyError = ref('');
    const showSaveConfirmModal = ref(false);
    const editLoading = ref(false);

    // Device Auth state
    const showAuthModal = ref(false);
    const selectedEmployeeName = ref('');
    const authCode = ref('');
    const codeCopied = ref(false);

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

    // Employee Frequency Report state
    const showFreqReportModal = ref(false);
    const freqLogs = ref([]);
    const freqLoading = ref(false);
    const freqMonth = ref(new Date().getMonth() + 1);
    const freqYear = ref(new Date().getFullYear());

    // Administrators state
    const admins = ref([]);
    const adminsLoading = ref(false);
    const adminsError = ref('');
    const showAdminModal = ref(false);
    const isEditingAdmin = ref(false);
    const selectedAdminId = ref(null);
    const adminFormUsername = ref('');
    const adminFormPassword = ref('');
    const adminFormRole = ref('admin');
    const adminFormError = ref('');
    const adminFormSaving = ref(false);
    
    // Confirm Modals admin
    const showAdminSaveConfirmModal = ref(false);
    const showAdminDeleteModal = ref(false);
    const adminToDelete = ref(null);
    const adminDeleteSaving = ref(false);

    // Delete Employee state
    const showDeleteModal = ref(false);
    const employeeToDelete = ref(null);
    const deleteLoading = ref(false);

    const selectTab = (tab) => {
      activeTab.value = tab;
      showMobileMenu.value = false; // close mobile menu when nav item clicked
      if (tab === 'employees') {
        clearActiveEmployee();
      }
    };

    // Fetch config
    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/admin/config', {
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
        const response = await fetch('/api/admin/config', {
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
        const response = await fetch('/api/admin/employees', {
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
        const response = await fetch('/api/admin/employees', {
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

    // Employee detail selection
    const viewEmployee = (emp) => {
      activeEmployee.value = emp;
      formEmpName.value = emp.name;
      formEmpReg.value = emp.registration_number;
      isEditingEmployee.value = false;
      formularyError.value = '';
    };

    const clearActiveEmployee = () => {
      activeEmployee.value = null;
      isEditingEmployee.value = false;
      formEmpName.value = '';
      formEmpReg.value = '';
      formularyError.value = '';
    };

    const startEditEmployee = () => {
      isEditingEmployee.value = true;
    };

    const cancelEditEmployee = () => {
      isEditingEmployee.value = false;
      formEmpName.value = activeEmployee.value.name;
      formEmpReg.value = activeEmployee.value.registration_number;
      formularyError.value = '';
    };

    const triggerSaveConfirm = () => {
      formularyError.value = '';
      showSaveConfirmModal.value = true;
    };

    // Save changes via PUT
    const saveEmployeeChanges = async () => {
      editLoading.value = true;
      showSaveConfirmModal.value = false;

      try {
        const response = await fetch(`/api/admin/employees/${activeEmployee.value.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${props.token}`,
            'Accept-Language': navigator.language
          },
          body: JSON.stringify({
            name: formEmpName.value,
            registration_number: formEmpReg.value
          })
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to update employee profile');
        }

        const data = await response.json();
        // Update active employee object locally
        activeEmployee.value.name = data.name;
        activeEmployee.value.registration_number = data.registration_number;

        isEditingEmployee.value = false;
        fetchEmployees();
      } catch (err) {
        formularyError.value = err.message;
      } finally {
        editLoading.value = false;
      }
    };

    // Delete Employee confirmation
    const confirmDeleteEmployee = (emp) => {
      employeeToDelete.value = emp;
      showDeleteModal.value = true;
    };

    const deleteEmployee = async () => {
      deleteLoading.value = true;

      try {
        const response = await fetch(`/api/admin/employees/${employeeToDelete.value.id}`, {
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
        clearActiveEmployee();
        fetchEmployees();
      } catch (err) {
        alert(err.message);
      } finally {
        deleteLoading.value = false;
      }
    };

    // Device Auth code generation
    const authorizeDevice = async (emp) => {
      try {
        const response = await fetch(`/api/admin/employees/${emp.id}/authorize`, {
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
        codeCopied.value = false;
        showAuthModal.value = true;

        fetchEmployees();
      } catch (err) {
        alert(err.message);
      }
    };

    const copyAuthCode = async () => {
      try {
        await navigator.clipboard.writeText(authCode.value);
        codeCopied.value = true;
        setTimeout(() => { codeCopied.value = false; }, 2000);
      } catch {
        // fallback: select text manually
      }
    };

    // Fetch clocking logs
    const fetchLogs = async () => {
      logsLoading.value = true;
      logsError.value = '';

      try {
        const response = await fetch(`/api/admin/logs?month=${filterMonth.value}&year=${filterYear.value}`, {
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

    // Fetch specific employee logs for individual report
    const openEmployeeFrequencyReport = (emp) => {
      activeEmployee.value = emp;
      freqMonth.value = filterMonth.value;
      freqYear.value = filterYear.value;
      showFreqReportModal.value = true;
      fetchEmployeeLogs();
    };

    const fetchEmployeeLogs = async () => {
      freqLoading.value = true;
      try {
        const response = await fetch(`/api/admin/logs?month=${freqMonth.value}&year=${freqYear.value}`, {
          headers: {
            'Authorization': `Bearer ${props.token}`,
            'Accept-Language': navigator.language
          }
        });

        if (response.ok) {
          const data = await response.json();
          // Filter logs to match only active employee
          freqLogs.value = data.logs.filter(log => log.registration_number === activeEmployee.value.registration_number);
        }
      } catch (err) {
        console.error('Error fetching employee frequency report logs:', err);
      } finally {
        freqLoading.value = false;
      }
    };

    // Administrators management (Superadmin Only)
    const fetchAdmins = async () => {
      adminsLoading.value = true;
      adminsError.value = '';

      try {
        const response = await fetch('/api/admin/admins', {
          headers: {
            'Authorization': `Bearer ${props.token}`
          }
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to retrieve administrators');
        }

        const data = await response.json();
        admins.value = data;
      } catch (err) {
        adminsError.value = err.message;
      } finally {
        adminsLoading.value = false;
      }
    };

    const openAddAdminModal = () => {
      isEditingAdmin.value = false;
      selectedAdminId.value = null;
      adminFormUsername.value = '';
      adminFormPassword.value = '';
      adminFormRole.value = 'admin';
      adminFormError.value = '';
      showAdminModal.value = true;
    };

    const openEditAdminModal = (adm) => {
      isEditingAdmin.value = true;
      selectedAdminId.value = adm.id;
      adminFormUsername.value = adm.username;
      adminFormPassword.value = ''; // keep empty unless updating
      adminFormRole.value = adm.role;
      adminFormError.value = '';
      showAdminModal.value = true;
    };

    const closeAdminModal = () => {
      showAdminModal.value = false;
      adminFormUsername.value = '';
      adminFormPassword.value = '';
      adminFormRole.value = 'admin';
      adminFormError.value = '';
      selectedAdminId.value = null;
    };

    const triggerAdminSaveConfirm = () => {
      adminFormError.value = '';
      showAdminSaveConfirmModal.value = true;
    };

    // Create or Update admin
    const saveAdminAccount = async () => {
      adminFormSaving.value = true;
      showAdminSaveConfirmModal.value = false;

      const url = isEditingAdmin.value 
        ? `/api/admin/admins/${selectedAdminId.value}`
        : '/api/admin/admins';
      
      const method = isEditingAdmin.value ? 'PUT' : 'POST';

      const payload = {
        username: adminFormUsername.value,
        role: adminFormRole.value
      };

      if (adminFormPassword.value) {
        payload.password = adminFormPassword.value;
      }

      try {
        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${props.token}`
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to save admin account');
        }

        closeAdminModal();
        fetchAdmins();
      } catch (err) {
        adminFormError.value = err.message;
        showAdminModal.value = true; // reopen form modal to show error
      } finally {
        adminFormSaving.value = false;
      }
    };

    // Delete admin account
    const confirmDeleteAdmin = (adm) => {
      adminToDelete.value = adm;
      showAdminDeleteModal.value = true;
    };

    const deleteAdminAccount = async () => {
      adminDeleteSaving.value = true;

      try {
        const response = await fetch(`/api/admin/admins/${adminToDelete.value.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${props.token}`
          }
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to delete administrator');
        }

        showAdminDeleteModal.value = false;
        adminToDelete.value = null;
        fetchAdmins();
      } catch (err) {
        alert(err.message);
      } finally {
        adminDeleteSaving.value = false;
      }
    };

    // Date/Time helper formatters
    const formatTimestamp = (timestamp) => {
      if (!timestamp) return '';
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
      } else if (newTab === 'admins') {
        fetchAdmins();
      }
    });

    onMounted(() => {
      fetchConfig();
      fetchEmployees();
    });

    return {
      activeTab,
      showMobileMenu,
      selectTab,
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
      codeCopied,
      copyAuthCode,
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

      // Employee Details/Formulary View exports
      activeEmployee,
      isEditingEmployee,
      formEmpName,
      formEmpReg,
      formularyError,
      showSaveConfirmModal,
      editLoading,
      viewEmployee,
      clearActiveEmployee,
      startEditEmployee,
      cancelEditEmployee,
      triggerSaveConfirm,
      saveEmployeeChanges,

      // Delete Employee exports
      showDeleteModal,
      employeeToDelete,
      deleteLoading,
      confirmDeleteEmployee,
      deleteEmployee,

      // Employee Frequency Report exports
      showFreqReportModal,
      freqLogs,
      freqLoading,
      freqMonth,
      freqYear,
      openEmployeeFrequencyReport,
      fetchEmployeeLogs,

      // Administrators exports
      admins,
      adminsLoading,
      adminsError,
      showAdminModal,
      isEditingAdmin,
      selectedAdminId,
      adminFormUsername,
      adminFormPassword,
      adminFormRole,
      adminFormError,
      adminFormSaving,
      openAddAdminModal,
      openEditAdminModal,
      closeAdminModal,
      triggerAdminSaveConfirm,
      saveAdminAccount,
      showAdminSaveConfirmModal,
      showAdminDeleteModal,
      adminToDelete,
      confirmDeleteAdmin,
      deleteAdminAccount
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
.employee-link {
  color: var(--primary-color);
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s ease-in-out;
}
.employee-link:hover {
  color: #9a75ff;
  text-decoration: underline !important;
}
.mobile-menu-btn {
  border: 1px solid var(--border-glass);
  background: transparent;
  color: var(--text-primary);
}
.mobile-menu-btn:hover {
  background: rgba(255,255,255,0.05);
}
.pairing-code-block {
  background: rgba(140, 98, 255, 0.08);
  border: 1px solid rgba(140, 98, 255, 0.25);
  border-radius: 16px;
  padding: 1.5rem 2rem;
  display: inline-block;
  min-width: 240px;
}
.pairing-code-label {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  color: var(--text-muted, #888);
  margin-bottom: 0.5rem;
}
.pairing-code-digits {
  font-size: 2.8rem;
  font-weight: 800;
  font-family: 'Outfit', 'Courier New', monospace;
  letter-spacing: 0.3em;
  color: #fff;
  text-shadow: 0 0 24px rgba(140, 98, 255, 0.6);
}
</style>
