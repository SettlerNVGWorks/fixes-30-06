const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'sport_predictions',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

// Test connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
  process.exit(-1);
});

// Initialize database tables
const initDatabase = async () => {
  try {
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        telegram_tag VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create predictions table (migrated from FastAPI)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS predictions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sport VARCHAR(100) NOT NULL,
        match_name VARCHAR(500) NOT NULL,
        prediction TEXT NOT NULL,
        confidence INTEGER CHECK (confidence >= 0 AND confidence <= 100),
        odds DECIMAL(5,2),
        status VARCHAR(50) DEFAULT 'pending',
        match_date DATE,
        result TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create stats table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS stats (
        id SERIAL PRIMARY KEY,
        total_predictions INTEGER DEFAULT 0,
        success_rate DECIMAL(5,2) DEFAULT 0,
        active_bettors INTEGER DEFAULT 0,
        monthly_wins INTEGER DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert initial stats if table is empty
    const statsResult = await pool.query('SELECT COUNT(*) FROM stats');
    if (parseInt(statsResult.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO stats (total_predictions, success_rate, active_bettors, monthly_wins)
        VALUES (1247, 78.5, 5892, 342)
      `);
    }

    console.log('✅ Database tables initialized successfully');
  } catch (err) {
    console.error('❌ Error initializing database:', err);
    throw err;
  }
};

module.exports = {
  pool,
  initDatabase
};