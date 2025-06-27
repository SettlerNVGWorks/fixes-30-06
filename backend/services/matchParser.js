const axios = require('axios');
const cheerio = require('cheerio');
const UserAgent = require('user-agents');
const { pool } = require('../database');

class MatchParser {
  constructor() {
    this.userAgent = new UserAgent();
    this.cache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes
  }

  // Get axios instance with random user agent
  getAxiosInstance() {
    return axios.create({
      headers: {
        'User-Agent': this.userAgent.toString(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      timeout: 10000,
      maxRedirects: 3,
    });
  }

  // Get today's date in YYYY-MM-DD format
  getTodayString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Check cache for recent data
  isCacheValid(key) {
    const cached = this.cache.get(key);
    if (!cached) return false;
    return Date.now() - cached.timestamp < this.cacheTimeout;
  }

  // Get cached data
  getCachedData(key) {
    const cached = this.cache.get(key);
    return cached ? cached.data : null;
  }

  // Set cache data
  setCacheData(key, data) {
    this.cache.set(key, {
      data: data,
      timestamp: Date.now()
    });
  }

  // Get random analysis from database
  async getRandomAnalysis() {
    try {
      const result = await pool.query(
        'SELECT analysis_text FROM match_analyses ORDER BY RANDOM() LIMIT 1'
      );
      return result.rows[0]?.analysis_text || 'Детальный анализ матча доступен в VIP-канале.';
    } catch (error) {
      console.error('Error getting random analysis:', error);
      return 'Экспертный анализ этого матча доступен подписчикам.';
    }
  }

  // Parse matches from a mock source (since we can't reliably scrape betting sites)
  async parseMockMatches() {
    const today = this.getTodayString();
    const mockMatches = [
      // Football matches
      {
        sport: 'football',
        team1: 'Реал Мадрид',
        team2: 'Барселона',
        match_time: `${today} 21:00:00`,
        odds_team1: 2.1,
        odds_team2: 3.2,
        odds_draw: 3.0,
        source: 'mock_parser'
      },
      {
        sport: 'football',
        team1: 'Манчестер Сити',
        team2: 'Ливерпуль',
        match_time: `${today} 18:30:00`,
        odds_team1: 1.8,
        odds_team2: 4.2,
        odds_draw: 3.5,
        source: 'mock_parser'
      },
      // Hockey matches
      {
        sport: 'hockey',
        team1: 'ЦСКА',
        team2: 'СКА',
        match_time: `${today} 19:30:00`,
        odds_team1: 2.3,
        odds_team2: 2.8,
        odds_draw: null,
        source: 'mock_parser'
      },
      {
        sport: 'hockey',
        team1: 'Динамо Москва',
        team2: 'Спартак',
        match_time: `${today} 17:00:00`,
        odds_team1: 1.9,
        odds_team2: 3.1,
        odds_draw: null,
        source: 'mock_parser'
      },
      // Baseball matches
      {
        sport: 'baseball',
        team1: 'Yankees',
        team2: 'Red Sox',
        match_time: `${today} 20:00:00`,
        odds_team1: 1.7,
        odds_team2: 2.2,
        odds_draw: null,
        source: 'mock_parser'
      },
      {
        sport: 'baseball',
        team1: 'Dodgers',
        team2: 'Giants',
        match_time: `${today} 22:30:00`,
        odds_team1: 2.0,
        odds_team2: 1.8,
        odds_draw: null,
        source: 'mock_parser'
      },
      // Esports matches
      {
        sport: 'esports',
        team1: 'Navi',
        team2: 'Astralis',
        match_time: `${today} 16:00:00`,
        odds_team1: 1.6,
        odds_team2: 2.4,
        odds_draw: null,
        source: 'mock_parser'
      },
      {
        sport: 'esports',
        team1: 'G2 Esports',
        team2: 'Fnatic',
        match_time: `${today} 19:00:00`,
        odds_team1: 2.1,
        odds_team2: 1.7,
        odds_draw: null,
        source: 'mock_parser'
      }
    ];

    // Add random analysis to each match
    for (let match of mockMatches) {
      match.analysis = await this.getRandomAnalysis();
      match.match_date = today;
    }

    return mockMatches;
  }

  // Parse real matches from betting sites (placeholder for future implementation)
  async parseRealMatches() {
    // This would contain real parsing logic for betting sites
    // For now, we'll use mock data to demonstrate the functionality
    console.log('Real parsing would be implemented here');
    return [];
  }

  // Get all today's matches
  async getTodayMatches() {
    const cacheKey = `today_matches_${this.getTodayString()}`;
    
    // Check cache first
    if (this.isCacheValid(cacheKey)) {
      console.log('Returning cached matches');
      return this.getCachedData(cacheKey);
    }

    try {
      // First, try to get existing matches from database
      const today = this.getTodayString();
      const existingMatches = await pool.query(
        'SELECT * FROM matches WHERE match_date = $1 ORDER BY match_time ASC',
        [today]
      );

      if (existingMatches.rows.length > 0) {
        console.log(`Found ${existingMatches.rows.length} existing matches for today`);
        this.setCacheData(cacheKey, existingMatches.rows);
        return existingMatches.rows;
      }

      // If no existing matches, parse new ones
      console.log('Parsing new matches for today');
      const newMatches = await this.parseMockMatches();
      
      // Save to database
      await this.saveMatchesToDatabase(newMatches);
      
      // Get saved matches with IDs
      const savedMatches = await pool.query(
        'SELECT * FROM matches WHERE match_date = $1 ORDER BY match_time ASC',
        [today]
      );

      this.setCacheData(cacheKey, savedMatches.rows);
      return savedMatches.rows;

    } catch (error) {
      console.error('Error getting today matches:', error);
      return [];
    }
  }

  // Save matches to database
  async saveMatchesToDatabase(matches) {
    try {
      for (const match of matches) {
        await pool.query(`
          INSERT INTO matches 
          (sport, team1, team2, match_time, odds_team1, odds_team2, odds_draw, analysis, source, match_date)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (id) DO NOTHING
        `, [
          match.sport,
          match.team1,
          match.team2,
          match.match_time,
          match.odds_team1,
          match.odds_team2,
          match.odds_draw,
          match.analysis,
          match.source,
          match.match_date
        ]);
      }
      console.log(`✅ Saved ${matches.length} matches to database`);
    } catch (error) {
      console.error('❌ Error saving matches to database:', error);
      throw error;
    }
  }

  // Get matches by sport
  async getMatchesBySport(sport) {
    try {
      const allMatches = await this.getTodayMatches();
      return allMatches.filter(match => match.sport === sport);
    } catch (error) {
      console.error(`Error getting ${sport} matches:`, error);
      return [];
    }
  }

  // Clear old matches (older than 1 day)
  async clearOldMatches() {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayString = yesterday.toISOString().split('T')[0];

      await pool.query(
        'DELETE FROM matches WHERE match_date < $1',
        [yesterdayString]
      );
      console.log('✅ Cleared old matches');
    } catch (error) {
      console.error('❌ Error clearing old matches:', error);
    }
  }

  // Force refresh matches (bypass cache)
  async forceRefreshMatches() {
    const cacheKey = `today_matches_${this.getTodayString()}`;
    this.cache.delete(cacheKey);
    
    // Clear today's matches from database
    const today = this.getTodayString();
    await pool.query('DELETE FROM matches WHERE match_date = $1', [today]);
    
    // Get fresh matches
    return await this.getTodayMatches();
  }
}

module.exports = MatchParser;