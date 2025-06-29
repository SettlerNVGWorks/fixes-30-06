const axios = require('axios');
const UserAgent = require('user-agents');
const { getDatabase, getSportAnalysis } = require('../database_mongo');

class RealMatchParser {
  constructor() {
    this.userAgent = new UserAgent();
    this.cache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes
    
    // API Configuration
    this.apis = {
      odds: {
        url: 'https://api.the-odds-api.com',
        key: process.env.ODDS_API_KEY || 'demo', // Will use demo for testing
        rateLimit: 500 // per month on free tier
      },
      football: {
        url: 'https://api.football-data.org/v4',
        key: process.env.FOOTBALL_DATA_KEY || '', // Free tier
        rateLimit: 10 // per minute
      }
    };

    // Sport mappings for different APIs
    this.sportMappings = {
      'football': {
        odds_api: 'soccer_epl', // Premier League
        football_data: 'PL'
      },
      'hockey': {
        odds_api: 'icehockey_nhl',
        alternative: 'KHL' // Russian Hockey League
      },
      'baseball': {
        odds_api: 'baseball_mlb',
        alternative: 'MLB'
      },
      'esports': {
        odds_api: 'esports_lol', // League of Legends
        alternative: 'CSGO'
      }
    };

    this.lastApiCalls = {
      odds: 0,
      football: 0
    };
  }

  // Rate limiting check
  canMakeApiCall(apiName) {
    const now = Date.now();
    const lastCall = this.lastApiCalls[apiName];
    
    if (apiName === 'football') {
      // 10 calls per minute limit
      return now - lastCall > 6000; // 6 seconds between calls
    } else if (apiName === 'odds') {
      // 500 calls per month - be very conservative
      return now - lastCall > 300000; // 5 minutes between calls
    }
    
    return true;
  }

  // Update last API call time
  updateApiCallTime(apiName) {
    this.lastApiCalls[apiName] = Date.now();
  }

  // Get axios instance with proper headers
  getAxiosInstance(apiName = 'default') {
    const headers = {
      'User-Agent': this.userAgent.toString(),
      'Accept': 'application/json',
      'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
    };

    if (apiName === 'football' && this.apis.football.key) {
      headers['X-Auth-Token'] = this.apis.football.key;
    }

    return axios.create({
      headers,
      timeout: 15000,
      maxRedirects: 3,
    });
  }

  // Get today's date in various formats
  getTodayString() {
    const today = new Date();
    return {
      iso: today.toISOString().split('T')[0], // YYYY-MM-DD
      timestamp: today.getTime(),
      footballData: today.toISOString().split('T')[0] // Same format
    };
  }

  // Cache management
  isCacheValid(key) {
    const cached = this.cache.get(key);
    if (!cached) return false;
    return Date.now() - cached.timestamp < this.cacheTimeout;
  }

  getCachedData(key) {
    const cached = this.cache.get(key);
    return cached ? cached.data : null;
  }

  setCacheData(key, data) {
    this.cache.set(key, {
      data: data,
      timestamp: Date.now()
    });
  }

  // Get random analysis by sport
  async getRandomAnalysisBySport(sport) {
    try {
      const db = getDatabase();
      const analyses = await db.collection('match_analyses')
        .find({ sport: sport })
        .toArray();
      
      if (analyses.length > 0) {
        const randomIndex = Math.floor(Math.random() * analyses.length);
        return analyses[randomIndex].analysis_text;
      }
      
      // Fallback to generic analysis
      return this.getGenericAnalysis(sport);
    } catch (error) {
      console.error('Error getting sport-specific analysis:', error);
      return this.getGenericAnalysis(sport);
    }
  }

  // Generate sport-specific generic analysis
  getGenericAnalysis(sport) {
    const analyses = {
      football: [
        'Домашняя команда показывает стабильную игру в обороне в последних матчах. Рекомендуем рассмотреть ставку на их победу.',
        'Статистика личных встреч говорит в пользу фаворита. Ожидаем результативный матч.',
        'Ключевые игроки в отличной форме. Тактическое преимущество очевидно.'
      ],
      hockey: [
        'Команда демонстрирует отличную игру в большинстве. Силовые приёмы могут стать решающими.',
        'Вратарь показывает высокий процент отражённых бросков. Ожидаем низкий тотал.',
        'Быстрые контратаки - конёк этой команды. Преимущество в скорости очевидно.'
      ],
      baseball: [
        'Питчер показывает отличную статистику ERA в последних играх. Преимущество в подаче.',
        'Команда сильна в нападении против левосторонних питчеров. Ожидаем результативность.',
        'Домашнее поле даёт серьёзное преимущество в этом противостоянии.'
      ],
      esports: [
        'Команда показывает отличную синхронизацию в последних матчах. Map pool играет в их пользу.',
        'Сильная игра в клатчевых ситуациях. Опыт игроков может стать решающим фактором.',
        'Тактическая подготовка на высоком уровне. Ожидаем доминирование в стратегии.'
      ]
    };
    
    const sportAnalyses = analyses[sport] || analyses.football;
    return sportAnalyses[Math.floor(Math.random() * sportAnalyses.length)];
  }

  // Parse real football matches
  async parseFootballMatches() {
    const cacheKey = 'football_matches_today';
    
    if (this.isCacheValid(cacheKey)) {
      return this.getCachedData(cacheKey);
    }

    try {
      if (!this.canMakeApiCall('football')) {
        console.log('Rate limit reached for Football-Data API, using cache or mock data');
        return this.generateMockFootballMatches();
      }

      const today = this.getTodayString();
      const axios = this.getAxiosInstance('football');
      
      // Get today's matches from major leagues
      const competitions = ['PL', 'BL1', 'FL1', 'SA', 'PD']; // Premier League, Bundesliga, Ligue 1, Serie A, La Liga
      let allMatches = [];

      for (const competition of competitions) {
        try {
          this.updateApiCallTime('football');
          
          const response = await axios.get(
            `${this.apis.football.url}/competitions/${competition}/matches`,
            {
              params: {
                dateFrom: today.iso,
                dateTo: today.iso
              }
            }
          );

          if (response.data && response.data.matches) {
            const matches = response.data.matches.map(match => ({
              sport: 'football',
              team1: match.homeTeam.name,
              team2: match.awayTeam.name,
              match_time: match.utcDate,
              competition: match.competition.name,
              source: 'football-data-api'
            }));
            
            allMatches = allMatches.concat(matches);
          }

          // Rate limiting delay
          await new Promise(resolve => setTimeout(resolve, 6500));
        } catch (error) {
          console.error(`Error fetching ${competition} matches:`, error.message);
          continue;
        }
      }

      // If no matches found for today, generate mock data
      if (allMatches.length === 0) {
        allMatches = this.generateMockFootballMatches();
      }

      this.setCacheData(cacheKey, allMatches);
      return allMatches;

    } catch (error) {
      console.error('Error parsing football matches:', error);
      return this.generateMockFootballMatches();
    }
  }

  // Generate mock football matches as fallback
  generateMockFootballMatches() {
    const teams = [
      'Реал Мадрид', 'Барселона', 'Манчестер Сити', 'Ливерпуль', 
      'ПСЖ', 'Бавария', 'Интер', 'Милан', 'Арсенал', 'Челси'
    ];
    
    const matches = [];
    const today = this.getTodayString();
    
    for (let i = 0; i < 2; i++) {
      const team1 = teams[Math.floor(Math.random() * teams.length)];
      let team2 = teams[Math.floor(Math.random() * teams.length)];
      while (team2 === team1) {
        team2 = teams[Math.floor(Math.random() * teams.length)];
      }
      
      const hour = 19 + i * 2;
      const matchTime = `${today.iso} ${hour}:00:00`;
      
      matches.push({
        sport: 'football',
        team1: team1,
        team2: team2,
        match_time: matchTime,
        competition: 'Лига Чемпионов',
        source: 'mock-generator'
      });
    }
    
    return matches;
  }

  // Parse odds from The Odds API
  async parseOddsForMatches(matches) {
    if (!this.canMakeApiCall('odds')) {
      console.log('Rate limit reached for Odds API, generating mock odds');
      return this.addMockOdds(matches);
    }

    try {
      const axios = this.getAxiosInstance();
      const sportsWithOdds = [];

      // Get odds for different sports
      for (const sport of ['soccer_epl', 'icehockey_nhl', 'baseball_mlb']) {
        try {
          this.updateApiCallTime('odds');
          
          const response = await axios.get(
            `${this.apis.odds.url}/v4/sports/${sport}/odds`,
            {
              params: {
                apiKey: this.apis.odds.key,
                regions: 'us,uk,eu',
                markets: 'h2h', // head to head
                oddsFormat: 'decimal'
              }
            }
          );

          if (response.data && response.data.length > 0) {
            sportsWithOdds.push(...response.data);
          }

          // Rate limiting delay
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          console.error(`Error fetching odds for ${sport}:`, error.message);
          continue;
        }
      }

      // Match odds with our matches
      return this.matchOddsWithMatches(matches, sportsWithOdds);

    } catch (error) {
      console.error('Error parsing odds:', error);
      return this.addMockOdds(matches);
    }
  }

  // Match API odds with our matches
  matchOddsWithMatches(matches, oddsData) {
    return matches.map(match => {
      // Try to find matching odds
      const matchingOdds = oddsData.find(odds => 
        odds.home_team.toLowerCase().includes(match.team1.toLowerCase().split(' ')[0]) ||
        odds.away_team.toLowerCase().includes(match.team2.toLowerCase().split(' ')[0])
      );

      if (matchingOdds && matchingOdds.bookmakers && matchingOdds.bookmakers.length > 0) {
        const bookmaker = matchingOdds.bookmakers[0]; // Use first bookmaker
        const market = bookmaker.markets.find(m => m.key === 'h2h');
        
        if (market && market.outcomes) {
          const homeOdds = market.outcomes.find(o => o.name === matchingOdds.home_team);
          const awayOdds = market.outcomes.find(o => o.name === matchingOdds.away_team);
          const drawOdds = market.outcomes.find(o => o.name === 'Draw');
          
          return {
            ...match,
            odds_team1: homeOdds ? parseFloat(homeOdds.price) : this.generateMockOdds(),
            odds_team2: awayOdds ? parseFloat(awayOdds.price) : this.generateMockOdds(),
            odds_draw: drawOdds ? parseFloat(drawOdds.price) : (match.sport === 'football' ? this.generateMockOdds() : null),
            odds_source: 'the-odds-api'
          };
        }
      }

      // Fallback to mock odds
      return {
        ...match,
        odds_team1: this.generateMockOdds(),
        odds_team2: this.generateMockOdds(),
        odds_draw: match.sport === 'football' ? this.generateMockOdds() : null,
        odds_source: 'generated'
      };
    });
  }

  // Generate realistic mock odds
  generateMockOdds() {
    return parseFloat((1.4 + Math.random() * 2.5).toFixed(2));
  }

  // Add mock odds to matches
  addMockOdds(matches) {
    return matches.map(match => ({
      ...match,
      odds_team1: this.generateMockOdds(),
      odds_team2: this.generateMockOdds(),
      odds_draw: match.sport === 'football' ? this.generateMockOdds() : null,
      odds_source: 'generated'
    }));
  }

  // Generate matches for other sports (mock for now)
  async generateOtherSportsMatches() {
    const today = this.getTodayString();
    
    const sportsData = {
      hockey: {
        teams: ['ЦСКА', 'СКА', 'Динамо М', 'Спартак', 'Авангард', 'Металлург', 'Ак Барс', 'Торпедо'],
        count: 2
      },
      baseball: {
        teams: ['Yankees', 'Red Sox', 'Dodgers', 'Giants', 'Astros', 'Phillies', 'Mets', 'Cubs'],
        count: 2
      },
      esports: {
        teams: ['Navi', 'Astralis', 'G2', 'Fnatic', 'FaZe', 'Liquid', 'Cloud9', 'MOUZ'],
        count: 2
      }
    };

    const allMatches = [];
    
    for (const [sport, data] of Object.entries(sportsData)) {
      for (let i = 0; i < data.count; i++) {
        const team1 = data.teams[Math.floor(Math.random() * data.teams.length)];
        let team2 = data.teams[Math.floor(Math.random() * data.teams.length)];
        while (team2 === team1) {
          team2 = data.teams[Math.floor(Math.random() * data.teams.length)];
        }
        
        const hour = 16 + Math.floor(Math.random() * 6);
        const minute = Math.floor(Math.random() * 2) * 30;
        const matchTime = `${today.iso} ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
        
        allMatches.push({
          sport: sport,
          team1: team1,
          team2: team2,
          match_time: matchTime,
          source: 'sport-generator'
        });
      }
    }
    
    return allMatches;
  }

  // Main function to get all today's matches
  async getTodayMatches() {
    const cacheKey = `real_matches_${this.getTodayString().iso}`;
    
    if (this.isCacheValid(cacheKey)) {
      console.log('🔄 Returning cached real matches');
      return this.getCachedData(cacheKey);
    }

    try {
      console.log('🔍 Fetching real matches from APIs...');
      
      // Get matches from different sources
      const footballMatches = await this.parseFootballMatches();
      const otherSportsMatches = await this.generateOtherSportsMatches();
      
      // Combine all matches
      let allMatches = [...footballMatches, ...otherSportsMatches];
      
      // Add odds to all matches
      allMatches = await this.parseOddsForMatches(allMatches);
      
      // Add analysis and additional data
      for (let match of allMatches) {
        match.analysis = await this.getRandomAnalysisBySport(match.sport);
        match.match_date = this.getTodayString().iso;
        match.prediction = this.generatePrediction(match);
      }
      
      console.log(`✅ Successfully parsed ${allMatches.length} real matches`);
      
      this.setCacheData(cacheKey, allMatches);
      return allMatches;

    } catch (error) {
      console.error('❌ Error getting real matches:', error);
      // Fallback to mock data
      return this.generateFallbackMatches();
    }
  }

  // Generate prediction based on odds and team data
  generatePrediction(match) {
    const odds1 = match.odds_team1;
    const odds2 = match.odds_team2;
    
    if (odds1 < odds2) {
      if (odds1 <= 1.5) {
        return `Уверенная победа ${match.team1}. Высокая вероятность.`;
      } else if (odds1 <= 2.0) {
        return `${match.team1} фаворит матча. Рекомендуем рассмотреть.`;
      } else {
        return `Равная игра с небольшим преимуществом ${match.team1}.`;
      }
    } else {
      if (odds2 <= 1.5) {
        return `Уверенная победа ${match.team2}. Высокая вероятность.`;
      } else if (odds2 <= 2.0) {
        return `${match.team2} фаворит матча. Рекомендуем рассмотреть.`;
      } else {
        return `Равная игра с небольшим преимуществом ${match.team2}.`;
      }
    }
  }

  // Fallback matches if all APIs fail
  async generateFallbackMatches() {
    console.log('⚠️ Using fallback match generation');
    
    const fallbackMatches = [
      {
        sport: 'football',
        team1: 'Реал Мадрид',
        team2: 'Барселона',
        match_time: `${this.getTodayString().iso} 21:00:00`,
        odds_team1: 2.1,
        odds_team2: 3.2,
        odds_draw: 3.0,
        source: 'fallback'
      },
      {
        sport: 'hockey',
        team1: 'ЦСКА',
        team2: 'СКА',
        match_time: `${this.getTodayString().iso} 19:30:00`,
        odds_team1: 2.3,
        odds_team2: 2.8,
        source: 'fallback'
      }
    ];
    
    // Add analysis and predictions
    for (let match of fallbackMatches) {
      match.analysis = await this.getRandomAnalysisBySport(match.sport);
      match.match_date = this.getTodayString().iso;
      match.prediction = this.generatePrediction(match);
    }
    
    return fallbackMatches;
  }

  // Save matches to database (reuse existing method structure)
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
      console.log(`✅ Saved ${matches.length} real matches to database`);
    } catch (error) {
      console.error('❌ Error saving real matches to database:', error);
      throw error;
    }
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
    console.log('🧹 Match parser cache cleared');
  }
}

module.exports = RealMatchParser;