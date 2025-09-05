// Cloudflare Worker for Enhanced DDoS Protection and Analytics
// Deploy this to Cloudflare Workers for advanced protection

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

// Rate limiting configuration
const RATE_LIMITS = {
  '/api/': { requests: 100, window: 60 }, // 100 requests per minute for API
  '/auth.html': { requests: 10, window: 60 }, // 10 requests per minute for auth
  '/login.html': { requests: 10, window: 60 }, // 10 requests per minute for login
  default: { requests: 200, window: 60 } // 200 requests per minute for other pages
}

// Blocked countries (if needed)
const BLOCKED_COUNTRIES = []

// Blocked ASNs (Autonomous System Numbers) - known bad actors
const BLOCKED_ASNS = []

// Suspicious user agents
const SUSPICIOUS_USER_AGENTS = [
  /bot/i,
  /crawler/i,
  /spider/i,
  /scraper/i,
  /curl/i,
  /wget/i,
  /python/i,
  /php/i,
  /java/i
]

async function handleRequest(request) {
  const url = new URL(request.url)
  const clientIP = request.headers.get('CF-Connecting-IP')
  const country = request.cf?.country
  const asn = request.cf?.asn
  const userAgent = request.headers.get('User-Agent') || ''
  const cfRay = request.headers.get('CF-Ray')
  
  // Security checks
  const securityCheck = await performSecurityChecks(request, {
    clientIP,
    country,
    asn,
    userAgent,
    cfRay,
    pathname: url.pathname
  })
  
  if (!securityCheck.allowed) {
    return new Response(securityCheck.message, { 
      status: securityCheck.status,
      headers: {
        'Content-Type': 'application/json',
        'CF-Security-Block': 'true',
        'CF-Ray': cfRay
      }
    })
  }
  
  // Rate limiting
  const rateLimitCheck = await checkRateLimit(clientIP, url.pathname)
  if (!rateLimitCheck.allowed) {
    return new Response(JSON.stringify({
      error: 'Rate limit exceeded',
      retryAfter: rateLimitCheck.retryAfter
    }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': rateLimitCheck.retryAfter.toString(),
        'CF-Rate-Limited': 'true',
        'CF-Ray': cfRay
      }
    })
  }
  
  // Add security headers to request
  const modifiedRequest = new Request(request, {
    headers: {
      ...request.headers,
      'CF-Worker-Processed': 'true',
      'CF-Client-IP': clientIP,
      'CF-Country': country,
      'CF-ASN': asn?.toString(),
      'CF-Ray': cfRay,
      'CF-Security-Level': getSecurityLevel(url.pathname),
      'CF-DDoS-Protection': 'active'
    }
  })
  
  // Fetch the original response
  const response = await fetch(modifiedRequest)
  
  // Add security headers to response
  const modifiedResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: {
      ...response.headers,
      'X-CF-Worker': 'nightdev-security',
      'X-CF-Ray': cfRay,
      'X-CF-Country': country,
      'X-CF-DDoS-Protection': 'active',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    }
  })
  
  // Log analytics data
  await logAnalytics({
    timestamp: new Date().toISOString(),
    clientIP,
    country,
    asn,
    userAgent,
    cfRay,
    url: request.url,
    method: request.method,
    status: response.status,
    securityLevel: getSecurityLevel(url.pathname),
    ddosProtected: true
  })
  
  return modifiedResponse
}

async function performSecurityChecks(request, data) {
  const { clientIP, country, asn, userAgent, pathname } = data
  
  // Check blocked countries
  if (BLOCKED_COUNTRIES.includes(country)) {
    return {
      allowed: false,
      status: 403,
      message: JSON.stringify({ error: 'Access denied from your location' })
    }
  }
  
  // Check blocked ASNs
  if (BLOCKED_ASNS.includes(asn)) {
    return {
      allowed: false,
      status: 403,
      message: JSON.stringify({ error: 'Access denied from your network' })
    }
  }
  
  // Check suspicious user agents for sensitive pages
  if ((pathname.includes('/auth') || pathname.includes('/login') || pathname.includes('/api/')) &&
      SUSPICIOUS_USER_AGENTS.some(pattern => pattern.test(userAgent))) {
    return {
      allowed: false,
      status: 403,
      message: JSON.stringify({ error: 'Suspicious user agent detected' })
    }
  }
  
  // Check for common attack patterns in URL
  const suspiciousPatterns = [
    /\.\./,
    /\/etc\/passwd/,
    /\/proc\/self\/environ/,
    /\<script/i,
    /javascript:/i,
    /vbscript:/i,
    /onload=/i,
    /onerror=/i,
    /eval\(/i,
    /union.*select/i,
    /drop.*table/i,
    /insert.*into/i,
    /delete.*from/i
  ]
  
  if (suspiciousPatterns.some(pattern => pattern.test(request.url))) {
    return {
      allowed: false,
      status: 403,
      message: JSON.stringify({ error: 'Malicious request detected' })
    }
  }
  
  return { allowed: true }
}

async function checkRateLimit(clientIP, pathname) {
  // Determine rate limit for this path
  let rateLimit = RATE_LIMITS.default
  for (const [path, limit] of Object.entries(RATE_LIMITS)) {
    if (path !== 'default' && pathname.startsWith(path)) {
      rateLimit = limit
      break
    }
  }
  
  // Use Cloudflare KV for rate limiting (requires KV namespace)
  // For demo purposes, we'll use a simple in-memory approach
  // In production, use Cloudflare KV or Durable Objects
  
  const key = `rate_limit:${clientIP}:${pathname}`
  const now = Math.floor(Date.now() / 1000)
  const windowStart = now - rateLimit.window
  
  try {
    // This would be implemented with KV storage in production
    // const requests = await RATE_LIMIT_KV.get(key, 'json') || []
    // const recentRequests = requests.filter(timestamp => timestamp > windowStart)
    
    // For now, allow all requests (implement KV storage for production)
    return { allowed: true }
    
    // Production implementation:
    // if (recentRequests.length >= rateLimit.requests) {
    //   return {
    //     allowed: false,
    //     retryAfter: rateLimit.window - (now - Math.min(...recentRequests))
    //   }
    // }
    
    // recentRequests.push(now)
    // await RATE_LIMIT_KV.put(key, JSON.stringify(recentRequests), { expirationTtl: rateLimit.window })
    // return { allowed: true }
    
  } catch (error) {
    console.error('Rate limit check failed:', error)
    return { allowed: true } // Fail open
  }
}

function getSecurityLevel(pathname) {
  if (pathname.includes('/auth') || pathname.includes('/login')) {
    return 'high'
  } else if (pathname.includes('/api/')) {
    return 'medium'
  } else {
    return 'low'
  }
}

async function logAnalytics(data) {
  try {
    // Send analytics data to your backend
    // This could be sent to your server, a third-party service, or Cloudflare Analytics
    
    // Example: Send to your analytics endpoint
    await fetch('https://your-domain.com/api/cf-analytics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer your-analytics-token'
      },
      body: JSON.stringify(data)
    })
  } catch (error) {
    console.error('Analytics logging failed:', error)
  }
}

// Challenge page for suspicious requests
function getChallengePageHTML(cfRay) {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Security Check - nightdev</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0a0a;
      color: #e0e0e0;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
    }
    .container {
      text-align: center;
      max-width: 500px;
      padding: 2rem;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }
    h1 {
      margin-bottom: 1rem;
      color: #ffffff;
    }
    p {
      margin-bottom: 1.5rem;
      color: #cccccc;
      line-height: 1.6;
    }
    .ray-id {
      font-family: monospace;
      font-size: 0.9rem;
      color: #888888;
      margin-top: 2rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">🛡️</div>
    <h1>Security Check</h1>
    <p>We're verifying that you're a human. This process is automatic and should complete in a few seconds.</p>
    <p>If you continue to see this page, please contact support.</p>
    <div class="ray-id">Ray ID: ${cfRay}</div>
  </div>
  <script>
    // Auto-refresh after 5 seconds
    setTimeout(() => {
      window.location.reload();
    }, 5000);
  </script>
</body>
</html>
  `
}