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

  // Render quick links row beneath the search bar
  try {
    const quickLinksEl = document.getElementById('quick-links');
    if (quickLinksEl) {
      const DEFAULT_LINKS = [
        { title: 'EasyFun', url: 'https://easyfun.dev', icon: 'https://www.google.com/s2/favicons?domain=easyfun.dev&sz=64' },
        { title: 'Github',  url: 'https://github.com',  icon: 'https://www.google.com/s2/favicons?domain=github.com&sz=64' },
        { title: 'TikTok',  url: 'https://www.tiktok.com', icon: 'https://www.google.com/s2/favicons?domain=tiktok.com&sz=64' },
        { title: 'Discord', url: 'https://discord.com', icon: 'https://www.google.com/s2/favicons?domain=discord.com&sz=64' },
      ];

      // load user links from storage
      const stored = JSON.parse(localStorage.getItem('nightdev_quick_links') || 'null');
      const links = Array.isArray(stored) && stored.length ? stored : DEFAULT_LINKS;

      function saveLinks(list){
        localStorage.setItem('nightdev_quick_links', JSON.stringify(list));
      }

      function goThroughProxy(rawUrl){
        // Keep behavior consistent with search navigation
        localStorage.setItem('lastUvUrl', rawUrl);
        window.location.href = 'active/search.html?url=' + encodeURIComponent(rawUrl) + '&search=' + encodeURIComponent(rawUrl);
      }

      let openMenuCleanup = null; // cleanup fn to close an open menu
      function closeAnyMenu(){
        if (typeof openMenuCleanup === 'function') {
          openMenuCleanup();
          openMenuCleanup = null;
        }
      }

      function render(){
        quickLinksEl.innerHTML = '';
        links.forEach((l, idx) => {
          const card = document.createElement('div');
          card.className = 'quick-link';
          card.title = l.url;
          card.innerHTML = `
            <div class="ql-icon"><img src="${l.icon}" alt="" loading="lazy"></div>
            <div class="ql-title">${l.title}</div>
            <button class="ql-more" aria-haspopup="true" aria-expanded="false" aria-label="Quick link menu">⋯</button>
            <div class="ql-menu" role="menu">
              <button class="ql-menu-item edit" role="menuitem">Change site</button>
              <button class="ql-menu-item remove" role="menuitem">Remove</button>
            </div>
          `;

          // Navigate on card click
          card.addEventListener('click', () => {
            goThroughProxy(l.url);
          });

          // Menu controls
          const moreBtn = card.querySelector('.ql-more');
          const menu = card.querySelector('.ql-menu');
          const btnEdit = card.querySelector('.ql-menu-item.edit');
          const btnRemove = card.querySelector('.ql-menu-item.remove');
          // Prevent clicks inside the menu from bubbling to the card
          menu.addEventListener('click', (e) => e.stopPropagation());

          function openMenu(){
            closeAnyMenu();
            menu.classList.add('open');
            moreBtn.setAttribute('aria-expanded', 'true');
            // Set cleanup
            openMenuCleanup = () => {
              menu.classList.remove('open');
              moreBtn.setAttribute('aria-expanded', 'false');
            };
          }

          function toggleMenu(){
            if (menu.classList.contains('open')) {
              closeAnyMenu();
            } else {
              openMenu();
            }
          }

          moreBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleMenu();
          });

          btnEdit.addEventListener('click', (e) => {
            e.stopPropagation();
            closeAnyMenu();
            edit(idx);
          });

          btnRemove.addEventListener('click', (e) => {
            e.stopPropagation();
            closeAnyMenu();
            links.splice(idx, 1);
            saveLinks(links);
            render();
          });

          quickLinksEl.appendChild(card);
        });

        // Close menus when clicking anywhere else
        document.addEventListener('click', () => closeAnyMenu(), { once: true });

        // Add button
        const add = document.createElement('div');
        add.className = 'quick-link add';
        add.innerHTML = `
          <div class="ql-icon"><span class="plus">+</span></div>
          <div class="ql-title">Add</div>
        `;
        add.addEventListener('click', (e) => {
          e.stopPropagation();
          closeAnyMenu();
          openModal();
        });
        quickLinksEl.appendChild(add);
      }

      // Modal helpers
      let editingIndex = null;
      const modal = document.getElementById('ql-modal');
      const modalTitle = document.getElementById('ql-modal-title');
      const inputUrl = document.getElementById('ql-input-url');
      const inputTitle = document.getElementById('ql-input-title');
      const inputIcon = document.getElementById('ql-input-icon');
      const previewIcon = document.getElementById('ql-preview-icon');
      const previewTitle = document.getElementById('ql-preview-title');
      const btnClose = document.getElementById('ql-modal-close');
      const btnSave = document.getElementById('ql-save');
      const btnCancel = document.getElementById('ql-cancel');
      const btnDelete = document.getElementById('ql-delete');

      function openModal(index){
        editingIndex = (typeof index === 'number') ? index : null;
        const existing = (editingIndex !== null) ? links[editingIndex] : { title: '', url: '', icon: '' };
        modalTitle.textContent = editingIndex !== null ? 'Edit quick link' : 'Add quick link';
        inputUrl.value = existing.url || '';
        inputTitle.value = existing.title || '';
        inputIcon.value = existing.icon || '';
        updatePreview();
        btnDelete.style.display = editingIndex !== null ? 'inline-block' : 'none';
        modal.classList.remove('hidden');
        inputUrl.focus();
      }

      function closeModal(){
        modal.classList.add('hidden');
        editingIndex = null;
      }

      function updatePreview(){
        const urlVal = inputUrl.value.trim();
        const titleVal = inputTitle.value.trim() || 'Preview';
        let iconVal = inputIcon.value.trim();
        try {
          if (!iconVal && urlVal) {
            const host = (new URL(urlVal)).hostname;
            iconVal = `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
          }
        } catch {}
        previewTitle.textContent = titleVal;
        previewIcon.src = iconVal || '';
      }

      [inputUrl, inputTitle, inputIcon].forEach(el => el && el.addEventListener('input', updatePreview));

      btnClose && btnClose.addEventListener('click', closeModal);
      btnCancel && btnCancel.addEventListener('click', closeModal);
      modal && modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

      btnDelete && btnDelete.addEventListener('click', () => {
        if (editingIndex === null) return;
        links.splice(editingIndex, 1);
        saveLinks(links);
        render();
        closeModal();
      });

      btnSave && btnSave.addEventListener('click', () => {
        const url = inputUrl.value.trim();
        const title = (inputTitle.value || '').trim() || 'Link';
        let icon = (inputIcon.value || '').trim();
        if (!/^https?:\/\//i.test(url)) {
          alert('Please enter a valid URL starting with http(s)://');
          return;
        }
        if (!icon) {
          try {
            const host = (new URL(url)).hostname;
            icon = `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
          } catch {}
        }
        const item = { title, url, icon };
        if (editingIndex !== null) links[editingIndex] = item; else links.push(item);
        saveLinks(links);
        render();
        closeModal();
      });

      function edit(index){
        openModal(index);
      }

      render();
    }
  } catch (e) {
    console.warn('Quick links init failed', e);
  }
  
  address.addEventListener("keydown", function(e) {
    // This will be handled by the suggestions system now
    // The suggestions system will call the navigation logic when needed
  });
}

let currentVersion = '1.0.0'; // Move to top level so it's accessible everywhere

// Update version display
function updateVersionDisplay() {
    const versionDisplay = document.getElementById('version-display');
    if (versionDisplay) {
        versionDisplay.textContent = `v${currentVersion}`;
        
        // Add hover effect
        versionDisplay.title = 'Click to check for updates';
        versionDisplay.style.cursor = 'pointer';
        versionDisplay.style.transition = 'opacity 0.2s';
        
        versionDisplay.addEventListener('mouseenter', () => {
            versionDisplay.style.opacity = '1';
        });
        
        versionDisplay.addEventListener('mouseleave', () => {
            versionDisplay.style.opacity = '0.7';
        });
        
        // Click to manually check for updates
        versionDisplay.addEventListener('click', checkForUpdates);
    }
}

async function checkForUpdates() {
    try {
        // Show checking state
        const versionDisplay = document.getElementById('version-display');
        if (versionDisplay) {
            versionDisplay.textContent = 'Checking...';
            versionDisplay.style.opacity = '1';
        }
        
        // Fetch latest release from GitHub
        const response = await fetch('https://api.github.com/repos/nightswimdev/nightdev/releases/latest');
        if (!response.ok) throw new Error('Failed to fetch release info');
        
        const release = await response.json();
        const latestVersion = release.tag_name.replace(/^v/, ''); // Remove 'v' prefix if present
        
        // Update version display back to current version
        updateVersionDisplay();
        
        if (compareVersions(latestVersion, currentVersion) > 0) {
            // New version available
            const updateToast = document.createElement('div');
            updateToast.className = 'toast show info';
            updateToast.style.cssText = `
                background: var(--toast-bg, #232a3a);
                color: var(--toast-color, #fff);
                padding: 1em 2em;
                border-radius: 1em;
                margin-bottom: 10px;
                min-width: 250px;
                box-shadow: 0 4px 24px #232a3a44;
                font-size: 1.1em;
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                opacity: 1;
                transition: opacity 0.5s;
            `;
            
            updateToast.innerHTML = `
                <div style="display: flex; align-items: center; margin-bottom: 8px;">
                    <i class="fa-solid fa-arrow-up-from-bracket" style="margin-right: 8px;"></i>
                    <strong>Update Available!</strong>
                </div>
                <div style="font-size: 0.9em; margin-bottom: 12px;">
                    Version ${latestVersion} is now available (you have v${currentVersion})
                </div>
                <div style="display: flex; gap: 8px; width: 100%;">
                    <button id="update-now" style="
                        background: #4CAF50;
                        color: white;
                        border: none;
                        padding: 6px 12px;
                        border-radius: 4px;
                        cursor: pointer;
                        flex: 1;
                    ">Update Now</button>
                    <button id="update-later" style="
                        background: transparent;
                        color: #bfc9db;
                        border: 1px solid #bfc9db33;
                        padding: 6px 12px;
                        border-radius: 4px;
                        cursor: pointer;
                    ">Later</button>
                </div>
            `;
            
            document.getElementById('toast-container').appendChild(updateToast);
            
            // Add event listeners for buttons
            document.getElementById('update-now').addEventListener('click', () => {
                window.open(release.html_url, '_blank');
                updateToast.style.opacity = '0';
                setTimeout(() => updateToast.remove(), 500);
            });
            
            document.getElementById('update-later').addEventListener('click', () => {
                updateToast.style.opacity = '0';
                setTimeout(() => updateToast.remove(), 500);
            });
            
            // Auto-hide after 30 seconds
            setTimeout(() => {
                if (updateToast.parentNode) {
                    updateToast.style.opacity = '0';
                    setTimeout(() => updateToast.remove(), 500);
                }
            }, 30000);
        } else if (versionDisplay) {
            // Show up-to-date message briefly
            versionDisplay.textContent = 'Up to date';
            setTimeout(updateVersionDisplay, 2000);
        }
    } catch (error) {
        console.error('Error checking for updates:', error);
        const versionDisplay = document.getElementById('version-display');
        if (versionDisplay) {
            versionDisplay.textContent = 'Update check failed';
            versionDisplay.style.color = '#ff6b6b';
            setTimeout(updateVersionDisplay, 2000);
        }
    }
}

// Check for updates when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Initialize version display
    updateVersionDisplay();
    
    // Wait a bit before checking for updates to avoid blocking initial page load
    setTimeout(checkForUpdates, 3000);
    
    // Also check for updates every 24 hours
    setInterval(checkForUpdates, 24 * 60 * 60 * 1000);
});
