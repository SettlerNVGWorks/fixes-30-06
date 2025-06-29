const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { initDatabase } = require('./database_mongo');
const authRoutes = require('./routes/auth_mongo');
const apiRoutes = require('./routes/api_mongo');
const telegramRoutes = require('./routes/telegram_webhook');
const Scheduler = require('./services/scheduler');

const app = express();
const PORT = process.env.PORT || 8001;

// Rate limiting - более мягкие ограничения для разработки
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // увеличенный лимит для разработки
  message: 'Too many requests from this IP, please try again later.'
});

// Middleware
app.set('trust proxy', 1); // Trust first proxy
app.use(helmet({
  crossOriginEmbedderPolicy: false // Отключаем для локальной разработки
}));
app.use(limiter);

// CORS Configuration - ОБНОВЛЕНО ДЛЯ ЛОКАЛЬНОЙ РАБОТЫ
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    process.env.FRONTEND_URL || 'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Добавляем логирование для отладки
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Sport Predictions API - Node.js LOCAL',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: 'LOCAL_DEVELOPMENT'
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: 'mongodb://localhost:27017/sport_predictions',
    cors_enabled: true
  });
});

// Auth routes
app.use('/api/auth', authRoutes);

// API routes (with /api prefix for consistency)
app.use('/api', apiRoutes);

// Telegram webhook routes
app.use('/api/telegram', telegramRoutes);

// Initialize scheduler
let scheduler;

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Initialize database and start server
const startServer = async () => {
  try {
    console.log('🔄 Initializing database connection...');
    await initDatabase();
    console.log('✅ Database connected successfully');
    
    // Initialize scheduler for daily match updates
    scheduler = new Scheduler();
    console.log('⏰ Scheduler инициализирован для ежедневного обновления матчей');
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log('\n🚀 =================================');
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔧 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
      console.log(`🗄️  Database: ${process.env.MONGO_URL}`);
      console.log(`📅 Матчи обновляются каждый день в 12:00 МСК`);
      console.log('🚀 =================================\n');
      
      // Показываем доступные endpoints
      console.log('📋 Available API endpoints:');
      console.log(`   GET  http://localhost:${PORT}/api/health`);
      console.log(`   GET  http://localhost:${PORT}/api/stats`);
      console.log(`   GET  http://localhost:${PORT}/api/matches/today`);
      console.log(`   POST http://localhost:${PORT}/api/auth/register`);
      console.log(`   POST http://localhost:${PORT}/api/auth/login`);
      console.log('');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    console.error('❌ Make sure MongoDB is running on localhost:27017');
    process.exit(1);
  }
};

startServer();

module.exports = app;