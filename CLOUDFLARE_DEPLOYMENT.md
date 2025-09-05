# Cloudflare Pages Deployment Guide for nightdev

This guide explains how to deploy nightdev to Cloudflare Pages with enhanced DDoS protection and analytics.

## Prerequisites

1. Cloudflare account
2. Domain configured with Cloudflare DNS
3. GitHub repository with your nightdev code

## Step 1: Cloudflare Pages Setup

1. **Connect Repository**
   - Go to Cloudflare Dashboard → Pages
   - Click "Create a project"
   - Connect your GitHub repository
   - Select the nightdev repository

2. **Build Configuration**
   ```
   Build command: npm run build (if using build process)
   Build output directory: / (root directory)
   Root directory: / (root directory)
   ```

3. **Environment Variables**
   Set these in Pages → Settings → Environment variables:
   ```
   TURNSTILE_SECRET_KEY=0x4AAAAAAByuMp3amBtzLFTqD_00DbRzj0o
   ANALYTICS_ENABLED=true
   DDOS_PROTECTION=high
   SECURITY_LEVEL=high
   ```

## Step 2: Cloudflare Turnstile Setup

1. **Get Turnstile Keys**
   - Go to Cloudflare Dashboard → Turnstile
   - Create a new site
   - Copy Site Key: `0x4AAAAAAByuMh7yznUYie-D`
   - Copy Secret Key: `0x4AAAAAAByuMp3amBtzLFTqD_00DbRzj0o`

2. **Configure Domains**
   - Add your domain(s) to Turnstile site configuration
   - Enable for both production and development domains

## Step 3: DDoS Protection Configuration

1. **Security Settings**
   - Go to Security → Settings
   - Set Security Level to "High" or "I'm Under Attack"
   - Enable Browser Integrity Check
   - Enable Hotlink Protection

2. **Firewall Rules**
   Create these firewall rules in Security → WAF:
   
   ```
   Rule 1: Block known bad bots
   Expression: (cf.client.bot) and not (cf.verified_bot_category in {"Search Engine" "Social Media"})
   Action: Block
   
   Rule 2: Rate limit auth pages
   Expression: (http.request.uri.path contains "/auth" or http.request.uri.path contains "/login")
   Action: Rate Limit (10 requests per minute)
   
   Rule 3: Block suspicious patterns
   Expression: (http.request.uri.query contains "union select" or http.request.uri.query contains "../" or http.request.uri.query contains "<script")
   Action: Block
   ```

3. **Page Rules**
   Create these page rules in Rules → Page Rules:
   
   ```
   Rule 1: */auth.html
   Settings: Security Level = I'm Under Attack, Cache Level = Bypass
   
   Rule 2: */login.html  
   Settings: Security Level = High, Cache Level = Bypass
   
   Rule 3: */api/*
   Settings: Security Level = High, Cache Level = Bypass
   ```

## Step 4: Analytics Configuration

1. **Web Analytics**
   - Go to Analytics → Web Analytics
   - Enable Cloudflare Web Analytics
   - Add the beacon to your pages (already included in cloudflare-analytics.js)

2. **Custom Analytics**
   - The enhanced analytics are handled by `/api/cf-track` endpoint
   - Data includes Cloudflare-specific headers and DDoS protection status
   - Analytics data is stored with enhanced IP geolocation

## Step 5: Worker Deployment (Optional)

1. **Deploy Security Worker**
   - Go to Workers → Manage Workers
   - Create new Worker
   - Copy content from `cloudflare-worker.js`
   - Deploy to your domain

2. **Worker Routes**
   Add these routes in Workers → Add route:
   ```
   your-domain.com/api/*
   your-domain.com/auth.html
   your-domain.com/login.html
   ```

## Step 6: DNS Configuration

1. **A Records**
   ```
   Type: A
   Name: @
   Content: [Cloudflare Pages IP]
   Proxy: Enabled (Orange Cloud)
   ```

2. **CNAME Records**
   ```
   Type: CNAME
   Name: www
   Content: your-domain.com
   Proxy: Enabled (Orange Cloud)
   ```

## Step 7: SSL/TLS Configuration

1. **SSL/TLS Settings**
   - Go to SSL/TLS → Overview
   - Set encryption mode to "Full (strict)"
   - Enable "Always Use HTTPS"

2. **Edge Certificates**
   - Enable "HTTP Strict Transport Security (HSTS)"
   - Set Max Age to 12 months
   - Enable "Include subdomains"
   - Enable "Preload"

## Step 8: Performance Optimization

1. **Caching**
   - Go to Caching → Configuration
   - Set Browser Cache TTL to "1 year"
   - Enable "Always Online"

2. **Speed Optimization**
   - Go to Speed → Optimization
   - Enable "Auto Minify" for HTML, CSS, JS
   - Enable "Brotli" compression
   - Enable "Early Hints"

## Step 9: Monitoring and Alerts

1. **Security Events**
   - Go to Security → Events
   - Monitor blocked requests and threats
   - Set up notifications for security events

2. **Analytics Monitoring**
   - Monitor `/api/analytics/summary` endpoint
   - Set up alerts for unusual traffic patterns
   - Track DDoS protection effectiveness

## File Structure

Ensure these files are in your repository root:

```
nightdev/
├── _headers                 # Cloudflare Pages headers config
├── _redirects              # Cloudflare Pages redirects config
├── cloudflare-worker.js    # Optional Worker script
├── cloudflare-analytics.js # Enhanced analytics
├── auth.html              # Secure authentication page
├── login.html             # Login page with Turnstile
├── server.js              # Backend with Cloudflare support
└── CLOUDFLARE_DEPLOYMENT.md # This guide
```

## Testing DDoS Protection

1. **Test Rate Limiting**
   ```bash
   # Test auth page rate limiting
   for i in {1..15}; do curl -I https://your-domain.com/auth.html; done
   ```

2. **Test Security Rules**
   ```bash
   # Test malicious pattern blocking
   curl "https://your-domain.com/?test=<script>alert('xss')</script>"
   ```

3. **Test Turnstile**
   - Visit auth.html or login.html
   - Complete Turnstile challenge
   - Verify server-side validation works

## Monitoring Commands

```bash
# Check Cloudflare headers
curl -I https://your-domain.com/

# Test API endpoints
curl -X POST https://your-domain.com/api/verify-turnstile \
  -H "Content-Type: application/json" \
  -d '{"token":"test-token"}'

# Check analytics
curl https://your-domain.com/api/analytics/summary
```

## Security Best Practices

1. **Regular Updates**
   - Update Turnstile keys regularly
   - Monitor security events daily
   - Review firewall rules monthly

2. **Backup Strategy**
   - Export analytics data regularly
   - Backup Cloudflare configuration
   - Keep deployment scripts updated

3. **Incident Response**
   - Have DDoS response plan ready
   - Monitor for false positives
   - Keep emergency contacts updated

## Troubleshooting

### Common Issues

1. **Turnstile Not Loading**
   - Check site key configuration
   - Verify domain whitelist
   - Check CSP headers

2. **Rate Limiting Too Aggressive**
   - Adjust firewall rules
   - Check Page Rules configuration
   - Monitor false positives

3. **Analytics Not Working**
   - Verify API endpoints
   - Check CORS configuration
   - Monitor server logs

### Support Resources

- Cloudflare Community: https://community.cloudflare.com/
- Turnstile Documentation: https://developers.cloudflare.com/turnstile/
- Pages Documentation: https://developers.cloudflare.com/pages/

## Performance Metrics

After deployment, monitor these metrics:

- **DDoS Attacks Blocked**: Security → Events
- **Page Load Times**: Speed → Performance
- **Uptime**: Analytics → Reliability
- **Cache Hit Ratio**: Caching → Analytics
- **Bandwidth Usage**: Analytics → Traffic

## Cost Optimization

- Use Cloudflare's free tier for basic protection
- Monitor bandwidth usage to avoid overages
- Optimize images and assets for better caching
- Use Workers sparingly to stay within limits

This deployment provides enterprise-level DDoS protection and analytics for your nightdev proxy service while maintaining optimal performance and security.