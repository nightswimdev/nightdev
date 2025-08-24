"use strict";

/**
 * Convert input to a fully qualified URL or search query using configured default engine.
 * Reads default engine from window.getDefaultEngine() (provided by settings.js) or falls back to DuckDuckGo.
 */

/* helpers */
function getDefaultEngine() {
  try {
    // Use getSavedSettings from settings.js to get fresh values
    if (typeof window.getSavedSettings === "function") {
      return window.getSavedSettings().defaultEngine;
    }
    // Last resort: read directly from localStorage
    return localStorage.getItem('defaultEngine') || "https://duckduckgo.com";
  } catch (e) {}
  return "https://duckduckgo.com";
}

function makeSearchTemplate(engine) {
  engine = (engine || "").trim();
  if (!engine) engine = "https://duckduckgo.com";
  // ensure no trailing slash
  engine = engine.replace(/\/$/, "");
  return engine + "/?q=%s";
}

function isValidHttpUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (e) {
    return false;
  }
}

function looksLikeDomain(s) {
  if (!s) return false;
  s = s.trim();
  if (/^https?:\/\//i.test(s)) return true;
  if (/\s/.test(s) || /@/.test(s)) return false;
  return /^([a-z0-9-]+\.)+[a-z]{2,}(\/.*)?$/i.test(s);
}

function buildUrl(userInput, defaultEngine) {
  if (!userInput) return defaultEngine;
  let v = userInput.trim();
  try { v = decodeURIComponent(v); } catch (e) {}
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(v)) return v; // already absolute
  if (looksLikeDomain(v)) return "https://" + v;
  // fallback to search
  const tpl = makeSearchTemplate(defaultEngine);
  return tpl.replace("%s", encodeURIComponent(v));
}

/* DOM logic */
document.addEventListener("DOMContentLoaded", function () {
  const searchInput = document.getElementById("searchInputt");
  const uvaddress = document.getElementById("uv-address");
  const iframe = document.getElementById("cool-iframe");
  // Don't cache defaultEngine - always get fresh values

  // helper to set iframe using UV encode if available, otherwise navigate directly
  async function setDestination(dest) {
    // sanity check dest
    try { new URL(dest); } catch (e) {
      console.error("Invalid destination URL:", dest);
      return;
    }

    // if uv proxy available and encodeUrl exists, use it
    if (window.__uv$config && typeof window.__uv$config.encodeUrl === "function") {
      try {
        const prefix = window.__uv$config.prefix || "";
        if (iframe) {
          iframe.src = prefix + window.__uv$config.encodeUrl(dest);
          return;
        }
      } catch (e) {
        console.warn("UV encode failed, falling back to direct navigation", e);
      }
    }

    // fallback: navigate to destination directly in current page or iframe if present
    if (iframe) iframe.src = dest;
    else window.location.href = dest;
  }

  // Enter handler for the search field (try both possible IDs)
  const activeSearchInput = uvaddress || searchInput;
  if (activeSearchInput) {
    activeSearchInput.addEventListener("keydown", function (e) {
      if (e.key !== "Enter") return;
      e.preventDefault();
      const raw = (activeSearchInput.value || "").trim();
      if (!raw) return;
      const dest = buildUrl(raw, getDefaultEngine());
      // persist friendly value
      try { localStorage.setItem("lastUvUrl", dest); } catch (e) {}
      setDestination(dest);
    });
  }

  // Also handle form submission
  const uvForm = document.getElementById("uv-form");
  if (uvForm) {
    uvForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const input = uvForm.querySelector("#uv-address");
      if (input) {
        const raw = (input.value || "").trim();
        if (!raw) return;
        const dest = buildUrl(raw, getDefaultEngine());
        // persist friendly value
        try { localStorage.setItem("lastUvUrl", dest); } catch (e) {}
        setDestination(dest);
      }
    });
  }

  // If page was opened with ?url=... load that target
  // Add a small delay to ensure settings.js is fully loaded
  function processUrlParams() {
    try {
      console.log("processUrlParams: Starting URL parameter processing");
      const params = new URLSearchParams(window.location.search);
      const userInput = params.get("url");
      console.log("processUrlParams: User input from URL:", userInput);
      if (userInput != null) {
        // Get fresh default engine value instead of using cached one
        const currentDefaultEngine = getDefaultEngine();
        console.log("processUrlParams: Current default engine:", currentDefaultEngine);
        const finalUrl = buildUrl(decodeURIComponent(userInput), currentDefaultEngine);
        console.log("processUrlParams: Final URL:", finalUrl);
        setDestination(finalUrl);
        console.log("processUrlParams: Set destination complete");
      }
    } catch (e) {
      console.error("Failed to parse URL params", e);
    }
  }
  
  // Try immediately, then retry with delay if settings not ready
  console.log("Search.js: Checking for settings functions...");
  console.log("getSavedSettings available:", typeof window.getSavedSettings === 'function');
  console.log("getDefaultEngine available:", typeof window.getDefaultEngine === 'function');
  
  if (typeof window.getSavedSettings === 'function' || typeof window.getDefaultEngine === 'function') {
    console.log("Settings available immediately, processing URL params");
    processUrlParams();
  } else {
    console.log("Settings not ready, starting retry mechanism");
    // Wait for settings.js to load, with multiple retries
    let retries = 0;
    const maxRetries = 20; // Increased retries
    const checkAndProcess = () => {
      console.log(`Retry ${retries + 1}/${maxRetries}: checking for settings...`);
      if (typeof window.getSavedSettings === 'function' || typeof window.getDefaultEngine === 'function') {
        console.log("Settings now available, processing URL params");
        processUrlParams();
      } else if (retries < maxRetries) {
        retries++;
        setTimeout(checkAndProcess, 100); // Increased delay
      } else {
        // Fallback: process with localStorage directly
        console.log("Settings not loaded after retries, using localStorage fallback");
        processUrlParams();
      }
    };
    setTimeout(checkAndProcess, 100);
  }
});
