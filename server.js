const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Store analytics data in JSON file
const ANALYTICS_FILE = path.join(__dirname, 'analytics-data.json');

// Initialize analytics data file
async function initAnalyticsFile() {
  try {
    await fs.access(ANALYTICS_FILE);
  } catch (error) {
    // File doesn't exist, create it
    const initialData = {
      totalStats: {
        pageViews: 0,
        uniqueVisitors: [],
        firstVisit: new Date().toISOString()
      },
      dailyStats: {},
      ipData: [],
      browserData: [],
      sessions: []
    };
    await fs.writeFile(ANALYTICS_FILE, JSON.stringify(initialData, null, 2));
  }
}

// Read analytics data
async function readAnalyticsData() {
  try {
    const data = await fs.readFile(ANALYTICS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading analytics data:', error);
    return null;
  }
}

// Write analytics data
async function writeAnalyticsData(data) {
  try {
    await fs.writeFile(ANALYTICS_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing analytics data:', error);
    return false;
  }
}

// Get client IP address
function getClientIP(req) {
  return req.headers['x-forwarded-for'] || 
         req.headers['x-real-ip'] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         req.ip;
}

// Get detailed IP information
async function getIPDetails(ip) {
  try {
    // Use multiple IP geolocation services for better reliability
    const services = [
      `http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query`,
      `https://ipapi.co/${ip}/json/`,
      `https://api.ipgeolocation.io/ipgeo?apiKey=free&ip=${ip}`
    ];

    for (const service of services) {
      try {
        const response = await axios.get(service, { timeout: 5000 });
        const data = response.data;

        // Format response based on service
        if (service.includes('ip-api.com')) {
          if (data.status === 'success') {
            return {
              ip: data.query,
              city: data.city || 'Unknown',
              region: data.regionName || 'Unknown',
              country: data.country || 'Unknown',
              countryCode: data.countryCode || 'Unknown',
              timezone: data.timezone || 'Unknown',
              latitude: data.lat || null,
              longitude: data.lon || null,
              isp: data.isp || 'Unknown',
              org: data.org || 'Unknown',
              asn: data.as || 'Unknown',
              zip: data.zip || 'Unknown'
            };
          }
        } else if (service.includes('ipapi.co')) {
          if (!data.error) {
            return {
              ip: data.ip,
              city: data.city || 'Unknown',
              region: data.region || 'Unknown',
              country: data.country_name || 'Unknown',
              countryCode: data.country_code || 'Unknown',
              timezone: data.timezone || 'Unknown',
              latitude: data.latitude || null,
              longitude: data.longitude || null,
              isp: data.org || 'Unknown',
              org: data.org || 'Unknown',
              asn: data.asn || 'Unknown',
              zip: data.postal || 'Unknown'
            };
          }
        } else if (service.includes('ipgeolocation.io')) {
          return {
            ip: data.ip,
            city: data.city || 'Unknown',
            region: data.state_prov || 'Unknown',
            country: data.country_name || 'Unknown',
            countryCode: data.country_code2 || 'Unknown',
            timezone: data.time_zone?.name || 'Unknown',
            latitude: data.latitude || null,
            longitude: data.longitude || null,
            isp: data.isp || 'Unknown',
            org: data.organization || 'Unknown',
            asn: data.asn || 'Unknown',
            zip: data.zipcode || 'Unknown'
          };
        }
      } catch (serviceError) {
        console.log(`Service ${service} failed:`, serviceError.message);
        continue;
      }
    }

    // If all services fail, return basic info
    return {
      ip: ip,
      city: 'Unknown',
      region: 'Unknown',
      country: 'Unknown',
      countryCode: 'Unknown',
      timezone: 'Unknown',
      latitude: null,
      longitude: null,
      isp: 'Unknown',
      org: 'Unknown',
      asn: 'Unknown',
      zip: 'Unknown'
    };
  } catch (error) {
    console.error('Error getting IP details:', error);
    return {
      ip: ip,
      city: 'Unknown',
      region: 'Unknown',
      country: 'Unknown',
      countryCode: 'Unknown',
      timezone: 'Unknown',
      latitude: null,
      longitude: null,
      isp: 'Unknown',
      org: 'Unknown',
      asn: 'Unknown',
      zip: 'Unknown'
    };
  }
}

// API Routes

// Track page visit
app.post('/api/track', async (req, res) => {
  try {
    const clientIP = getClientIP(req);
    const { sessionId, browserData, pageData } = req.body;

    // Get detailed IP information
    const ipDetails = await getIPDetails(clientIP);

    // Read current analytics data
    const analytics = await readAnalyticsData();
    if (!analytics) {
      return res.status(500).json({ error: 'Failed to read analytics data' });
    }

    // Create session entry
    const sessionEntry = {
      sessionId,
      ip: clientIP,
      ipDetails,
      browserData,
      pageData,
      timestamp: new Date().toISOString(),
      userAgent: req.headers['user-agent']
    };

    // Add to sessions
    analytics.sessions.push(sessionEntry);

    // Update IP data
    const ipEntry = {
      ...ipDetails,
      sessionId,
      timestamp: new Date().toISOString(),
      page: pageData?.url || 'Unknown',
      userAgent: req.headers['user-agent']
    };
    analytics.ipData.push(ipEntry);

    // Update browser data
    if (browserData) {
      const browserEntry = {
        ...browserData,
        sessionId,
        ip: clientIP,
        timestamp: new Date().toISOString()
      };
      analytics.browserData.push(browserEntry);
    }

    // Update daily stats
    const today = new Date().toDateString();
    if (!analytics.dailyStats[today]) {
      analytics.dailyStats[today] = {
        pageViews: 0,
        uniqueVisitors: [],
        pages: {},
        timeOnSite: 0
      };
    }

    analytics.dailyStats[today].pageViews++;
    if (!analytics.dailyStats[today].uniqueVisitors.includes(sessionId)) {
      analytics.dailyStats[today].uniqueVisitors.push(sessionId);
    }

    const currentPage = pageData?.pathname || '/';
    if (!analytics.dailyStats[today].pages[currentPage]) {
      analytics.dailyStats[today].pages[currentPage] = 0;
    }
    analytics.dailyStats[today].pages[currentPage]++;

    // Update total stats
    analytics.totalStats.pageViews++;
    if (!analytics.totalStats.uniqueVisitors.includes(sessionId)) {
      analytics.totalStats.uniqueVisitors.push(sessionId);
    }

    // Limit stored data to prevent file from getting too large
    if (analytics.sessions.length > 10000) {
      analytics.sessions = analytics.sessions.slice(-5000);
    }
    if (analytics.ipData.length > 10000) {
      analytics.ipData = analytics.ipData.slice(-5000);
    }
    if (analytics.browserData.length > 10000) {
      analytics.browserData = analytics.browserData.slice(-5000);
    }

    // Save updated analytics
    await writeAnalyticsData(analytics);

    res.json({
      success: true,
      sessionId,
      ipDetails,
      message: 'Tracking data recorded successfully'
    });

  } catch (error) {
    console.error('Error tracking visit:', error);
    res.status(500).json({ error: 'Failed to track visit' });
  }
});

// Get analytics summary
app.get('/api/analytics/summary', async (req, res) => {
  try {
    const analytics = await readAnalyticsData();
    if (!analytics) {
      return res.status(500).json({ error: 'Failed to read analytics data' });
    }

    const today = new Date().toDateString();
    const todayStats = analytics.dailyStats[today] || {};

    const summary = {
      totalPageViews: analytics.totalStats?.pageViews || 0,
      totalUniqueVisitors: analytics.totalStats?.uniqueVisitors?.length || 0,
      todayPageViews: todayStats.pageViews || 0,
      todayUniqueVisitors: todayStats.uniqueVisitors?.length || 0,
      totalIPEntries: analytics.ipData?.length || 0,
      totalBrowserEntries: analytics.browserData?.length || 0,
      totalSessions: analytics.sessions?.length || 0,
      firstVisit: analytics.totalStats?.firstVisit,
      lastUpdate: new Date().toISOString(),
      recentCountries: getRecentCountries(analytics.ipData),
      topPages: getTopPages(analytics.dailyStats),
      browserStats: getBrowserStats(analytics.browserData)
    };

    res.json(summary);
  } catch (error) {
    console.error('Error getting analytics summary:', error);
    res.status(500).json({ error: 'Failed to get analytics summary' });
  }
});

// Get detailed analytics data (protected endpoint)
app.get('/api/analytics/detailed', async (req, res) => {
  try {
    const analytics = await readAnalyticsData();
    if (!analytics) {
      return res.status(500).json({ error: 'Failed to read analytics data' });
    }

    // Return detailed data (you might want to add authentication here)
    res.json(analytics);
  } catch (error) {
    console.error('Error getting detailed analytics:', error);
    res.status(500).json({ error: 'Failed to get detailed analytics' });
  }
});

// Helper functions
function getRecentCountries(ipData) {
  const countries = {};
  const recent = ipData.slice(-100); // Last 100 entries
  
  recent.forEach(entry => {
    const country = entry.country || 'Unknown';
    countries[country] = (countries[country] || 0) + 1;
  });

  return Object.entries(countries)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([country, count]) => ({ country, count }));
}

function getTopPages(dailyStats) {
  const pages = {};
  
  Object.values(dailyStats).forEach(day => {
    if (day.pages) {
      Object.entries(day.pages).forEach(([page, count]) => {
        pages[page] = (pages[page] || 0) + count;
      });
    }
  });

  return Object.entries(pages)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([page, count]) => ({ page, count }));
}

function getBrowserStats(browserData) {
  const browsers = {};
  const recent = browserData.slice(-100); // Last 100 entries
  
  recent.forEach(entry => {
    const browser = entry.browser || 'Unknown';
    browsers[browser] = (browsers[browser] || 0) + 1;
  });

  return Object.entries(browsers)
    .sort(([,a], [,b]) => b - a)
    .map(([browser, count]) => ({ browser, count }));
}

// Serve static files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
async function startServer() {
  await initAnalyticsFile();
  
  app.listen(PORT, () => {
    console.log(`🚀 NightDev Server running on http://localhost:${PORT}`);
    console.log(`📊 Analytics API available at http://localhost:${PORT}/api/analytics/summary`);
    console.log(`🔍 Detailed analytics at http://localhost:${PORT}/api/analytics/detailed`);
  });
}

startServer().catch(console.error);

module.exports = app;