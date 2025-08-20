"use strict";

/**
 * Convert input to a fully qualified URL or search query using configured default engine.
 * Reads default engine from window.getDefaultEngine() (provided by settings.js) or falls back to DuckDuckGo.
 */

/* helpers */
function getDefaultEngine() {
  try {
    if (typeof window.getDefaultEngine === "function") return window.getDefaultEngine();
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
  const iframe = document.getElementById("cool-iframe");
  const defaultEngine = getDefaultEngine();
  const defaultTemplate = makeSearchTemplate(defaultEngine);

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

  // Enter handler for the small search field
  if (searchInput) {
    searchInput.addEventListener("keydown", function (e) {
      if (e.key !== "Enter") return;
      e.preventDefault();
      const raw = (searchInput.value || "").trim();
      if (!raw) return;
      const dest = buildUrl(raw, defaultEngine);
      // persist friendly value
      try { localStorage.setItem("lastUvUrl", dest); } catch (e) {}
      setDestination(dest);
    });
  }

  // If page was opened with ?url=... load that target
  try {
    const params = new URLSearchParams(window.location.search);
    const userInput = params.get("url");
    if (userInput != null) {
      const finalUrl = buildUrl(decodeURIComponent(userInput), defaultEngine);
      setDestination(finalUrl);
    }
  } catch (e) {
    console.error("Failed to parse URL params", e);
  }
});
