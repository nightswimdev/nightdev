"use strict";

// Redirect to setup if user is not set up, otherwise run checks and show index
(function() {
  const storedName = localStorage.getItem('userName');
  const isSetupPage = window.location.pathname.endsWith('newtosite.html');

  // If no user, redirect to setup (unless already on setup page)
  if ((!storedName || !storedName.trim()) && !isSetupPage) {
    window.location.href = "newtosite.html";
    return;
  }

  // If user exists and is on setup page, redirect to index
  if (storedName && storedName.trim() && isSetupPage) {
    window.location.href = "index.html";
    return;
  }
})();

// Toast function with icon support
function showToast(message, type = 'success', iconType = 'wave') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast show ${type}`;
    toast.style.cssText = `
        background: ${type === "success" ? "var(--toast-bg, #232a3a)" : "#b90000"};
        color: var(--toast-color, #fff);
        padding: 1em 2em;
        border-radius: 1em;
        margin-bottom: 10px;
        min-width: 200px;
        box-shadow: 0 4px 24px #232a3a44;
        font-size: 1.1em;
        display: flex;
        align-items: center;
        opacity: 1;
        transition: opacity 0.5s;
    `;
    const icons = {
        success: '<i class="fa-solid fa-check-circle" style="margin-right: 8px;"></i>',
        error:   '<i class="fa-solid fa-times-circle" style="margin-right: 8px;"></i>',
        info:    '<i class="fa-solid fa-info-circle" style="margin-right: 8px;"></i>',
        warning: '<i class="fa-solid fa-exclamation-triangle" style="margin-right: 8px;"></i>',
        wave:    '<i class="fa-solid fa-hand-peace" style="margin-right: 8px;"></i>',
        game:    '<i class="fa-solid fa-gamepad" style="margin-right: 8px;"></i>',
        apps:    '<i class="fa-solid fa-th-large" style="margin-right: 8px;"></i>',
        robot:   '<i class="fa-solid fa-robot" style="margin-right: 8px;"></i>',
    };
    toast.innerHTML = `${icons[iconType] || icons.wave}${message}`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = 0;
        setTimeout(() => toast.remove(), 500);
    }, 2500);
}

// Greeting function with icon and fade-in
function updateGreeting(name) {
    const { text, icon } = getGreeting();
    const el = document.getElementById('greeting');
    if (el) {
        el.innerHTML = `${icon} ${text}, ${name}!`;
        setTimeout(() => { el.style.opacity = 1; }, 100);
    }
}

// UV form logic
const form = document.getElementById("uv-form");
const address = document.getElementById("uv-address");
const searchEngine = document.getElementById("uv-search-engine");
const error = document.getElementById("uv-error");
const errorCode = document.getElementById("uv-error-code");

async function registerSW() {
  if (!navigator.serviceWorker.controller) {
    await navigator.serviceWorker.register('/active/uv/uv.sw.js', {
      scope: __uv$config.prefix,
    });
  }
}

function isUrl(val = "") {
  return /^http(s?):\/\//.test(val) ||
    (val.includes(".") && val.substr(0, 1) !== " ");
}

function search(val) {
  if (!isUrl(val)) return `https://duckduckgo.com/?q=${encodeURIComponent(val)}`;
  if (!(val.startsWith("https://") || val.startsWith("http://")))
    return "http://" + val;
  return val;
}

if (form) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const val = address ? address.value.trim() : "";
    if (!val) return;

    // Store the raw input in localStorage
    localStorage.setItem('lastUvUrl', val);

    // Redirect to search.html with just the user's input
    window.location.href = 'active/search.html?url=' + encodeURIComponent(val) + '&search=' + encodeURIComponent(val);
  });
}

if (address) {
  address.addEventListener("keydown", function(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      let val = address.value.trim();
      if (!val) return;

      // Store the raw input in localStorage for next visit
      localStorage.setItem('lastUvUrl', val);
      
      // Redirect to search.html with just the user's input
      window.location.href = 'active/search.html?url=' + encodeURIComponent(val) + '&search=' + encodeURIComponent(val);
    }
  });
}
