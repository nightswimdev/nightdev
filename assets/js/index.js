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

// Greeting text/icon logic
function getGreeting() {
    const now = new Date();
    const hour = now.getHours();
    const timeGreetings = [];
    const generalGreetings = [
        { text: 'let’s do ts, start with something', icon: '<i class="fa-solid fa-rocket"></i>' },
        { text: 'Let’s do something great', icon: '<i class="fa-solid fa-lightbulb"></i>' },
        { text: 'Hope you enjoy nightdev', icon: '<i class="fa-solid fa-heart"></i>' },
        { text: 'Time to explore', icon: '<i class="fa-solid fa-compass"></i>' },
        { text: 'Let’s roll', icon: '<i class="fa-solid fa-dice"></i>' },
        { text: 'The adventure continues', icon: '<i class="fa-solid fa-map"></i>' }
    ];
    if (hour >= 5 && hour < 12) {
        timeGreetings.push(
            { text: 'Good morning, sunshine', icon: '<i class="fa-solid fa-sun"></i>' },
            { text: 'Here’s to a bright morning', icon: '<i class="fa-solid fa-cloud-sun"></i>' },
            { text: 'Enjoy your morning', icon: '<i class="fa-solid fa-mug-hot"></i>' },
            { text: 'Your day starts here', icon: '<i class="fa-solid fa-star"></i>' }
        );
    } else if (hour < 17) {
        timeGreetings.push(
            { text: 'Good afternoon', icon: '<i class="fa-solid fa-leaf"></i>' },
            { text: 'Hope your day is going well', icon: '<i class="fa-solid fa-coffee"></i>' },
            { text: 'Keep up the pace', icon: '<i class="fa-solid fa-book"></i>' },
            { text: 'Stay on track today', icon: '<i class="fa-solid fa-sun"></i>' }
        );
    } else if (hour < 21) {
        timeGreetings.push(
            { text: 'Good evening', icon: '<i class="fa-solid fa-cloud-moon"></i>' },
            { text: 'Time to unwind', icon: '<i class="fa-solid fa-fire"></i>' },
            { text: 'Evening’s here—relax', icon: '<i class="fa-solid fa-star"></i>' },
            { text: 'Breathe and recharge', icon: '<i class="fa-solid fa-moon"></i>' }
        );
    } else {
        timeGreetings.push(
            { text: 'Good night', icon: '<i class="fa-solid fa-bed"></i>' },
            { text: 'Rest well', icon: '<i class="fa-solid fa-blanket"></i>' },
            { text: 'Sweet dreams', icon: '<i class="fa-solid fa-star-and-crescent"></i>' },
            { text: 'See you tomorrow', icon: '<i class="fa-solid fa-moon"></i>' }
        );
    }
    const useGeneral = Math.random() < 0.5;
    const pool = useGeneral ? generalGreetings : timeGreetings;
    return pool[Math.floor(Math.random() * pool.length)];
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

function search(query) {
  if (!isUrl(query)) return "https://duckduckgo.com/?q=" + encodeURIComponent(query);
  if (!(query.startsWith("https://") || query.startsWith("http://")))
    return "http://" + query;
  return query;
}

if (form) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      await registerSW();
    } catch (err) {
      if (error) error.textContent = "Failed to register service worker.";
      if (errorCode) errorCode.textContent = err.toString();
      throw err;
    }

    const url = search(address.value, searchEngine ? searchEngine.value : "");
    // Redirect to /active/go/ + encoded URL
    location.href = '/active/go/' + __uv$config.encodeUrl(url);
  });
}

if (address) {
  address.addEventListener("keydown", function(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      let val = address.value.trim();
      if (!val) return;

      // Store the raw input in localStorage
      localStorage.setItem('lastUvUrl', val);

      let url;
      // If input looks like a domain, treat as URL
      if (/^([a-z0-9-]+\.)+[a-z]{2,}(\/.*)?$/i.test(val)) {
        url = 'http://' + val;
      } else {
        // Try to construct a URL; if it fails, treat as search
        try {
          url = new URL(val).toString();
        } catch {
          url = `https://duckduckgo.com/?q=${encodeURIComponent(val)}`;
        }
      }

      const encoded = __uv$config.encodeUrl(url);
      window.location.href = '/active/search.html?url=' + encoded;
    }
  });
}

const userName = localStorage.getItem('userName');
if (userName && userName.trim()) {
    showToast("Welcome to nightdev.", "success", "wave");
    updateGreeting(userName);
}