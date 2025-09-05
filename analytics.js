/**
 * NightDev Analytics & IP Tracking System
 * Captures user data, IP information, and page analytics
 */

class NightDevAnalytics {
  constructor() {
    // Use Cloudflare Pages Function endpoint
    this.serverEndpoint = window.location.origin + '/api/analytics';
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
    this.pageViews = [];
    this.userAgent = navigator.userAgent;
    this.locationData = null;
    this.browserData = null;
    this.init();
  }

  // Generate unique session ID
  generateSessionId() {
    return 'nd_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Initialize tracking
  async init() {
    try {
      // Collect browser and device data
      this.collectBrowserData();
      
      // For static deployment, skip server tracking and use local storage directly
      if (this.isStaticDeployment()) {
        console.log('Static deployment detected, using local analytics storage');
        await this.fallbackToLocalStorage();
      } else {
        // Track page view and send to server
        await this.trackPageViewToServer();
        
        // Also store locally as backup
        this.storeAnalyticsDataLocally();
      }
      
      // Set up event listeners
      this.setupEventListeners();
      
    } catch (error) {
      console.warn('Analytics initialization failed:', error);
      // Fallback to local storage if server fails
      this.fallbackToLocalStorage();
    }
  }

  // Check if this is a static deployment (no backend server)
  isStaticDeployment() {
    // Check if we're on Cloudflare Pages or other static hosting
    return window.location.hostname.includes('.pages.dev') || 
           window.location.hostname.includes('github.io') ||
           window.location.hostname.includes('netlify.app') ||
           window.location.hostname.includes('vercel.app') ||
           !window.location.hostname.includes('localhost');
  }

  // Send tracking data to server
  async trackPageViewToServer() {
    try {
      const pageData = {
        url: window.location.href,
        pathname: window.location.pathname,
        title: document.title,
        referrer: document.referrer,
        timestamp: new Date().toISOString(),
        loadTime: Date.now() - this.startTime
      };

      const response = await fetch(this.serverEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
          browserData: this.browserData,
          pageData: pageData
        })
      });

      if (response.ok) {
        const result = await response.json();
        this.locationData = result.ipDetails;
        console.log('Analytics data sent to server successfully');
        return result;
      } else {
        throw new Error(`Server responded with status: ${response.status}`);
      }
    } catch (error) {
      console.warn('Failed to send analytics to server:', error);
      throw error;
    }
  }

  // Fallback to local storage if server is unavailable
  async fallbackToLocalStorage() {
    try {
      // Use the old IP collection method as fallback
      await this.collectIPDataFallback();
      this.trackPageView();
      this.storeAnalyticsDataLocally();
      console.log('Analytics initialized with local storage');
    } catch (error) {
      console.warn('Fallback analytics also failed:', error);
    }
  }

  // Fallback IP collection method
  async collectIPDataFallback() {
    try {
      // Try multiple free IP services
      const ipServices = [
        'https://api.ipify.org?format=json',
        'https://ipapi.co/json/',
        'https://api.ip.sb/jsonip'
      ];

      for (const service of ipServices) {
        try {
          const response = await fetch(service);
          const data = await response.json();
          
          if (service.includes('ipify')) {
            this.locationData = { ip: data.ip };
            // Get geo data separately
            const geoResponse = await fetch('https://ipapi.co/json/');
            const geoData = await geoResponse.json();
            this.locationData = {
              ip: data.ip,
              city: geoData.city || 'Unknown',
              region: geoData.region || 'Unknown',
              country: geoData.country_name || 'Unknown',
              countryCode: geoData.country_code || 'Unknown',
              timezone: geoData.timezone || 'Unknown',
              latitude: geoData.latitude || null,
              longitude: geoData.longitude || null,
              isp: geoData.org || 'Unknown',
              asn: geoData.asn || 'Unknown'
            };
          } else if (service.includes('ipapi.co')) {
            this.locationData = {
              ip: data.ip,
              city: data.city || 'Unknown',
              region: data.region || 'Unknown',
              country: data.country_name || 'Unknown',
              countryCode: data.country_code || 'Unknown',
              timezone: data.timezone || 'Unknown',
              latitude: data.latitude || null,
              longitude: data.longitude || null,
              isp: data.org || 'Unknown',
              asn: data.asn || 'Unknown'
            };
          } else if (service.includes('ip.sb')) {
            this.locationData = { ip: data.ip };
          }
          
          if (this.locationData) break;
        } catch (serviceError) {
          continue;
        }
      }

      if (!this.locationData) {
        throw new Error('All IP services failed');
      }

    } catch (error) {
      console.warn('Failed to collect IP data:', error);
      this.locationData = {
        ip: 'Unknown',
        city: 'Unknown',
        region: 'Unknown',
        country: 'Unknown',
        countryCode: 'Unknown',
        timezone: 'Unknown',
        latitude: null,
        longitude: null,
        isp: 'Unknown',
        asn: 'Unknown'
      };
    }
  }

  // Collect browser and device information
  collectBrowserData() {
    this.browserData = {
      userAgent: navigator.userAgent,
      language: navigator.language || navigator.userLanguage,
      languages: navigator.languages || [],
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      doNotTrack: navigator.doNotTrack,
      
      // Screen information
      screenWidth: screen.width,
      screenHeight: screen.height,
      screenColorDepth: screen.colorDepth,
      screenPixelDepth: screen.pixelDepth,
      
      // Window information
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      
      // Browser detection
      browser: this.detectBrowser(),
      os: this.detectOS(),
      device: this.detectDevice(),
      
      // Additional info
      referrer: document.referrer,
      url: window.location.href,
      domain: window.location.hostname,
      protocol: window.location.protocol,
      
      // Performance data
      connectionType: this.getConnectionType(),
      timestamp: new Date().toISOString()
    };
  }

  // Detect browser
  detectBrowser() {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
    if (ua.includes('Edg')) return 'Edge';
    if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
    return 'Unknown';
  }

  // Detect operating system
  detectOS() {
    const ua = navigator.userAgent;
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac OS')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iOS')) return 'iOS';
    return 'Unknown';
  }

  // Detect device type
  detectDevice() {
    const ua = navigator.userAgent;
    if (/tablet|ipad|playbook|silk/i.test(ua)) return 'Tablet';
    if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(ua)) return 'Mobile';
    return 'Desktop';
  }

  // Get connection type
  getConnectionType() {
    if ('connection' in navigator) {
      return navigator.connection.effectiveType || 'Unknown';
    }
    return 'Unknown';
  }

  // Track page view
  trackPageView() {
    const pageData = {
      url: window.location.href,
      title: document.title,
      referrer: document.referrer,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      loadTime: Date.now() - this.startTime
    };

    this.pageViews.push(pageData);
    this.updatePageViewCount();
  }

  // Update page view statistics
  updatePageViewCount() {
    const today = new Date().toDateString();
    const analytics = this.getStoredAnalytics();
    
    // Update daily stats
    if (!analytics.dailyStats[today]) {
      analytics.dailyStats[today] = {
        pageViews: 0,
        uniqueVisitors: new Set(),
        pages: {}
      };
    }
    
    analytics.dailyStats[today].pageViews++;
    analytics.dailyStats[today].uniqueVisitors.add(this.sessionId);
    
    const currentPage = window.location.pathname || '/';
    if (!analytics.dailyStats[today].pages[currentPage]) {
      analytics.dailyStats[today].pages[currentPage] = 0;
    }
    analytics.dailyStats[today].pages[currentPage]++;
    
    // Update total stats
    analytics.totalStats.pageViews++;
    analytics.totalStats.uniqueVisitors.add(this.sessionId);
    
    // Convert Set to Array for storage
    analytics.dailyStats[today].uniqueVisitors = Array.from(analytics.dailyStats[today].uniqueVisitors);
    analytics.totalStats.uniqueVisitors = Array.from(analytics.totalStats.uniqueVisitors);
    
    this.saveAnalytics(analytics);
  }

  // Get stored analytics data
  getStoredAnalytics() {
    try {
      const stored = localStorage.getItem('nightdev_analytics');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert arrays back to Sets for processing
        if (parsed.totalStats && parsed.totalStats.uniqueVisitors) {
          parsed.totalStats.uniqueVisitors = new Set(parsed.totalStats.uniqueVisitors);
        }
        if (parsed.dailyStats) {
          Object.keys(parsed.dailyStats).forEach(date => {
            if (parsed.dailyStats[date].uniqueVisitors) {
              parsed.dailyStats[date].uniqueVisitors = new Set(parsed.dailyStats[date].uniqueVisitors);
            }
          });
        }
        return parsed;
      }
    } catch (error) {
      console.warn('Failed to parse stored analytics:', error);
    }
    
    return {
      totalStats: {
        pageViews: 0,
        uniqueVisitors: new Set(),
        firstVisit: new Date().toISOString()
      },
      dailyStats: {},
      ipData: [],
      browserData: []
    };
  }

  // Store analytics data locally (as backup)
  storeAnalyticsDataLocally() {
    if (!this.locationData || !this.browserData) return;
    
    const analytics = this.getStoredAnalytics();
    
    // Store IP data
    const ipEntry = {
      ...this.locationData,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      page: window.location.pathname || '/',
      source: 'server' // Mark as server-sourced data
    };
    
    analytics.ipData.push(ipEntry);
    
    // Store browser data
    const browserEntry = {
      ...this.browserData,
      sessionId: this.sessionId,
      source: 'server'
    };
    
    analytics.browserData.push(browserEntry);
    
    // Limit stored data to prevent localStorage overflow
    if (analytics.ipData.length > 1000) {
      analytics.ipData = analytics.ipData.slice(-500);
    }
    
    if (analytics.browserData.length > 1000) {
      analytics.browserData = analytics.browserData.slice(-500);
    }
    
    this.saveAnalytics(analytics);
  }

  // Save analytics to localStorage
  saveAnalytics(analytics) {
    try {
      localStorage.setItem('nightdev_analytics', JSON.stringify(analytics));
    } catch (error) {
      console.warn('Failed to save analytics:', error);
    }
  }

  // Set up event listeners for user interactions
  setupEventListeners() {
    // Track time on page
    window.addEventListener('beforeunload', () => {
      const timeOnPage = Date.now() - this.startTime;
      this.trackTimeOnPage(timeOnPage);
    });

    // Track clicks
    document.addEventListener('click', (e) => {
      this.trackClick(e);
    });

    // Track scroll depth
    let maxScroll = 0;
    window.addEventListener('scroll', () => {
      const scrollPercent = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
      if (scrollPercent > maxScroll) {
        maxScroll = scrollPercent;
      }
    });

    // Save max scroll on page unload
    window.addEventListener('beforeunload', () => {
      this.trackScrollDepth(maxScroll);
    });
  }

  // Track time spent on page
  trackTimeOnPage(timeMs) {
    const analytics = this.getStoredAnalytics();
    const today = new Date().toDateString();
    
    if (!analytics.dailyStats[today]) {
      analytics.dailyStats[today] = { timeOnSite: 0 };
    }
    
    if (!analytics.dailyStats[today].timeOnSite) {
      analytics.dailyStats[today].timeOnSite = 0;
    }
    
    analytics.dailyStats[today].timeOnSite += timeMs;
    this.saveAnalytics(analytics);
  }

  // Track clicks
  trackClick(event) {
    const clickData = {
      element: event.target.tagName,
      className: event.target.className,
      id: event.target.id,
      text: event.target.textContent?.substring(0, 100),
      x: event.clientX,
      y: event.clientY,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId
    };

    // Store click data (optional - can be enabled for detailed tracking)
    // this.storeClickData(clickData);
  }

  // Track scroll depth
  trackScrollDepth(maxPercent) {
    const analytics = this.getStoredAnalytics();
    const today = new Date().toDateString();
    
    if (!analytics.dailyStats[today]) {
      analytics.dailyStats[today] = {};
    }
    
    if (!analytics.dailyStats[today].scrollDepth) {
      analytics.dailyStats[today].scrollDepth = [];
    }
    
    analytics.dailyStats[today].scrollDepth.push({
      page: window.location.pathname,
      maxScroll: maxPercent,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString()
    });
    
    this.saveAnalytics(analytics);
  }

  // Get analytics summary for dashboard
  static getAnalyticsSummary() {
    try {
      const stored = localStorage.getItem('nightdev_analytics');
      if (!stored) return null;
      
      const analytics = JSON.parse(stored);
      const today = new Date().toDateString();
      const todayStats = analytics.dailyStats[today] || {};
      
      return {
        totalPageViews: analytics.totalStats?.pageViews || 0,
        totalUniqueVisitors: analytics.totalStats?.uniqueVisitors?.length || 0,
        todayPageViews: todayStats.pageViews || 0,
        todayUniqueVisitors: todayStats.uniqueVisitors?.length || 0,
        totalIPEntries: analytics.ipData?.length || 0,
        totalBrowserEntries: analytics.browserData?.length || 0,
        firstVisit: analytics.totalStats?.firstVisit,
        lastUpdate: new Date().toISOString()
      };
    } catch (error) {
      console.warn('Failed to get analytics summary:', error);
      return null;
    }
  }

  // Get IP data for dashboard
  static getIPData() {
    try {
      const stored = localStorage.getItem('nightdev_analytics');
      if (!stored) return [];
      
      const analytics = JSON.parse(stored);
      return analytics.ipData || [];
    } catch (error) {
      console.warn('Failed to get IP data:', error);
      return [];
    }
  }

  // Get browser data for dashboard
  static getBrowserData() {
    try {
      const stored = localStorage.getItem('nightdev_analytics');
      if (!stored) return [];
      
      const analytics = JSON.parse(stored);
      return analytics.browserData || [];
    } catch (error) {
      console.warn('Failed to get browser data:', error);
      return [];
    }
  }
}

// Auto-initialize analytics when script loads
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.nightdevAnalytics = new NightDevAnalytics();
    });
  } else {
    window.nightdevAnalytics = new NightDevAnalytics();
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NightDevAnalytics;
}