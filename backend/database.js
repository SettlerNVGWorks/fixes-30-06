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

    // Create matches table for today's matches
    await pool.query(`
      CREATE TABLE IF NOT EXISTS matches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sport VARCHAR(100) NOT NULL,
        team1 VARCHAR(255) NOT NULL,
        team2 VARCHAR(255) NOT NULL,
        match_time TIMESTAMP NOT NULL,
        odds_team1 DECIMAL(5,2),
        odds_team2 DECIMAL(5,2),
        odds_draw DECIMAL(5,2),
        analysis TEXT,
        source VARCHAR(255),
        status VARCHAR(50) DEFAULT 'scheduled',
        match_date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create match analyses pool
    await pool.query(`
      CREATE TABLE IF NOT EXISTS match_analyses (
        id SERIAL PRIMARY KEY,
        analysis_text TEXT NOT NULL,
        sport VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

    // Insert sample analyses if table is empty
    const analysesResult = await pool.query('SELECT COUNT(*) FROM match_analyses');
    if (parseInt(analysesResult.rows[0].count) === 0) {
      const sampleAnalyses = [
        'Команда в отличной форме, последние 5 матчей показали стабильную игру в обороне. Рекомендуем ставку на победу.',
        'Статистика личных встреч говорит в пользу первой команды. В последних 10 играх между собой соотношение побед 7:3.',
        'Ключевые игроки команды находятся в прекрасной физической форме. Мотивация на максимуме перед важным матчем.',
        'Анализ тактических схем показывает преимущество в средней линии. Ожидаем контролируемую игру и результативность.',
        'Домашнее поле даёт серьёзное преимущество. Команда не проигрывала дома уже 8 матчей подряд.',
        'Травмы ключевых игроков в составе соперника существенно ослабляют их шансы. Видим отличную ценность в коэффициентах.',
        'Турнирная мотивация играет решающую роль. Команде необходимы очки для достижения цели сезона.',
        'Погодные условия и покрытие поля благоприятствуют стилю игры фаворита. Техническое преимущество очевидно.',
        'Психологический фактор на стороне команды после последней крупной победы. Уверенность и командный дух на пике.',
        'Глубокий анализ статистики ударов, передач и владения мячом показывает явного фаворита этого противостояния.'
      ];

      for (let analysis of sampleAnalyses) {
        await pool.query(
          'INSERT INTO match_analyses (analysis_text) VALUES ($1)',
          [analysis]
        );
      }
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