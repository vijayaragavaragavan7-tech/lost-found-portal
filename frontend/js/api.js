// Base URL - since the backend serves the frontend too, same-origin relative paths work.
const API_BASE = "/api";

function getToken() {
  return localStorage.getItem("lf_token");
}
function getUser() {
  const raw = localStorage.getItem("lf_user");
  return raw ? JSON.parse(raw) : null;
}
function setSession(token, user) {
  localStorage.setItem("lf_token", token);
  localStorage.setItem("lf_user", JSON.stringify(user));
}
function clearSession() {
  localStorage.removeItem("lf_token");
  localStorage.removeItem("lf_user");
}
function isLoggedIn() {
  return !!getToken();
}
function isAdmin() {
  const u = getUser();
  return u && u.role === "admin";
}

/**
 * Generic API request wrapper.
 * `body` may be a plain object (sent as JSON) or a FormData instance (for file uploads).
 */
async function apiRequest(path, { method = "GET", body = null, auth = true } = {}) {
  const headers = {};
  const token = getToken();
  if (auth && token) headers["Authorization"] = `Bearer ${token}`;

  const opts = { method, headers };

  if (body instanceof FormData) {
    opts.body = body; // browser sets multipart content-type automatically
  } else if (body) {
    headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE}${path}`, opts);
  let data = {};
  try {
    data = await res.json();
  } catch (e) {
    /* no JSON body */
  }

  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

function requireLogin(redirectTo = "login.html") {
  if (!isLoggedIn()) {
    window.location.href = redirectTo;
  }
}

function requireAdmin(redirectTo = "index.html") {
  if (!isAdmin()) {
    window.location.href = redirectTo;
  }
}

function logout() {
  clearSession();
  window.location.href = "index.html";
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function escapeHtml(str = "") {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ---- Shared navbar renderer ----
function renderNavbar() {
  const el = document.getElementById("navbar");
  if (!el) return;
  const user = getUser();

  let links = `
    <a href="index.html">Home</a>
    <a href="search.html">Browse Items</a>
  `;

  if (user) {
    links += `
      <a href="report-lost.html">Report Lost</a>
      <a href="report-found.html">Report Found</a>
      <a href="dashboard.html">My Reports</a>
      ${user.role === "admin" ? '<a href="admin.html">Admin Panel</a>' : ""}
      <span>${escapeHtml(user.name)}${user.role === "admin" ? '<span class="badge-role">Admin</span>' : ""}</span>
      <button onclick="logout()">Logout</button>
    `;
  } else {
    links += `
      <a href="login.html">Login</a>
      <a href="register.html" class="btn btn-primary btn-sm">Register</a>
    `;
  }

  el.innerHTML = `
    <div class="brand">🔎 Lost &amp; Found Portal</div>
    <nav>${links}</nav>
  `;
}

document.addEventListener("DOMContentLoaded", renderNavbar);
