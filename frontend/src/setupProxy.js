const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Прокси только для API запросов, НЕ для статических файлов
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:8001',
      changeOrigin: true,
      secure: false,
      logLevel: 'info',
      // Фильтруем только API запросы
      pathRewrite: {
        // Убираем дублирование /api если оно есть
      },
      onError: (err, req, res) => {
        console.error('❌ API Proxy error:', err.message);
        console.error('   Request:', req.method, req.url);
        res.status(500).json({ 
          error: 'Backend connection failed', 
          message: 'Could not connect to backend server on localhost:8001',
          details: err.message
        });
      },
      onProxyReq: (proxyReq, req, res) => {
        console.log('🔄 Proxying API request:', req.method, req.url, '-> http://localhost:8001' + req.url);
      },
      onProxyRes: (proxyRes, req, res) => {
        console.log('✅ API Proxy response:', req.method, req.url, '- Status:', proxyRes.statusCode);
      }
    })
  );
};