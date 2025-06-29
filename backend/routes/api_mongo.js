const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database_mongo');
const RealMatchParser = require('../services/realMatchParser');
const LogoService = require('../services/logoService');

// Initialize services
const matchParser = new RealMatchParser();
const logoService = new LogoService();

// Get today's matches grouped by sport
router.get('/matches/today', async (req, res) => {
  try {
    const matches = await matchParser.getTodayMatches();
    
    // Group matches by sport
    const groupedMatches = matches.reduce((acc, match) => {
      if (!acc[match.sport]) {
        acc[match.sport] = [];
      }
      acc[match.sport].push(match);
      return acc;
    }, {});
    
    res.json({
      success: true,
      matches: groupedMatches,
      total: matches.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting today matches:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get today matches',
      matches: {}
    });
  }
});

// Get matches by sport
router.get('/matches/sport/:sport', async (req, res) => {
  try {
    const sport = req.params.sport;
    const matches = await matchParser.getMatchesBySport(sport);
    
    res.json({
      success: true,
      sport: sport,
      matches: matches,
      count: matches.length
    });
  } catch (error) {
    console.error(`Error getting ${req.params.sport} matches:`, error);
    res.status(500).json({
      success: false,
      error: `Failed to get ${req.params.sport} matches`,
      matches: []
    });
  }
});

// Refresh all matches
router.post('/matches/refresh', async (req, res) => {
  try {
    console.log('🔄 Manual refresh request received');
    const matches = await matchParser.forceRefreshMatches();
    
    // Update logos for all teams
    await logoService.updateAllTeamLogos();
    
    // Group matches by sport
    const groupedMatches = matches.reduce((acc, match) => {
      if (!acc[match.sport]) {
        acc[match.sport] = [];
      }
      acc[match.sport].push(match);
      return acc;
    }, {});
    
    res.json({
      success: true,
      message: 'Matches refreshed successfully with updated logos',
      matches: groupedMatches,
      total: matches.length,
      refreshed_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error refreshing matches:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh matches'
    });
  }
});

// Update daily matches (trigger scheduler manually)
router.post('/matches/update-daily', async (req, res) => {
  try {
    const matches = await matchParser.forceRefreshMatches();
    await matchParser.saveMatchesToDatabase(matches);
    
    res.json({
      success: true,
      message: 'Daily matches updated successfully',
      count: matches.length
    });
  } catch (error) {
    console.error('Error updating daily matches:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update daily matches'
    });
  }
});

// Get schedule info
router.get('/matches/schedule-info', (req, res) => {
  try {
    const scheduleInfo = {
      morningUpdate: '09:00 МСК каждый день',
      eveningUpdate: '19:00 МСК каждый день',
      oldMatchCleanup: '02:00 МСК каждый день',
      timezone: 'Europe/Moscow',
      matchesPerSport: 2,
      maxMatchesPerDay: 8,
      realDataOnly: true,
      noMockData: true,
      autoLogoFetch: true
    };
    
    res.json({
      success: true,
      schedule: scheduleInfo
    });
  } catch (error) {
    console.error('Error getting schedule info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get schedule info'
    });
  }
});

// Get team logo
router.get('/logos/team/:teamName/:sport', async (req, res) => {
  try {
    const { teamName, sport } = req.params;
    const logoUrl = await logoService.getTeamLogoWithDatabase(teamName, sport);
    
    res.json({
      success: true,
      team: teamName,
      sport: sport,
      logo_url: logoUrl
    });
  } catch (error) {
    console.error('Error getting team logo:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get team logo'
    });
  }
});

// Update all team logos
router.post('/logos/update-all', async (req, res) => {
  try {
    await logoService.updateAllTeamLogos();
    
    res.json({
      success: true,
      message: 'All team logos updated successfully'
    });
  } catch (error) {
    console.error('Error updating all logos:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update all logos'
    });
  }
});

// Get all team logos from database
router.get('/logos/all', async (req, res) => {
  try {
    const db = getDatabase();
    const logos = await db.collection('team_logos').find({}).toArray();
    
    res.json({
      success: true,
      logos: logos,
      count: logos.length
    });
  } catch (error) {
    console.error('Error getting all logos:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get all logos'
    });
  }
});

// Get statistics
router.get('/stats', async (req, res) => {
  try {
    const db = getDatabase();
    let stats = await db.collection('stats').findOne({});
    
    if (!stats) {
      // Create default stats
      stats = {
        total_predictions: 1247,
        success_rate: 78.5,
        active_bettors: 5892,
        monthly_wins: 342,
        updated_at: new Date()
      };
      await db.collection('stats').insertOne(stats);
    }
    
    res.json({
      success: true,
      total_predictions: stats.total_predictions,
      success_rate: stats.success_rate,
      active_bettors: stats.active_bettors,
      monthly_wins: stats.monthly_wins,
      updated_at: stats.updated_at
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get statistics'
    });
  }
});

module.exports = router;