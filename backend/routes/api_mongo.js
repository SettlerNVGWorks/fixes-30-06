const express = require('express');
const { getDatabase } = require('../database_mongo');
const RealMatchParser = require('../services/realMatchParser');

const router = express.Router();
const matchParser = new RealMatchParser();

// Sample predictions data for seeding
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
    const db = getDatabase();
    const stats = await db.collection('stats').findOne({}, { sort: { _id: -1 } });

    if (!stats) {
      return res.json({
        total_predictions: 1567,
        success_rate: 82.3,
        active_bettors: 6234,
        monthly_wins: 458,
        sports_stats: {
          baseball: { predictions: 312, accuracy: 82.1, profit: 15.4 },
          football: { predictions: 428, accuracy: 76.3, profit: 12.8 },
          hockey: { predictions: 285, accuracy: 79.8, profit: 18.2 },
          esports: { predictions: 222, accuracy: 74.9, profit: 9.6 }
        }
      });
    }

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
    const db = getDatabase();
    const { sport, limit = 10 } = req.query;
    
    let filter = {};
    if (sport) {
      filter.sport = sport.toLowerCase();
    }

    const predictions = await db.collection('predictions')
      .find(filter)
      .sort({ created_at: -1 })
      .limit(parseInt(limit))
      .toArray();
    
    // If no predictions in database, seed sample data
    if (predictions.length === 0) {
      await seedPredictions();
      const newPredictions = await db.collection('predictions')
        .find(filter)
        .sort({ created_at: -1 })
        .limit(parseInt(limit))
        .toArray();
      
      return res.json({
        predictions: newPredictions,
        total: newPredictions.length
      });
    }

    res.json({
      predictions: predictions,
      total: predictions.length
    });
  } catch (error) {
    console.error('Predictions error:', error);
    res.status(500).json({ error: 'Ошибка получения прогнозов' });
  }
});

// Get specific prediction
router.get('/predictions/:id', async (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    
    const { ObjectId } = require('mongodb');
    let objectId;
    
    try {
      objectId = new ObjectId(id);
    } catch (error) {
      return res.status(400).json({ error: 'Неверный ID прогноза' });
    }
    
    const prediction = await db.collection('predictions').findOne({ _id: objectId });
    
    if (!prediction) {
      return res.status(404).json({ error: 'Прогноз не найден' });
    }

    res.json(prediction);
  } catch (error) {
    console.error('Prediction error:', error);
    res.status(500).json({ error: 'Ошибка получения прогноза' });
  }
});

// Get sport specific stats
router.get('/sports/:sport/stats', async (req, res) => {
  try {
    const db = getDatabase();
    const { sport } = req.params;
    const sportLower = sport.toLowerCase();
    
    const validSports = ['baseball', 'football', 'hockey', 'esports'];
    if (!validSports.includes(sportLower)) {
      return res.status(404).json({ error: 'Спорт не найден' });
    }

    // Get recent predictions for this sport
    const recentPredictions = await db.collection('predictions')
      .find({ sport: sportLower })
      .sort({ created_at: -1 })
      .limit(5)
      .toArray();

    const sportsStats = {
      baseball: { predictions: 312, accuracy: 82.1, profit: 15.4 },
      football: { predictions: 428, accuracy: 76.3, profit: 12.8 },
      hockey: { predictions: 285, accuracy: 79.8, profit: 18.2 },
      esports: { predictions: 222, accuracy: 74.9, profit: 9.6 }
    };

    res.json({
      sport: sport,
      stats: sportsStats[sportLower],
      recent_predictions: recentPredictions
    });
  } catch (error) {
    console.error('Sport stats error:', error);
    res.status(500).json({ error: 'Ошибка получения статистики спорта' });
  }
});

// Telegram formatted stats
router.get('/telegram/stats', async (req, res) => {
  try {
    const db = getDatabase();
    const stats = await db.collection('stats').findOne({}, { sort: { _id: -1 } });

    const recentPredictions = await db.collection('predictions')
      .find({})
      .sort({ created_at: -1 })
      .limit(3)
      .toArray();

    const sportsStats = {
      baseball: { accuracy: 82.1 },
      football: { accuracy: 76.3 },
      hockey: { accuracy: 79.8 },
      esports: { accuracy: 74.9 }
    };

    const statsMessage = `
📊 **Актуальная статистика**

🎯 Всего прогнозов: ${stats?.total_predictions || 1567}
✅ Проходимость: ${stats?.success_rate || 82.3}%
👥 Активных подписчиков: ${stats?.active_bettors || 6234}
🏆 Побед в месяц: ${stats?.monthly_wins || 458}

📈 **По видам спорта:**
⚾ Бейсбол: ${sportsStats.baseball.accuracy}%
🏈 Футбол: ${sportsStats.football.accuracy}%
🏒 Хоккей: ${sportsStats.hockey.accuracy}%
🎮 Киберспорт: ${sportsStats.esports.accuracy}%
    `;

    res.json({
      stats_message: statsMessage,
      recent_predictions: recentPredictions
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
        id: match.id || match._id,
        team1: match.team1,
        team2: match.team2,
        match_time: match.match_time,
        odds_team1: match.odds_team1,
        odds_team2: match.odds_team2,
        odds_draw: match.odds_draw,
        analysis: match.analysis,
        prediction: match.prediction,
        sport: match.sport,
        status: match.status,
        confidence_level: match.confidence_level,
        source: match.source,
        competition: match.competition,
        logo_team1: match.logo_team1,
        logo_team2: match.logo_team2,
        realism_score: match.realism_score,
        game: match.game, // For esports
        venue: match.venue
      });
      return acc;
    }, {});

    res.json({
      success: true,
      date: new Date().toISOString().split('T')[0],
      total_matches: matches.length,
      matches: groupedMatches,
      sports_available: Object.keys(groupedMatches),
      update_schedule: "Автоматическое обновление в 12:00 и 00:00 МСК"
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

// Helper function to seed sample predictions
async function seedPredictions() {
  try {
    const db = getDatabase();
    
    // Add created_at to each prediction
    const predictionsWithDates = samplePredictions.map(prediction => ({
      ...prediction,
      created_at: new Date(),
      updated_at: new Date()
    }));
    
    await db.collection('predictions').insertMany(predictionsWithDates);
    console.log('✅ Sample predictions seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding predictions:', error);
  }
}

module.exports = router;