// Cloudflare Pages Function for analytics
export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const data = await request.json();
    
    // Get client IP
    const clientIP = request.headers.get('CF-Connecting-IP') || 
                    request.headers.get('X-Forwarded-For') || 
                    'unknown';
    
    // Get user agent
    const userAgent = request.headers.get('User-Agent') || 'unknown';
    
    // Get country from Cloudflare
    const country = request.cf?.country || 'unknown';
    
    // Create analytics entry
    const analyticsData = {
      timestamp: new Date().toISOString(),
      ip: clientIP,
      userAgent: userAgent,
      country: country,
      page: data.page || 'unknown',
      event: data.event || 'pageview',
      ...data
    };
    
    // Log to console (in production, you'd save to a database)
    console.log('Analytics:', analyticsData);
    
    // You can store this in Cloudflare KV, D1, or send to external service
    // Example: await env.ANALYTICS_KV.put(`analytics-${Date.now()}`, JSON.stringify(analyticsData));
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Analytics data received',
      ip: clientIP,
      country: country
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 400,
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