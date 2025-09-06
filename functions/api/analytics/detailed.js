// Cloudflare Pages Function for detailed analytics
// Replicates the /api/analytics/detailed endpoint from server.js

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
    
    // Get query parameters for filtering
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit')) || 100;
    const offset = parseInt(url.searchParams.get('offset')) || 0;
    const type = url.searchParams.get('type'); // 'sessions', 'events', 'ddos', etc.
    
    let detailedData = {
      totalStats: {},
      dailyStats: {},
      sessions: [],
      events: [],
      ddosEvents: [],
      metadata: {
        timestamp: new Date().toISOString(),
        limit,
        offset,
        type
      }
    };
    
    // Get total stats
    try {
      const totalData = await env.ANALYTICS_KV.get('total:stats');
      if (totalData) {
        detailedData.totalStats = JSON.parse(totalData);
      }
    } catch (e) {
      console.log('No total stats found');
    }
    
    // Get daily stats (last 30 days)
    const dailyStats = {};
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateString = date.toDateString();
      
      try {
        const dayData = await env.ANALYTICS_KV.get(`daily:${dateString}`);
        if (dayData) {
          dailyStats[dateString] = JSON.parse(dayData);
        }
      } catch (e) {
        continue;
      }
    }
    detailedData.dailyStats = dailyStats;
    
    // Get sessions data
    if (!type || type === 'sessions') {
      try {
        const sessionsList = await env.ANALYTICS_KV.list({ 
          prefix: 'session:',
          limit: limit + offset
        });
        
        const sessions = [];
        const keysToFetch = sessionsList.keys.slice(offset, offset + limit);
        
        for (const key of keysToFetch) {
          try {
            const sessionData = await env.ANALYTICS_KV.get(key.name);
            if (sessionData) {
              sessions.push(JSON.parse(sessionData));
            }
          } catch (e) {
            continue;
          }
        }
        
        detailedData.sessions = sessions;
      } catch (e) {
        console.error('Error fetching sessions:', e);
      }
    }
    
    // Get events data
    if (!type || type === 'events') {
      try {
        const eventsList = await env.ANALYTICS_KV.list({ 
          prefix: 'cf-event:',
          limit: limit + offset
        });
        
        const events = [];
        const keysToFetch = eventsList.keys.slice(offset, offset + limit);
        
        for (const key of keysToFetch) {
          try {
            const eventData = await env.ANALYTICS_KV.get(key.name);
            if (eventData) {
              events.push(JSON.parse(eventData));
            }
          } catch (e) {
            continue;
          }
        }
        
        detailedData.events = events;
      } catch (e) {
        console.error('Error fetching events:', e);
      }
    }
    
    // Get DDoS events
    if (!type || type === 'ddos') {
      try {
        const ddosList = await env.ANALYTICS_KV.list({ 
          prefix: 'ddos:',
          limit: limit + offset
        });
        
        const ddosEvents = [];
        const keysToFetch = ddosList.keys.slice(offset, offset + limit);
        
        for (const key of keysToFetch) {
          try {
            const ddosData = await env.ANALYTICS_KV.get(key.name);
            if (ddosData) {
              ddosEvents.push(JSON.parse(ddosData));
            }
          } catch (e) {
            continue;
          }
        }
        
        detailedData.ddosEvents = ddosEvents;
      } catch (e) {
        console.error('Error fetching DDoS events:', e);
      }
    }
    
    // Add summary statistics
    detailedData.summary = {
      totalSessions: detailedData.sessions.length,
      totalEvents: detailedData.events.length,
      totalDDoSEvents: detailedData.ddosEvents.length,
      uniqueCountries: [...new Set(detailedData.sessions.map(s => 
        s.cloudflareData?.cfIPCountry || s.ipDetails?.country || 'Unknown'
      ))].length,
      uniqueIPs: [...new Set(detailedData.sessions.map(s => s.ip))].length,
      dateRange: {
        oldest: detailedData.sessions.length > 0 ? 
          Math.min(...detailedData.sessions.map(s => new Date(s.timestamp).getTime())) : null,
        newest: detailedData.sessions.length > 0 ? 
          Math.max(...detailedData.sessions.map(s => new Date(s.timestamp).getTime())) : null
      }
    };
    
    return new Response(JSON.stringify(detailedData), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
    
  } catch (error) {
    console.error('Error getting detailed analytics:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to get detailed analytics',
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