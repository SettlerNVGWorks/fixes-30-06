const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Проксируем ТОЛЬКО /api/* запросы на backend
  // НЕ трогаем статические файлы (/static/*, /, /favicon.ico, etc.)
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:8001',
      changeOrigin: true,
      secure: false,
      logLevel: 'warn', // Уменьшаем логирование
      // Фильтр: проксируем только запросы начинающиеся с /api
      filter: function (pathname, req) {
        return pathname.startsWith('/api');
      },
      onError: (err, req, res) => {
        console.error('❌ API Proxy error:', err.message);
        console.error('   Request URL:', req.url);
        res.status(500).json({ 
          error: 'Backend connection failed', 
          message: 'Could not connect to backend server on localhost:8001',
          details: err.message,
          url: req.url
        });
      },
      onProxyReq: (proxyReq, req, res) => {
        console.log('🔄 API Proxy:', req.method, req.url);
      }
    })
  );
};