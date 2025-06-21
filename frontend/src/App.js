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
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900">
      {/* Header */}
      <header className="bg-blue-900/50 backdrop-blur-sm border-b border-gold-500/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-gold-400 to-gold-600 rounded-lg flex items-center justify-center">
                <span className="text-blue-900 font-bold text-xl">SP</span>
              </div>
              <h1 className="text-2xl font-bold text-white">Sport Prognosis</h1>
            </div>
            <a
              href="https://t.me/+UD8DYv3MgfUxNWU6"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gradient-to-r from-gold-400 to-gold-600 text-blue-900 px-6 py-2 rounded-lg font-semibold hover:from-gold-500 hover:to-gold-700 transition-all duration-300 transform hover:scale-105"
            >
              📱 Перейти в Telegram
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/90 to-blue-800/90"></div>
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1700085663927-d223c604fb57)' }}
        ></div>
        <div className="relative container mx-auto px-4 py-20">
          <div className="text-center max-w-4xl mx-auto">
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Профессиональные
              <span className="bg-gradient-to-r from-gold-400 to-gold-600 bg-clip-text text-transparent"> Прогнозы</span>
            </h2>
            <p className="text-xl text-blue-100 mb-8 leading-relaxed">
              Экспертная аналитика и прогнозы на бейсбол, футбол, хоккей и киберспорт.
              Стабильный профит с доказанной статистикой успешности.
            </p>
            
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-gold-500/20">
                <div className="text-3xl font-bold text-gold-400">{stats.totalPredictions}</div>
                <div className="text-blue-100 text-sm">Всего прогнозов</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-gold-500/20">
                <div className="text-3xl font-bold text-gold-400">{stats.successRate}%</div>
                <div className="text-blue-100 text-sm">Проходимость</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-gold-500/20">
                <div className="text-3xl font-bold text-gold-400">{stats.activeBettors}</div>
                <div className="text-blue-100 text-sm">Активных подписчиков</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-gold-500/20">
                <div className="text-3xl font-bold text-gold-400">{stats.monthlyWins}</div>
                <div className="text-blue-100 text-sm">Побед в месяц</div>
              </div>
            </div>

            <a
              href="https://t.me/+UD8DYv3MgfUxNWU6"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-3 bg-gradient-to-r from-gold-400 to-gold-600 text-blue-900 px-8 py-4 rounded-lg font-bold text-lg hover:from-gold-500 hover:to-gold-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              <span>🚀 Получить прогнозы</span>
            </a>
          </div>
        </div>
      </section>

      {/* Sports Sections */}
      <section className="py-20 bg-gradient-to-b from-blue-800 to-blue-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold text-white mb-4">Наши специализации</h3>
            <p className="text-xl text-blue-100">Экспертная аналитика по всем популярным видам спорта</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {sports.map((sport, index) => (
              <div key={index} className="bg-white/5 backdrop-blur-sm rounded-xl overflow-hidden border border-gold-500/20 hover:border-gold-500/40 transition-all duration-300 transform hover:scale-105">
                <div className="h-48 overflow-hidden">
                  <img
                    src={sport.image}
                    alt={sport.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <span className="text-3xl">{sport.icon}</span>
                    <h4 className="text-xl font-bold text-white">{sport.name}</h4>
                  </div>
                  <p className="text-blue-100 mb-4 text-sm">{sport.description}</p>
                  <div className="flex justify-between items-center">
                    <div className="text-center">
                      <div className="text-gold-400 font-bold">{sport.stats.predictions}</div>
                      <div className="text-blue-200 text-xs">прогнозов</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gold-400 font-bold">{sport.stats.accuracy}%</div>
                      <div className="text-blue-200 text-xs">точность</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-gradient-to-b from-blue-900 to-blue-800">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold text-white mb-4">Отзывы клиентов</h3>
            <p className="text-xl text-blue-100">Что говорят наши подписчики</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-gold-500/20">
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <span key={i} className="text-gold-400 text-xl">⭐</span>
                  ))}
                </div>
                <p className="text-blue-100 mb-4 italic">"{testimonial.text}"</p>
                <div className="text-gold-400 font-semibold">— {testimonial.name}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-gold-400 to-gold-600">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-4xl font-bold text-blue-900 mb-6">
            Готовы начать зарабатывать?
          </h3>
          <p className="text-xl text-blue-800 mb-8 max-w-2xl mx-auto">
            Присоединяйтесь к нашему Telegram каналу и получите доступ к эксклюзивным прогнозам
            и детальной аналитике от профессионалов.
          </p>
          <a
            href="https://t.me/+UD8DYv3MgfUxNWU6"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-3 bg-blue-900 text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-blue-800 transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            <span>📈 Присоединиться к каналу</span>
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-blue-900 py-8 border-t border-gold-500/20">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-gradient-to-r from-gold-400 to-gold-600 rounded-lg flex items-center justify-center">
              <span className="text-blue-900 font-bold">SP</span>
            </div>
            <h4 className="text-xl font-bold text-white">Sport Prognosis</h4>
          </div>
          <p className="text-blue-200 mb-4">
            Профессиональные спортивные прогнозы и аналитика
          </p>
          <div className="text-blue-300 text-sm">
            © 2025 Sport Prognosis. Все права защищены.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;