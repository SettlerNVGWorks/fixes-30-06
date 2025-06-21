import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [stats, setStats] = useState({
    totalPredictions: 1247,
    successRate: 78.5,
    activeBettors: 5892,
    monthlyWins: 342
  });

  const sports = [
    {
      name: 'Бейсбол',
      icon: '⚾',
      image: 'https://images.unsplash.com/photo-1471295253337-3ceaaedca402',
      stats: { predictions: 312, accuracy: 82.1 },
      description: 'Профессиональные прогнозы на MLB и международные турниры'
    },
    {
      name: 'Футбол',
      icon: '🏈',
      image: 'https://images.unsplash.com/photo-1610729866389-fbf90649c302',
      stats: { predictions: 428, accuracy: 76.3 },
      description: 'Детальный анализ NFL и студенческого футбола'
    },
    {
      name: 'Хоккей',
      icon: '🏒',
      image: 'https://images.unsplash.com/photo-1576584520374-c55375496eac',
      stats: { predictions: 285, accuracy: 79.8 },
      description: 'Экспертные прогнозы на NHL и международные чемпионаты'
    },
    {
      name: 'Киберспорт',
      icon: '🎮',
      image: 'https://images.pexels.com/photos/7915357/pexels-photo-7915357.jpeg',
      stats: { predictions: 222, accuracy: 74.9 },
      description: 'Аналитика топовых турниров CS:GO, Dota 2, LoL'
    }
  ];

  const testimonials = [
    {
      name: 'Алексей М.',
      text: 'За месяц подписки удалось выйти в плюс на 15%. Прогнозы действительно работают!',
      rating: 5
    },
    {
      name: 'Дмитрий К.',
      text: 'Лучший канал по спортивной аналитике. Подробные разборы и высокий процент проходимости.',
      rating: 5
    },
    {
      name: 'Михаил С.',
      text: 'Следую рекомендациям уже полгода. Стабильный профит и качественная аналитика.',
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      {/* Header */}
      <header className="bg-black/80 backdrop-blur-sm border-b border-gold-500/30 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-b from-gold-300 to-gold-600 rounded-lg flex items-center justify-center relative overflow-hidden">
                  <div className="crown-icon text-2xl">👑</div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-white text-xs flex items-center justify-center text-white font-bold">1</div>
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white leading-tight">ПРОГНОЗЫ</h1>
                <div className="text-gold-400 text-sm font-semibold">НА СПОРТ №1</div>
              </div>
            </div>
            <a
              href="https://t.me/+UD8DYv3MgfUxNWU6"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gradient-to-r from-gold-400 to-gold-600 text-black px-6 py-2 rounded-lg font-bold hover:from-gold-500 hover:to-gold-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              📱 Перейти в Telegram
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20">
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-blue-900/70"></div>
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1700085663927-d223c604fb57)' }}
        ></div>
        <div className="relative container mx-auto px-4">
          <div className="text-center max-w-4xl mx-auto">
            {/* Logo Section */}
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-b from-gold-300 to-gold-600 rounded-full mb-4 shadow-2xl">
                <div className="crown-icon text-4xl">👑</div>
              </div>
              <h2 className="text-5xl md:text-6xl font-bold text-white mb-2 leading-tight">
                ПРОГНОЗЫ
              </h2>
              <div className="text-3xl md:text-4xl font-bold mb-4">
                <span className="text-white">НА </span>
                <span className="bg-gradient-to-r from-gold-400 to-gold-600 bg-clip-text text-transparent">СПОРТ</span>
                <span className="text-blue-400"> №1</span>
              </div>
              <p className="text-xl text-gray-200 mb-8 leading-relaxed max-w-3xl mx-auto">
                Лучшие аналитики мира предоставляют экспертные прогнозы на бейсбол, футбол, хоккей и киберспорт.
                <br />
                <span className="text-gold-400 font-semibold">Стабильный профит с доказанной статистикой успешности.</span>
              </p>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
              <div className="bg-black/60 backdrop-blur-sm rounded-lg p-6 border border-gold-500/30 hover:border-gold-500/60 transition-all">
                <div className="text-4xl font-bold text-gold-400 mb-2">{stats.totalPredictions}</div>
                <div className="text-white text-sm font-medium">Всего прогнозов</div>
              </div>
              <div className="bg-black/60 backdrop-blur-sm rounded-lg p-6 border border-gold-500/30 hover:border-gold-500/60 transition-all">
                <div className="text-4xl font-bold text-gold-400 mb-2">{stats.successRate}%</div>
                <div className="text-white text-sm font-medium">Проходимость</div>
              </div>
              <div className="bg-black/60 backdrop-blur-sm rounded-lg p-6 border border-gold-500/30 hover:border-gold-500/60 transition-all">
                <div className="text-4xl font-bold text-gold-400 mb-2">{stats.activeBettors}</div>
                <div className="text-white text-sm font-medium">Активных подписчиков</div>
              </div>
              <div className="bg-black/60 backdrop-blur-sm rounded-lg p-6 border border-gold-500/30 hover:border-gold-500/60 transition-all">
                <div className="text-4xl font-bold text-gold-400 mb-2">{stats.monthlyWins}</div>
                <div className="text-white text-sm font-medium">Побед в месяц</div>
              </div>
            </div>

            <a
              href="https://t.me/+UD8DYv3MgfUxNWU6"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-3 bg-gradient-to-r from-gold-400 to-gold-600 text-black px-8 py-4 rounded-lg font-bold text-lg hover:from-gold-500 hover:to-gold-700 transition-all duration-300 transform hover:scale-105 shadow-xl"
            >
              <span>🚀 ПОЛУЧИТЬ ПРОГНОЗЫ</span>
            </a>
          </div>
        </div>
      </section>

      {/* Sports Sections */}
      <section className="py-20 bg-gradient-to-b from-gray-900 to-black">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold text-white mb-4">Наши специализации</h3>
            <p className="text-xl text-gray-300">Экспертная аналитика по всем популярным видам спорта</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {sports.map((sport, index) => (
              <div key={index} className="bg-black/40 backdrop-blur-sm rounded-xl overflow-hidden border border-gold-500/20 hover:border-gold-500/50 transition-all duration-300 transform hover:scale-105">
                <div className="h-48 overflow-hidden relative">
                  <img
                    src={sport.image}
                    alt={sport.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                </div>
                <div className="p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <span className="text-3xl">{sport.icon}</span>
                    <h4 className="text-xl font-bold text-white">{sport.name}</h4>
                  </div>
                  <p className="text-gray-300 mb-4 text-sm leading-relaxed">{sport.description}</p>
                  <div className="flex justify-between items-center">
                    <div className="text-center">
                      <div className="text-gold-400 font-bold text-lg">{sport.stats.predictions}</div>
                      <div className="text-gray-400 text-xs">прогнозов</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gold-400 font-bold text-lg">{sport.stats.accuracy}%</div>
                      <div className="text-gray-400 text-xs">точность</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-gradient-to-b from-black to-gray-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold text-white mb-4">Отзывы клиентов</h3>
            <p className="text-xl text-gray-300">Что говорят наши подписчики</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-black/60 backdrop-blur-sm rounded-xl p-6 border border-gold-500/20 hover:border-gold-500/40 transition-all">
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <span key={i} className="text-gold-400 text-xl">⭐</span>
                  ))}
                </div>
                <p className="text-gray-200 mb-4 italic leading-relaxed">"{testimonial.text}"</p>
                <div className="text-gold-400 font-semibold">— {testimonial.name}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-gold-400 via-gold-500 to-gold-600">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto">
            <div className="crown-icon text-6xl mb-6">👑</div>
            <h3 className="text-4xl md:text-5xl font-bold text-black mb-6">
              Готовы стать №1?
            </h3>
            <p className="text-xl text-black/80 mb-8 max-w-2xl mx-auto leading-relaxed">
              Присоединяйтесь к нашему Telegram каналу и получите доступ к эксклюзивным прогнозам
              и детальной аналитике от лучших экспертов мира.
            </p>
            <a
              href="https://t.me/+UD8DYv3MgfUxNWU6"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-3 bg-black text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-800 transition-all duration-300 transform hover:scale-105 shadow-xl"
            >
              <span>📈 ПРИСОЕДИНИТЬСЯ К КАНАЛУ</span>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black py-12 border-t border-gold-500/20">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-4 mb-6">
            <div className="w-10 h-10 bg-gradient-to-b from-gold-300 to-gold-600 rounded-lg flex items-center justify-center">
              <span className="crown-icon text-2xl">👑</span>
            </div>
            <div>
              <h4 className="text-xl font-bold text-white">ПРОГНОЗЫ НА СПОРТ №1</h4>
            </div>
          </div>
          <p className="text-gray-300 mb-6 text-lg">
            Лучшие аналитики мира • Профессиональные спортивные прогнозы
          </p>
          <div className="text-gray-400 text-sm">
            © 2025 Прогнозы на спорт №1. Все права защищены.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;