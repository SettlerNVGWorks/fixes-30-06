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

// Enhanced sport-specific analyses
const sportAnalyses = {
  football: [
    'Домашняя команда демонстрирует феноменальную статистику дома - 12 побед в 15 последних матчах. Сила домашних стен очевидна.',
    'Анализ xG (ожидаемых голов) показывает значительное превосходство первой команды в создании голевых моментов.',
    'Ключевой нападающий команды набрал отличную форму - 8 голов в последних 6 матчах. Рекомендуем ставку на его результативность.',
    'Тактическая схема 4-3-3 идеально подходит против обороны соперника. Ожидаем доминирование в средней линии.',
    'Статистика личных встреч впечатляет: 7 побед из 10 последних матчей. Психологическое преимущество налицо.',
    'Травма ключевого защитника соперника открывает уязвимости в обороне. Видим отличную ценность в атакующих ставках.',
    'Команда показывает невероятную стабильность в обороне - всего 3 пропущенных гола в последних 8 матчах.',
    'Мотивация максимальная: команде нужны очки для выхода в еврокубки. Ожидаем самоотдачу на 200%.',
    'Погодные условия (дождь) благоприятствуют силовому стилю игры фаворита. Техническое преимущество сохраняется.',
    'Глубина скамейки запасных позволяет ротировать состав без потери качества. Свежесть игроков - решающий фактор.'
  ],
  hockey: [
    'Команда демонстрирует потрясающую игру в большинстве - 78% реализации в последних 10 матчах. Дисциплина соперника под вопросом.',
    'Вратарь находится в феноменальной форме: 94.2% отражённых бросков за последние 5 игр. Крепость ворот обеспечена.',
    'Первое звено показывает невероятную результативность - 15 очков в последних 4 матчах. Химия на льду очевидна.',
    'Физическая подготовка команды позволяет доминировать в третьем периоде. 60% голов забивается в финальной трети.',
    'Тренерская схема с активным форчекингом идеально работает против стиля игры соперника.',
    'Домашний лёд даёт решающее преимущество - команда не проигрывала дома уже 12 матчей подряд.',
    'Статистика бросков в створ впечатляет: 38 бросков в среднем за матч против 24 у соперника.',
    'Молодые игроки набирают невероятный темп - 3 новичка уже набрали по 20+ очков за сезон.',
    'Опыт в плей-офф играет решающую роль. Команда знает, как выигрывать важные матчи под давлением.',
    'Травмы ключевых игроков соперника серьёзно ослабляют их шансы. Глубина состава не позволяет полноценно заменить.'
  ],
  baseball: [
    'Стартовый питчер демонстрирует выдающуюся статистику: ERA 2.15 в последних 8 играх. Контроль подачи безупречен.',
    'Команда сильна против левосторонних питчеров - batting average .312 в текущем сезоне.',
    'Домашнее поле даёт серьёзные преимущества: особенности ветра и размеры поля играют в пользу хозяев.',
    'Буллпен команды показывает стабильность - только 2 провала в последних 15 матчах.',
    'Статистика с бегунами в скоринговой позиции впечатляет: 67% успешных ситуаций.',
    'Команда традиционно сильна в дневных играх - 18 побед в 24 дневных матчах сезона.',
    'Психологический фактор: команда выиграла 8 из последних 10 встреч с этим соперником.',
    'Менеджер принимает правильные тактические решения в критических моментах игры.',
    'Глубина ротации питчеров позволяет не зависеть от одного игрока. Стабильность обеспечена.',
    'Мотивация на пике: команда борется за wild card место в плей-офф.'
  ],
  esports: [
    'Map pool команды идеально подходит под формат турнира. Doминирование на 4 из 7 карт очевидно.',
    'Синхронизация действий команды достигла пика - только 2 ошибки в коммуникации за последние 5 матчей.',
    'AWP-ер команды показывает феноменальную точность: 78% попаданий в голову в решающих раундах.',
    'Тактическая подготовка на высочайшем уровне: 15 новых стратегий отработано за последний месяц.',
    'Опыт в клатчевых ситуациях неоценим - команда выигрывает 73% раундов при численном меньшинстве.',
    'Ментальная устойчивость игроков проверена в крупных турнирах. Давление не сломает команду.',
    'Индивидуальное мастерство каждого игрока превосходит средний уровень соперника на 15-20%.',
    'Адаптивность команды позволяет быстро перестраиваться под стиль игры противника.',
    'Физическая форма игроков оптимальна: полноценный сон и тренировки дают преимущество в концентрации.',
    'Аналитическая работа тренерского штаба выявила слабые места в игре соперника.'
  ]
};

// Initialize enhanced database with sport-specific analyses
const initEnhancedDatabase = async () => {
  try {
    // Create enhanced matches table with additional fields
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
        prediction TEXT,
        confidence_level INTEGER CHECK (confidence_level >= 0 AND confidence_level <= 100),
        source VARCHAR(255),
        odds_source VARCHAR(255),
        status VARCHAR(50) DEFAULT 'scheduled',
        match_date DATE NOT NULL,
        competition VARCHAR(255),
        venue VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create enhanced match_analyses table with sport categories
    await pool.query(`
      CREATE TABLE IF NOT EXISTS match_analyses (
        id SERIAL PRIMARY KEY,
        analysis_text TEXT NOT NULL,
        sport VARCHAR(100) NOT NULL,
        category VARCHAR(100), -- 'tactical', 'statistical', 'psychological', etc.
        confidence_weight DECIMAL(3,2) DEFAULT 1.0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create team statistics table for better predictions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS team_stats (
        id SERIAL PRIMARY KEY,
        team_name VARCHAR(255) NOT NULL,
        sport VARCHAR(100) NOT NULL,
        wins INTEGER DEFAULT 0,
        losses INTEGER DEFAULT 0,
        draws INTEGER DEFAULT 0,
        goals_for INTEGER DEFAULT 0,
        goals_against INTEGER DEFAULT 0,
        home_record VARCHAR(50),
        away_record VARCHAR(50),
        recent_form VARCHAR(20), -- Last 5 matches: WWDLL
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create predictions tracking table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS predictions_tracking (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        match_id UUID REFERENCES matches(id),
        predicted_outcome VARCHAR(100),
        actual_outcome VARCHAR(100),
        prediction_confidence INTEGER,
        was_correct BOOLEAN,
        odds_accuracy DECIMAL(5,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Clear existing analyses and insert sport-specific ones
    await pool.query('DELETE FROM match_analyses');
    
    // Insert sport-specific analyses
    for (const [sport, analyses] of Object.entries(sportAnalyses)) {
      for (const analysis of analyses) {
        await pool.query(
          'INSERT INTO match_analyses (analysis_text, sport, category) VALUES ($1, $2, $3)',
          [analysis, sport, 'expert']
        );
      }
    }

    // Create users table if not exists
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

    // Create enhanced stats table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS stats (
        id SERIAL PRIMARY KEY,
        total_predictions INTEGER DEFAULT 0,
        success_rate DECIMAL(5,2) DEFAULT 0,
        active_bettors INTEGER DEFAULT 0,
        monthly_wins INTEGER DEFAULT 0,
        total_matches_analyzed INTEGER DEFAULT 0,
        ai_prediction_accuracy DECIMAL(5,2) DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert initial enhanced stats if table is empty
    const statsResult = await pool.query('SELECT COUNT(*) FROM stats');
    if (parseInt(statsResult.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO stats (total_predictions, success_rate, active_bettors, monthly_wins, total_matches_analyzed, ai_prediction_accuracy)
        VALUES (1567, 82.3, 6234, 458, 2341, 78.9)
      `);
    }

    // Create predictions table if not exists
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

    console.log('✅ Enhanced database with sport-specific analyses initialized successfully');
    console.log(`📊 Inserted ${Object.values(sportAnalyses).flat().length} sport-specific analyses`);
    
    // Log statistics
    for (const [sport, analyses] of Object.entries(sportAnalyses)) {
      console.log(`   ${sport}: ${analyses.length} expert analyses`);
    }

  } catch (err) {
    console.error('❌ Error initializing enhanced database:', err);
    throw err;
  }
};

// Get sport-specific analysis
const getSportAnalysis = async (sport) => {
  try {
    const result = await pool.query(
      'SELECT analysis_text FROM match_analyses WHERE sport = $1 ORDER BY RANDOM() LIMIT 1',
      [sport]
    );
    
    if (result.rows.length > 0) {
      return result.rows[0].analysis_text;
    }
    
    // Fallback to any analysis
    const fallbackResult = await pool.query(
      'SELECT analysis_text FROM match_analyses ORDER BY RANDOM() LIMIT 1'
    );
    
    return fallbackResult.rows[0]?.analysis_text || 'Экспертный анализ доступен в VIP-канале.';
  } catch (error) {
    console.error('Error getting sport analysis:', error);
    return 'Детальный анализ матча доступен подписчикам.';
  }
};

// Update team statistics
const updateTeamStats = async (teamName, sport, matchResult) => {
  try {
    // This would be called after match completion to track team performance
    await pool.query(`
      INSERT INTO team_stats (team_name, sport, wins, losses, draws)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (team_name, sport) DO UPDATE SET
        wins = team_stats.wins + $3,
        losses = team_stats.losses + $4,
        draws = team_stats.draws + $5,
        last_updated = CURRENT_TIMESTAMP
    `, [teamName, sport, matchResult.wins || 0, matchResult.losses || 0, matchResult.draws || 0]);
  } catch (error) {
    console.error('Error updating team stats:', error);
  }
};

// Get team statistics for prediction enhancement
const getTeamStats = async (teamName, sport) => {
  try {
    const result = await pool.query(
      'SELECT * FROM team_stats WHERE team_name = $1 AND sport = $2',
      [teamName, sport]
    );
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting team stats:', error);
    return null;
  }
};

module.exports = {
  pool,
  initEnhancedDatabase,
  getSportAnalysis,
  updateTeamStats,
  getTeamStats,
  sportAnalyses
};