import React, { useState, useEffect } from 'react';
import { matchesAPI } from '../services/api';

const TodayMatches = () => {
  const [matches, setMatches] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  // Sport icons and names mapping
  const sportsInfo = {
    football: {
      name: 'Футбол',
      icon: '⚽',
      color: 'from-green-500 to-green-700'
    },
    baseball: {
      name: 'Бейсбол',
      icon: '⚾',
      color: 'from-blue-500 to-blue-700'
    },
    hockey: {
      name: 'Хоккей',
      icon: '🏒',
      color: 'from-purple-500 to-purple-700'
    },
    esports: {
      name: 'Киберспорт',
      icon: '🎮',
      color: 'from-red-500 to-red-700'
    }
  };

  // Load today's matches
  const loadMatches = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await matchesAPI.getTodayMatches();
      const data = response.data;
      
      if (data.success) {
        setMatches(data.matches);
        setLastUpdated(new Date());
      } else {
        setError('Не удалось загрузить матчи');
      }
    } catch (err) {
      console.error('Error loading matches:', err);
      setError('Ошибка загрузки матчей');
    } finally {
      setLoading(false);
    }
  };

  // Format match time with date if needed
  const formatMatchTime = (matchTime) => {
    try {
      const date = new Date(matchTime);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const matchDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      
      // Check if match is today
      const isToday = matchDate.getTime() === today.getTime();
      
      if (isToday) {
        return date.toLocaleTimeString('ru-RU', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Europe/Moscow'
        });
      } else {
        // Include date if not today
        return date.toLocaleDateString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Europe/Moscow'
        });
      }
    } catch (error) {
      return 'Время неизвестно';
    }
  };

  // Get match status info
  const getMatchStatus = (match) => {
    const status = match.status || 'scheduled';
    const now = new Date();
    const matchTime = new Date(match.match_time);
    
    switch (status) {
      case 'live':
        return {
          text: 'ИДЁТ МАТЧ',
          color: 'text-green-400',
          bgColor: 'bg-green-500/20',
          icon: '🔴'
        };
      case 'finished':
        return {
          text: 'ЗАВЕРШЁН',
          color: 'text-gray-400',
          bgColor: 'bg-gray-500/20',
          icon: '✅'
        };
      default:
        // Check if match should have started but status is still scheduled
        if (now > matchTime) {
          return {
            text: 'ВОЗМОЖНО ИДЁТ',
            color: 'text-yellow-400',
            bgColor: 'bg-yellow-500/20',
            icon: '⚡'
          };
        }
        return {
          text: 'ЗАПЛАНИРОВАН',
          color: 'text-blue-400',
          bgColor: 'bg-blue-500/20',
          icon: '📅'
        };
    }
  };

  // Get odds color based on value
  const getOddsColor = (odds) => {
    const value = parseFloat(odds);
    if (value <= 1.5) return 'text-green-400'; // Very likely
    if (value <= 2.0) return 'text-yellow-400'; // Likely
    if (value <= 3.0) return 'text-orange-400'; // Moderate
    return 'text-red-400'; // Unlikely
  };

  // Refresh matches
  const handleRefresh = async () => {
    await loadMatches();
  };

  useEffect(() => {
    loadMatches();
    
    // Auto refresh every 30 minutes
    const interval = setInterval(loadMatches, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <section className="py-16 bg-gradient-to-b from-gray-800 to-gray-900">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-600 rounded w-64 mx-auto mb-4"></div>
              <div className="h-4 bg-gray-600 rounded w-48 mx-auto"></div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-16 bg-gradient-to-b from-gray-800 to-gray-900">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h3 className="text-4xl font-bold text-white mb-4">Матчи на сегодня</h3>
            <div className="bg-red-600/20 border border-red-500 rounded-lg p-4 max-w-md mx-auto">
              <p className="text-red-300">{error}</p>
              <p className="text-xs text-gray-400 mt-2">
                Матчи обновляются 2 раза в день: 09:00 и 19:00 МСК (только реальные данные)
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const totalMatches = Object.values(matches).reduce((sum, sportMatches) => sum + sportMatches.length, 0);

  if (totalMatches === 0) {
    return (
      <section className="py-16 bg-gradient-to-b from-gray-800 to-gray-900">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h3 className="text-4xl font-bold text-white mb-4">Матчи на сегодня</h3>
            <div className="bg-yellow-600/20 border border-yellow-500 rounded-lg p-6 max-w-md mx-auto">
              <p className="text-yellow-300 mb-3">На сегодня матчей не найдено</p>
              <p className="text-xs text-gray-400">
                Матчи обновляются 2 раза в день: 09:00 и 19:00 МСК (только реальные данные)
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-gradient-to-b from-gray-800 to-gray-900">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h3 className="text-4xl font-bold text-white mb-4">Матчи на сегодня</h3>
          <p className="text-xl text-gray-300 mb-4">
            Экспертный анализ и коэффициенты на {totalMatches} матчей
          </p>
          {lastUpdated && (
            <p className="text-sm text-gray-400">
              Обновлено: {lastUpdated.toLocaleTimeString('ru-RU')}
            </p>
          )}
          <p className="text-xs text-gray-500 mt-2">
            Матчи обновляются автоматически в 09:00 и 19:00 МСК
          </p>
        </div>

        {/* Sports sections */}
        <div className="space-y-8">
          {Object.entries(matches).map(([sport, sportMatches]) => {
            const sportInfo = sportsInfo[sport];
            if (!sportInfo || sportMatches.length === 0) return null;

            return (
              <div key={sport} className="bg-black/40 backdrop-blur-sm rounded-xl p-6 border border-gold-500/20">
                {/* Sport header */}
                <div className="flex items-center space-x-3 mb-6">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${sportInfo.color} flex items-center justify-center text-2xl`}>
                    {sportInfo.icon}
                  </div>
                  <div>
                    <h4 className="text-2xl font-bold text-white">{sportInfo.name}</h4>
                    <p className="text-gray-300">{sportMatches.length} {sportMatches.length === 1 ? 'матч' : 'матчей'}</p>
                  </div>
                </div>

                {/* Matches grid */}
                <div className="grid md:grid-cols-2 gap-6">
                  {sportMatches.map((match) => (
                    <div key={match.id} className="bg-gray-900/50 rounded-lg p-5 border border-gray-700 hover:border-gold-500/50 transition-all">
                      {/* Match header with team logos */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-center flex-1">
                          <div className="flex items-center justify-center space-x-3 mb-2">
                            {match.logo_team1 && (
                              <img 
                                src={match.logo_team1} 
                                alt={match.team1}
                                className="w-8 h-8 rounded-full object-contain"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            )}
                            <div className="text-lg font-semibold text-white">
                              {match.team1}
                            </div>
                          </div>
                          <div className="text-sm text-gray-400">vs</div>
                          <div className="flex items-center justify-center space-x-3 mt-2">
                            <div className="text-lg font-semibold text-white">
                              {match.team2}
                            </div>
                            {match.logo_team2 && (
                              <img 
                                src={match.logo_team2} 
                                alt={match.team2}
                                className="w-8 h-8 rounded-full object-contain"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-gold-400 font-bold text-lg">
                            {formatMatchTime(match.match_time)}
                          </div>
                          <div className="text-xs text-gray-400">МСК</div>
                          
                          {/* Match Status */}
                          <div className={`mt-2 inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-semibold ${getMatchStatus(match).bgColor} ${getMatchStatus(match).color}`}>
                            <span>{getMatchStatus(match).icon}</span>
                            <span>{getMatchStatus(match).text}</span>
                          </div>
                        </div>
                      </div>

                      {/* Odds */}
                      <div className="bg-black/30 rounded-lg p-3 mb-4">
                        <div className="text-xs text-gray-400 mb-2 text-center">Коэффициенты</div>
                        <div className="flex justify-center space-x-4">
                          <div className="text-center">
                            <div className="text-xs text-gray-400 mb-1">П1</div>
                            <div className={`font-bold ${getOddsColor(match.odds_team1)}`}>
                              {match.odds_team1}
                            </div>
                          </div>
                          {match.odds_draw && (
                            <div className="text-center">
                              <div className="text-xs text-gray-400 mb-1">X</div>
                              <div className={`font-bold ${getOddsColor(match.odds_draw)}`}>
                                {match.odds_draw}
                              </div>
                            </div>
                          )}
                          <div className="text-center">
                            <div className="text-xs text-gray-400 mb-1">П2</div>
                            <div className={`font-bold ${getOddsColor(match.odds_team2)}`}>
                              {match.odds_team2}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Analysis */}
                      <div className="bg-gradient-to-r from-gold-500/10 to-gold-600/10 rounded-lg p-3 border border-gold-500/20">
                        <div className="flex items-start space-x-2">
                          <div className="text-gold-400 text-lg">💡</div>
                          <div>
                            <div className="text-xs text-gold-400 font-semibold mb-1">ЭКСПЕРТНЫЙ АНАЛИЗ</div>
                            <p className="text-gray-200 text-sm leading-relaxed">
                              {match.analysis}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <div className="bg-gradient-to-r from-gold-400/20 to-gold-600/20 rounded-xl p-6 border border-gold-500/30">
            <h4 className="text-2xl font-bold text-white mb-3">Хотите больше анализов?</h4>
            <p className="text-gray-300 mb-4">
              Получите детальные прогнозы и эксклюзивную аналитику в нашем VIP-канале
            </p>
            <a
              href="https://t.me/+UD8DYv3MgfUxNWU6"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-gold-400 to-gold-600 text-white px-6 py-3 rounded-lg font-bold hover:from-gold-500 hover:to-gold-700 transition-all duration-300 transform hover:scale-105"
            >
              <span>📈 Присоединиться к VIP</span>
            </a>
          </div>
        </div>
        
        {/* Real Data Info */}
        <div className="text-center mt-8">
          <div className="inline-flex items-center space-x-2 bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-2">
            <span className="text-green-400">✅</span>
            <span className="text-green-300 text-sm font-medium">100% реальные данные из официальных API</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Обновления: 09:00 и 19:00 МСК | Без мок-данных
          </p>
        </div>
      </div>
    </section>
  );
};

export default TodayMatches;