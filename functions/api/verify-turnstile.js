// Cloudflare Pages Function for Turnstile verification
// Replicates the /api/verify-turnstile endpoint from server.js

export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const data = await request.json();
    const { token, ipData } = data;
    
    // Get secret key from environment variables
    const secretKey = env.TURNSTILE_SECRET_KEY || '0x4AAAAAAByuMp3amBtzLFTqD_00DbRzj0o';
    
    const clientIP = request.headers.get('CF-Connecting-IP') || 
                    request.headers.get('CF-Real-IP') ||
                    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
                    'unknown';
    
    // Get Cloudflare-specific data
    const cloudflareData = {
      cfRay: request.headers.get('CF-Ray'),
      cfConnectingIP: request.headers.get('CF-Connecting-IP'),
      cfIPCountry: request.headers.get('CF-IPCountry'),
      cfVisitor: request.headers.get('CF-Visitor'),
      cfCacheStatus: request.headers.get('CF-Cache-Status'),
      cfRequestID: request.headers.get('CF-Request-ID'),
      country: request.cf?.country || 'Unknown',
      city: request.cf?.city || 'Unknown',
      region: request.cf?.region || 'Unknown',
      colo: request.cf?.colo || 'Unknown',
      timestamp: new Date().toISOString()
    };
    
    if (!token) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Missing Turnstile token' 
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Verify token with Cloudflare Turnstile
    const verificationResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        secret: secretKey,
        response: token,
        remoteip: clientIP
      })
    });

    const verificationResult = await verificationResponse.json();
    
    // Create verification log entry
    const verificationEntry = {
      token: token.substring(0, 20) + '...', // Truncate token for security
      success: verificationResult.success,
      errorCodes: verificationResult['error-codes'] || [],
      challengeTs: verificationResult.challenge_ts,
      hostname: verificationResult.hostname,
      action: verificationResult.action,
      cdata: verificationResult.cdata,
      clientIP,
      cloudflareData,
      ipData,
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('User-Agent'),
      referer: request.headers.get('Referer')
    };
    
    // Store verification result in KV
    if (env.ANALYTICS_KV) {
      try {
        const verificationKey = `turnstile:${Date.now()}:${clientIP}`;
        await env.ANALYTICS_KV.put(
          verificationKey, 
          JSON.stringify(verificationEntry),
          { expirationTtl: 86400 * 7 } // 7 days
        );
        
        // Update verification counters
        const today = new Date().toDateString();
        const counterKey = `counter:turnstile_verification:${today}`;
        let count = 0;
        try {
          const existing = await env.ANALYTICS_KV.get(counterKey);
          if (existing) {
            count = parseInt(existing);
          }
        } catch (e) {
          console.log('No existing turnstile counter');
        }
        
        count++;
        await env.ANALYTICS_KV.put(counterKey, count.toString());
        
        // Store success/failure counters separately
        const statusKey = `counter:turnstile_${verificationResult.success ? 'success' : 'failure'}:${today}`;
        let statusCount = 0;
        try {
          const existing = await env.ANALYTICS_KV.get(statusKey);
          if (existing) {
            statusCount = parseInt(existing);
          }
        } catch (e) {
          console.log('No existing turnstile status counter');
        }
        
        statusCount++;
        await env.ANALYTICS_KV.put(statusKey, statusCount.toString());
        
      } catch (kvError) {
        console.error('KV storage error for Turnstile:', kvError);
      }
    }
    
    // Return verification result with enhanced data
    const response = {
      success: verificationResult.success,
      challengeTs: verificationResult.challenge_ts,
      hostname: verificationResult.hostname,
      action: verificationResult.action,
      cdata: verificationResult.cdata,
      errorCodes: verificationResult['error-codes'] || [],
      clientIP,
      cloudflareData: {
        country: cloudflareData.country,
        city: cloudflareData.city,
        region: cloudflareData.region,
        colo: cloudflareData.colo,
        cfRay: cloudflareData.cfRay
      },
      timestamp: new Date().toISOString()
    };
    
    // Add error details if verification failed
    if (!verificationResult.success) {
      response.errorDetails = {
        codes: verificationResult['error-codes'],
        message: getTurnstileErrorMessage(verificationResult['error-codes'])
      };
    }
    
    return new Response(JSON.stringify(response), {
      status: verificationResult.success ? 200 : 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
    
  } catch (error) {
    console.error('Error verifying Turnstile token:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Failed to verify Turnstile token',
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

// Helper function to get human-readable error messages
function getTurnstileErrorMessage(errorCodes) {
  if (!errorCodes || errorCodes.length === 0) {
    return 'Unknown error';
  }
  
  const errorMessages = {
    'missing-input-secret': 'The secret parameter is missing',
    'invalid-input-secret': 'The secret parameter is invalid or malformed',
    'missing-input-response': 'The response parameter is missing',
    'invalid-input-response': 'The response parameter is invalid or malformed',
    'bad-request': 'The request is invalid or malformed',
    'timeout-or-duplicate': 'The response is no longer valid: either is too old or has been used previously',
    'internal-error': 'An internal error happened while validating the response'
  };
  
  return errorCodes.map(code => errorMessages[code] || `Unknown error: ${code}`).join(', ');
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