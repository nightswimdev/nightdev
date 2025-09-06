// Cloudflare Pages Function for Cloudflare-specific tracking
// Replicates the /api/cf-track endpoint from server.js

export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const data = await request.json();
    const { type, sessionId, data: eventData, browserData, cloudflareData, ddosProtected } = data;
    
    // Get client IP with Cloudflare priority
    const clientIP = request.headers.get('CF-Connecting-IP') || 
                    request.headers.get('CF-Real-IP') ||
                    'unknown';
    
    // Enhanced Cloudflare-specific data collection
    const enhancedCloudflareData = {
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
      // Cloudflare request object data
      country: request.cf?.country || 'Unknown',
      city: request.cf?.city || 'Unknown',
      region: request.cf?.region || 'Unknown',
      timezone: request.cf?.timezone || 'Unknown',
      latitude: request.cf?.latitude || null,
      longitude: request.cf?.longitude || null,
      postalCode: request.cf?.postalCode || 'Unknown',
      metroCode: request.cf?.metroCode || 'Unknown',
      colo: request.cf?.colo || 'Unknown',
      asn: request.cf?.asn || 'Unknown',
      asOrganization: request.cf?.asOrganization || 'Unknown',
      timestamp: new Date().toISOString()
    };
    
    // Create comprehensive tracking entry
    const trackingEntry = {
      type,
      sessionId,
      ip: clientIP,
      eventData,
      browserData,
      cloudflareData: { ...cloudflareData, ...enhancedCloudflareData },
      ddosProtected: ddosProtected || false,
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('User-Agent'),
      referer: request.headers.get('Referer'),
      acceptLanguage: request.headers.get('Accept-Language'),
      acceptEncoding: request.headers.get('Accept-Encoding'),
      // Additional Cloudflare-specific headers
      cfTlsVersion: request.headers.get('CF-TLS-Version'),
      cfTlsCipher: request.headers.get('CF-TLS-Cipher'),
      cfHttpProtocol: request.headers.get('CF-HTTP-Protocol'),
      cfBotScore: request.headers.get('CF-Bot-Score'),
      cfThreatScore: request.headers.get('CF-Threat-Score')
    };
    
    // Store in Cloudflare KV
    if (env.ANALYTICS_KV) {
      try {
        // Store the tracking event
        const eventKey = `cf-event:${type}:${sessionId}:${Date.now()}`;
        await env.ANALYTICS_KV.put(
          eventKey, 
          JSON.stringify(trackingEntry),
          { expirationTtl: 86400 * 30 } // 30 days
        );
        
        // Update event counters
        const eventCounterKey = `counter:${type}:${new Date().toDateString()}`;
        let eventCount = 0;
        try {
          const existing = await env.ANALYTICS_KV.get(eventCounterKey);
          if (existing) {
            eventCount = parseInt(existing);
          }
        } catch (e) {
          console.log('No existing event counter');
        }
        
        eventCount++;
        await env.ANALYTICS_KV.put(eventCounterKey, eventCount.toString());
        
        // Store DDoS protection status if provided
        if (ddosProtected !== undefined) {
          const ddosKey = `ddos:${sessionId}:${Date.now()}`;
          await env.ANALYTICS_KV.put(ddosKey, JSON.stringify({
            sessionId,
            ddosProtected,
            timestamp: new Date().toISOString(),
            cfRay: enhancedCloudflareData.cfRay,
            country: enhancedCloudflareData.country,
            colo: enhancedCloudflareData.colo
          }));
        }
        
      } catch (kvError) {
        console.error('KV storage error:', kvError);
      }
    }
    
    return new Response(JSON.stringify({
      success: true,
      sessionId,
      type,
      cloudflareData: enhancedCloudflareData,
      message: 'Cloudflare tracking data recorded successfully'
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
    
  } catch (error) {
    console.error('Error in Cloudflare tracking:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Failed to process Cloudflare tracking',
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}