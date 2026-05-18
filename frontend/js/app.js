
/* STATE */
const state = {
  statuses: [],
  applications: [],
  filters: { company_name: '', status_id: '' },
  deleteTargetId: null,
  isAuthenticated: false,
  user: null
};

/* DOM REFS */
const $ = id => document.getElementById(id);

// Auth Views
const authView = $('auth-view');
const appView = $('app-view');
const loginForm = $('login-form');
const registerForm = $('register-form');
const adminLoginForm = $('admin-login-form');
const showRegister = $('show-register');
const showLogin = $('show-login');
const cancelAdmin = $('cancel-admin');
const loginError = $('login-error');
const registerError = $('register-error');
const adminError = $('admin-error');
const userGreeting = $('user-greeting');
const btnLogout = $('btn-logout');

const grid = $('applications-grid');
const loadingState = $('loading-state');
const emptyState = $('empty-state');
const filterCompany = $('filter-company');
const filterStatus = $('filter-status');

// Stats
const statTotalVal = $('stat-total-val');
const statPendingVal = $('stat-pending-val');
const statInterviewVal = $('stat-interview-val');
const statOfferVal = $('stat-offer-val');
const statRejectedVal = $('stat-rejected-val');

// Add/Edit modal
const modalOverlay = $('modal-overlay');
const modalTitle = $('modal-title');
const form = $('application-form');
const formId = $('form-id');
const formCompany = $('form-company');
const formPosition = $('form-position');
const formStatus = $('form-status');
const formDate = $('form-date');
const formNotes = $('form-notes');
const formApiError = $('form-api-error');

// Delete modal
const deleteOverlay = $('delete-overlay');
const deleteText = $('delete-modal-text');

// Toast
const toast = $('toast');
const toastMsg = $('toast-message');

let toastTimer = null;

/* UTILITIES */
function showLoading() {
  loadingState.classList.remove('hidden');
  emptyState.classList.add('hidden');
  grid.innerHTML = '';
}

function hideLoading() {
  loadingState.classList.add('hidden');
}

function showToast(message, isError = false) {
  toastMsg.textContent = message;
  toast.classList.toggle('toast-error', isError);
  toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 3000);
}

function openModal() {
  modalOverlay.classList.remove('hidden');
  setTimeout(() => formCompany.focus(), 100);
}

function closeModal() {
  modalOverlay.classList.add('hidden');
  resetForm();
}

function openDeleteModal(id, companyName) {
  state.deleteTargetId = id;
  deleteText.textContent = `Are you sure you want to delete the application for "${companyName}"? This action cannot be undone.`;
  deleteOverlay.classList.remove('hidden');
}

function closeDeleteModal() {
  deleteOverlay.classList.add('hidden');
  state.deleteTargetId = null;
}

function resetForm() {
  form.reset();
  formId.value = '';
  ['form-company', 'form-position', 'form-status', 'form-date', 'form-notes'].forEach(id => {
    const el = $(id);
    if (el) el.classList.remove('invalid');
  });
  ['error-company', 'error-position', 'error-status', 'error-date'].forEach(id => {
    const el = $(id);
    if (el) el.textContent = '';
  });
  formApiError.textContent = '';
  formApiError.classList.add('hidden');
}

/* ── Status badge helpers ── */
function getStatusBadgeClass(statusName) {
  const map = {
    'Pending': 'badge-pending',
    'HR Interview': 'badge-hr',
    'Technical Interview': 'badge-tech',
    'Offer': 'badge-offer',
    'Rejected': 'badge-rejected',
  };
  return map[statusName] || 'badge-pending';
}

function getCardAccentColor(statusName) {
  const map = {
    'Pending': '#f59e0b',
    'HR Interview': '#3b82f6',
    'Technical Interview': '#8b5cf6',
    'Offer': '#10b981',
    'Rejected': '#ef4444',
  };
  return map[statusName] || '#6366f1';
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(m, 10) - 1]} ${parseInt(d, 10)}, ${y}`;
}

/* RENDER */
function renderStats(apps) {
  statTotalVal.textContent = apps.length;
  statPendingVal.textContent = apps.filter(a => a.status_name === 'Pending').length;
  statInterviewVal.textContent = apps.filter(a => ['HR Interview', 'Technical Interview'].includes(a.status_name)).length;
  statOfferVal.textContent = apps.filter(a => a.status_name === 'Offer').length;
  statRejectedVal.textContent = apps.filter(a => a.status_name === 'Rejected').length;
}

function renderCard(app) {
  const badgeClass = getStatusBadgeClass(app.status_name);
  const accent = getCardAccentColor(app.status_name);

  let ownerBadge = '';
  if (state.user && state.user.role === 'admin' && app.owner_name) {
    ownerBadge = `<div class="owner-badge">👤 ${escapeHtml(app.owner_name)}</div>`;
  }

  const card = document.createElement('div');
  card.className = 'app-card';
  card.style.setProperty('--card-accent', accent);
  card.setAttribute('role', 'listitem');
  card.dataset.id = app.id;

  card.innerHTML = `
    ${ownerBadge}
    <div class="card-header">
      <div class="card-company-wrap">
        <span class="card-company">${escapeHtml(app.company_name)}</span>
        <span class="card-position">${escapeHtml(app.position)}</span>
      </div>
      <span class="status-badge ${badgeClass}">${escapeHtml(app.status_name)}</span>
    </div>
    ${app.notes ? `<p class="card-notes">${escapeHtml(app.notes)}</p>` : ''}
    <div class="card-date">📅 ${formatDate(app.application_date)}</div>
    <div class="card-actions">
      <button class="card-btn card-btn-edit"   data-id="${app.id}" id="btn-edit-${app.id}">✏️ Edit</button>
      <button class="card-btn card-btn-delete" data-id="${app.id}" id="btn-delete-${app.id}">🗑 Delete</button>
    </div>
  `;
  return card;
}

function renderApplications(apps) {
  grid.innerHTML = '';

  if (apps.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  const fragment = document.createDocumentFragment();
  apps.forEach((app, i) => {
    const card = renderCard(app);
    card.style.animationDelay = `${i * 40}ms`;
    fragment.appendChild(card);
  });
  grid.appendChild(fragment);
}

function populateStatusDropdowns(statuses) {
  // Filter dropdown
  filterStatus.innerHTML = '<option value="">All Statuses</option>';
  statuses.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.name;
    filterStatus.appendChild(opt);
  });

  // Form dropdown
  formStatus.innerHTML = '<option value="">Select a status…</option>';
  statuses.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.name;
    formStatus.appendChild(opt);
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* FRONTEND VALIDATION */
function validateForm() {
  let valid = true;

  const fields = [
    { el: formCompany, errorId: 'error-company', label: 'Company name is required.' },
    { el: formPosition, errorId: 'error-position', label: 'Position is required.' },
    { el: formStatus, errorId: 'error-status', label: 'Please select a status.' },
    { el: formDate, errorId: 'error-date', label: 'Application date is required.' },
  ];

  fields.forEach(({ el, errorId, label }) => {
    const errorEl = $(errorId);
    if (!el.value.trim()) {
      el.classList.add('invalid');
      errorEl.textContent = label;
      valid = false;
    } else {
      el.classList.remove('invalid');
      errorEl.textContent = '';
    }
  });

  // Extra: date format check
  if (formDate.value && !/^\d{4}-\d{2}-\d{2}$/.test(formDate.value)) {
    formDate.classList.add('invalid');
    $('error-date').textContent = 'Date format must be YYYY-MM-DD.';
    valid = false;
  }

  return valid;
}

/* DATA LOADING */
async function loadStatuses() {
  const statuses = await fetchStatuses();
  state.statuses = statuses;
  populateStatusDropdowns(statuses);
}

async function loadApplications() {
  showLoading();
  const apps = await fetchApplications(state.filters);
  state.applications = apps;
  hideLoading();
  renderStats(apps);
  renderApplications(apps);
}

/* FORM SUBMIT */
async function handleFormSubmit(e) {
  e.preventDefault();
  if (!validateForm()) return;

  const payload = {
    company_name: formCompany.value.trim(),
    position: formPosition.value.trim(),
    status_id: Number(formStatus.value),
    application_date: formDate.value,
    notes: formNotes.value.trim() || null,
  };

  const submitBtn = $('btn-submit');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving…';

  try {
    const id = formId.value;
    if (id) {
      await updateApplication(id, payload);
      showToast('Application updated successfully!');
    } else {
      await createApplication(payload);
      showToast('Application added successfully!');
    }
    closeModal();
    await loadApplications();
  } catch (err) {
    formApiError.textContent = err.message || 'Something went wrong. Please try again.';
    formApiError.classList.remove('hidden');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Save Application';
  }
}

/* EDIT / DELETE HANDLERS */
function handleEditClick(id) {
  const app = state.applications.find(a => a.id === Number(id));
  if (!app) return;

  formId.value = app.id;
  formCompany.value = app.company_name;
  formPosition.value = app.position;
  formStatus.value = app.status_id;
  formDate.value = app.application_date;
  formNotes.value = app.notes || '';
  modalTitle.textContent = 'Edit Application';
  openModal();
}

async function handleDeleteConfirm() {
  if (!state.deleteTargetId) return;
  const btn = $('btn-delete-confirm');
  btn.disabled = true;
  btn.textContent = 'Deleting…';
  try {
    await deleteApplication(state.deleteTargetId);
    closeDeleteModal();
    showToast('Application deleted.');
    await loadApplications();
  } catch (err) {
    closeDeleteModal();
    showToast(err.message || 'Delete failed.', true);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Delete';
  }
}

/* FILTER HANDLERS */
let filterDebounce = null;

function handleFilterChange() {
  state.filters.company_name = filterCompany.value.trim();
  state.filters.status_id = filterStatus.value;
  clearTimeout(filterDebounce);
  filterDebounce = setTimeout(loadApplications, 350);
}

function clearFilters() {
  filterCompany.value = '';
  filterStatus.value = '';
  state.filters = { company_name: '', status_id: '' };
  loadApplications();
}

/* AUTH LOGIC */
function checkAuthState() {
  const token = localStorage.getItem('jobtracker_token');
  const userJson = localStorage.getItem('jobtracker_user');

  if (token && userJson) {
    try {
      state.user = JSON.parse(userJson);
      state.isAuthenticated = true;
      const isAdmin = state.user.role === 'admin';
      userGreeting.textContent = `Hello, ${state.user.username} ${isAdmin ? '(Admin)' : ''}`;
      if (isAdmin) userGreeting.style.color = '#4ade80';
      else userGreeting.style.color = 'var(--text-2)';

      authView.classList.add('hidden');
      appView.classList.remove('hidden');
      return true;
    } catch (e) {
      handleLogout();
      return false;
    }
  } else {
    handleLogout();
    return false;
  }
}

function handleLogout() {
  localStorage.removeItem('jobtracker_token');
  localStorage.removeItem('jobtracker_user');
  state.isAuthenticated = false;
  state.user = null;
  state.applications = [];

  appView.classList.add('hidden');
  authView.classList.remove('hidden');
  loginForm.reset();
  registerForm.reset();
  adminLoginForm.reset();
  loginError.classList.add('hidden');
  registerError.classList.add('hidden');
  adminError.classList.add('hidden');

  adminLoginForm.classList.add('hidden');
  registerForm.classList.add('hidden');
  loginForm.classList.remove('hidden');
  document.querySelector('.auth-container').style.borderColor = 'var(--border)';
  document.querySelector('.auth-container').style.backgroundColor = 'var(--bg-modal)';
  document.body.style.background = '';
}

async function handleLogin(e) {
  e.preventDefault();
  const username = $('login-username').value.trim();
  const password = $('login-password').value.trim();

  if (!username || !password) {
    loginError.textContent = 'Please enter both username and password';
    loginError.classList.remove('hidden');
    return;
  }

  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Logging in...';

  try {
    const data = await loginUser(username, password);
    localStorage.setItem('jobtracker_token', data.token);
    localStorage.setItem('jobtracker_user', JSON.stringify(data.user));
    loginError.classList.add('hidden');

    checkAuthState();
    await loadStatuses();
    await loadApplications();
  } catch (err) {
    loginError.textContent = err.message || 'Login failed';
    loginError.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Login';
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const username = $('register-username').value.trim();
  const password = $('register-password').value.trim();

  if (!username || !password) {
    registerError.textContent = 'Please enter both username and password';
    registerError.classList.remove('hidden');
    return;
  }

  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Creating...';

  try {
    await registerUser(username, password);
    registerError.classList.add('hidden');
    showToast('Account created! Please log in.');

    // Switch to login form
    registerForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
    $('login-username').value = username;
    $('login-password').focus();
  } catch (err) {
    registerError.textContent = err.message || 'Registration failed';
    registerError.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Create Account';
  }
}

async function handleAdminLogin(e) {
  e.preventDefault();
  const username = $('admin-username').value.trim();
  const password = $('admin-password').value.trim();

  if (!username || !password) {
    adminError.textContent = 'Admin credentials required';
    adminError.classList.remove('hidden');
    return;
  }

  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Verifying...';

  try {
    const data = await loginUser(username, password);
    if (data.user.role !== 'admin') {
      throw new Error('Access denied. Insufficient privileges.');
    }
    localStorage.setItem('jobtracker_token', data.token);
    localStorage.setItem('jobtracker_user', JSON.stringify(data.user));
    adminError.classList.add('hidden');

    checkAuthState();
    await loadStatuses();
    await loadApplications();
  } catch (err) {
    adminError.textContent = err.message || 'Override failed';
    adminError.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Initialize Override';
  }
}

/* EVENT LISTENERS */
function bindEvents() {
  // Auth Events
  loginForm.addEventListener('submit', handleLogin);
  registerForm.addEventListener('submit', handleRegister);
  adminLoginForm.addEventListener('submit', handleAdminLogin);

  showRegister.addEventListener('click', () => {
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
    loginError.classList.add('hidden');
  });

  showLogin.addEventListener('click', () => {
    registerForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
    registerError.classList.add('hidden');
  });

  cancelAdmin.addEventListener('click', () => {
    adminLoginForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
    adminError.classList.add('hidden');
    document.querySelector('.auth-container').style.borderColor = 'var(--border)';
    document.querySelector('.auth-container').style.backgroundColor = 'var(--bg-modal)';
    document.body.style.background = '';
  });

  // Secret Admin Toggle (Ghost Typing: "switchmode")
  let keySequence = '';
  const SECRET_WORD = 'switchmode';

  window.addEventListener('keydown', (e) => {
    if (state.isAuthenticated) return;

    if (e.key && e.key.length === 1) {
      keySequence += e.key.toLowerCase();

      if (keySequence.length > SECRET_WORD.length) {
        keySequence = keySequence.slice(-SECRET_WORD.length);
      }

      if (keySequence === SECRET_WORD) {
        loginForm.classList.add('hidden');
        registerForm.classList.add('hidden');
        adminLoginForm.classList.remove('hidden');
        $('admin-username').focus();
        document.querySelector('.auth-container').style.borderColor = '#22c55e';
        document.querySelector('.auth-container').style.backgroundColor = '#0a0a0a';
        document.body.style.background = 'radial-gradient(circle at 50% -20%, rgba(34, 197, 94, 0.15) 0%, #000 80%)';
        keySequence = '';
      }
    }
  });

  btnLogout.addEventListener('click', handleLogout);

  window.addEventListener('auth-expired', handleLogout);

  $('btn-add-application').addEventListener('click', () => {
    formId.value = '';
    modalTitle.textContent = 'New Application';
    formDate.value = new Date().toISOString().split('T')[0];
    openModal();
  });

  $('modal-close').addEventListener('click', closeModal);
  $('btn-cancel').addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });
  form.addEventListener('submit', handleFormSubmit);

  [formCompany, formPosition, formStatus, formDate].forEach(el => {
    el.addEventListener('input', () => el.classList.remove('invalid'));
  });

  $('delete-modal-close').addEventListener('click', closeDeleteModal);
  $('btn-delete-cancel').addEventListener('click', closeDeleteModal);
  deleteOverlay.addEventListener('click', e => { if (e.target === deleteOverlay) closeDeleteModal(); });
  $('btn-delete-confirm').addEventListener('click', handleDeleteConfirm);

  filterCompany.addEventListener('input', handleFilterChange);
  filterStatus.addEventListener('change', handleFilterChange);
  $('btn-clear-filters').addEventListener('click', clearFilters);

  grid.addEventListener('click', e => {
    const editBtn = e.target.closest('.card-btn-edit');
    const deleteBtn = e.target.closest('.card-btn-delete');
    if (editBtn) handleEditClick(editBtn.dataset.id);
    if (deleteBtn) {
      const app = state.applications.find(a => a.id === Number(deleteBtn.dataset.id));
      if (app) openDeleteModal(app.id, app.company_name);
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (!modalOverlay.classList.contains('hidden')) closeModal();
      if (!deleteOverlay.classList.contains('hidden')) closeDeleteModal();
    }
  });
}
/* INIT */
async function init() {
  bindEvents();
  const isAuthenticated = checkAuthState();

  if (isAuthenticated) {
    try {
      await loadStatuses();
      await loadApplications();
    } catch (err) {
      console.error('Initialization error:', err);
      if (err.status !== 401) {
        showToast('Could not connect to server. Is the backend running?', true);
      }
      hideLoading();
    }
  }
}

init();
