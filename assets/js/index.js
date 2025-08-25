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

// Service worker registration is handled by register.js

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

// Search Suggestions System for Index Page
class IndexSearchSuggestions {
  constructor(inputElement, containerElement) {
    this.input = inputElement;
    this.container = containerElement;
    this.suggestions = [];
    this.selectedIndex = -1;
    this.isVisible = false;
    
    this.init();
  }
  
  init() {
    this.input.addEventListener('input', (e) => this.handleInput(e));
    this.input.addEventListener('keydown', (e) => this.handleKeydown(e));
    this.input.addEventListener('focus', (e) => this.handleFocus(e));
    this.input.addEventListener('blur', (e) => this.handleBlur(e));
    
    // Close suggestions when clicking outside
    document.addEventListener('click', (e) => {
      if (!this.input.contains(e.target) && !this.container.contains(e.target)) {
        this.hideSuggestions();
      }
    });
  }
  
  async handleInput(e) {
    const query = e.target.value.trim();
    
    if (query.length === 0) {
      this.hideSuggestions();
      return;
    }
    
    if (query.length >= 1) {
      const suggestions = await this.generateSuggestions(query);
      this.showSuggestions(suggestions);
    }
  }
  
  handleFocus(e) {
    const query = e.target.value.trim();
    if (query.length >= 1) {
      this.generateSuggestions(query).then(suggestions => {
        this.showSuggestions(suggestions);
      });
    }
  }
  
  handleBlur(e) {
    // Delay hiding to allow clicking on suggestions
    setTimeout(() => {
      if (!this.container.matches(':hover')) {
        this.hideSuggestions();
      }
    }, 150);
  }
  
  handleKeydown(e) {
    if (!this.isVisible) {
      // Handle normal Enter key when suggestions are not visible
      if (e.key === "Enter") {
        e.preventDefault();
        let val = this.input.value.trim();
        if (!val) return;

        // Add to history
        this.addToHistory(val);
        
        // Store the raw input in localStorage for next visit
        localStorage.setItem('lastUvUrl', val);
        
        // Redirect to search.html with just the user's input
        window.location.href = 'active/search.html?url=' + encodeURIComponent(val) + '&search=' + encodeURIComponent(val);
      }
      return;
    }
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.selectedIndex = Math.min(this.selectedIndex + 1, this.suggestions.length - 1);
        this.updateSelection();
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
        this.updateSelection();
        break;
        
      case 'Enter':
        if (this.selectedIndex >= 0) {
          e.preventDefault();
          e.stopPropagation();
          this.selectSuggestion(this.suggestions[this.selectedIndex]);
        }
        break;
        
      case 'Escape':
        e.preventDefault();
        this.hideSuggestions();
        break;
    }
  }
  
  async generateSuggestions(query) {
    const suggestions = [];
    const lowerQuery = query.toLowerCase();
    
    // First, add history suggestions
    const history = this.getHistory();
    const historySuggestions = history
      .filter(item => item.url.toLowerCase().includes(lowerQuery) || item.title?.toLowerCase().includes(lowerQuery))
      .slice(0, 3)
      .map(item => ({
        title: item.title || item.url,
        url: item.url,
        type: 'history',
        icon: 'fa-solid fa-history'
      }));
    
    suggestions.push(...historySuggestions);
    
    // Check if it looks like a URL or domain
    const isUrl = /^https?:\/\//.test(query);
    const isDomain = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.([a-zA-Z]{2,}|[a-zA-Z]{2,}\.[a-zA-Z]{2,})/.test(query);
    
    if (isUrl) {
      // If it's already a URL, suggest the URL itself
      suggestions.push({
        title: query,
        url: query,
        type: 'url',
        icon: 'fa-solid fa-link'
      });
    } else if (isDomain) {
      // If it looks like a domain, suggest common paths
      const domain = query.includes('/') ? query.split('/')[0] : query;
      const baseDomain = domain.startsWith('www.') ? domain : `www.${domain}`;
      
      suggestions.push({
        title: `https://${baseDomain}`,
        url: `https://${baseDomain}`,
        type: 'website',
        icon: 'fa-solid fa-globe'
      });
      
      // Add common subpaths for popular domains
      const commonPaths = this.getCommonPaths(domain);
      commonPaths.forEach(path => {
        suggestions.push({
          title: `${domain}${path.path}`,
          url: `https://${baseDomain}${path.path}`,
          type: path.type,
          icon: path.icon
        });
      });
    } else {
      // Generate search suggestions for different engines
      const searchEngines = [
        { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=', icon: 'fa-solid fa-search' },
        { name: 'Google', url: 'https://www.google.com/search?q=', icon: 'fa-brands fa-google' },
        { name: 'Bing', url: 'https://www.bing.com/search?q=', icon: 'fa-brands fa-microsoft' },
        { name: 'YouTube', url: 'https://www.youtube.com/results?search_query=', icon: 'fa-brands fa-youtube' }
      ];
      
      searchEngines.forEach(engine => {
        suggestions.push({
          title: `Search "${query}" on ${engine.name}`,
          url: engine.url + encodeURIComponent(query),
          type: 'search',
          icon: engine.icon
        });
      });
      
      // Add popular website suggestions based on query
      const websiteSuggestions = this.getWebsiteSuggestions(lowerQuery);
      suggestions.push(...websiteSuggestions);
    }
    
    return suggestions.slice(0, 8); // Limit to 8 suggestions
  }
  
  getCommonPaths(domain) {
    const paths = [];
    const lowerDomain = domain.toLowerCase();
    
    // Gaming sites
    if (lowerDomain.includes('y8')) {
      paths.push(
        { path: '/games', type: 'games', icon: 'fa-solid fa-gamepad' },
        { path: '/apps', type: 'apps', icon: 'fa-solid fa-mobile-screen' },
        { path: '/multiplayer', type: 'multiplayer', icon: 'fa-solid fa-users' }
      );
    } else if (lowerDomain.includes('coolmath')) {
      paths.push(
        { path: '/games', type: 'games', icon: 'fa-solid fa-gamepad' },
        { path: '/0-papas-games', type: 'games', icon: 'fa-solid fa-pizza-slice' },
        { path: '/0-skill-games', type: 'games', icon: 'fa-solid fa-target' }
      );
    } else if (lowerDomain.includes('github')) {
      paths.push(
        { path: '/trending', type: 'trending', icon: 'fa-solid fa-fire' },
        { path: '/explore', type: 'explore', icon: 'fa-solid fa-compass' },
        { path: '/marketplace', type: 'marketplace', icon: 'fa-solid fa-store' }
      );
    } else if (lowerDomain.includes('youtube')) {
      paths.push(
        { path: '/trending', type: 'trending', icon: 'fa-solid fa-fire' },
        { path: '/gaming', type: 'gaming', icon: 'fa-solid fa-gamepad' },
        { path: '/music', type: 'music', icon: 'fa-solid fa-music' }
      );
    } else if (lowerDomain.includes('reddit')) {
      paths.push(
        { path: '/r/popular', type: 'popular', icon: 'fa-solid fa-fire' },
        { path: '/r/all', type: 'all', icon: 'fa-solid fa-globe' },
        { path: '/r/gaming', type: 'gaming', icon: 'fa-solid fa-gamepad' }
      );
    } else {
      // Generic common paths
      paths.push(
        { path: '/about', type: 'about', icon: 'fa-solid fa-info-circle' },
        { path: '/contact', type: 'contact', icon: 'fa-solid fa-envelope' },
        { path: '/help', type: 'help', icon: 'fa-solid fa-question-circle' }
      );
    }
    
    return paths;
  }
  
  getWebsiteSuggestions(query) {
    const suggestions = [];
    const websites = [
      // Gaming
      { keywords: ['game', 'games', 'play', 'gaming'], title: 'Y8 Games', url: 'https://www.y8.com/games', icon: 'fa-solid fa-gamepad' },
      { keywords: ['math', 'cool', 'coolmath'], title: 'Cool Math Games', url: 'https://www.coolmathgames.com', icon: 'fa-solid fa-calculator' },
      { keywords: ['scratch', 'programming'], title: 'Scratch', url: 'https://scratch.mit.edu', icon: 'fa-solid fa-code' },
      
      // Social/Entertainment
      { keywords: ['video', 'youtube', 'watch'], title: 'YouTube', url: 'https://www.youtube.com', icon: 'fa-brands fa-youtube' },
      { keywords: ['reddit', 'forum'], title: 'Reddit', url: 'https://www.reddit.com', icon: 'fa-brands fa-reddit' },
      { keywords: ['twitter', 'tweet'], title: 'Twitter', url: 'https://www.twitter.com', icon: 'fa-brands fa-twitter' },
      
      // Development
      { keywords: ['github', 'git', 'code', 'repository'], title: 'GitHub', url: 'https://www.github.com', icon: 'fa-brands fa-github' },
      { keywords: ['stack', 'overflow', 'programming'], title: 'Stack Overflow', url: 'https://stackoverflow.com', icon: 'fa-brands fa-stack-overflow' },
      
      // Education
      { keywords: ['wiki', 'wikipedia', 'encyclopedia'], title: 'Wikipedia', url: 'https://www.wikipedia.org', icon: 'fa-brands fa-wikipedia-w' },
      { keywords: ['khan', 'academy', 'learn'], title: 'Khan Academy', url: 'https://www.khanacademy.org', icon: 'fa-solid fa-graduation-cap' }
    ];
    
    websites.forEach(site => {
      if (site.keywords.some(keyword => query.includes(keyword))) {
        suggestions.push({
          title: site.title,
          url: site.url,
          type: 'website',
          icon: site.icon
        });
      }
    });
    
    return suggestions;
  }
  
  showSuggestions(suggestions) {
    this.suggestions = suggestions;
    this.selectedIndex = -1;
    
    if (suggestions.length === 0) {
      this.hideSuggestions();
      return;
    }
    
    this.container.innerHTML = '';
    
    suggestions.forEach((suggestion, index) => {
      const item = document.createElement('div');
      item.className = 'suggestion-item';
      item.innerHTML = `
        <i class="suggestion-icon ${suggestion.icon}"></i>
        <div class="suggestion-content">
          <div class="suggestion-title">${this.escapeHtml(suggestion.title)}</div>
          <div class="suggestion-url">${this.escapeHtml(suggestion.url)}</div>
        </div>
        <div class="suggestion-type">${suggestion.type}</div>
      `;
      
      item.addEventListener('click', () => {
        this.selectSuggestion(suggestion);
      });
      
      this.container.appendChild(item);
    });
    
    this.container.classList.add('show');
    this.isVisible = true;
  }
  
  hideSuggestions() {
    this.container.classList.remove('show');
    this.isVisible = false;
    this.selectedIndex = -1;
  }
  
  updateSelection() {
    const items = this.container.querySelectorAll('.suggestion-item');
    items.forEach((item, index) => {
      item.classList.toggle('selected', index === this.selectedIndex);
    });
  }
  
  selectSuggestion(suggestion) {
    this.input.value = suggestion.url;
    this.hideSuggestions();
    
    // Add to history
    this.addToHistory(suggestion.url, suggestion.title);
    
    // Store the URL and navigate
    localStorage.setItem('lastUvUrl', suggestion.url);
    
    // Navigate to the selected URL
    window.location.href = 'active/search.html?url=' + encodeURIComponent(suggestion.url) + '&search=' + encodeURIComponent(suggestion.url);
  }
  
  addToHistory(url, title = null) {
    const history = this.getHistory();
    const newItem = {
      url: url,
      title: title || url,
      timestamp: Date.now()
    };
    
    // Remove existing entry if it exists
    const existingIndex = history.findIndex(item => item.url === url);
    if (existingIndex !== -1) {
      history.splice(existingIndex, 1);
    }
    
    // Add to beginning
    history.unshift(newItem);
    
    // Keep only last 10 items
    if (history.length > 10) {
      history.splice(10);
    }
    
    localStorage.setItem('nightdev_history', JSON.stringify(history));
    this.updateHistoryDisplay();
  }
  
  getHistory() {
    try {
      return JSON.parse(localStorage.getItem('nightdev_history') || '[]');
    } catch {
      return [];
    }
  }
  
  updateHistoryDisplay() {
    const historySection = document.getElementById('history-section');
    const historyList = document.getElementById('history-list');
    const history = this.getHistory();
    
    if (history.length === 0) {
      historySection.style.display = 'none';
      return;
    }
    
    historySection.style.display = 'block';
    historyList.innerHTML = '';
    
    history.forEach(item => {
      const li = document.createElement('li');
      li.className = 'history-item';
      li.innerHTML = `
        <i class="history-icon fa-solid fa-history"></i>
        <span class="history-url">${this.escapeHtml(item.title || item.url)}</span>
        <span class="history-time">${this.formatTime(item.timestamp)}</span>
      `;
      
      li.addEventListener('click', () => {
        this.input.value = item.url;
        localStorage.setItem('lastUvUrl', item.url);
        window.location.href = 'active/search.html?url=' + encodeURIComponent(item.url) + '&search=' + encodeURIComponent(item.url);
      });
      
      historyList.appendChild(li);
    });
  }
  
  formatTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

if (address) {
  // Initialize search suggestions
  const suggestionsContainer = document.getElementById('index-suggestions-container');
  if (suggestionsContainer) {
    const searchSuggestions = new IndexSearchSuggestions(address, suggestionsContainer);
    
    // Initialize history display
    searchSuggestions.updateHistoryDisplay();
    
    // Clear history button
    const clearHistoryBtn = document.getElementById('clear-history');
    if (clearHistoryBtn) {
      clearHistoryBtn.addEventListener('click', () => {
        localStorage.removeItem('nightdev_history');
        searchSuggestions.updateHistoryDisplay();
        showToast('History cleared', 'success', 'info');
      });
    }
  }
  
  address.addEventListener("keydown", function(e) {
    // This will be handled by the suggestions system now
    // The suggestions system will call the navigation logic when needed
  });
}
