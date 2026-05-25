const ADMIN_USER = 'inaam';
const ADMIN_PASS = 'inaam123';
const STORAGE_REQUESTS = 'apex_instagram_requests';
const STORAGE_ADMIN_SESSION = 'apex_admin_logged_in';

const els = {
  loginSection: document.getElementById('admin-login-section'),
  dashboard: document.getElementById('admin-dashboard'),
  loginForm: document.getElementById('admin-login-form'),
  username: document.getElementById('admin-username'),
  password: document.getElementById('admin-password'),
  loginError: document.getElementById('admin-login-error'),
  logout: document.getElementById('admin-logout'),
  empty: document.getElementById('admin-empty'),
  pendingBody: document.getElementById('admin-pending-body'),
  pendingTable: document.getElementById('admin-pending-table'),
  historyList: document.getElementById('admin-history-list'),
};

function getRequests() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_REQUESTS) || '[]');
  } catch {
    return [];
  }
}

function saveRequests(requests) {
  localStorage.setItem(STORAGE_REQUESTS, JSON.stringify(requests));
}

function formatDate(iso) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function isLoggedIn() {
  return sessionStorage.getItem(STORAGE_ADMIN_SESSION) === 'true';
}

function showDashboard() {
  els.loginSection.hidden = true;
  els.dashboard.hidden = false;
  els.logout.hidden = false;
  renderPendingList();
  renderHistory();
}

function showLogin() {
  els.loginSection.hidden = false;
  els.dashboard.hidden = true;
  els.logout.hidden = true;
}

function handleAdminLogin(e) {
  e.preventDefault();
  const user = els.username.value.trim();
  const pass = els.password.value;

  if (user === ADMIN_USER && pass === ADMIN_PASS) {
    sessionStorage.setItem(STORAGE_ADMIN_SESSION, 'true');
    els.loginError.textContent = '';
    showDashboard();
  } else {
    els.loginError.textContent = 'Invalid username or password.';
  }
}

function handleLogout() {
  sessionStorage.removeItem(STORAGE_ADMIN_SESSION);
  els.username.value = '';
  els.password.value = '';
  els.loginError.textContent = '';
  showLogin();
}

function updateRequestStatus(id, status) {
  const requests = getRequests();
  const updated = requests.map((r) => (r.id === id ? { ...r, status } : r));
  saveRequests(updated);
  renderPendingList();
  renderHistory();
}

function renderPendingList() {
  const pending = getRequests().filter((r) => r.status === 'pending');
  els.pendingBody.innerHTML = '';

  if (pending.length === 0) {
    els.empty.hidden = false;
    els.pendingTable.hidden = true;
    return;
  }

  els.empty.hidden = true;
  els.pendingTable.hidden = false;

  pending.forEach((req) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>@${req.igUsername.replace(/^@/, '')}</td>
      <td>${formatDate(req.createdAt)}</td>
      <td class="admin-actions">
        <button type="button" class="btn btn--primary btn--small" data-action="approve" data-id="${req.id}">Approve</button>
        <button type="button" class="btn btn--secondary btn--small" data-action="reject" data-id="${req.id}">Reject</button>
      </td>
    `;
    els.pendingBody.appendChild(tr);
  });
}

function renderHistory() {
  const recent = getRequests()
    .filter((r) => r.status !== 'pending')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 10);

  els.historyList.innerHTML = '';

  if (recent.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'No recent activity';
    li.className = 'admin-history__empty';
    els.historyList.appendChild(li);
    return;
  }

  recent.forEach((req) => {
    const li = document.createElement('li');
    li.className = `admin-history__item admin-history__item--${req.status}`;
    li.innerHTML = `
      <span>@${req.igUsername.replace(/^@/, '')}</span>
      <span class="admin-history__status">${req.status}</span>
      <span class="admin-history__date">${formatDate(req.createdAt)}</span>
    `;
    els.historyList.appendChild(li);
  });
}

els.loginForm.addEventListener('submit', handleAdminLogin);
els.logout.addEventListener('click', handleLogout);

els.pendingBody.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;

  const id = btn.dataset.id;
  const action = btn.dataset.action;

  if (action === 'approve') {
    updateRequestStatus(id, 'approved');
  } else if (action === 'reject') {
    updateRequestStatus(id, 'rejected');
  }
});

window.addEventListener('storage', () => {
  if (isLoggedIn()) {
    renderPendingList();
    renderHistory();
  }
});

if (isLoggedIn()) {
  showDashboard();
} else {
  showLogin();
}
