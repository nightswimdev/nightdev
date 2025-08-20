// Global settings bridge — reads values saved by settings.html and applies behavior site-wide.

(function () {
  if (typeof window === 'undefined') return;

  const LS = {
    panicKey: () => localStorage.getItem('panicKey') || '',
    defaultEngine: () => localStorage.getItem('defaultEngine') || 'https://duckduckgo.com',
    uvPrefix: () => localStorage.getItem('uvPrefix') || '',
    uvBare: () => localStorage.getItem('uvBare') || '',
    hideNavbarOnSearch: () => localStorage.getItem('hideNavbarOnSearch') === 'true'
  };

  // expose getters for other scripts
  window.getSavedSettings = () => ({
    panicKey: LS.panicKey(),
    defaultEngine: LS.defaultEngine(),
    uvPrefix: LS.uvPrefix(),
    uvBare: LS.uvBare(),
    hideNavbarOnSearch: LS.hideNavbarOnSearch()
  });

  // Apply panic key: open about:blank in same tab
  (function applyPanicKey() {
    const key = LS.panicKey();
    if (!key) return;
    window.addEventListener('keydown', e => {
      try {
        if (e.key && e.key.toLowerCase() === key.toLowerCase()) window.open('about:blank', '_self');
      } catch (err) { /* ignore */ }
    }, { passive: true });
  })();

  // Provide buildFinalUrl utility and default engine getter
  window.getDefaultEngine = function () {
    return LS.defaultEngine();
  };

  window.looksLikeDomain = function (s) {
    if (!s) return false;
    s = s.trim();
    if (/^https?:\/\//i.test(s)) return true;
    if (s.includes(' ') || s.includes('@')) return false;
    return /^([a-z0-9-]+\.)+[a-z]{2,}(\/.*)?$/i.test(s);
  };

  window.buildFinalUrl = function (userInput) {
    if (!userInput) return window.getDefaultEngine();
    let v = (userInput || '').trim();
    try { v = decodeURIComponent(v); } catch (e) { /* ignore */ }
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(v)) return v;
    if (window.looksLikeDomain(v)) return 'https://' + v;
    return window.getDefaultEngine().replace(/\/$/, '') + '/?q=' + encodeURIComponent(v);
  };

  // Apply proxy overrides to window.__uv$config if present (frontend-only)
  (function applyProxyOverrides() {
    try {
      const prefix = LS.uvPrefix();
      const bare = LS.uvBare();
      if (typeof window.__uv$config === 'object') {
        if (prefix) window.__uv$config.prefix = prefix;
        if (bare) window.__uv$config.bare = bare;
      } else if (typeof window.__uv === 'object' && window.__uv.config) {
        if (prefix) window.__uv.config.prefix = prefix;
        if (bare) window.__uv.config.bare = bare;
      }
      // expose for scripts that read these values
      window.getUvPrefix = () => (prefix || (window.__uv$config && window.__uv$config.prefix) || '/service/');
      window.getUvBare = () => (bare || (window.__uv$config && window.__uv$config.bare) || '/bare/');
    } catch (e) { /* ignore */ }
  })();

  // Hide navbar on focus of search inputs if enabled
  (function applyHideNavbar() {
    if (!LS.hideNavbarOnSearch()) return;
    function hideIfFocused(el) {
      const navs = document.querySelectorAll('.navbar, nav, #navbar');
      if (!navs.length) return;
      el.addEventListener('focus', () => navs.forEach(n => n.style.display = 'none'));
      el.addEventListener('blur', () => navs.forEach(n => n.style.display = ''));
    }
    // attach to common ids/classes used in project
    const candidates = ['#uv-address', '#searchInputt', 'input[type="search"]'];
    candidates.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => hideIfFocused(el));
    });
    // Also observe DOM for dynamically added search inputs
    const mo = new MutationObserver(() => {
      candidates.forEach(sel => document.querySelectorAll(sel).forEach(el => hideIfFocused(el)));
    });
    mo.observe(document.documentElement || document.body, { childList: true, subtree: true });
  })();

  // Provide aboutBlankCloak helper
  window.openInAboutBlank = function (url) {
    try {
      const w = window.open('about:blank', '_blank');
      if (!w) return false;
      const iframe = w.document.createElement('iframe');
      iframe.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;border:none;margin:0;';
      iframe.src = url || window.location.href;
      w.document.body.style.margin = '0';
      w.document.title = 'about:blank';
      w.document.body.appendChild(iframe);
      return true;
    } catch (e) { return false; }
  };

  // Small helper to auto-apply stored lastUvUrl into search inputs (UX)
  (function autofillLastUrl() {
    try {
      const last = localStorage.getItem('lastUvUrl');
      if (!last) return;

      const path = (window.location.pathname || '').toLowerCase();
      // Only autofill the index search input when explicitly requested.
      // Default behavior: autofill only on the search page (/active/search.html)
      // or into inputs that opt-in via the data-lastuv attribute.
      if (!/\/active\/search\.html$/.test(path)) {
        // fill only opt-in fields on other pages (do NOT fill index #uv-address)
        document.querySelectorAll('input[data-lastuv]').forEach(f => {
          if (!f.value) f.value = last;
        });
        return;
      }

      // on the dedicated search page, fill the search input(s)
      const fields = document.querySelectorAll('#searchInputt, input[data-lastuv]');
      fields.forEach(f => { if (!f.value) f.value = last; });
    } catch (e) { /* ignore */ }
  })();

  // Make sure this file runs before other inline scripts may call buildFinalUrl/getDefaultEngine.
  // Done.
})();