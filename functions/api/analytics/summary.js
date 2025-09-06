// Cloudflare Pages Function for analytics summary
// Replicates the /api/analytics/summary endpoint from server.js

export async function onRequestGet(context) {
  const { request, env } = context;
  
  try {
    if (!env.ANALYTICS_KV) {
      return new Response(JSON.stringify({
        error: 'Analytics storage not configured'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
    // Get total stats
    let totalStats = { pageViews: 0, uniqueVisitors: [], firstVisit: new Date().toISOString() };
    try {
      const totalData = await env.ANALYTICS_KV.get('total:stats');
      if (totalData) {
        totalStats = JSON.parse(totalData);
      }
    } catch (e) {
      console.log('No total stats found');
    }
    
    // Get today's stats
    const today = new Date().toDateString();
    let todayStats = { pageViews: 0, uniqueVisitors: [], pages: {} };
    try {
      const todayData = await env.ANALYTICS_KV.get(`daily:${today}`);
      if (todayData) {
        todayStats = JSON.parse(todayData);
      }
    } catch (e) {
      console.log('No today stats found');
    }
    
    // Get recent countries (from last 100 sessions)
    const recentCountries = await getRecentCountries(env.ANALYTICS_KV);
    
    // Get top pages from recent data
    const topPages = await getTopPages(env.ANALYTICS_KV);
    
    // Get browser stats
    const browserStats = await getBrowserStats(env.ANALYTICS_KV);
    
    // Get event counters for today
    const eventCounters = await getEventCounters(env.ANALYTICS_KV, today);
    
    const summary = {
      totalPageViews: totalStats.pageViews || 0,
      totalUniqueVisitors: totalStats.uniqueVisitors?.length || 0,
      todayPageViews: todayStats.pageViews || 0,
      todayUniqueVisitors: todayStats.uniqueVisitors?.length || 0,
      totalSessions: await getSessionCount(env.ANALYTICS_KV),
      firstVisit: totalStats.firstVisit,
      lastUpdate: new Date().toISOString(),
      recentCountries,
      topPages,
      browserStats,
      eventCounters,
      cloudflareSpecific: {
        ddosEvents: eventCounters.ddos_protection || 0,
        turnstileVerifications: eventCounters.turnstile_verification || 0,
        securityEvents: eventCounters.security || 0
      }
    };
    
    return new Response(JSON.stringify(summary), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
    
  } catch (error) {
    console.error('Error getting analytics summary:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to get analytics summary',
      details: error.message 
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

// Helper function to get recent countries
async function getRecentCountries(kv) {
  try {
    const countries = {};
    const list = await kv.list({ prefix: 'session:' });
    
    // Get last 50 sessions to analyze countries
    const recentSessions = list.keys.slice(-50);
    
    for (const key of recentSessions) {
      try {
        const sessionData = await kv.get(key.name);
        if (sessionData) {
          const session = JSON.parse(sessionData);
          const country = session.cloudflareData?.cfIPCountry || 
                         session.ipDetails?.country || 
                         'Unknown';
          countries[country] = (countries[country] || 0) + 1;
        }
      } catch (e) {
        continue;
      }
    }
    
    // Return top 10 countries
    return Object.entries(countries)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([country, count]) => ({ country, count }));
      
  } catch (error) {
    console.error('Error getting recent countries:', error);
    return [];
  }
}

// Helper function to get top pages
async function getTopPages(kv) {
  try {
    const pages = {};
    const today = new Date().toDateString();
    
    // Get today's page data
    const todayData = await kv.get(`daily:${today}`);
    if (todayData) {
      const stats = JSON.parse(todayData);
      return Object.entries(stats.pages || {})
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([page, views]) => ({ page, views }));
    }
    
    return [];
  } catch (error) {
    console.error('Error getting top pages:', error);
    return [];
  }
}

// Helper function to get browser stats
async function getBrowserStats(kv) {
  try {
    const browsers = {};
    const list = await kv.list({ prefix: 'session:' });
    
    // Get last 100 sessions to analyze browsers
    const recentSessions = list.keys.slice(-100);
    
    for (const key of recentSessions) {
      try {
        const sessionData = await kv.get(key.name);
        if (sessionData) {
          const session = JSON.parse(sessionData);
          const browser = session.browserData?.browser || 'Unknown';
          browsers[browser] = (browsers[browser] || 0) + 1;
        }
      } catch (e) {
        continue;
      }
    }
    
    return Object.entries(browsers)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([browser, count]) => ({ browser, count }));
      
  } catch (error) {
    console.error('Error getting browser stats:', error);
    return [];
  }
}

// Helper function to get event counters
async function getEventCounters(kv, date) {
  try {
    const counters = {};
    const list = await kv.list({ prefix: `counter:` });
    
    for (const key of list.keys) {
      if (key.name.includes(date)) {
        const eventType = key.name.split(':')[1];
        const count = await kv.get(key.name);
        counters[eventType] = parseInt(count) || 0;
      }
    }
    
    return counters;
  } catch (error) {
    console.error('Error getting event counters:', error);
    return {};
  }
}

// Helper function to get session count
async function getSessionCount(kv) {
  try {
    const list = await kv.list({ prefix: 'session:' });
    return list.keys.length;
  } catch (error) {
    console.error('Error getting session count:', error);
    return 0;
  }
}

// Handle CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}