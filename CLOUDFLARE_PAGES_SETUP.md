# Cloudflare Pages Setup Guide

This guide explains how to deploy your site to Cloudflare Pages with full server functionality including IP tracking and analytics APIs.

## 🚀 Quick Setup

### 1. Create KV Namespace

First, create a KV namespace for storing analytics data:

```bash
# Install Wrangler CLI if you haven't already
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Create KV namespace for production
wrangler kv:namespace create "ANALYTICS_KV"

# Create KV namespace for preview
wrangler kv:namespace create "ANALYTICS_KV" --preview
```

### 2. Update wrangler.toml

Replace the placeholder KV namespace IDs in `wrangler.toml` with the actual IDs from step 1:

```toml
[[kv_namespaces]]
binding = "ANALYTICS_KV"
id = "your-actual-kv-namespace-id"
preview_id = "your-actual-preview-kv-namespace-id"
```

### 3. Deploy to Cloudflare Pages

```bash
# Deploy to Cloudflare Pages
wrangler pages deploy . --project-name nightdev

# Or if you want to deploy to a specific environment
wrangler pages deploy . --project-name nightdev --env production
```

## 🔧 Configuration

### Environment Variables

Set these in your Cloudflare Pages dashboard or via wrangler:

- `ANALYTICS_ENABLED`: Set to "true" to enable analytics
- `TURNSTILE_SECRET_KEY`: Your Cloudflare Turnstile secret key

### Turnstile Setup

1. Go to Cloudflare Dashboard > Turnstile
2. Create a new site
3. Get your site key and secret key
4. Update the secret key in `wrangler.toml` and your HTML

## 📊 API Endpoints

Once deployed, your site will have these API endpoints available:

### Analytics Endpoints
- `GET /api/analytics/summary` - Get analytics summary
- `GET /api/analytics/detailed` - Get detailed analytics data
- `POST /api/track` - Track page visits and events
- `POST /api/cf-track` - Cloudflare-specific tracking

### Security Endpoints
- `POST /api/verify-turnstile` - Verify Turnstile tokens

## 🏗️ How It Works

### Local Development (http://localhost:3000)
- Uses Express.js server (`server.js`)
- Stores data in `analytics-data.json` file
- Full Node.js functionality

### Cloudflare Pages (https://nightdev.pages.dev)
- Uses Cloudflare Functions (`functions/api/*.js`)
- Stores data in Cloudflare KV
- Enhanced with Cloudflare-specific features:
  - Real visitor IP addresses
  - Geographic data from Cloudflare edge
  - DDoS protection status
  - Turnstile verification
  - Enhanced security headers

### Smart Detection
The `cloudflare-analytics.js` automatically detects the environment:
- Checks for Cloudflare-specific indicators
- Uses appropriate API endpoints
- Collects enhanced data when on Cloudflare

## 🔍 Data Storage

### Local (Development)
```
analytics-data.json
├── totalStats
├── dailyStats
├── ipData
├── browserData
└── sessions
```

### Cloudflare Pages (Production)
```
Cloudflare KV Store
├── session:* (individual sessions)
├── daily:* (daily statistics)
├── total:stats (total statistics)
├── cf-event:* (Cloudflare events)
├── ddos:* (DDoS events)
├── turnstile:* (Turnstile verifications)
└── counter:* (event counters)
```

## 🛡️ Security Features

### Enhanced IP Tracking
- Real visitor IPs (not proxy IPs)
- Geographic location data
- ISP and organization info
- Connection type detection

### DDoS Protection
- Automatic detection of DDoS protection status
- Tracking of protection events
- Integration with Cloudflare security features

### Turnstile Integration
- Bot protection
- Verification tracking
- Challenge completion analytics

## 📈 Analytics Features

### Visitor Tracking
- Unique visitor identification
- Session tracking
- Page view analytics
- Time on site measurement

### Geographic Analytics
- Country-level tracking
- City and region data
- Timezone detection
- Connection quality metrics

### Browser Analytics
- Browser type and version
- Operating system detection
- Screen resolution tracking
- Device capabilities

### Performance Metrics
- Page load times
- First paint metrics
- DNS and connection timing
- WebGL capabilities

## 🚨 Troubleshooting

### Common Issues

1. **KV Namespace Not Found**
   - Make sure you've created the KV namespace
   - Update the IDs in `wrangler.toml`
   - Redeploy after updating configuration

2. **Analytics Not Working**
   - Check browser console for errors
   - Verify API endpoints are responding
   - Check Cloudflare Functions logs

3. **Turnstile Verification Failing**
   - Verify secret key is correct
   - Check site key in HTML
   - Ensure domain matches Turnstile configuration

### Debug Mode

Add `?debug=true` to your URL to enable debug logging in the browser console.

## 📝 Monitoring

### Cloudflare Dashboard
- Monitor function invocations
- Check error rates
- View KV storage usage

### Analytics Dashboard
- Visit `/debug.html` for analytics dashboard
- View real-time visitor data
- Monitor security events

## 🔄 Updates

To update your deployment:

```bash
# Pull latest changes
git pull

# Deploy updates
wrangler pages deploy . --project-name nightdev
```

## 📞 Support

If you encounter issues:
1. Check the browser console for errors
2. Review Cloudflare Functions logs
3. Verify KV namespace configuration
4. Test API endpoints directly

Your site will now have full server functionality when deployed to Cloudflare Pages at https://nightdev.pages.dev!