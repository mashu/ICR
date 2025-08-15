const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Simple HTTPS server for testing speech recognition
const distPath = path.join(__dirname, 'dist');

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml'
};

function serveFile(res, filePath) {
  const extname = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404);
        res.end('File not found');
      } else {
        res.writeHead(500);
        res.end('Server error: ' + error.code);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
}

const requestHandler = (req, res) => {
  let filePath = path.join(distPath, req.url === '/' ? 'index.html' : req.url);
  serveFile(res, filePath);
};

// Try HTTPS first, fall back to HTTP
try {
  // Generate self-signed certificate if it doesn't exist
  if (!fs.existsSync('cert.pem') || !fs.existsSync('key.pem')) {
    console.log('Generating self-signed certificate...');
    const { execSync } = require('child_process');
    execSync('openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365 -nodes -subj "/CN=localhost"', { stdio: 'ignore' });
  }

  const options = {
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem')
  };

  const httpsServer = https.createServer(options, requestHandler);
  httpsServer.listen(8443, () => {
    console.log('HTTPS Server running at https://localhost:8443/');
    console.log('Note: Accept the self-signed certificate warning in your browser');
  });
} catch (error) {
  console.log('HTTPS not available, starting HTTP server...');
  const httpServer = http.createServer(requestHandler);
  httpServer.listen(8000, () => {
    console.log('HTTP Server running at http://localhost:8000/');
    console.log('Warning: Speech recognition may not work reliably over HTTP');
  });
}
