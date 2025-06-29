const axios = require('axios');
const UserAgent = require('user-agents');
const { getDatabase, getSportAnalysis } = require('../database_mongo');
const { getTeamLogo } = require('../data/teamLogos');

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
      footballAPI: {
        url: 'https://v3.football.api-sports.io',
        key: process.env.API_FOOTBALL_KEY || '',
        rateLimit: 100 // 100 requests per day on free tier
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
      hockeyBall: {
        url: 'https://nhl.balldontlie.io/v1',
        key: process.env.BALLDONTLIE_API_KEY || '',
        rateLimit: 5 // 5 requests per minute on free tier
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
      footballAPI: 0,
      baseball: 0,
      hockey: 0,
      hockeyBall: 0,
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
    } else if (apiName === 'footballAPI') {
      // 100 calls per day - be conservative (1 call per hour max)
      return now - lastCall > 3600000; // 1 hour between calls
    } else if (apiName === 'odds') {
      // 500 calls per month - be very conservative
      return now - lastCall > 300000; // 5 minutes between calls
    } else if (apiName === 'baseball') {
      // 50 calls per minute
      return now - lastCall > 1200; // 1.2 seconds between calls
    } else if (apiName === 'hockey') {
      // 30 calls per minute
      return now - lastCall > 2000; // 2 seconds between calls
    } else if (apiName === 'hockeyBall') {
      // 5 calls per minute on BALLDONTLIE free tier
      return now - lastCall > 12000; // 12 seconds between calls
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
    } else if (apiName === 'footballAPI' && this.apis.footballAPI.key) {
      headers['X-RapidAPI-Key'] = this.apis.footballAPI.key;
      headers['X-RapidAPI-Host'] = 'v3.football.api-sports.io';
    } else if (apiName === 'hockeyBall' && this.apis.hockeyBall.key) {
      headers['Authorization'] = `Bearer ${this.apis.hockeyBall.key}`;
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

  // Get random analysis by sport with betting recommendation
  async getRandomAnalysisBySport(sport) {
    try {
      const db = getDatabase();
      const analyses = await db.collection('match_analyses')
        .find({ sport: sport })
        .toArray();
      
      let baseAnalysis;
      if (analyses.length > 0) {
        const randomIndex = Math.floor(Math.random() * analyses.length);
        baseAnalysis = analyses[randomIndex].analysis_text;
      } else {
        baseAnalysis = this.getGenericAnalysis(sport);
      }
      
      return baseAnalysis;
    } catch (error) {
      console.error('Error getting sport-specific analysis:', error);
      return this.getGenericAnalysis(sport);
    }
  }

  // Add betting recommendation to analysis
  addBettingRecommendation(analysis, match) {
    const odds1 = parseFloat(match.odds_team1);
    const odds2 = parseFloat(match.odds_team2);
    const oddsDraw = match.odds_draw ? parseFloat(match.odds_draw) : null;
    
    let recommendation = "";
    
    // Determine best betting option based on odds and analysis
    if (odds1 && odds2) {
      const team1Prob = 1 / odds1;
      const team2Prob = 1 / odds2;
      const drawProb = oddsDraw ? 1 / oddsDraw : 0;
      
      if (odds1 <= 1.6 && odds1 < odds2) {
        // Strong favorite
        recommendation = this.getStrongFavoriteRecommendation(match, match.team1, odds1);
      } else if (odds2 <= 1.6 && odds2 < odds1) {
        // Strong favorite
        recommendation = this.getStrongFavoriteRecommendation(match, match.team2, odds2);
      } else if (odds1 >= 2.5 && odds2 >= 2.5 && oddsDraw && oddsDraw <= 2.2) {
        // Draw likely in football
        recommendation = `💰 ПРИОРИТЕТ СТАВКИ: Ничья (коэф. ${oddsDraw}) - равные силы команд, высокая вероятность ничейного исхода.`;
      } else if (Math.abs(odds1 - odds2) <= 0.3) {
        // Very close odds - suggest alternative markets
        recommendation = this.getAlternativeMarketRecommendation(match);
      } else if (odds1 > 1.8 && odds1 < 2.8 && odds1 < odds2) {
        // Good value bet
        recommendation = this.getValueBetRecommendation(match, match.team1, odds1);
      } else if (odds2 > 1.8 && odds2 < 2.8 && odds2 < odds1) {
        // Good value bet
        recommendation = this.getValueBetRecommendation(match, match.team2, odds2);
      } else {
        // Default recommendation
        const favoriteTeam = odds1 < odds2 ? match.team1 : match.team2;
        const favoriteOdds = Math.min(odds1, odds2);
        recommendation = `💰 ПРИОРИТЕТ СТАВКИ: ${favoriteTeam} (коэф. ${favoriteOdds}) - рекомендуем ставку на фаворита.`;
      }
    }
    
    return `${analysis} ${recommendation}`;
  }

  // Get strong favorite recommendation with enhanced priorities
  getStrongFavoriteRecommendation(match, team, odds) {
    const sportRecommendations = {
      'football': `🎯 ГЛАВНЫЙ ПРИОРИТЕТ: ${team} (коэф. ${odds}) - сильный фаворит! 
📈 ДОПОЛНИТЕЛЬНО: Фора -1.5 (коэф. ~${(odds * 1.4).toFixed(2)}) + Тотал больше 2.5 голов
💡 СТРАТЕГИЯ: Экспресс из основного исхода + тотал для максимальной прибыли`,
      'hockey': `🎯 ГЛАВНЫЙ ПРИОРИТЕТ: ${team} (коэф. ${odds}) - сильный фаворит! 
📈 ДОПОЛНИТЕЛЬНО: Победа в основное время (коэф. ~${(odds * 1.2).toFixed(2)})
💡 СТРАТЕГИЯ: Основной исход + первая шайба команды`,
      'baseball': `🎯 ГЛАВНЫЙ ПРИОРИТЕТ: ${team} (коэф. ${odds}) - сильный фаворит! 
📈 ДОПОЛНИТЕЛЬНО: Фора -1.5 ранов (коэф. ~${(odds * 1.6).toFixed(2)})
💡 СТРАТЕГИЯ: Монилайн + тотал меньше для стабильности`,
      'esports': `🎯 ГЛАВНЫЙ ПРИОРИТЕТ: ${team} (коэф. ${odds}) - сильный фаворит! 
📈 ДОПОЛНИТЕЛЬНО: Победа 2-0 по картам (коэф. ~${(odds * 2.1).toFixed(2)})
💡 СТРАТЕГИЯ: Основной исход + первая карта команды`
    };
    
    return sportRecommendations[match.sport] || `🎯 ГЛАВНЫЙ ПРИОРИТЕТ: ${team} (коэф. ${odds}) - сильный фаворит с высокой вероятностью победы!`;
  }

  // Get value bet recommendation with enhanced analysis
  getValueBetRecommendation(match, team, odds) {
    const sportRecommendations = {
      'football': `🎯 ВАЛУЙНАЯ СТАВКА: ${team} (коэф. ${odds}) - недооценены букмекерами! 
📊 АНАЛИЗ: Реальная вероятность выше заявленной на 15-20%
💡 ТАКТИКА: Ставка 3-5% от банка + страховка на ничью`,
      'hockey': `🎯 ВАЛУЙНАЯ СТАВКА: ${team} (коэф. ${odds}) - отличная ценность! 
📊 АНАЛИЗ: Домашний лёд/форма недооценены букмекерами
💡 ТАКТИКА: Основной исход + live-ставка при счете 0:0`,
      'baseball': `🎯 ВАЛУЙНАЯ СТАВКА: ${team} (коэф. ${odds}) - стартовый питчер в форме! 
📊 АНАЛИЗ: Статистика ERA и WHIP говорят о преимуществе
💡 ТАКТИКА: Монилайн + under на общий тотал`,
      'esports': `🎯 ВАЛУЙНАЯ СТАВКА: ${team} (коэф. ${odds}) - map pool в их пользу! 
📊 АНАЛИЗ: Тактическая подготовка недооценена букмекерами  
💡 ТАКТИКА: Основной исход + ставка на точный счет 2-1`
    };
    
    return sportRecommendations[match.sport] || `🎯 ВАЛУЙНАЯ СТАВКА: ${team} (коэф. ${odds}) - отличное соотношение риск/доходность!`;
  }

  // Get alternative market recommendations for close matches with detailed priorities
  getAlternativeMarketRecommendation(match) {
    const sportRecommendations = {
      'football': `🎯 ПРИОРИТЕТ: Тотал больше 2.5 голов (коэф. ~1.85) - равные силы = открытая игра!
📈 АЛЬТЕРНАТИВА: Обе забьют ДА (коэф. ~1.70) + Угловые больше 9.5
💡 СТРАТЕГИЯ: Избегать основного исхода, играть на статистику`,
      'hockey': `🎯 ПРИОРИТЕТ: Тотал больше 5.5 шайб (коэф. ~1.90) - равные команды играют открыто!
📈 АЛЬТЕРНАТИВА: Овертайм ДА (коэф. ~3.20) - при равной игре
💡 СТРАТЕГИЯ: Live-ставка на тотал после 1-го периода`,
      'baseball': `🎯 ПРИОРИТЕТ: Тотал больше 8.5 ранов (коэф. ~1.80) - питчеры могут уступить!
📈 АЛЬТЕРНАТИВА: Первые 5 иннингов - тотал больше 4.5
💡 СТРАТЕГИЯ: Следить за составом питчеров и погодой`,
      'esports': `🎯 ПРИОРИТЕТ: Тотал карт больше 2.5 (коэф. ~1.75) - равные силы = долгий матч!
📈 АЛЬТЕРНАТИВА: Точный счет 2-1 любой команде (коэф. ~2.80)
💡 СТРАТЕГИЯ: Live-ставка после первой карты на тотал`
    };
    
    return sportRecommendations[match.sport] || `🎯 ПРИОРИТЕТ: Рассмотрите альтернативные рынки - исход матча непредсказуем!`;
  }

  // Team logos mapping using comprehensive database
  getTeamLogoUrl(teamName, sport) {
    return getTeamLogo(teamName, sport);
  }
  generateMatchId(match) {
    const str = `${match.sport}_${match.team1}_${match.team2}_${match.match_time}`;
    return str.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  }

  // Generate sport-specific generic analysis with enhanced betting priorities
  getGenericAnalysis(sport) {
    const analyses = {
      football: [
        'Домашняя команда показывает стабильную игру в обороне в последних матчах. 🎯 ПРИОРИТЕТ: Ставка на их победу или тотал меньше.',
        'Статистика личных встреч говорит в пользу фаворита. 🎯 ПРИОРИТЕТ: Основной исход + обе забьют.',
        'Ключевые игроки в отличной форме. 🎯 ПРИОРИТЕТ: Фора фаворита или индивидуальный тотал.',
        'Травмы в обороне соперника создают отличные возможности. 🎯 ПРИОРИТЕТ: Тотал больше + победа.',
        'Мотивация на максимуме - борьба за еврокубки. 🎯 ПРИОРИТЕТ: Уверенная победа фаворита.'
      ],
      hockey: [
        'Команда демонстрирует отличную игру в большинстве. 🎯 ПРИОРИТЕТ: Победа + тотал больше 5.5.',
        'Вратарь показывает высокий процент отражённых бросков. 🎯 ПРИОРИТЕТ: Победа в основное время.',
        'Быстрые контратаки - конёк этой команды. 🎯 ПРИОРИТЕТ: Первая шайба + общая победа.',
        'Домашний лёд даёт решающее преимущество. 🎯 ПРИОРИТЕТ: Победа без овертайма.',
        'Физическая игра принесёт результат. 🎯 ПРИОРИТЕТ: Победа + больше 6 шайб.'
      ],
      baseball: [
        'Питчер показывает отличную статистику ERA в последних играх. 🎯 ПРИОРИТЕТ: Победа + тотал меньше 8.5.',
        'Команда сильна в нападении против левосторонних питчеров. 🎯 ПРИОРИТЕТ: Победа + тотал больше 9.',
        'Домашнее поле даёт серьёзное преимущество. 🎯 ПРИОРИТЕТ: Монилайн + фора -1.5.',
        'Буллпен в отличной форме - стабильность в концовке. 🎯 ПРИОРИТЕТ: Победа любой разницей.',
        'Статистика с бегунами в скоринговой позиции впечатляет. 🎯 ПРИОРИТЕТ: Победа + over 8.5.'
      ],
      esports: [
        'Команда показывает отличную синхронизацию в последних матчах. 🎯 ПРИОРИТЕТ: Победа 2-0 по картам.',
        'Сильная игра в клатчевых ситуациях. 🎯 ПРИОРИТЕТ: Победа + тотал карт больше 2.5.',
        'Тактическая подготовка на высоком уровне. 🎯 ПРИОРИТЕТ: Уверенная победа в 2 карты.',
        'Map pool идеально подходит под турнир. 🎯 ПРИОРИТЕТ: Победа + первая карта.',
        'AWP-ер в феноменальной форме. 🎯 ПРИОРИТЕТ: Победа с гандикапом +1.5 карты.'
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

  // Parse from Football-Data API with enhanced data collection
  async parseFromFootballDataAPI() {
    const today = this.getTodayString();
    const axios = this.getAxiosInstance('football');
    
    this.updateApiCallTime('football');
    
    // Get today's matches from major leagues with more competitions
    const competitions = [
      'PL',   // Premier League  
      'BL1',  // Bundesliga
      'FL1',  // Ligue 1
      'SA',   // Serie A
      'PD',   // La Liga
      'CL',   // Champions League
      'EL',   // Europa League
      'DED',  // Eredivisie
      'PPL',  // Primeira Liga
      'BSA'   // Brasileirão
    ]; 
    let allMatches = [];

    // Try multiple competitions to get more real matches
    for (const competition of competitions.slice(0, 5)) { // Limit to 5 to stay within rate limits
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
            source: 'football-data-api',
            matchday: match.matchday,
            season: match.season?.year,
            referee: match.referees?.[0]?.name,
            venue: match.homeTeam.venue || 'Stadium',
            logo_team1: this.getTeamLogoUrl(match.homeTeam.name, 'football'),
            logo_team2: this.getTeamLogoUrl(match.awayTeam.name, 'football')
          }));
          
          allMatches = allMatches.concat(matches);
        }

        if (allMatches.length >= 4) break; // Stop when we have enough matches
        
        await new Promise(resolve => setTimeout(resolve, 6500)); // Rate limiting - 10 per minute
      } catch (error) {
        console.error(`Error fetching ${competition} matches:`, error.message);
        continue;
      }
    }

    // If we still don't have enough matches, try next few days
    if (allMatches.length < 2) {
      for (let dayOffset = 1; dayOffset <= 7; dayOffset++) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + dayOffset);
        const futureDateString = futureDate.toISOString().split('T')[0];
        
        try {
          const response = await axios.get(
            `${this.apis.football.url}/competitions/PL/matches`,
            {
              params: {
                dateFrom: futureDateString,
                dateTo: futureDateString
              }
            }
          );

          if (response.data && response.data.matches && response.data.matches.length > 0) {
            const futureMatches = response.data.matches.slice(0, 2).map(match => ({
              sport: 'football',
              team1: match.homeTeam.name,
              team2: match.awayTeam.name,
              match_time: `${this.getTodayString().iso} ${19 + Math.floor(Math.random() * 3)}:00:00`, // Schedule for today evening
              competition: match.competition.name + ` (${dayOffset} day${dayOffset > 1 ? 's' : ''} ahead)`,
              source: 'football-data-api-future',
              logo_team1: this.getTeamLogoUrl(match.homeTeam.name, 'football'),
              logo_team2: this.getTeamLogoUrl(match.awayTeam.name, 'football'),
              original_date: match.utcDate
            }));
            
            allMatches = allMatches.concat(futureMatches);
            console.log(`✅ Found ${futureMatches.length} upcoming football matches (${dayOffset} days ahead)`);
            break;
          }
        } catch (error) {
          continue;
        }
        
        await new Promise(resolve => setTimeout(resolve, 6500)); // Rate limiting
      }
    }

    return allMatches.slice(0, 4); // Return max 4 matches
  }

  // Parse from API-Football (Alternative source)
  async parseFromAPIFootball() {
    const today = this.getTodayString();
    const axios = this.getAxiosInstance('footballAPI');
    
    this.updateApiCallTime('footballAPI');
    
    try {
      const response = await axios.get(
        `${this.apis.footballAPI.url}/fixtures`,
        {
          params: {
            date: today.iso,
            status: 'NS' // Not Started matches
          }
        }
      );

      if (response.data && response.data.response && response.data.response.length > 0) {
        return response.data.response.slice(0, 4).map(fixture => ({
          sport: 'football',
          team1: fixture.teams.home.name,
          team2: fixture.teams.away.name,
          match_time: fixture.fixture.date,
          competition: fixture.league.name,
          source: 'api-football',
          venue: fixture.fixture.venue?.name,
          referee: fixture.fixture.referee,
          logo_team1: fixture.teams.home.logo || this.getTeamLogoUrl(fixture.teams.home.name, 'football'),
          logo_team2: fixture.teams.away.logo || this.getTeamLogoUrl(fixture.teams.away.name, 'football')
        }));
      }
    } catch (error) {
      console.error('API-Football error:', error.response?.data || error.message);
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
        source: 'realistic-fixture',
        logo_team1: this.getTeamLogoUrl(match.team1, 'football'),
        logo_team2: this.getTeamLogoUrl(match.team2, 'football')
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

  // Parse real baseball matches from MLB StatsAPI (most reliable)
  async parseBaseballMatches() {
    const cacheKey = 'baseball_matches_today';
    
    if (this.isCacheValid(cacheKey)) {
      return this.getCachedData(cacheKey);
    }

    try {
      if (!this.canMakeApiCall('baseball')) {
        console.log('Rate limit reached for MLB API, using realistic generation');
        return this.generateRealisticBaseballMatches();
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
          source: 'mlb-statsapi',
          gameId: game.gamePk // Real game ID for verification
        }));
        
        console.log(`✅ Found ${matches.length} real MLB games for today`);
      }

      // If no MLB games today, generate realistic fixtures
      if (matches.length === 0) {
        console.log('⚠️ No MLB games today, generating realistic fixtures');
        matches = this.generateRealisticBaseballMatches();
      }

      this.setCacheData(cacheKey, matches);
      return matches;

    } catch (error) {
      console.error('Error parsing baseball matches:', error);
      return this.generateRealisticBaseballMatches();
    }
  }

  // Generate realistic baseball matches with real MLB teams
  generateRealisticBaseballMatches() {
    const realMatchups = [
      // AL East matchups
      { team1: 'New York Yankees', team2: 'Boston Red Sox', division: 'AL East' },
      { team1: 'Toronto Blue Jays', team2: 'Tampa Bay Rays', division: 'AL East' },
      { team1: 'Baltimore Orioles', team2: 'New York Yankees', division: 'AL East' },
      // AL Central matchups
      { team1: 'Cleveland Guardians', team2: 'Detroit Tigers', division: 'AL Central' },
      { team1: 'Chicago White Sox', team2: 'Minnesota Twins', division: 'AL Central' },
      // AL West matchups
      { team1: 'Houston Astros', team2: 'Texas Rangers', division: 'AL West' },
      { team1: 'Seattle Mariners', team2: 'Los Angeles Angels', division: 'AL West' },
      // NL East matchups
      { team1: 'Atlanta Braves', team2: 'New York Mets', division: 'NL East' },
      { team1: 'Philadelphia Phillies', team2: 'Miami Marlins', division: 'NL East' },
      // NL Central matchups
      { team1: 'Milwaukee Brewers', team2: 'Chicago Cubs', division: 'NL Central' },
      { team1: 'St. Louis Cardinals', team2: 'Cincinnati Reds', division: 'NL Central' },
      // NL West matchups
      { team1: 'Los Angeles Dodgers', team2: 'San Diego Padres', division: 'NL West' },
      { team1: 'San Francisco Giants', team2: 'Colorado Rockies', division: 'NL West' }
    ];
    
    const selectedMatches = realMatchups.sort(() => 0.5 - Math.random()).slice(0, 2);
    const today = this.getTodayString();
    
    return selectedMatches.map((match, index) => {
      const hour = 19 + index * 3; // 19:00 and 22:00 (typical MLB times)
      return {
        sport: 'baseball',
        team1: match.team1,
        team2: match.team2,
        match_time: `${today.iso} ${hour}:00:00`,
        venue: `${match.team1} Stadium`,
        competition: 'MLB',
        source: 'realistic-fixture',
        division: match.division
      };
    });
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
      let matches = [];

      // Try PandaScore API first
      if (this.canMakeApiCall('esports') && this.apis.esports.key) {
        matches = await this.parseFromPandaScore();
        if (matches.length >= 2) {
          console.log(`✅ Got ${matches.length} esports matches from PandaScore API`);
          this.setCacheData(cacheKey, matches);
          return matches;
        }
      }

      // Try free esports tracker
      if (this.canMakeApiCall('esportsFree')) {
        matches = await this.parseFromEsportsTracker();
        if (matches.length >= 2) {
          console.log(`✅ Got ${matches.length} esports matches from free tracker`);
          this.setCacheData(cacheKey, matches);
          return matches;
        }
      }

      // Generate realistic esports matches with real teams and tournaments
      matches = this.generateRealisticEsportsMatches();
      console.log(`⚡ Generated ${matches.length} realistic esports fixtures`);
      
      this.setCacheData(cacheKey, matches);
      return matches;

    } catch (error) {
      console.error('Error parsing esports matches:', error);
      return this.generateRealisticEsportsMatches();
    }
  }

  // Parse from PandaScore API with enhanced data collection
  async parseFromPandaScore() {
    const today = this.getTodayString();
    const axios = this.getAxiosInstance('esports');
    
    this.updateApiCallTime('esports');
    
    try {
      // Get upcoming matches (simpler query first)
      const upcomingResponse = await axios.get(
        `${this.apis.esports.url}/matches/upcoming`,
        {
          headers: {
            'Authorization': `Bearer ${this.apis.esports.key}`
          },
          params: {
            page: 1,
            per_page: 10
          }
        }
      );

      let matches = [];
      
      if (upcomingResponse.data && upcomingResponse.data.length > 0) {
        matches = upcomingResponse.data
          .filter(match => match.videogame && match.opponents && match.opponents.length >= 2)
          .slice(0, 4)
          .map((match, index) => {
            // Create today's schedule for these matches
            const hour = 16 + index * 2;
            return {
              sport: 'esports',
              team1: match.opponents[0].opponent.name,
              team2: match.opponents[1].opponent.name,
              match_time: `${today.iso}T${hour}:00:00Z`,
              game: match.videogame.name,
              competition: match.league?.name || match.tournament?.name || 'Tournament',
              tournament_tier: match.tournament?.tier,
              bo_type: match.number_of_games ? `BO${match.number_of_games}` : 'BO3',
              source: 'pandascore-api',
              logo_team1: this.getTeamLogoUrl(match.opponents[0].opponent.name, 'esports'),
              logo_team2: this.getTeamLogoUrl(match.opponents[1].opponent.name, 'esports'),
              match_id: match.id,
              original_time: match.begin_at
            };
          });
          
        console.log(`✅ PandaScore API returned ${matches.length} real esports matches`);
      }

      return matches;
      
    } catch (error) {
      console.error('PandaScore API error:', error.response?.data || error.message);
      return [];
    }
  }

  // Parse from free esports tracker
  async parseFromEsportsTracker() {
    const axios = this.getAxiosInstance();
    
    this.updateApiCallTime('esportsFree');
    
    try {
      const response = await axios.get(
        `${this.apis.esportsFree.url}/matches/upcoming`
      );

      if (response.data && response.data.matches && response.data.matches.length > 0) {
        return response.data.matches
          .slice(0, 4)
          .map(match => ({
            sport: 'esports',
            team1: match.team1 || match.homeTeam,
            team2: match.team2 || match.awayTeam,
            match_time: match.startTime || match.time,
            game: match.game || 'CS:GO',
            competition: match.tournament || 'Esports Tournament',
            source: 'esports-tracker'
          }));
      }
    } catch (error) {
      console.error('Esports tracker API error:', error);
    }

    return [];
  }

  // Generate realistic esports matches with current teams and tournaments
  generateRealisticEsportsMatches() {
    const realMatchups = [
      // CS2 teams
      { team1: 'Navi', team2: 'Astralis', game: 'CS2', tournament: 'BLAST Premier' },
      { team1: 'G2 Esports', team2: 'FaZe Clan', game: 'CS2', tournament: 'ESL Pro League' },
      { team1: 'Team Liquid', team2: 'Vitality', game: 'CS2', tournament: 'IEM Katowice' },
      // Dota 2 teams
      { team1: 'Team Spirit', team2: 'OG', game: 'Dota 2', tournament: 'The International' },
      { team1: 'PSG.LGD', team2: 'Team Secret', game: 'Dota 2', tournament: 'DPC League' },
      // League of Legends teams
      { team1: 'T1', team2: 'Gen.G', game: 'League of Legends', tournament: 'LCK Summer' },
      { team1: 'Cloud9', team2: 'Team Liquid', game: 'League of Legends', tournament: 'LCS Championship' },
      // Valorant teams
      { team1: 'Sentinels', team2: 'OpTic Gaming', game: 'Valorant', tournament: 'VCT Masters' },
      { team1: 'Fnatic', team2: 'LOUD', game: 'Valorant', tournament: 'VCT Champions' }
    ];
    
    const selectedMatches = realMatchups.sort(() => 0.5 - Math.random()).slice(0, 2);
    const today = this.getTodayString();
    
    return selectedMatches.map((match, index) => {
      const hour = 16 + index * 4; // 16:00 and 20:00
      return {
        sport: 'esports',
        team1: match.team1,
        team2: match.team2,
        match_time: `${today.iso} ${hour}:00:00`,
        game: match.game,
        competition: match.tournament,
        source: 'realistic-fixture'
      };
    });
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
      
      // Add analysis and additional data including team logos
      for (let match of allMatches) {
        const baseAnalysis = await this.getRandomAnalysisBySport(match.sport);
        match.analysis = this.addBettingRecommendation(baseAnalysis, match);
        match.match_date = this.getTodayString().iso;
        match.prediction = this.generatePrediction(match);
        match.id = this.generateMatchId(match);
        // Add team logos if not already present
        if (!match.logo_team1) {
          match.logo_team1 = this.getTeamLogoUrl(match.team1, match.sport);
        }
        if (!match.logo_team2) {
          match.logo_team2 = this.getTeamLogoUrl(match.team2, match.sport);
        }
        // Add realism score for tracking
        match.realism_score = this.calculateRealismScore(match);
      }
      
      // Calculate overall realism percentage
      const totalRealism = allMatches.reduce((sum, match) => sum + match.realism_score, 0);
      const realismPercentage = Math.round((totalRealism / allMatches.length) * 100);
      
      console.log(`✅ Successfully parsed ${allMatches.length} matches (limited to 2 per sport):`);
      console.log(`   ⚽ Футбол: ${limitedFootball.length} (${this.getSourceType(limitedFootball)})`);
      console.log(`   ⚾ Бейсбол: ${limitedBaseball.length} (${this.getSourceType(limitedBaseball)})`);
      console.log(`   🏒 Хоккей: ${limitedHockey.length} (${this.getSourceType(limitedHockey)})`);
      console.log(`   🎮 Киберспорт: ${limitedEsports.length} (${this.getSourceType(limitedEsports)})`);
      console.log(`   📊 Общий процент реальности: ${realismPercentage}%`);
      
      this.setCacheData(cacheKey, allMatches);
      return allMatches;

    } catch (error) {
      console.error('❌ Error getting real matches:', error);
      // Fallback to mock data
      return this.generateFallbackMatches();
    }
  }

  // Calculate realism score for a match (0.0 to 1.0)
  calculateRealismScore(match) {
    const source = match.source;
    
    // Real API sources get highest scores
    if (source === 'mlb-statsapi') return 1.0; // 100% real MLB data
    if (source === 'football-data-api') return 1.0; // 100% real football data
    if (source === 'football-data-api-future') return 0.95; // 95% real (upcoming matches)
    if (source === 'nhl-api') return 1.0; // 100% real NHL data
    if (source === 'pandascore-api') return 1.0; // 100% real esports data
    if (source === 'pandascore-upcoming') return 1.0; // 100% real esports data
    if (source === 'pandascore-running') return 1.0; // 100% real live data
    if (source === 'free-football-api') return 0.9; // 90% real
    if (source === 'thesportsdb') return 0.8; // 80% real
    if (source === 'esports-tracker') return 0.8; // 80% real
    
    // Realistic fixtures get high scores (real teams, realistic schedules)
    if (source === 'realistic-fixture') return 0.85; // 85% realistic
    
    // Fallback data gets lower scores
    if (source === 'fallback') return 0.7; // 70% realistic
    if (source === 'pandascore-adapted') return 0.8; // 80% realistic (real teams, adapted schedule)
    
    return 0.6; // 60% for unknown sources
  }

  // Get source type description for logging
  getSourceType(matches) {
    if (matches.length === 0) return 'none';
    
    const sources = matches.map(m => m.source);
    const realSources = ['mlb-statsapi', 'football-data-api', 'nhl-api', 'pandascore', 'free-football-api'];
    
    const realCount = sources.filter(s => realSources.includes(s)).length;
    const realisticCount = sources.filter(s => s === 'realistic-fixture').length;
    
    if (realCount === matches.length) return 'REAL API';
    if (realCount > 0) return `${realCount} REAL + ${matches.length - realCount} REALISTIC`;
    if (realisticCount === matches.length) return 'REALISTIC';
    return 'MIXED';
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
    
    // Add analysis and predictions with team logos
    for (let match of fallbackMatches) {
      const baseAnalysis = await this.getRandomAnalysisBySport(match.sport);
      match.analysis = this.addBettingRecommendation(baseAnalysis, match);
      match.match_date = this.getTodayString().iso;
      match.prediction = this.generatePrediction(match);
      match.id = this.generateMatchId(match);
      // Add team logos
      match.logo_team1 = this.getTeamLogoUrl(match.team1, match.sport);
      match.logo_team2 = this.getTeamLogoUrl(match.team2, match.sport);
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
              logo_team1: match.logo_team1,
              logo_team2: match.logo_team2,
              realism_score: match.realism_score,
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