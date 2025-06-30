const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Проксируем ТОЛЬКО /api/* запросы на backend
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:8001',
      changeOrigin: true,
      secure: false,
      logLevel: 'info',
      onError: (err, req, res) => {
        console.error('❌ API Proxy error:', err.message);
        res.status(500).json({ 
          error: 'Backend connection failed', 
          message: err.message 
        });
      },
      onProxyReq: (proxyReq, req, res) => {
        console.log('🔄 Proxying to backend:', req.method, req.url);
      },
      onProxyRes: (proxyRes, req, res) => {
        console.log('✅ Backend response:', proxyRes.statusCode, req.url);
      }
    })
  );
};