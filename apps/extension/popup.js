/* ============================================================
   LinkVault Chrome Extension — Popup Logic
   ============================================================
   
   Auth flow:
   1. User signs in with email+password via Supabase REST API
   2. We store access_token + refresh_token in chrome.storage.local
   3. All API calls use Bearer <access_token>
   4. On token expiry, we refresh using Supabase's /token?grant_type=refresh_token
   ============================================================ */

// ============================================================
// Config — user must set these after loading the extension
// ============================================================

const CONFIG_KEYS = {
  SUPABASE_URL: "supabase_url",
  SUPABASE_ANON_KEY: "supabase_anon_key",
  API_BASE_URL: "api_base_url",
  ACCESS_TOKEN: "access_token",
  REFRESH_TOKEN: "refresh_token",
};

// Default config — will be overridden by stored values
let SUPABASE_URL = "";
let SUPABASE_ANON_KEY = "";
let API_BASE_URL = "";

// ============================================================
// DOM Elements
// ============================================================

const loadingView = document.getElementById("loading-view");
const loginView = document.getElementById("login-view");
const saveView = document.getElementById("save-view");

const loginForm = document.getElementById("login-form");
const loginEmail = document.getElementById("login-email");
const loginPassword = document.getElementById("login-password");
const loginBtn = document.getElementById("login-btn");
const loginError = document.getElementById("login-error");

const logoutBtn = document.getElementById("logout-btn");
const tabTitle = document.getElementById("tab-title");
const tabUrl = document.getElementById("tab-url");
const collectionSelect = document.getElementById("collection-select");
const saveBtn = document.getElementById("save-btn");
const saveStatus = document.getElementById("save-status");

// ============================================================
// View Management
// ============================================================

function showView(view) {
  loadingView.classList.add("hidden");
  loginView.classList.add("hidden");
  saveView.classList.add("hidden");
  view.classList.remove("hidden");
}

function showStatus(message, type = "success") {
  saveStatus.textContent = message;
  saveStatus.className = `status ${type}`;
  saveStatus.classList.remove("hidden");
}

function hideStatus() {
  saveStatus.classList.add("hidden");
}

function setLoginError(message) {
  if (message) {
    loginError.textContent = message;
    loginError.classList.remove("hidden");
  } else {
    loginError.classList.add("hidden");
  }
}

// ============================================================
// Storage Helpers
// ============================================================

async function getStored(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, (result) => resolve(result[key] || null));
  });
}

async function setStored(obj) {
  return new Promise((resolve) => {
    chrome.storage.local.set(obj, resolve);
  });
}

async function removeStored(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.remove(keys, resolve);
  });
}

// ============================================================
// Config Management
// ============================================================

async function loadConfig() {
  const stored = await new Promise((resolve) => {
    chrome.storage.local.get(
      [CONFIG_KEYS.SUPABASE_URL, CONFIG_KEYS.SUPABASE_ANON_KEY, CONFIG_KEYS.API_BASE_URL],
      resolve
    );
  });

  SUPABASE_URL = stored[CONFIG_KEYS.SUPABASE_URL] || "";
  SUPABASE_ANON_KEY = stored[CONFIG_KEYS.SUPABASE_ANON_KEY] || "";
  API_BASE_URL = stored[CONFIG_KEYS.API_BASE_URL] || "";
}

function isConfigured() {
  return SUPABASE_URL && SUPABASE_ANON_KEY && API_BASE_URL;
}

// ============================================================
// Supabase Auth (REST API — no SDK needed)
// ============================================================

async function supabaseSignIn(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error_description || err.msg || "Sign in failed");
  }

  return res.json(); // { access_token, refresh_token, ... }
}

async function supabaseRefreshToken(refreshToken) {
  const res = await fetch(
    `${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    }
  );

  if (!res.ok) {
    throw new Error("Session expired. Please sign in again.");
  }

  return res.json();
}

// ============================================================
// API Client
// ============================================================

async function apiRequest(endpoint, options = {}) {
  let token = await getStored(CONFIG_KEYS.ACCESS_TOKEN);

  if (!token) {
    throw new Error("Not authenticated");
  }

  const { method = "GET", body } = options;

  const config = {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  let res = await fetch(`${API_BASE_URL}${endpoint}`, config);

  // If 401, try refreshing the token once
  if (res.status === 401) {
    const refreshToken = await getStored(CONFIG_KEYS.REFRESH_TOKEN);
    if (refreshToken) {
      try {
        const session = await supabaseRefreshToken(refreshToken);
        await setStored({
          [CONFIG_KEYS.ACCESS_TOKEN]: session.access_token,
          [CONFIG_KEYS.REFRESH_TOKEN]: session.refresh_token,
        });

        // Retry with new token
        config.headers.Authorization = `Bearer ${session.access_token}`;
        res = await fetch(`${API_BASE_URL}${endpoint}`, config);
      } catch {
        // Refresh failed — force re-login
        await clearSession();
        showView(loginView);
        return null;
      }
    } else {
      await clearSession();
      showView(loginView);
      return null;
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Request failed (${res.status})`);
  }

  return res.json();
}

// ============================================================
// Session Management
// ============================================================

async function clearSession() {
  await removeStored([CONFIG_KEYS.ACCESS_TOKEN, CONFIG_KEYS.REFRESH_TOKEN]);
}

async function hasSession() {
  const token = await getStored(CONFIG_KEYS.ACCESS_TOKEN);
  return !!token;
}

// ============================================================
// Current Tab
// ============================================================

async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });
  return tab;
}

// ============================================================
// Load Collections
// ============================================================

async function loadCollections() {
  try {
    const result = await apiRequest("/collections");
    if (!result || !result.data) return;

    // Clear existing options except the first (None)
    while (collectionSelect.options.length > 1) {
      collectionSelect.remove(1);
    }

    for (const col of result.data) {
      const option = document.createElement("option");
      option.value = col.id;
      option.textContent = `${col.emoji} ${col.name}`;
      collectionSelect.appendChild(option);
    }
  } catch {
    // Non-critical — collection picker just won't be populated
  }
}

// ============================================================
// Save Link
// ============================================================

async function saveLink(url, collectionId) {
  const body = { url };
  if (collectionId) {
    body.collection_id = collectionId;
  }

  return apiRequest("/links", {
    method: "POST",
    body,
  });
}

// ============================================================
// Event Handlers
// ============================================================

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  setLoginError(null);

  const email = loginEmail.value.trim();
  const password = loginPassword.value;

  if (!email || !password) return;

  loginBtn.disabled = true;
  loginBtn.textContent = "Signing in...";

  try {
    const session = await supabaseSignIn(email, password);

    await setStored({
      [CONFIG_KEYS.ACCESS_TOKEN]: session.access_token,
      [CONFIG_KEYS.REFRESH_TOKEN]: session.refresh_token,
    });

    // Show save view
    await initSaveView();
  } catch (err) {
    setLoginError(err.message);
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "Sign In";
  }
});

logoutBtn.addEventListener("click", async () => {
  await clearSession();
  showView(loginView);
});

saveBtn.addEventListener("click", async () => {
  hideStatus();
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";

  try {
    const tab = await getCurrentTab();
    if (!tab || !tab.url) {
      showStatus("Cannot save this page.", "error");
      return;
    }

    const collectionId = collectionSelect.value || undefined;
    const result = await saveLink(tab.url, collectionId);

    if (!result) return; // session expired, already redirected to login

    showStatus("Saved to LinkVault!", "success");

    // Auto-close after 1.5s
    setTimeout(() => window.close(), 1500);
  } catch (err) {
    if (err.message && err.message.includes("already exists")) {
      showStatus("Link already in your vault", "duplicate");
    } else {
      showStatus(err.message || "Failed to save", "error");
    }
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save to LinkVault";
  }
});

// ============================================================
// Init Save View
// ============================================================

async function initSaveView() {
  showView(saveView);

  // Show current tab info
  const tab = await getCurrentTab();
  if (tab) {
    tabTitle.textContent = tab.title || "Untitled";
    tabUrl.textContent = tab.url || "";
  }

  // Load collections in background
  loadCollections();
}

// ============================================================
// Init — Check if user has config + session
// ============================================================

async function init() {
  showView(loadingView);

  await loadConfig();

  if (!isConfigured()) {
    // First time — show config setup
    // For simplicity, we'll check if config.json exists and load defaults
    try {
      const res = await fetch(chrome.runtime.getURL("config.json"));
      if (res.ok) {
        const cfg = await res.json();
        SUPABASE_URL = cfg.supabase_url || "";
        SUPABASE_ANON_KEY = cfg.supabase_anon_key || "";
        API_BASE_URL = cfg.api_base_url || "";

        await setStored({
          [CONFIG_KEYS.SUPABASE_URL]: SUPABASE_URL,
          [CONFIG_KEYS.SUPABASE_ANON_KEY]: SUPABASE_ANON_KEY,
          [CONFIG_KEYS.API_BASE_URL]: API_BASE_URL,
        });
      }
    } catch {
      // config.json not found — that's fine
    }

    // If still not configured, show error
    if (!isConfigured()) {
      showView(loginView);
      setLoginError(
        "Extension not configured. Please create a config.json file."
      );
      loginBtn.disabled = true;
      return;
    }
  }

  // Check if we have a session
  if (await hasSession()) {
    // Verify the token is still valid by making a quick API call
    try {
      await apiRequest("/auth/me");
      await initSaveView();
    } catch {
      // Token expired and refresh failed
      showView(loginView);
    }
  } else {
    showView(loginView);
  }
}

// Start
init();
