// Minimal session save/load helper for proxy-based login persistence.
// NOTE: client-side cannot set third-party cookies. Implement server endpoints
// /uv/save-session and /uv/load-session to persist/replay cookies for the proxy.

const SaveConfig = (function () {
  const LOCAL_KEY = 'nightdev_sessions_v1';

  function _readLocal() {
    try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}'); }
    catch { return {}; }
  }
  function _writeLocal(data) {
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(data)); } catch {}
  }

  // Save session data for host. sessionObj can contain { cookies, notes, lastUsed }
  // Best practice: do NOT store plaintext passwords in localStorage.
  async function saveSession(host, sessionObj = {}) {
    // update local fallback
    const store = _readLocal();
    sessionObj.lastUsed = Date.now();
    store[host] = sessionObj;
    _writeLocal(store);

    // attempt to save on server (proxy) — implement on server to accept and store securely
    try {
      await fetch('/uv/save-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host, session: sessionObj }),
        credentials: 'include' // include cookie auth to identify user to your backend
      });
    } catch (err) {
      console.warn('saveSession: server save failed', err);
    }
  }

  // Load session for host. Returns session object or null.
  async function loadSession(host) {
    // try server first
    try {
      const res = await fetch('/uv/load-session?host=' + encodeURIComponent(host), {
        method: 'GET',
        credentials: 'include'
      });
      if (res.ok) {
        const json = await res.json();
        if (json && json.session) return json.session;
      }
    } catch (err) {
      console.warn('loadSession: server load failed', err);
    }
    // fallback to local
    const store = _readLocal();
    return store[host] || null;
  }

  // Request server to apply stored session to proxy for this host.
  // Server must implement applying stored cookies when proxying.
  async function applySessionToProxy(host) {
    try {
      const res = await fetch('/uv/apply-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host }),
        credentials: 'include'
      });
      return res.ok;
    } catch (err) {
      console.warn('applySessionToProxy failed', err);
      return false;
    }
  }

  // Example helper to extract host from a URL
  function hostFromUrl(url) {
    try { return new URL(url).host; } catch { return null; }
  }

  return {
    saveSession,
    loadSession,
    applySessionToProxy,
    hostFromUrl
  };
})();

// Export for use in browser <script> context
window.SaveConfig = SaveConfig;