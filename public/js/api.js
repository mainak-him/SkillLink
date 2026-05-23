/* SkillLink – shared client utilities */
const API_BASE = 'http://localhost:3000/api';
const UPLOAD_BASE = 'http://localhost:3000/uploads';

const Auth = {
  token: ()  => localStorage.getItem('sl_token'),
  user:  ()  => JSON.parse(localStorage.getItem('sl_user') || 'null'),
  save:  (token, user) => { localStorage.setItem('sl_token', token); localStorage.setItem('sl_user', JSON.stringify(user)); },
  clear: ()  => { localStorage.removeItem('sl_token'); localStorage.removeItem('sl_user'); },
  check: (requiredRole) => {
    const u = Auth.user();
    if (!u || !Auth.token()) { window.location.href = '/index.html'; return false; }
    if (requiredRole && u.role !== requiredRole) {
      if (u.role === 'artisan') window.location.href = '/artisan/dashboard.html';
      else if (u.role === 'client') window.location.href = '/client/dashboard.html';
      else if (u.role === 'admin') window.location.href = '/admin/dashboard.html';
      return false;
    }
    return true;
  }
};

async function api(endpoint, method = 'GET', body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Auth.token()}` }
  };
  if (body) opts.body = JSON.stringify(body);
  const res  = await fetch(API_BASE + endpoint, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

async function apiForm(endpoint, formData) {
  const res  = await fetch(API_BASE + endpoint, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${Auth.token()}` },
    body: formData
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data;
}

function toast(msg, type = 'info', dur = 3500) {
  let el = document.getElementById('toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; document.body.appendChild(el); }
  el.textContent = msg;
  el.className = `show ${type}`;
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.className = ''; }, dur);
}

// FIX #4: silentRefresh – no scroll restoration, no flash
let _pendingRefresh = false;
async function silentRefresh(callback) {
  if (_pendingRefresh) return;
  _pendingRefresh = true;
  try {
    await callback();
  } finally {
    _pendingRefresh = false;
  }
}

// Keep refreshWithScroll only for job listing pages that need it
async function refreshWithScroll(callback, preserveScroll = true) {
  if (_pendingRefresh) return;
  _pendingRefresh = true;
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  try {
    await callback();
    if (preserveScroll) {
      requestAnimationFrame(() => window.scrollTo(scrollX, scrollY));
    }
  } finally {
    _pendingRefresh = false;
  }
}

// ── Helpers ────────────────────────────────────────────────
const NEIGHBORHOODS = {
  Westlands: [-1.2663, 36.8010],
  Kilimani:  [-1.2810, 36.7950],
  Embakasi:  [-1.3050, 36.9000],
  Karen:     [-1.3232, 36.7192],
  Kasarani:  [-1.2179, 36.9080],
  CBD:       [-1.2833, 36.8167],
  Langata:   [-1.3170, 36.7710]
};

function resolveLocationCoords(name) {
  return NEIGHBORHOODS[name] || null;
}

function locationOptionsHTML() {
  return Object.keys(NEIGHBORHOODS).map(name => `<option value="${name}">${name}</option>`).join('');
}

function statusPill(status) {
  const map = {
    open:      'pill pill-blue',
    assigned:  'pill pill-orange',
    completed: 'pill pill-purple',
    confirmed: 'pill pill-green',
    closed:    'pill pill-gray',
    disputed:  'pill pill-red',
    paid:      'pill pill-green',
    unpaid:    'pill pill-orange',
    pending:   'pill pill-orange',
    verified:  'pill pill-green',
    rejected:  'pill pill-red'
  };
  return `<span class="${map[status] || 'pill pill-gray'}">${status}</span>`;
}

function avatarSrc(pic) {
  if (!pic || pic === 'default.png') return '/img/default.png';
  return `${UPLOAD_BASE}/${pic}`;
}

function timeAgo(dateStr) {
  const d = new Date(dateStr), now = new Date();
  const s = Math.floor((now - d) / 1000);
  if (s < 60)   return 'just now';
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-KE', { day:'numeric', month:'short', year:'numeric' });
}

function fmtMoney(n) {
  return n != null ? `KES ${(+n).toLocaleString()}` : '–';
}

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371, r = d => d * Math.PI / 180;
  const dLat = r(lat2-lat1), dLng = r(lng2-lng1);
  const a = Math.sin(dLat/2)**2 + Math.cos(r(lat1))*Math.cos(r(lat2))*Math.sin(dLng/2)**2;
  return +(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(2);
}

async function reverseGeocode(lat, lng) {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, {
      headers: { 'Accept-Language': 'en' }
    });
    const d = await r.json();
    const p = d.display_name.split(',');
    return p.slice(0, 2).join(',').trim();
  } catch { return `${(+lat).toFixed(4)}, ${(+lng).toFixed(4)}`; }
}

// ── Navigation ─────────────────────────────────────────────
function renderNav(role) {
  const user   = Auth.user();
  const pic    = avatarSrc(user?.profile_pic);
  const profileLink = user?.role === 'admin'
    ? '/admin/profile.html'
    : user?.role === 'artisan'
      ? '/artisan/profile.html'
      : '/client/profile.html';
  const links = user?.role === 'artisan'
    ? `<a href="/artisan/dashboard.html">Dashboard</a>
       <a href="/artisan/jobs.html">Jobs</a>
       <a href="/artisan/credentials.html">Credentials</a>`
    : user?.role === 'client'
      ? `<a href="/client/dashboard.html">Dashboard</a>
         <a href="/client/jobs.html">My Jobs</a>
         <a href="/client/artisans.html">Find Artisans</a>`
      : `<a href="/admin/dashboard.html">Dashboard</a>`;

  document.getElementById('nav-container').innerHTML = `
    <nav class="topnav">
      <div class="nav-brand">Skill<span>Link</span></div>
      <div class="nav-links">${links}</div>
      <div class="nav-right">
        <button class="notif-btn" id="notif-btn" title="Alerts">
          🔔 <span class="badge" id="notif-badge"></span>
        </button>
        <div style="position: relative; display: inline-block;">
          <img src="${pic}" class="avatar-nav" id="nav-avatar"
               onerror="this.src='/img/default.png'"
               title="Profile" />
          <div id="profile-menu" style="display: none; position: absolute; right: 0; top: 45px; background: var(--card); border: 1px solid var(--border); border-radius: 8px; box-shadow: var(--shadow); width: 170px; z-index: 300;">
            <a href="${profileLink}" style="display: block; padding: 10px; color: var(--text); border-bottom: 1px solid var(--border); text-decoration: none;">My Profile</a>
            <button id="logout-btn" style="display: block; width: 100%; text-align: left; padding: 10px; background: none; border: none; cursor: pointer; color: var(--danger); font-weight: 700;">Logout</button>
          </div>
        </div>
      </div>
    </nav>
    <div class="notif-dropdown" id="notif-dropdown">
      <div class="notif-header">
        Notifications
        <button class="btn btn-sm btn-outline" onclick="markAllRead()">Mark all read</button>
      </div>
      <div id="notif-list"><div class="notif-empty">Loading...</div></div>
    </div>`;

  // Active link
  const path = window.location.pathname;
  document.querySelectorAll('.nav-links a').forEach(a => {
    if (path.endsWith(a.getAttribute('href').split('/').pop())) a.classList.add('active');
  });

  if (!window.__renderNavInit) {
    window.__renderNavInit = true;
    const notifBtn = document.getElementById('notif-btn');
    const avatar = document.getElementById('nav-avatar');
    const profileMenu = document.getElementById('profile-menu');
    const logoutBtn = document.getElementById('logout-btn');
    const notifDropdown = document.getElementById('notif-dropdown');

    notifBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      notifDropdown.classList.toggle('open');
      if (notifDropdown.classList.contains('open')) loadNotifications();
    });

    avatar.addEventListener('click', (e) => {
      e.stopPropagation();
      profileMenu.style.display = profileMenu.style.display === 'block' ? 'none' : 'block';
    });

    profileMenu.addEventListener('click', (e) => e.stopPropagation());

    logoutBtn.addEventListener('click', () => {
      Auth.clear();
      window.location.href = '/index.html';
    });

    document.addEventListener('click', () => {
      notifDropdown.classList.remove('open');
      profileMenu.style.display = 'none';
    });

    notifDropdown.addEventListener('click', e => e.stopPropagation());
  }

  pollNotifCount();
  setInterval(pollNotifCount, 30000);
}

// FIX #8: pollNotifCount with explicit console.warn and fallback
async function pollNotifCount() {
  try {
    const { unread } = await api('/notifications');
    const badge = document.getElementById('notif-badge');
    if (badge) { badge.textContent = unread; badge.classList.toggle('show', unread > 0); }
  } catch (e) {
    console.warn('Notification poll failed:', e.message);
  }
}

// FIX #8: loadNotifications with console.warn and proper fallback message
async function loadNotifications() {
  const list = document.getElementById('notif-list');
  try {
    const { notifications, unread } = await api('/notifications');
    const badge = document.getElementById('notif-badge');
    if (badge) { badge.textContent = unread; badge.classList.toggle('show', unread > 0); }
    if (!notifications || !notifications.length) {
      list.innerHTML = '<div class="notif-empty">No notifications yet.</div>';
      return;
    }
    list.innerHTML = notifications.map(n => `
      <div class="notif-item ${n.is_read ? '' : 'unread'}" onclick="handleNotificationClick(${n.notification_id}, ${n.related_job_id})">
        ${n.message}
        <div class="notif-time">${timeAgo(n.created_at)}</div>
      </div>
    `).join('');
  } catch (e) {
    console.warn('Failed to load notifications:', e.message);
    if (list) list.innerHTML = '<div class="notif-empty">Unable to load notifications.</div>';
  }
}

async function markAllRead() {
  try {
    await api('/notifications/read-all', 'PUT');
    loadNotifications();
  } catch (e) {
    console.warn('Mark all read failed:', e.message);
  }
}

// FIX #5: close dropdown BEFORE redirect
async function handleNotificationClick(notifId, jobId) {
  if (!jobId) return;
  // Close dropdown immediately
  document.getElementById('notif-dropdown')?.classList.remove('open');
  // Mark as read (non-blocking)
  try {
    await api(`/notifications/${notifId}/read`, 'PUT');
  } catch (e) { console.warn('Mark read failed:', e.message); }
  // Redirect
  const user = Auth.user();
  const jobPage = user.role === 'artisan' ? '/artisan/jobs.html' : '/client/jobs.html';
  window.location.href = `${jobPage}?job=${jobId}`;
}

function getCurrentPosition() {
  return new Promise((res, rej) => {
    if (!navigator.geolocation) return rej(new Error('Geolocation not supported'));
    navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000 });
  });
}

function renderStars(rating, interactive = false, onRate = null) {
  const full = Math.floor(rating || 0);
  let html = '';
  for (let i = 1; i <= 5; i++) {
    const filled = i <= full ? '★' : '☆';
    if (interactive) {
      html += `<span style="cursor:pointer;font-size:1.2rem;color:#ffc107" data-rate="${i}" onclick="if(typeof onRate==='function') onRate(${i})">${filled}</span>`;
    } else {
      html += `<span style="font-size:1rem;color:${i <= full ? '#ffc107' : '#ddd'}">${filled}</span>`;
    }
  }
  return html;
}

function ratingStarsHTML(avg, total) {
  return `<div style="display:flex;gap:6px;align-items:center">
    <span style="font-size:0.9rem">${renderStars(avg)}</span>
    <span style="font-size:0.85rem;color:var(--text-l)">${avg} / 5 (${total} ${total === 1 ? 'rating' : 'ratings'})</span>
  </div>`;
}

// FIX #7: use created_at with 14-day threshold (no completed_at column needed)
function isPaymentOverdue(jobCreatedAt, jobStatus, paymentStatus) {
  if (jobStatus !== 'completed' || paymentStatus === 'paid') return false;
  if (!jobCreatedAt) return false;
  const created = new Date(jobCreatedAt);
  const now = new Date();
  const daysPassed = (now - created) / (1000 * 60 * 60 * 24);
  return daysPassed > 14;
}