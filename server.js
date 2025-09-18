const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Set Content Security Policy
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "connect-src 'self' https://math.cinevez.lol https://*.cloudflare.com https://*.pages.dev https://api.ipgeolocation.io https://ipapi.co https://ip-api.com https://*.google-analytics.com https://*.groq.com https://api.ipify.org https://api.ip.sb https://open.spotify.com https://*.spotify.com; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com https://*.google-analytics.com; " +
    "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; " +
    "img-src 'self' data: https:; " +
    "font-src 'self' https://cdnjs.cloudflare.com; " +
    "frame-src 'self' https:; " +
    "object-src 'none';"
  );
  next();
});

app.use(express.static('.'));

// Start the server
async function startServer() {
  try {
    await app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Only start the server if this file is run directly (not required)
if (require.main === module) {
  startServer().catch(console.error);
}

module.exports = app;