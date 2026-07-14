const { getDefaultConfig } = require('expo/metro-config');
const http = require('http');

const config = getDefaultConfig(__dirname);

/**
 * Proxy /api-server/* requests to the API server at port 8080.
 * This must run BEFORE Expo's own CorsMiddleware, which is why we use
 * enhanceMiddleware — our handler intercepts matching requests and never
 * calls the inner middleware stack for them.
 */
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      if (req.url && req.url.startsWith('/api-server')) {
        // Strip /api-server prefix and forward to Express on port 8080
        const target = req.url.replace(/^\/api-server/, '');
        const options = {
          hostname: 'localhost',
          port: 8080,
          path: target || '/',
          method: req.method,
          headers: {
            ...req.headers,
            host: 'localhost:8080',
          },
        };

        const proxyReq = http.request(options, (proxyRes) => {
          res.writeHead(proxyRes.statusCode, proxyRes.headers);
          proxyRes.pipe(res, { end: true });
        });

        proxyReq.on('error', (err) => {
          console.error('[Metro proxy] API server error:', err.message);
          res.writeHead(502);
          res.end(JSON.stringify({ error: 'API server unreachable' }));
        });

        req.pipe(proxyReq, { end: true });
        return;
      }

      // All other requests go through the normal Expo middleware stack
      middleware(req, res, next);
    };
  },
};

module.exports = config;
