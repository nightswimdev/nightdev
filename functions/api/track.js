// Cloudflare Pages Function for tracking analytics
// Replicates the /api/track endpoint from server.js

export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const data = await request.json();
    const { sessionId, browserData, pageData, ddosProtected, ipData } = data;
    
    // Get client IP with Cloudflare priority
    const clientIP = request.headers.get('CF-Connecting-IP') || 
                    request.headers.get('CF-Real-IP') ||
                    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
                    request.headers.get('X-Real-IP') ||
                    'unknown';
    
    // Get Cloudflare-specific data
    const cloudflareData = {
      cfRay: request.headers.get('CF-Ray'),
      cfConnectingIP: request.headers.get('CF-Connecting-IP'),
      cfIPCountry: request.headers.get('CF-IPCountry'),
      cfVisitor: request.headers.get('CF-Visitor'),
      cfCloudflareUID: request.headers.get('CF-Cloudflare-UID'),
      cfWorker: request.headers.get('CF-Worker'),
      cfCacheStatus: request.headers.get('CF-Cache-Status'),
      cfRequestID: request.headers.get('CF-Request-ID'),
      cfEdgeRequestKeepAlive: request.headers.get('CF-Edge-Request-Keep-Alive'),
      cfWarpTagline: request.headers.get('CF-Warp-Tagline'),
      cfAccessClientID: request.headers.get('CF-Access-Client-ID'),
      cfAccessClientName: request.headers.get('CF-Access-Client-Name'),
      cfAccessClientEmail: request.headers.get('CF-Access-Client-Email'),
      timestamp: new Date().toISOString()
    };
    
    // Get detailed IP information using multiple services
    const ipDetails = await getIPDetails(clientIP);
    
    // Create enhanced session entry
    const sessionEntry = {
      sessionId,
      ip: clientIP,
      ipDetails,
      cloudflareData,
      browserData,
      pageData,
      clientIPData: ipData,
      ddosProtected: ddosProtected || false,
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('User-Agent'),
      referer: request.headers.get('Referer'),
      acceptLanguage: request.headers.get('Accept-Language'),
      acceptEncoding: request.headers.get('Accept-Encoding'),
      cfCountry: request.cf?.country || 'Unknown',
      cfCity: request.cf?.city || 'Unknown',
      cfRegion: request.cf?.region || 'Unknown',
      cfTimezone: request.cf?.timezone || 'Unknown',
      cfLatitude: request.cf?.latitude || null,
      cfLongitude: request.cf?.longitude || null,
      cfPostalCode: request.cf?.postalCode || 'Unknown',
      cfMetroCode: request.cf?.metroCode || 'Unknown',
      cfColo: request.cf?.colo || 'Unknown'
    };
    
    // Store in Cloudflare KV (you'll need to bind this in wrangler.toml)
    if (env.ANALYTICS_KV) {
      try {
        // Store session data
        await env.ANALYTICS_KV.put(
          `session:${sessionId}:${Date.now()}`, 
          JSON.stringify(sessionEntry),
          { expirationTtl: 86400 * 30 } // 30 days
        );
        
        // Update daily stats
        const today = new Date().toDateString();
        const dailyKey = `daily:${today}`;
        
        let dailyStats = {};
        try {
          const existing = await env.ANALYTICS_KV.get(dailyKey);
          if (existing) {
            dailyStats = JSON.parse(existing);
          }
        } catch (e) {
          console.log('No existing daily stats');
        }
        
        if (!dailyStats.pageViews) dailyStats.pageViews = 0;
        if (!dailyStats.uniqueVisitors) dailyStats.uniqueVisitors = [];
        if (!dailyStats.pages) dailyStats.pages = {};
        
        dailyStats.pageViews++;
        if (!dailyStats.uniqueVisitors.includes(sessionId)) {
          dailyStats.uniqueVisitors.push(sessionId);
        }
        
        const currentPage = pageData?.pathname || '/';
        if (!dailyStats.pages[currentPage]) {
          dailyStats.pages[currentPage] = 0;
        }
        dailyStats.pages[currentPage]++;
        
        await env.ANALYTICS_KV.put(dailyKey, JSON.stringify(dailyStats));
        
        // Update total stats
        let totalStats = { pageViews: 0, uniqueVisitors: [], firstVisit: new Date().toISOString() };
        try {
          const existing = await env.ANALYTICS_KV.get('total:stats');
          if (existing) {
            totalStats = JSON.parse(existing);
          }
        } catch (e) {
          console.log('No existing total stats');
        }
        
        totalStats.pageViews++;
        if (!totalStats.uniqueVisitors.includes(sessionId)) {
          totalStats.uniqueVisitors.push(sessionId);
        }
        
        await env.ANALYTICS_KV.put('total:stats', JSON.stringify(totalStats));
        
      } catch (kvError) {
        console.error('KV storage error:', kvError);
      }
    }
    
    return new Response(JSON.stringify({
      success: true,
      sessionId,
      ipDetails,
      cloudflareData: {
        country: request.cf?.country,
        city: request.cf?.city,
        region: request.cf?.region,
        colo: request.cf?.colo
      },
      message: 'Tracking data recorded successfully'
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
    
  } catch (error) {
    console.error('Error tracking visit:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Failed to track visit',
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

// Get detailed IP information using multiple services
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
        const response = await fetch(service, { 
          signal: AbortSignal.timeout(5000) // 5 second timeout
        });
        const data = await response.json();

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

// Handle CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}