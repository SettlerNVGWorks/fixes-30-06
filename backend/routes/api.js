const express = require('express');
const { getDatabase } = require('../database_mongo');
const RealMatchParser = require('../services/realMatchParser');

const router = express.Router();
const matchParser = new RealMatchParser();

// Sample predictions data (will be seeded into database)
const samplePredictions = [
  {
    sport: 'baseball',
    match_name: 'Yankees vs Red Sox',
    prediction: 'Yankees победа',
    confidence: 85,
    odds: 2.1,
    status: 'won',
    match_date: '2025-03-10',
    result: 'Yankees 7-4 Red Sox'
  },
  {
    sport: 'football',
    match_name: 'Chiefs vs Bills',
    prediction: 'Тотал больше 48.5',
    confidence: 78,
    odds: 1.9,
    status: 'won',
    match_date: '2025-03-09',
    result: 'Chiefs 31-24 Bills (55 очков)'
  },
  {
    sport: 'hockey',
    match_name: 'Rangers vs Bruins',
    prediction: 'Rangers победа в основное время',
    confidence: 72,
    odds: 2.3,
    status: 'lost',
    match_date: '2025-03-08',
    result: 'Rangers 2-3 Bruins'
  },
  {
    sport: 'esports',
    match_name: 'Navi vs Astralis (CS:GO)',
    prediction: 'Navi победа 2-0',
    confidence: 82,
    odds: 2.5,
    status: 'won',
    match_date: '2025-03-07',
    result: 'Navi 2-0 Astralis'
  }
];

// Get overall statistics
router.get('/stats', async (req, res) => {
  try {
    const statsResult = await pool.query('SELECT * FROM stats ORDER BY id DESC LIMIT 1');
    const stats = statsResult.rows[0];

    // Get sports specific stats
    const sportsStats = {
      baseball: { predictions: 312, accuracy: 82.1, profit: 15.4 },
      football: { predictions: 428, accuracy: 76.3, profit: 12.8 },
      hockey: { predictions: 285, accuracy: 79.8, profit: 18.2 },
      esports: { predictions: 222, accuracy: 74.9, profit: 9.6 }
    };

    res.json({
      total_predictions: stats.total_predictions,
      success_rate: stats.success_rate,
      active_bettors: stats.active_bettors,
      monthly_wins: stats.monthly_wins,
      sports_stats: sportsStats
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Ошибка получения статистики' });
  }
});

// Get predictions
router.get('/predictions', async (req, res) => {
  try {
    const { sport, limit = 10 } = req.query;
    
    let query = 'SELECT * FROM predictions';
    let params = [];
    
    if (sport) {
      query += ' WHERE sport = $1';
      params.push(sport.toLowerCase());
    }
    
    query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1);
    params.push(parseInt(limit));

    const result = await pool.query(query, params);
    
    // If no predictions in database, return sample data
    if (result.rows.length === 0) {
      await seedPredictions(); // Seed sample data
      const newResult = await pool.query(query, params);
      return res.json({
        predictions: newResult.rows,
        total: newResult.rows.length
      });
    }

    res.json({
      predictions: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Predictions error:', error);
    res.status(500).json({ error: 'Ошибка получения прогнозов' });
  }
});

// Get specific prediction
router.get('/predictions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('SELECT * FROM predictions WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Прогноз не найден' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Prediction error:', error);
    res.status(500).json({ error: 'Ошибка получения прогноза' });
  }
});

// Get sport specific stats
router.get('/sports/:sport/stats', async (req, res) => {
  try {
    const { sport } = req.params;
    const sportLower = sport.toLowerCase();
    
    const validSports = ['baseball', 'football', 'hockey', 'esports'];
    if (!validSports.includes(sportLower)) {
      return res.status(404).json({ error: 'Спорт не найден' });
    }

    // Get recent predictions for this sport
    const predictionsResult = await pool.query(
      'SELECT * FROM predictions WHERE sport = $1 ORDER BY created_at DESC LIMIT 5',
      [sportLower]
    );

    // Get sport stats (hardcoded for now, can be calculated from database)
    const sportsStats = {
      baseball: { predictions: 312, accuracy: 82.1, profit: 15.4 },
      football: { predictions: 428, accuracy: 76.3, profit: 12.8 },
      hockey: { predictions: 285, accuracy: 79.8, profit: 18.2 },
      esports: { predictions: 222, accuracy: 74.9, profit: 9.6 }
    };

    res.json({
      sport: sport,
      stats: sportsStats[sportLower],
      recent_predictions: predictionsResult.rows
    });
  } catch (error) {
    console.error('Sport stats error:', error);
    res.status(500).json({ error: 'Ошибка получения статистики спорта' });
  }
});

// Telegram formatted stats
router.get('/telegram/stats', async (req, res) => {
  try {
    const statsResult = await pool.query('SELECT * FROM stats ORDER BY id DESC LIMIT 1');
    const stats = statsResult.rows[0];

    const recentPredictions = await pool.query(
      'SELECT * FROM predictions ORDER BY created_at DESC LIMIT 3'
    );

    const sportsStats = {
      baseball: { accuracy: 82.1 },
      football: { accuracy: 76.3 },
      hockey: { accuracy: 79.8 },
      esports: { accuracy: 74.9 }
    };

    const statsMessage = `
📊 **Актуальная статистика**

🎯 Всего прогнозов: ${stats.total_predictions}
✅ Проходимость: ${stats.success_rate}%
👥 Активных подписчиков: ${stats.active_bettors}
🏆 Побед в месяц: ${stats.monthly_wins}

📈 **По видам спорта:**
⚾ Бейсбол: ${sportsStats.baseball.accuracy}%
🏈 Футбол: ${sportsStats.football.accuracy}%
🏒 Хоккей: ${sportsStats.hockey.accuracy}%
🎮 Киберспорт: ${sportsStats.esports.accuracy}%
    `;

    res.json({
      stats_message: statsMessage,
      recent_predictions: recentPredictions.rows
    });
  } catch (error) {
    console.error('Telegram stats error:', error);
    res.status(500).json({ error: 'Ошибка получения статистики для Telegram' });
  }
});

// Get today's matches
router.get('/matches/today', async (req, res) => {
  try {
    const { sport } = req.query;
    
    let matches;
    if (sport) {
      matches = await matchParser.getMatchesBySport(sport.toLowerCase());
    } else {
      matches = await matchParser.getTodayMatches();
    }

    // Group matches by sport for better organization
    const groupedMatches = matches.reduce((acc, match) => {
      if (!acc[match.sport]) {
        acc[match.sport] = [];
      }
      acc[match.sport].push({
        id: match.id,
        team1: match.team1,
        team2: match.team2,
        match_time: match.match_time,
        odds_team1: match.odds_team1,
        odds_team2: match.odds_team2,
        odds_draw: match.odds_draw,
        analysis: match.analysis,
        sport: match.sport,
        status: match.status
      });
      return acc;
    }, {});

    res.json({
      success: true,
      date: new Date().toISOString().split('T')[0],
      total_matches: matches.length,
      matches: groupedMatches,
      sports_available: Object.keys(groupedMatches)
    });
  } catch (error) {
    console.error('Today matches error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Ошибка получения матчей на сегодня' 
    });
  }
});

// Refresh today's matches (force update)
router.post('/matches/refresh', async (req, res) => {
  try {
    const matches = await matchParser.forceRefreshMatches();
    
    res.json({
      success: true,
      message: 'Матчи обновлены',
      total_matches: matches.length,
      updated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Refresh matches error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Ошибка обновления матчей' 
    });
  }
});

// Manual daily update endpoint (for testing scheduler)
router.post('/matches/update-daily', async (req, res) => {
  try {
    // Import scheduler here to avoid circular dependency
    const Scheduler = require('../services/scheduler');
    const scheduler = new Scheduler();
    
    console.log('🔧 Запуск ручного ежедневного обновления матчей...');
    await scheduler.manualUpdate();
    
    // Get fresh matches to return
    const freshMatches = await matchParser.getTodayMatches();
    
    res.json({
      success: true,
      message: 'Ежедневное обновление матчей выполнено успешно',
      total_matches: freshMatches.length,
      updated_at: new Date().toISOString(),
      matches: freshMatches
    });
  } catch (error) {
    console.error('Manual daily update error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Ошибка ручного обновления матчей' 
    });
  }
});

// Get scheduler info
router.get('/matches/schedule-info', (req, res) => {
  try {
    const Scheduler = require('../services/scheduler');
    const scheduler = new Scheduler();
    const scheduleInfo = scheduler.getScheduleInfo();
    
    // Calculate time until next update
    const now = new Date();
    const nextUpdate = new Date();
    nextUpdate.setHours(12, 0, 0, 0); // 12:00 today
    
    // If we're past 12:00, set for tomorrow
    if (now.getHours() >= 12) {
      nextUpdate.setDate(nextUpdate.getDate() + 1);
    }
    
    const timeUntilUpdate = nextUpdate.getTime() - now.getTime();
    const hoursUntilUpdate = Math.floor(timeUntilUpdate / (1000 * 60 * 60));
    const minutesUntilUpdate = Math.floor((timeUntilUpdate % (1000 * 60 * 60)) / (1000 * 60));
    
    res.json({
      success: true,
      schedule: scheduleInfo,
      nextUpdate: {
        date: nextUpdate.toISOString(),
        timeUntil: `${hoursUntilUpdate}ч ${minutesUntilUpdate}м`,
        timestamp: nextUpdate.getTime()
      },
      message: 'Информация о расписании обновления матчей'
    });
  } catch (error) {
    console.error('Schedule info error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Ошибка получения информации о расписании' 
    });
  }
});

// Get matches by specific sport
router.get('/matches/sport/:sport', async (req, res) => {
  try {
    const { sport } = req.params;
    const validSports = ['football', 'hockey', 'baseball', 'esports'];
    
    if (!validSports.includes(sport.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: 'Неподдерживаемый вид спорта',
        available_sports: validSports
      });
    }

    const matches = await matchParser.getMatchesBySport(sport.toLowerCase());
    
    res.json({
      success: true,
      sport: sport,
      total_matches: matches.length,
      matches: matches
    });
  } catch (error) {
    console.error(`Sport matches error:`, error);
    res.status(500).json({ 
      success: false,
      error: 'Ошибка получения матчей по спорту'
    });
  }
});

// Helper function to seed sample predictions
async function seedPredictions() {
  try {
    for (const prediction of samplePredictions) {
      await pool.query(
        'INSERT INTO predictions (sport, match_name, prediction, confidence, odds, status, match_date, result) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [
          prediction.sport,
          prediction.match_name,
          prediction.prediction,
          prediction.confidence,
          prediction.odds,
          prediction.status,
          prediction.match_date,
          prediction.result
        ]
      );
    }
    console.log('✅ Sample predictions seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding predictions:', error);
  }
}

module.exports = router;