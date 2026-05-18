/**
 * api.js — All fetch-based communication with the backend.
 * No DOM manipulation here, only HTTP request helpers.
 */

const BASE_URL = '/api';

function getAuthHeaders() {
  const token = localStorage.getItem('jobtracker_token');
  return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

async function handleResponse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) {
      // Token expired or invalid, clear local storage
      localStorage.removeItem('jobtracker_token');
      localStorage.removeItem('jobtracker_user');
      window.dispatchEvent(new Event('auth-expired'));
    }
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

/* ── Auth ── */
async function loginUser(username, password) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  return handleResponse(res);
}

async function registerUser(username, password) {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  return handleResponse(res);
}

/* ── Statuses ── */
async function fetchStatuses() {
  const res = await fetch(`${BASE_URL}/statuses`, { headers: getAuthHeaders() });
  return handleResponse(res);
}

/* ── Applications ── */
async function fetchApplications(filters = {}) {
  const params = new URLSearchParams();
  if (filters.company_name) params.set('company_name', filters.company_name);
  if (filters.status_id)   params.set('status_id', filters.status_id);
  const query = params.toString() ? `?${params}` : '';
  const res = await fetch(`${BASE_URL}/applications${query}`, { headers: getAuthHeaders() });
  return handleResponse(res);
}

async function fetchApplicationById(id) {
  const res = await fetch(`${BASE_URL}/applications/${id}`, { headers: getAuthHeaders() });
  return handleResponse(res);
}

async function createApplication(data) {
  const res = await fetch(`${BASE_URL}/applications`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

async function updateApplication(id, data) {
  const res = await fetch(`${BASE_URL}/applications/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

async function deleteApplication(id) {
  const res = await fetch(`${BASE_URL}/applications/${id}`, { 
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  return handleResponse(res);
}
