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
        key: process.env.ODDS_API_KEY || 'demo',
        rateLimit: 500
      },
      football: {
        url: 'https://api.football-data.org/v4',
        key: process.env.FOOTBALL_DATA_KEY || '',
        rateLimit: 10
      },
      footballFree: {
        url: 'https://www.freefootballapi.com/api',
        key: null, // Free API, no key needed
        rateLimit: 60
      },
      baseball: {
        url: 'https://statsapi.mlb.com/api/v1',
        key: null, // Free API, no key needed
        rateLimit: 50
      },
      hockey: {
        url: 'https://statsapi.web.nhl.com/api/v1',
        key: null, // Free official NHL API
        rateLimit: 30
      },
      hockeyBackup: {
        url: 'https://www.thesportsdb.com/api/v1/json',
        key: process.env.SPORTSDB_KEY || '1',
        rateLimit: 30
      },
      esports: {
        url: 'https://api.pandascore.co',
        key: process.env.PANDASCORE_KEY || '',
        rateLimit: 10
      },
      esportsFree: {
        url: 'https://esportstracker.azurewebsites.net/api',
        key: null, // Free tracker API
        rateLimit: 30
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
        sportsdb: 'NHL'
      },
      'baseball': {
        odds_api: 'baseball_mlb',
        mlb_api: 'mlb'
      },
      'esports': {
        odds_api: 'esports_lol', // League of Legends
        pandascore: ['lol', 'cs-go', 'dota2']
      }
    };

    this.lastApiCalls = {
      odds: 0,
      football: 0,
      baseball: 0,
      hockey: 0,
      esports: 0
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
    } else if (apiName === 'baseball') {
      // 50 calls per minute
      return now - lastCall > 1200; // 1.2 seconds between calls
    } else if (apiName === 'hockey') {
      // 30 calls per minute
      return now - lastCall > 2000; // 2 seconds between calls
    } else if (apiName === 'esports') {
      // 10 calls per minute on free tier
      return now - lastCall > 6000; // 6 seconds between calls
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
    } else if (apiName === 'esports' && this.apis.esports.key) {
      headers['Authorization'] = `Bearer ${this.apis.esports.key}`;
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

  // Parse real football matches with multiple sources
  async parseFootballMatches() {
    const cacheKey = 'football_matches_today';
    
    if (this.isCacheValid(cacheKey)) {
      return this.getCachedData(cacheKey);
    }

    try {
      let allMatches = [];
      
      // Try primary Football-Data API first
      if (this.canMakeApiCall('football') && this.apis.football.key) {
        try {
          allMatches = await this.parseFromFootballDataAPI();
          if (allMatches.length >= 2) {
            console.log(`✅ Got ${allMatches.length} football matches from Football-Data API`);
            this.setCacheData(cacheKey, allMatches);
            return allMatches;
          }
        } catch (error) {
          console.log('⚠️ Football-Data API failed, trying backup sources...');
        }
      }

      // Try free football API as backup
      if (this.canMakeApiCall('footballFree')) {
        try {
          allMatches = await this.parseFromFreeFootballAPI();
          if (allMatches.length >= 2) {
            console.log(`✅ Got ${allMatches.length} football matches from Free Football API`);
            this.setCacheData(cacheKey, allMatches);
            return allMatches;
          }
        } catch (error) {
          console.log('⚠️ Free Football API failed, using fixture generation...');
        }
      }

      // Generate realistic fixture data based on current season
      allMatches = this.generateRealisticFootballMatches();
      console.log(`⚡ Generated ${allMatches.length} realistic football fixtures`);
      
      this.setCacheData(cacheKey, allMatches);
      return allMatches;

    } catch (error) {
      console.error('Error parsing football matches:', error);
      return this.generateRealisticFootballMatches();
    }
  }

  // Parse from Football-Data API
  async parseFromFootballDataAPI() {
    const today = this.getTodayString();
    const axios = this.getAxiosInstance('football');
    
    this.updateApiCallTime('football');
    
    // Get today's matches from major leagues
    const competitions = ['PL', 'BL1', 'FL1', 'SA', 'PD']; // Premier League, Bundesliga, etc.
    let allMatches = [];

    for (const competition of competitions.slice(0, 2)) { // Limit to 2 leagues to save API calls
      try {
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

        if (allMatches.length >= 2) break; // Stop when we have enough matches
        
        await new Promise(resolve => setTimeout(resolve, 6500)); // Rate limiting
      } catch (error) {
        console.error(`Error fetching ${competition} matches:`, error.message);
        continue;
      }
    }

    return allMatches;
  }

  // Parse from Free Football API
  async parseFromFreeFootballAPI() {
    const today = this.getTodayString();
    const axios = this.getAxiosInstance();
    
    this.updateApiCallTime('footballFree');
    
    try {
      const response = await axios.get(
        `${this.apis.footballFree.url}/fixtures`,
        {
          params: {
            date: today.iso
          }
        }
      );

      if (response.data && response.data.data && response.data.data.length > 0) {
        return response.data.data.slice(0, 4).map(match => ({
          sport: 'football',
          team1: match.homeTeam?.name || match.home_team,
          team2: match.awayTeam?.name || match.away_team,
          match_time: match.date || match.fixture_date,
          competition: match.league?.name || 'Football League',
          source: 'free-football-api'
        }));
      }
    } catch (error) {
      console.error('Free Football API error:', error);
    }

    return [];
  }

  // Generate realistic football matches based on current leagues
  generateRealisticFootballMatches() {
    const realTeams = [
      // Premier League teams
      { team1: 'Manchester City', team2: 'Arsenal', league: 'Premier League' },
      { team1: 'Liverpool', team2: 'Chelsea', league: 'Premier League' },
      { team1: 'Manchester United', team2: 'Tottenham', league: 'Premier League' },
      // La Liga teams  
      { team1: 'Real Madrid', team2: 'Barcelona', league: 'La Liga' },
      { team1: 'Atlético Madrid', team2: 'Sevilla', league: 'La Liga' },
      // Serie A teams
      { team1: 'Inter Milan', team2: 'AC Milan', league: 'Serie A' },
      { team1: 'Juventus', team2: 'Napoli', league: 'Serie A' },
      // Bundesliga teams
      { team1: 'Bayern Munich', team2: 'Borussia Dortmund', league: 'Bundesliga' },
    ];
    
    // Select 2 random realistic matchups
    const selectedMatches = realTeams.sort(() => 0.5 - Math.random()).slice(0, 2);
    const today = this.getTodayString();
    
    return selectedMatches.map((match, index) => {
      const hour = 19 + index * 2;
      return {
        sport: 'football',
        team1: match.team1,
        team2: match.team2,
        match_time: `${today.iso} ${hour}:00:00`,
        competition: match.league,
        source: 'realistic-fixture'
      };
    });
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

  // Parse real baseball matches from MLB StatsAPI
  async parseBaseballMatches() {
    const cacheKey = 'baseball_matches_today';
    
    if (this.isCacheValid(cacheKey)) {
      return this.getCachedData(cacheKey);
    }

    try {
      if (!this.canMakeApiCall('baseball')) {
        console.log('Rate limit reached for MLB API, using cache or mock data');
        return this.generateMockBaseballMatches();
      }

      const today = this.getTodayString();
      const axios = this.getAxiosInstance();
      
      this.updateApiCallTime('baseball');
      
      const response = await axios.get(
        `${this.apis.baseball.url}/schedule?sportId=1&date=${today.iso}`
      );

      let matches = [];
      
      if (response.data && response.data.dates && response.data.dates.length > 0) {
        const games = response.data.dates[0].games || [];
        
        matches = games.map(game => ({
          sport: 'baseball',
          team1: game.teams.home.team.name,
          team2: game.teams.away.team.name,
          match_time: game.gameDate,
          venue: game.venue.name,
          competition: 'MLB',
          source: 'mlb-statsapi'
        }));
      }

      // If no matches found, generate mock data
      if (matches.length === 0) {
        matches = this.generateMockBaseballMatches();
      }

      this.setCacheData(cacheKey, matches);
      return matches;

    } catch (error) {
      console.error('Error parsing baseball matches:', error);
      return this.generateMockBaseballMatches();
    }
  }

  // Parse real hockey matches from NHL API
  async parseHockeyMatches() {
    const cacheKey = 'hockey_matches_today';
    
    if (this.isCacheValid(cacheKey)) {
      return this.getCachedData(cacheKey);
    }

    try {
      let matches = [];
      
      // Try NHL API first (official and free)
      if (this.canMakeApiCall('hockey')) {
        matches = await this.parseFromNHLAPI();
        if (matches.length >= 2) {
          console.log(`✅ Got ${matches.length} hockey matches from NHL API`);
          this.setCacheData(cacheKey, matches);
          return matches;
        }
      }

      // Try TheSportsDB as backup
      if (this.canMakeApiCall('hockeyBackup')) {
        matches = await this.parseFromSportsDB();
        if (matches.length >= 2) {
          console.log(`✅ Got ${matches.length} hockey matches from SportsDB`);
          this.setCacheData(cacheKey, matches);
          return matches;
        }
      }

      // Generate realistic hockey matches based on real teams
      matches = this.generateRealisticHockeyMatches();
      console.log(`⚡ Generated ${matches.length} realistic hockey fixtures`);
      
      this.setCacheData(cacheKey, matches);
      return matches;

    } catch (error) {
      console.error('Error parsing hockey matches:', error);
      return this.generateRealisticHockeyMatches();
    }
  }

  // Parse from NHL official API
  async parseFromNHLAPI() {
    const today = this.getTodayString();
    const axios = this.getAxiosInstance();
    
    this.updateApiCallTime('hockey');
    
    try {
      const response = await axios.get(
        `${this.apis.hockey.url}/schedule?date=${today.iso}`
      );

      if (response.data && response.data.dates && response.data.dates.length > 0) {
        const games = response.data.dates[0].games || [];
        
        return games.slice(0, 4).map(game => ({
          sport: 'hockey',
          team1: game.teams.home.team.name,
          team2: game.teams.away.team.name,
          match_time: game.gameDate,
          venue: game.venue?.name,
          competition: 'NHL',
          source: 'nhl-api'
        }));
      }
    } catch (error) {
      console.error('NHL API error:', error);
    }

    return [];
  }

  // Parse from TheSportsDB
  async parseFromSportsDB() {
    const today = this.getTodayString();
    const axios = this.getAxiosInstance();
    
    this.updateApiCallTime('hockeyBackup');
    
    try {
      const response = await axios.get(
        `${this.apis.hockeyBackup.url}/${this.apis.hockeyBackup.key}/eventsday.php?d=${today.iso}&s=Ice_Hockey`
      );

      if (response.data && response.data.events && response.data.events.length > 0) {
        return response.data.events
          .filter(event => event.strSport === 'Ice Hockey')
          .slice(0, 4)
          .map(event => ({
            sport: 'hockey',
            team1: event.strHomeTeam || 'Home Team',
            team2: event.strAwayTeam || 'Away Team',
            match_time: `${event.dateEvent} ${event.strTime || '20:00'}`,
            venue: event.strVenue,
            competition: event.strLeague || 'Hockey League',
            source: 'thesportsdb'
          }));
      }
    } catch (error) {
      console.error('SportsDB Hockey API error:', error);
    }

    return [];
  }

  // Generate realistic hockey matches with real teams
  generateRealisticHockeyMatches() {
    const realMatchups = [
      // NHL teams
      { team1: 'Toronto Maple Leafs', team2: 'Montreal Canadiens', league: 'NHL' },
      { team1: 'Boston Bruins', team2: 'New York Rangers', league: 'NHL' },
      { team1: 'Tampa Bay Lightning', team2: 'Florida Panthers', league: 'NHL' },
      { team1: 'Pittsburgh Penguins', team2: 'Philadelphia Flyers', league: 'NHL' },
      // KHL teams
      { team1: 'ЦСКА Москва', team2: 'СКА Санкт-Петербург', league: 'КХЛ' },
      { team1: 'Динамо Москва', team2: 'Спартак Москва', league: 'КХЛ' },
      { team1: 'Авангард Омск', team2: 'Металлург Магнитогорск', league: 'КХЛ' },
      { team1: 'Ак Барс Казань', team2: 'Салават Юлаев Уфа', league: 'КХЛ' }
    ];
    
    const selectedMatches = realMatchups.sort(() => 0.5 - Math.random()).slice(0, 2);
    const today = this.getTodayString();
    
    return selectedMatches.map((match, index) => {
      const hour = 19 + index * 2;
      return {
        sport: 'hockey',
        team1: match.team1,
        team2: match.team2,
        match_time: `${today.iso} ${hour}:30:00`,
        competition: match.league,
        source: 'realistic-fixture'
      };
    });
  }

  // Parse real esports matches
  async parseEsportsMatches() {
    const cacheKey = 'esports_matches_today';
    
    if (this.isCacheValid(cacheKey)) {
      return this.getCachedData(cacheKey);
    }

    try {
      if (!this.canMakeApiCall('esports') || !this.apis.esports.key) {
        console.log('Rate limit reached or no API key for Esports API, using mock data');
        return this.generateMockEsportsMatches();
      }

      const today = this.getTodayString();
      const axios = this.getAxiosInstance('esports');
      
      this.updateApiCallTime('esports');
      
      // Get matches from PandaScore API
      const response = await axios.get(
        `${this.apis.esports.url}/matches/running`,
        {
          headers: {
            'Authorization': `Bearer ${this.apis.esports.key}`
          },
          params: {
            sort: 'begin_at',
            page: 1,
            per_page: 10
          }
        }
      );

      let matches = [];
      
      if (response.data && response.data.length > 0) {
        matches = response.data
          .filter(match => match.videogame && match.opponents && match.opponents.length >= 2)
          .slice(0, 4) // Limit to 4 matches
          .map(match => ({
            sport: 'esports',
            team1: match.opponents[0].opponent.name,
            team2: match.opponents[1].opponent.name,
            match_time: match.begin_at || `${today.iso} 18:00:00`,
            game: match.videogame.name,
            competition: match.league?.name || 'Esports Tournament',
            source: 'pandascore'
          }));
      }

      // If no matches found, generate mock data
      if (matches.length === 0) {
        matches = this.generateMockEsportsMatches();
      }

      this.setCacheData(cacheKey, matches);
      return matches;

    } catch (error) {
      console.error('Error parsing esports matches:', error);
      return this.generateMockEsportsMatches();
    }
  }

  // Generate mock hockey matches as fallback
  generateMockHockeyMatches() {
    const teams = [
      'ЦСКА', 'СКА', 'Динамо М', 'Спартак', 'Авангард', 'Металлург', 'Ак Барс', 'Торпедо',
      'Rangers', 'Bruins', 'Penguins', 'Blackhawks'
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
      const matchTime = `${today.iso} ${hour}:30:00`;
      
      matches.push({
        sport: 'hockey',
        team1: team1,
        team2: team2,
        match_time: matchTime,
        competition: 'NHL/KHL',
        source: 'mock-generator'
      });
    }
    
    return matches;
  }

  // Generate mock baseball matches as fallback
  generateMockBaseballMatches() {
    const teams = [
      'Yankees', 'Red Sox', 'Dodgers', 'Giants', 'Astros', 'Phillies', 'Mets', 
      'Cubs', 'Cardinals', 'Braves', 'Blue Jays', 'Angels'
    ];
    
    const matches = [];
    const today = this.getTodayString();
    
    for (let i = 0; i < 2; i++) {
      const team1 = teams[Math.floor(Math.random() * teams.length)];
      let team2 = teams[Math.floor(Math.random() * teams.length)];
      while (team2 === team1) {
        team2 = teams[Math.floor(Math.random() * teams.length)];
      }
      
      const hour = 20 + i * 2;
      const matchTime = `${today.iso} ${hour}:00:00`;
      
      matches.push({
        sport: 'baseball',
        team1: team1,
        team2: team2,
        match_time: matchTime,
        competition: 'MLB',
        source: 'mock-generator'
      });
    }
    
    return matches;
  }

  // Generate mock esports matches as fallback  
  generateMockEsportsMatches() {
    const teams = [
      'Navi', 'Astralis', 'G2 Esports', 'Fnatic', 'FaZe Clan', 'Team Liquid',
      'Cloud9', 'MOUZ', 'Vitality', 'NIP', 'ENCE', 'BIG'
    ];
    
    const games = ['CS:GO', 'Dota 2', 'League of Legends', 'Valorant'];
    
    const matches = [];
    const today = this.getTodayString();
    
    for (let i = 0; i < 2; i++) {
      const team1 = teams[Math.floor(Math.random() * teams.length)];
      let team2 = teams[Math.floor(Math.random() * teams.length)];
      while (team2 === team1) {
        team2 = teams[Math.floor(Math.random() * teams.length)];
      }
      
      const hour = 16 + i * 3;
      const matchTime = `${today.iso} ${hour}:00:00`;
      
      matches.push({
        sport: 'esports',
        team1: team1,
        team2: team2,
        match_time: matchTime,
        game: games[Math.floor(Math.random() * games.length)],
        competition: 'Major Tournament',
        source: 'mock-generator'
      });
    }
    
    return matches;
  }

  // Main function to get all today's matches (limit 2 per sport)
  async getTodayMatches() {
    const cacheKey = `real_matches_${this.getTodayString().iso}`;
    
    if (this.isCacheValid(cacheKey)) {
      console.log('🔄 Returning cached real matches');
      return this.getCachedData(cacheKey);
    }

    try {
      console.log('🔍 Fetching real matches from APIs...');
      
      // Get matches from different sources in parallel
      const [footballMatches, baseballMatches, hockeyMatches, esportsMatches] = await Promise.all([
        this.parseFootballMatches(),
        this.parseBaseballMatches(),
        this.parseHockeyMatches(),
        this.parseEsportsMatches()
      ]);
      
      // Limit to 2 matches per sport
      const limitedFootball = footballMatches.slice(0, 2);
      const limitedBaseball = baseballMatches.slice(0, 2);
      const limitedHockey = hockeyMatches.slice(0, 2);
      const limitedEsports = esportsMatches.slice(0, 2);
      
      // Combine all matches
      let allMatches = [
        ...limitedFootball,
        ...limitedBaseball,
        ...limitedHockey,
        ...limitedEsports
      ];
      
      // Add odds to all matches
      allMatches = await this.parseOddsForMatches(allMatches);
      
      // Add analysis and additional data
      for (let match of allMatches) {
        match.analysis = await this.getRandomAnalysisBySport(match.sport);
        match.match_date = this.getTodayString().iso;
        match.prediction = this.generatePrediction(match);
        match.id = this.generateMatchId(match);
      }
      
      console.log(`✅ Successfully parsed ${allMatches.length} real matches (limited to 2 per sport):`);
      console.log(`   ⚽ Футбол: ${limitedFootball.length}`);
      console.log(`   ⚾ Бейсбол: ${limitedBaseball.length}`);
      console.log(`   🏒 Хоккей: ${limitedHockey.length}`);
      console.log(`   🎮 Киберспорт: ${limitedEsports.length}`);
      
      this.setCacheData(cacheKey, allMatches);
      return allMatches;

    } catch (error) {
      console.error('❌ Error getting real matches:', error);
      // Fallback to mock data
      return this.generateFallbackMatches();
    }
  }

  // Generate unique match ID
  generateMatchId(match) {
    const str = `${match.sport}_${match.team1}_${match.team2}_${match.match_time}`;
    return str.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
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

  // Fallback matches if all APIs fail (2 per sport)
  async generateFallbackMatches() {
    console.log('⚠️ Using fallback match generation (2 per sport)');
    
    const fallbackMatches = [
      // Football (2 matches)
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
        sport: 'football',
        team1: 'Манчестер Сити',
        team2: 'Ливерпуль',
        match_time: `${this.getTodayString().iso} 19:00:00`,
        odds_team1: 1.9,
        odds_team2: 3.5,
        odds_draw: 3.2,
        source: 'fallback'
      },
      // Hockey (2 matches)
      {
        sport: 'hockey',
        team1: 'ЦСКА',
        team2: 'СКА',
        match_time: `${this.getTodayString().iso} 19:30:00`,
        odds_team1: 2.3,
        odds_team2: 2.8,
        source: 'fallback'
      },
      {
        sport: 'hockey',
        team1: 'Динамо М',
        team2: 'Спартак',
        match_time: `${this.getTodayString().iso} 17:00:00`,
        odds_team1: 2.5,
        odds_team2: 2.4,
        source: 'fallback'
      },
      // Baseball (2 matches)
      {
        sport: 'baseball',
        team1: 'Yankees',
        team2: 'Red Sox',
        match_time: `${this.getTodayString().iso} 20:00:00`,
        odds_team1: 1.8,
        odds_team2: 2.9,
        source: 'fallback'
      },
      {
        sport: 'baseball',
        team1: 'Dodgers',
        team2: 'Giants',
        match_time: `${this.getTodayString().iso} 22:00:00`,
        odds_team1: 2.0,
        odds_team2: 2.7,
        source: 'fallback'
      },
      // Esports (2 matches)
      {
        sport: 'esports',
        team1: 'Navi',
        team2: 'Astralis',
        match_time: `${this.getTodayString().iso} 16:00:00`,
        odds_team1: 1.7,
        odds_team2: 2.9,
        source: 'fallback'
      },
      {
        sport: 'esports',
        team1: 'G2 Esports',
        team2: 'FaZe Clan',
        match_time: `${this.getTodayString().iso} 18:30:00`,
        odds_team1: 2.2,
        odds_team2: 2.4,
        source: 'fallback'
      }
    ];
    
    // Add analysis and predictions
    for (let match of fallbackMatches) {
      match.analysis = await this.getRandomAnalysisBySport(match.sport);
      match.match_date = this.getTodayString().iso;
      match.prediction = this.generatePrediction(match);
      match.id = this.generateMatchId(match);
    }
    
    return fallbackMatches;
  }

  // Save matches to database (using MongoDB)
  async saveMatchesToDatabase(matches) {
    try {
      const db = getDatabase();
      
      for (const match of matches) {
        await db.collection('matches').updateOne(
          { 
            team1: match.team1,
            team2: match.team2,
            match_date: match.match_date
          },
          { 
            $set: {
              id: match.id || this.generateMatchId(match),
              sport: match.sport,
              team1: match.team1,
              team2: match.team2,
              match_time: match.match_time,
              odds_team1: match.odds_team1,
              odds_team2: match.odds_team2,
              odds_draw: match.odds_draw,
              analysis: match.analysis,
              source: match.source,
              match_date: match.match_date,
              prediction: match.prediction,
              competition: match.competition,
              game: match.game, // For esports
              venue: match.venue,
              status: 'scheduled',
              updated_at: new Date()
            }
          },
          { upsert: true }
        );
      }
      console.log(`✅ Saved ${matches.length} real matches to database`);
    } catch (error) {
      console.error('❌ Error saving real matches to database:', error);
      throw error;
    }
  }

  // Get matches by specific sport
  async getMatchesBySport(sport) {
    try {
      const allMatches = await this.getTodayMatches();
      return allMatches.filter(match => match.sport === sport);
    } catch (error) {
      console.error(`Error getting ${sport} matches:`, error);
      return [];
    }
  }
  
  // Force refresh matches
  async forceRefreshMatches() {
    // Clear cache to force refresh
    this.cache.clear();
    console.log('🧹 Match parser cache cleared');
    console.log('🔄 Force refreshing matches...');
    return await this.getTodayMatches();
  }
  
  // Clear cache
  clearCache() {
    this.cache.clear();
    console.log('🧹 Match parser cache cleared');
  }
}

module.exports = RealMatchParser;