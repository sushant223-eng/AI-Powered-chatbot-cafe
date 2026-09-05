require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.env.PORT || 3000;

const n8nWebhook = process.env.N8N_WEBHOOK_URL;

const root = __dirname;

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};


/**
 * Send response
 */
function respond(res, status, body, contentType = 'application/json; charset=utf-8') {
  res.writeHead(status, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store'
  });

  // File data (HTML, CSS, JS)
  if (Buffer.isBuffer(body)) {
    res.end(body);
    return;
  }

  // Normal text
  if (typeof body === 'string') {
    res.end(body);
    return;
  }

  // JSON data
  res.end(JSON.stringify(body));
}


/**
 * Serve HTML, CSS and JavaScript files
 */
function serveFile(req, res) {
  const requestPath =
    req.url === '/'
      ? '/index.html'
      : decodeURIComponent(req.url.split('?')[0]);

  const filePath = path.resolve(root, `.${requestPath}`);

  // Security check
  if (
    !filePath.startsWith(root) ||
    !fs.existsSync(filePath) ||
    fs.statSync(filePath).isDirectory()
  ) {
    return respond(
      res,
      404,
      'Not found',
      'text/plain; charset=utf-8'
    );
  }

  const extension = path.extname(filePath);

  fs.readFile(filePath, (error, data) => {
    if (error) {
      console.error('File error:', error);

      return respond(
        res,
        500,
        'Could not load this file.',
        'text/plain; charset=utf-8'
      );
    }

    return respond(
      res,
      200,
      data,
      types[extension] || 'application/octet-stream'
    );
  });
}


/**
 * Receive chat message from website
 * and forward it to n8n
 */
async function forwardChat(req, res) {
  let body = '';

  req.on('data', (chunk) => {
    body += chunk;

    // Prevent very large requests
    if (body.length > 100000) {
      req.destroy();
    }
  });


  req.on('end', async () => {
    try {
      // Parse website data
      const payload = JSON.parse(body || '{}');


      // Validate message
      if (
        typeof payload.message !== 'string' ||
        !payload.message.trim()
      ) {
        return respond(res, 400, {
          message: 'Please write a message first.'
        });
      }


      console.log(
        'Message received:',
        payload.message
      );


      // Send message to n8n
      const response = await fetch(n8nWebhook, {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },

        body: JSON.stringify({
          message: payload.message,
          source: payload.source || 'website',
          timestamp: payload.timestamp || new Date().toISOString()
        }),

        signal: AbortSignal.timeout(30000)
      });


      // Get response from n8n
      const responseText = await response.text();

      let result;

      try {
        result = JSON.parse(responseText);
      } catch {
        result = {
          reply: responseText
        };
      }


      console.log(
        'n8n response:',
        result
      );


      // Send n8n response back to website
      return respond(
        res,
        response.status,
        result
      );

    } catch (error) {

      console.error(
        'n8n webhook request failed:',
        error.message
      );


      return respond(res, 502, {
        message:
          'The cafe assistant is temporarily unavailable. Please try again shortly.'
      });
    }
  });
}


/**
 * Create HTTP server
 */
const server = http.createServer((req, res) => {

  console.log(
    `${req.method} ${req.url}`
  );


  // Chat API
  if (
    req.method === 'POST' &&
    req.url === '/api/chat'
  ) {
    return forwardChat(req, res);
  }


  // Website files
  if (
    req.method === 'GET' ||
    req.method === 'HEAD'
  ) {
    return serveFile(req, res);
  }


  // Other methods
  return respond(res, 405, {
    message: 'Method not allowed'
  });

});


/**
 * Start server
 */
server.listen(port, () => {

  console.log('-----------------------------------');
  console.log('Morrow & Mint server is running!');
  console.log(`http://localhost:${port}`);
  console.log('-----------------------------------');

});
