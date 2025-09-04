# NightDev Analytics Server

This server provides real-time IP tracking and analytics for the NightDev website.

## Features

- **Server-side IP tracking** - Gets real IP addresses and geolocation data
- **Multiple IP services** - Uses multiple APIs for reliability (ip-api.com, ipapi.co, ipgeolocation.io)
- **Detailed analytics** - Tracks page views, unique visitors, browser data, and more
- **Data persistence** - Stores analytics data in JSON files
- **RESTful API** - Provides endpoints for analytics data
- **Fallback support** - Falls back to client-side tracking if server is unavailable

## Quick Start

### Option 1: Using the Batch File (Windows)
1. Double-click `start-server.bat`
2. The script will automatically install dependencies and start the server

### Option 2: Manual Setup
1. Install Node.js from https://nodejs.org/
2. Open terminal/command prompt in the project directory
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the server:
   ```bash
   npm start
   ```

## Server Endpoints

- **Website**: `http://localhost:3000` - Serves the main website
- **Track API**: `POST /api/track` - Records visitor data
- **Analytics Summary**: `GET /api/analytics/summary` - Get analytics overview
- **Detailed Analytics**: `GET /api/analytics/detailed` - Get full analytics data

## How It Works

1. **Client visits website** → Analytics script loads
2. **Script sends data** → POST request to `/api/track` with browser info
3. **Server processes** → Gets real IP, geolocation, and stores data
4. **Data stored** → Saved to `analytics-data.json` file
5. **Dashboard access** → Analytics available via API endpoints

## Data Collected

### IP & Location Data
- Real IP address (server-side detection)
- City, region, country
- ISP and organization
- Timezone and coordinates
- ASN information

### Browser & Device Data
- User agent and browser type
- Operating system
- Screen resolution
- Language preferences
- Connection type

### Page Analytics
- Page views and unique visitors
- Time on site
- Referrer information
- Popular pages

## File Structure

```
nightdev/
├── server.js              # Main server file
├── package.json           # Dependencies
├── analytics.js           # Updated client-side script
├── analytics-data.json    # Analytics data (auto-created)
├── start-server.bat       # Windows startup script
└── README-SERVER.md       # This file
```

## Configuration

The server runs on port 3000 by default. You can change this by setting the `PORT` environment variable:

```bash
PORT=8080 npm start
```

## Data Storage

Analytics data is stored in `analytics-data.json` with the following structure:

```json
{
  "totalStats": {
    "pageViews": 0,
    "uniqueVisitors": [],
    "firstVisit": "2024-01-01T00:00:00.000Z"
  },
  "dailyStats": {},
  "ipData": [],
  "browserData": [],
  "sessions": []
}
```

## Security Notes

- The server automatically detects real IP addresses behind proxies
- Data is stored locally in JSON files
- No external database required
- Analytics data includes detailed visitor information

## Troubleshooting

### Server won't start
- Make sure Node.js is installed
- Check if port 3000 is available
- Run `npm install` to install dependencies

### IP tracking not working
- Check if the server is running
- Verify the client can reach `/api/track`
- Check browser console for errors

### Analytics not updating
- Ensure `analytics-data.json` is writable
- Check server logs for errors
- Verify client-side script is loading

## Development

To run in development mode with auto-restart:

```bash
npm run dev
```

This uses nodemon to automatically restart the server when files change.

## Production Deployment

For production deployment:

1. Set `NODE_ENV=production`
2. Use a process manager like PM2
3. Set up reverse proxy (nginx/Apache)
4. Configure proper logging
5. Set up SSL/HTTPS

## API Examples

### Track a visit
```javascript
fetch('/api/track', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionId: 'unique-session-id',
    browserData: { /* browser info */ },
    pageData: { /* page info */ }
  })
});
```

### Get analytics summary
```javascript
fetch('/api/analytics/summary')
  .then(response => response.json())
  .then(data => console.log(data));
```

## License

MIT License - See main project for details.