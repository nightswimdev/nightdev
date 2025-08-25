const express = require('express');
const { createBareServer } = require('@tomphttp/bare-server-node');
const { createServer } = require('node:http');
const { join } = require('node:path');

const app = express();
const server = createServer();

// Create bare server
const bare = createBareServer('/bare/');

// Serve static files
app.use(express.static(join(__dirname)));

// Handle bare server requests
server.on('request', (req, res) => {
  if (bare.shouldRoute(req)) {
    bare.routeRequest(req, res);
  } else {
    app(req, res);
  }
});

server.on('upgrade', (req, socket, head) => {
  if (bare.shouldRoute(req)) {
    bare.routeUpgrade(req, socket, head);
  } else {
    socket.end();
  }
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Bare server available at http://localhost:${PORT}/bare/`);
});