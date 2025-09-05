// Cloudflare Pages Analytics Configuration
// Enhanced analytics specifically designed for Cloudflare Pages deployment

class CloudflareAnalytics {
  constructor() {
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
    this.pageViews = [];
    this.events = [];
    this.isCloudflarePages = this.detectCloudflarePages();
    this.ddosProtectionActive = false;
    
    this.init();
  }

  // Generate unique session ID
  generateSessionId() {
    return 'cf_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Detect if running on Cloudflare Pages
  detectCloudflarePages() {
    // Check for Cloudflare-specific indicators
    const cfHeaders = document.querySelector('meta[name="cf-ray"]');
    const cfWorker = window.cfWorker;
    const cfPages = window.CF_PAGES;
    
    return !!(cfHeaders || cfWorker || cfPages || 
              window.location.hostname.includes('.pages.dev') ||
              document.cookie.includes('__cf'));
  }

  // Get enhanced Cloudflare data
  getCloudflareData() {
    const data = {
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      userAgent: navigator.userAgent,
      language: navigator.language,
      languages: navigator.languages,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      hardwareConcurrency: navigator.hardwareConcurrency,
      maxTouchPoints: navigator.maxTouchPoints,
      screen: {
        width: screen.width,
        height: screen.height,
        availWidth: screen.availWidth,
        availHeight: screen.availHeight,
        colorDepth: screen.colorDepth,
        pixelDepth: screen.pixelDepth,
        orientation: screen.orientation?.type
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio
      },
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      connection: this.getConnectionInfo(),
      performance: this.getPerformanceData(),
      cloudflare: {
        isPages: this.isCloudflarePages,
        ddosProtected: this.ddosProtectionActive,
        ray: this.getCfRay(),
        country: this.getCfCountry(),
        colo: this.getCfColo()
      }
    };

    // Add WebGL info if available
    if (this.getWebGLInfo) {
      data.webgl = this.getWebGLInfo();
    }

    return data;
  }

  // Get connection information
  getConnectionInfo() {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection) {
      return {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData
      };
    }
    return null;
  }

  // Get performance data
  getPerformanceData() {
    if (window.performance) {
      const navigation = performance.getEntriesByType('navigation')[0];
      const paint = performance.getEntriesByType('paint');
      
      return {
        loadTime: navigation ? navigation.loadEventEnd - navigation.loadEventStart : null,
        domContentLoaded: navigation ? navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart : null,
        firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || null,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || null,
        timeOrigin: performance.timeOrigin,
        timing: navigation ? {
          dns: navigation.domainLookupEnd - navigation.domainLookupStart,
          tcp: navigation.connectEnd - navigation.connectStart,
          ssl: navigation.secureConnectionStart > 0 ? navigation.connectEnd - navigation.secureConnectionStart : 0,
          ttfb: navigation.responseStart - navigation.requestStart,
          download: navigation.responseEnd - navigation.responseStart
        } : null
      };
    }
    return null;
  }

  // Get WebGL information
  getWebGLInfo() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        return {
          vendor: gl.getParameter(gl.VENDOR),
          renderer: gl.getParameter(gl.RENDERER),
          version: gl.getParameter(gl.VERSION),
          shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
          unmaskedVendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : null,
          unmaskedRenderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : null
        };
      }
    } catch (e) {
      console.warn('WebGL info not available:', e);
    }
    return null;
  }

  // Get Cloudflare Ray ID
  getCfRay() {
    const rayMeta = document.querySelector('meta[name="cf-ray"]');
    return rayMeta ? rayMeta.content : null;
  }

  // Get Cloudflare Country
  getCfCountry() {
    const countryMeta = document.querySelector('meta[name="cf-country"]');
    return countryMeta ? countryMeta.content : null;
  }

  // Get Cloudflare Colo
  getCfColo() {
    const coloMeta = document.querySelector('meta[name="cf-colo"]');
    return coloMeta ? coloMeta.content : null;
  }

  // Track page view
  trackPageView(additionalData = {}) {
    const pageData = {
      url: window.location.href,
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
      title: document.title,
      referrer: document.referrer,
      timestamp: new Date().toISOString(),
      ...additionalData
    };

    this.pageViews.push(pageData);
    this.sendToServer('pageview', pageData);
  }

  // Track custom event
  trackEvent(category, action, label = null, value = null, additionalData = {}) {
    const eventData = {
      category,
      action,
      label,
      value,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      ...additionalData
    };

    this.events.push(eventData);
    this.sendToServer('event', eventData);
  }

  // Track DDoS protection status
  trackDDoSProtection(isActive, additionalData = {}) {
    this.ddosProtectionActive = isActive;
    this.trackEvent('security', 'ddos_protection', isActive ? 'active' : 'inactive', null, additionalData);
  }

  // Track Turnstile verification
  trackTurnstileVerification(success, additionalData = {}) {
    this.trackEvent('security', 'turnstile_verification', success ? 'success' : 'failure', null, additionalData);
  }

  // Send data to server
  async sendToServer(type, data) {
    try {
      const payload = {
        type,
        sessionId: this.sessionId,
        data,
        browserData: this.getBrowserData(),
        cloudflareData: this.getCloudflareData(),
        ddosProtected: this.ddosProtectionActive
      };

      // Use different endpoints based on deployment
      const endpoint = this.isCloudflarePages ? '/api/cf-track' : '/api/track';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        console.warn('Analytics tracking failed:', response.status);
      }
    } catch (error) {
      console.warn('Analytics error:', error);
    }
  }

  // Get browser data
  getBrowserData() {
    const ua = navigator.userAgent;
    let browser = 'Unknown';
    let version = 'Unknown';

    // Detect browser
    if (ua.includes('Chrome') && !ua.includes('Edg')) {
      browser = 'Chrome';
      version = ua.match(/Chrome\/([0-9.]+)/)?.[1] || 'Unknown';
    } else if (ua.includes('Firefox')) {
      browser = 'Firefox';
      version = ua.match(/Firefox\/([0-9.]+)/)?.[1] || 'Unknown';
    } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
      browser = 'Safari';
      version = ua.match(/Version\/([0-9.]+)/)?.[1] || 'Unknown';
    } else if (ua.includes('Edg')) {
      browser = 'Edge';
      version = ua.match(/Edg\/([0-9.]+)/)?.[1] || 'Unknown';
    }

    return {
      browser,
      version,
      userAgent: ua,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      javaEnabled: navigator.javaEnabled ? navigator.javaEnabled() : false,
      onLine: navigator.onLine
    };
  }

  // Initialize analytics
  init() {
    // Track initial page view
    this.trackPageView();

    // Track page unload
    window.addEventListener('beforeunload', () => {
      const timeOnPage = Date.now() - this.startTime;
      this.trackEvent('engagement', 'time_on_page', null, timeOnPage);
    });

    // Track visibility changes
    document.addEventListener('visibilitychange', () => {
      this.trackEvent('engagement', 'visibility_change', document.visibilityState);
    });

    // Track errors
    window.addEventListener('error', (event) => {
      this.trackEvent('error', 'javascript_error', event.message, null, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    // Track unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.trackEvent('error', 'unhandled_promise_rejection', event.reason?.toString() || 'Unknown');
    });

    console.log('Cloudflare Analytics initialized', {
      sessionId: this.sessionId,
      isCloudflarePages: this.isCloudflarePages,
      ddosProtected: this.ddosProtectionActive
    });
  }
}

// Global analytics instance
window.cfAnalytics = new CloudflareAnalytics();

// Convenience functions for global access
window.trackPageView = (data) => window.cfAnalytics.trackPageView(data);
window.trackEvent = (category, action, label, value, data) => window.cfAnalytics.trackEvent(category, action, label, value, data);
window.trackDDoSProtection = (isActive, data) => window.cfAnalytics.trackDDoSProtection(isActive, data);
window.trackTurnstileVerification = (success, data) => window.cfAnalytics.trackTurnstileVerification(success, data);

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CloudflareAnalytics;
}