const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Прокси для всех API запросов
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:8001',
      changeOrigin: true,
      secure: false,
      logLevel: 'info',
      onError: (err, req, res) => {
        console.error('❌ Proxy error:', err.message);
        console.error('   Request:', req.method, req.url);
        console.error('   Target: http://localhost:8001');
        res.status(500).json({ 
          error: 'Backend connection failed', 
          message: 'Could not connect to backend server',
          details: err.message,
          target: 'http://localhost:8001'
        });
      },
      onProxyReq: (proxyReq, req, res) => {
        console.log('🔄 Proxying API request:', req.method, req.url, '-> http://localhost:8001' + req.url);
      },
      onProxyRes: (proxyRes, req, res) => {
        console.log('✅ Proxy response:', req.method, req.url, '- Status:', proxyRes.statusCode);
      }
    })
  );
};