import React, { useState, useEffect } from 'react';
import './App.css';
import crownImage from './source_pics/main-pic.jpg';
import logoVideo from './source_pics/main-vid.mp4';
import onewin_logo from './source_pics/1win-mid-1280x720-1.png';
import { authAPI, sportsAPI } from './services/api';

function App() {
  const [showServices, setShowServices] = useState(false);
  const [showSponsor, setShowSponsor] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [showGame, setShowGame] = useState(false);
  const [showFAQ, setShowFAQ] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [showBot, setShowBot] = useState(false);

  // Authentication states
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [authMode, setAuthMode] = useState('login'); // 'login', 'register', 'profile', 'changePassword'
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');

  // Form states
  const [formData, setFormData] = useState({
    telegram_tag: '',
    username: '',
    password: '',
    confirmPassword: '',
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });

  const [stats, setStats] = useState({
    totalPredictions: 1247,
    successRate: 78.5,
    activeBettors: 5892,
    monthlyWins: 342
  });

  // Check for existing token on component mount
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');
    
    if (token && userData) {
      try {
        const user = JSON.parse(userData);
        setCurrentUser(user);
        setIsLoggedIn(true);
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
      }
    }

    // Load stats from backend
    loadStats();
  }, []);

  // Load statistics from backend
  const loadStats = async () => {
    try {
      const response = await sportsAPI.getStats();
      const data = response.data;
      setStats({
        totalPredictions: data.total_predictions,
        successRate: data.success_rate,
        activeBettors: data.active_bettors,
        monthlyWins: data.monthly_wins
      });
    } catch (error) {
      console.error('Error loading stats:', error);
      // Keep default values if API fails
    }
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear errors when user types
    if (authError) setAuthError('');
    if (authSuccess) setAuthSuccess('');
  };

  // Handle registration
  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    setAuthSuccess('');

    try {
      const response = await authAPI.register({
        telegram_tag: formData.telegram_tag,
        username: formData.username,
        password: formData.password,
        confirmPassword: formData.confirmPassword
      });

      const { token, user } = response.data;
      
      // Save token and user data
      localStorage.setItem('authToken', token);
      localStorage.setItem('userData', JSON.stringify(user));
      
      setCurrentUser(user);
      setIsLoggedIn(true);
      setAuthMode('profile');
      setAuthSuccess('Регистрация прошла успешно!');
      
      // Clear form
      setFormData({
        telegram_tag: '',
        username: '',
        password: '',
        confirmPassword: '',
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: ''
      });
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Ошибка регистрации';
      setAuthError(errorMessage);
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle login
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    setAuthSuccess('');

    try {
      const response = await authAPI.login({
        username: formData.username,
        password: formData.password
      });

      const { token, user } = response.data;
      
      // Save token and user data
      localStorage.setItem('authToken', token);
      localStorage.setItem('userData', JSON.stringify(user));
      
      setCurrentUser(user);
      setIsLoggedIn(true);
      setAuthMode('profile');
      setAuthSuccess('Вход выполнен успешно!');
      
      // Clear form
      setFormData({
        telegram_tag: '',
        username: '',
        password: '',
        confirmPassword: '',
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: ''
      });
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Ошибка входа';
      setAuthError(errorMessage);
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle password change
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    setAuthSuccess('');

    try {
      await authAPI.changePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
        confirmNewPassword: formData.confirmNewPassword
      });

      setAuthSuccess('Пароль успешно изменен!');
      
      // Clear form
      setFormData({
        ...formData,
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: ''
      });
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Ошибка смены пароля';
      setAuthError(errorMessage);
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage and state
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      setCurrentUser(null);
      setIsLoggedIn(false);
      setAuthMode('login');
      setShowAccount(false);
      setAuthError('');
      setAuthSuccess('');
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('ru-RU');
    } catch (error) {
      return dateString;
    }
  };

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
      image: 'https://www.oradesibiu.ro/wp-content/uploads/2021/10/E-Sports.jpg',
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
                <img src={crownImage} alt="Crown" className="w-32 h-32 object-contain" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white leading-tight">ПРОГНОЗЫ</h1>
                <div className="text-gold-400 text-sm font-semibold">НА СПОРТ №1</div>
              </div>
            </div>
        <div className="flex items-center space-x-3">
          {/* Account Button */}
          <button
            onClick={() => setShowAccount(true)}
            className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center animate-pulse hover:bg-white/20 transition"
            aria-label="Аккаунт"
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </button>
          
          {/* Hamburger Menu Button */}
          <button
            onClick={() => setMenuOpen(true)}
            className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center animate-pulse hover:bg-white/20 transition"
            aria-label="Открыть меню"
          >
            <div className="space-y-1">
              <span className="block w-6 h-0.5 bg-white"></span>
              <span className="block w-6 h-0.5 bg-white"></span>
              <span className="block w-6 h-0.5 bg-white"></span>
            </div>
          </button>
        </div>






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
              <h2 className="text-5xl md:text-6xl font-bold text-white mb-2 leading-tight">
                ПРОГНОЗЫ
              </h2>
              <div className="text-3xl md:text-4xl font-bold mb-4">
                <span className="text-white">НА </span>
                <span className="text-white">СПОРТ</span>
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
              className="inline-flex items-center space-x-3 bg-gradient-to-r from-gold-400 to-gold-600 text-white px-8 py-4 rounded-lg font-bold text-lg hover:from-gold-500 hover:to-gold-700 transition-all duration-300 transform hover:scale-105 shadow-xl"
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
          <div className="w-150 h-820 object-contain mx-auto mb-6">
            <video
              src={logoVideo}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          </div>
          <h3 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Готовы стать №1?
            </h3>
            <p className="text-xl text-white mb-8 max-w-2xl mx-auto leading-relaxed">
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
            <img src={crownImage} alt="Crown" className="w-6 h-6 object-contain" />
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
      
      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-60 flex justify-end">
          <div className="w-64 bg-[#0a1b2a] text-white h-full p-6 shadow-lg border-l border-blue-100 relative animate-slide-in-right">
            <button
              onClick={() => setMenuOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl"
            >
              ✖
            </button>
            <div className="space-y-4 mt-12">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setShowServices(true);
                }}
                className="block w-full text-left text-blue-300 hover:text-blue-100 font-semibold border-t border-blue-100 py-3 px-2 hover:bg-blue-900/20 transition"
              >
                💼 Наши услуги
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setShowBot(true);
                }}
                className="block w-full text-left text-blue-300 hover:text-blue-100 font-semibold border-t border-blue-100 py-3 px-2 hover:bg-blue-900/20 transition"
              >
                🤖 Наш бот
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setShowGame(true);
                }}
                className="block w-full text-left text-blue-300 hover:text-blue-100 font-semibold border-t border-blue-100 py-3 px-2 hover:bg-blue-900/20 transition"
              >
                🎮 Мини-игра
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setShowSponsor(true);
                }}
                className="block w-full text-left text-blue-300 hover:text-blue-100 font-semibold border-t border-blue-100 py-3 px-2 hover:bg-blue-900/20 transition"
              >
                🤝 Наши спонсоры
              </button>
              
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setShowContact(true);
                }}
                className="block w-full text-left text-blue-300 hover:text-blue-100 font-semibold border-t border-blue-100 py-3 px-2 hover:bg-blue-900/20 transition"
              >
                📞 Контакты
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setShowFAQ(true);
                }}
                className="block w-full text-left text-blue-300 hover:text-blue-100 font-semibold border-t border-blue-100 py-3 px-2 hover:bg-blue-900/20 transition"
              >
                ❓ FAQ
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Модальное окно: Наши услуги */}
      {showServices && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 px-4">
          <div className="bg-[#0a1b2a] text-white rounded-xl shadow-2xl max-w-lg w-full p-6 relative border border-yellow-500 overflow-y-auto max-h-[80vh]">
            <h2 className="text-2xl font-bold mb-6 text-center">Наши услуги</h2>

            {/* ОРДИНАР */}
            <div className="mb-6 p-4 bg-[#142b45] rounded-lg border border-yellow-400">
              <h3 className="text-lg font-semibold mb-2">🎯 ОРДИНАР — 599₽</h3>
              <p className="mb-4">
                Одиночный прогноз с коэффициентом от 1.8 до 2.2. Надёжность около 98%. Отличный выбор для тех, кто хочет ставить уверенно и постепенно увеличивать банк.
              </p>
              <button
                className="bg-yellow-500 hover:bg-yellow-600 text-[#0a1b2a] font-bold py-2 px-4 rounded transition"
                onClick={() => alert('Покупка ОРДИНАРа')}
              >
                Купить
              </button>
            </div>

            {/* ДВОЙНИК */}
            <div className="mb-6 p-4 bg-[#142b45] rounded-lg border border-yellow-400">
              <h3 className="text-lg font-semibold mb-2">⚡ ДВОЙНИК — 999₽</h3>
              <p className="mb-4">
                Прогноз на два события с общим коэффициентом от 1.99 до 2.5. Надёжность около 95%. Для тех, кто хочет немного больше риска, но при этом высокую проходимость.
              </p>
              <button
                className="bg-yellow-500 hover:bg-yellow-600 text-[#0a1b2a] font-bold py-2 px-4 rounded transition"
                onClick={() => alert('Покупка ДВОЙНИКа')}
              >
                Купить
              </button>
            </div>

            {/* ЭКСПРЕСС */}
            <div className="mb-6 p-4 bg-[#142b45] rounded-lg border border-yellow-400">
              <h3 className="text-lg font-semibold mb-2">🚀 ЭКСПРЕСС — 1999₽</h3>
              <p className="mb-4">
                Несколько событий с коэффициентом от 3.5 до 6.5. Надёжность около 99%. Подходит для опытных игроков, готовых на более крупные выигрыши.
              </p>
              <button
                className="bg-yellow-500 hover:bg-yellow-600 text-[#0a1b2a] font-bold py-2 px-4 rounded transition"
                onClick={() => alert('Покупка ЭКСПРЕССа')}
              >
                Купить
              </button>
            </div>

            {/* VIP КАНАЛ */}
            <div className="p-4 bg-[#142b45] rounded-lg border border-yellow-400">
              <h3 className="text-lg font-semibold mb-2">👑 VIP КАНАЛ — Только уверенные события</h3>
              <p className="mb-4">Доступ к самым надёжным прогнозам и разбору матчей:</p>
              <ul className="list-disc list-inside mb-4">
                <li>Неделя — 3500₽ </li>
                <li>Месяц — 15000₽ </li>
                <li>Год — 50000₽ </li>
              </ul>
              <button
                className="bg-yellow-500 hover:bg-yellow-600 text-[#0a1b2a] font-bold py-2 px-4 rounded transition"
                onClick={() => alert('Покупка ВИПа')}
              >
                Купить
              </button>
            </div>

            <button
              onClick={() => setShowServices(false)}
              className="absolute top-3 right-3 text-gray-600 hover:text-black text-xl"
              aria-label="Закрыть окно услуг"
            >
              ✖
            </button>
          </div>
        </div>
      )}
      {/* Модальное окно: Наш бот */}
      {showBot && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 px-4">
          <div className="bg-[#123045] text-white rounded-xl shadow-2xl max-w-md w-full p-6 relative border border-yellow-500 overflow-y-auto max-h-[80vh]">
            <h2 className="text-2xl font-bold mb-4">🤖 Наш бот</h2>
            <p className="mb-4">
              Наш бот — это удобный помощник в Telegram, который помогает вам быть в курсе всех прогнозов и управлять подпиской напрямую из мессенджера. Вот что он умеет:
            </p>
            <ul className="list-disc list-inside mb-4 space-y-2 text-sm">
              <li>🔔 Уведомляет вас о новых прогнозах сразу после публикации.</li>
              <li>👤 Позволяет просматривать ваши личные данные и статус подписки.</li>
              <li>⚙️ Работает через встроенное Telegram-приложение для быстрого и удобного взаимодействия с нашим сервисом.</li>
              <li>💬 Поддерживает обратную связь — вы можете отправить вопрос или запросить помощь прямо в чате с ботом.</li>
            </ul>
            <p className="mb-6">
              Чтобы начать пользоваться ботом, просто перейдите по ссылке:
              <br />
              <a
                href="https://t.me/ByWin52Bot"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 underline"
              >
                https://t.me/ByWin52Bot
              </a>
            </p>
            <button
              onClick={() => setShowBot(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-white text-xl"
              aria-label="Закрыть окно бота"
            >
              ✖
            </button>
          </div>
        </div>
      )}


      {/* Модальное окно: Аккаунт/Аутентификация */}
      {showAccount && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 px-4">
          <div className="bg-[#0a1b2a] text-white rounded-xl shadow-2xl max-w-lg w-full p-6 relative border border-yellow-500 max-h-[80vh] overflow-y-auto">
            
            {!isLoggedIn ? (
              // Форма входа/регистрации
              <div>
                <div className="flex justify-center mb-6">
                  <button
                    onClick={() => setAuthMode('login')}
                    className={`px-4 py-2 mr-2 rounded-lg font-semibold transition ${
                      authMode === 'login' 
                        ? 'bg-yellow-500 text-[#0a1b2a]' 
                        : 'bg-transparent text-yellow-500 border border-yellow-500'
                    }`}
                  >
                    Вход
                  </button>
                  <button
                    onClick={() => setAuthMode('register')}
                    className={`px-4 py-2 rounded-lg font-semibold transition ${
                      authMode === 'register' 
                        ? 'bg-yellow-500 text-[#0a1b2a]' 
                        : 'bg-transparent text-yellow-500 border border-yellow-500'
                    }`}
                  >
                    Регистрация
                  </button>
                </div>

                {/* Display messages */}
                {authError && (
                  <div className="mb-4 p-3 bg-red-600/20 border border-red-500 rounded-lg text-red-300 text-sm">
                    {authError}
                  </div>
                )}
                
                {authSuccess && (
                  <div className="mb-4 p-3 bg-green-600/20 border border-green-500 rounded-lg text-green-300 text-sm">
                    {authSuccess}
                  </div>
                )}

                {authMode === 'login' ? (
                  <div>
                    <h2 className="text-2xl font-bold mb-4 text-center">Вход в систему</h2>
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Имя пользователя</label>
                        <input
                          type="text"
                          name="username"
                          value={formData.username}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 bg-[#142b45] border border-yellow-400 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-300"
                          placeholder="Введите имя пользователя"
                          required
                          disabled={authLoading}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Пароль</label>
                        <input
                          type="password"
                          name="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 bg-[#142b45] border border-yellow-400 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-300"
                          placeholder="Введите пароль"
                          required
                          disabled={authLoading}
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={authLoading}
                        className="w-full bg-yellow-500 hover:bg-yellow-600 text-[#0a1b2a] font-bold py-2 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {authLoading ? 'Вход...' : 'Войти'}
                      </button>
                    </form>
                  </div>
                ) : (
                  <div>
                    <h2 className="text-2xl font-bold mb-4 text-center">Регистрация</h2>
                    <form onSubmit={handleRegister} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Telegram тег</label>
                        <input
                          type="text"
                          name="telegram_tag"
                          value={formData.telegram_tag}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 bg-[#142b45] border border-yellow-400 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-300"
                          placeholder="@username"
                          required
                          disabled={authLoading}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Имя пользователя</label>
                        <input
                          type="text"
                          name="username"
                          value={formData.username}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 bg-[#142b45] border border-yellow-400 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-300"
                          placeholder="Введите имя пользователя"
                          required
                          disabled={authLoading}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Пароль</label>
                        <input
                          type="password"
                          name="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 bg-[#142b45] border border-yellow-400 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-300"
                          placeholder="Введите пароль (минимум 6 символов)"
                          required
                          disabled={authLoading}
                          minLength="6"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Подтвердите пароль</label>
                        <input
                          type="password"
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 bg-[#142b45] border border-yellow-400 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-300"
                          placeholder="Повторите пароль"
                          required
                          disabled={authLoading}
                          minLength="6"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={authLoading}
                        className="w-full bg-yellow-500 hover:bg-yellow-600 text-[#0a1b2a] font-bold py-2 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {authLoading ? 'Регистрация...' : 'Зарегистрироваться'}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            ) : (
              // Профиль пользователя
              <div>
                <div className="flex justify-center mb-6">
                  <button
                    onClick={() => setAuthMode('profile')}
                    className={`px-4 py-2 mr-2 rounded-lg font-semibold transition ${
                      authMode === 'profile' 
                        ? 'bg-yellow-500 text-[#0a1b2a]' 
                        : 'bg-transparent text-yellow-500 border border-yellow-500'
                    }`}
                  >
                    Профиль
                  </button>
                  <button
                    onClick={() => setAuthMode('changePassword')}
                    className={`px-4 py-2 rounded-lg font-semibold transition ${
                      authMode === 'changePassword' 
                        ? 'bg-yellow-500 text-[#0a1b2a]' 
                        : 'bg-transparent text-yellow-500 border border-yellow-500'
                    }`}
                  >
                    Смена пароля
                  </button>
                </div>

                {/* Display messages */}
                {authError && (
                  <div className="mb-4 p-3 bg-red-600/20 border border-red-500 rounded-lg text-red-300 text-sm">
                    {authError}
                  </div>
                )}
                
                {authSuccess && (
                  <div className="mb-4 p-3 bg-green-600/20 border border-green-500 rounded-lg text-green-300 text-sm">
                    {authSuccess}
                  </div>
                )}

                {authMode === 'profile' ? (
                  <div>
                    <h2 className="text-2xl font-bold mb-4 text-center">Мой профиль</h2>
                    <div className="bg-[#142b45] rounded-lg p-4 space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-300">Telegram:</span>
                        <span className="text-yellow-400">{currentUser?.telegram_tag || 'Не указан'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Пользователь:</span>
                        <span className="text-yellow-400">{currentUser?.username || 'Не указан'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Дата регистрации:</span>
                        <span className="text-yellow-400">
                          {currentUser?.registration_date ? formatDate(currentUser.registration_date) : 'Не указана'}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition"
                    >
                      Выйти
                    </button>
                  </div>
                ) : (
                  <div>
                    <h2 className="text-2xl font-bold mb-4 text-center">Смена пароля</h2>
                    <form onSubmit={handleChangePassword} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Текущий пароль</label>
                        <input
                          type="password"
                          name="currentPassword"
                          value={formData.currentPassword}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 bg-[#142b45] border border-yellow-400 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-300"
                          placeholder="Введите текущий пароль"
                          required
                          disabled={authLoading}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Новый пароль</label>
                        <input
                          type="password"
                          name="newPassword"
                          value={formData.newPassword}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 bg-[#142b45] border border-yellow-400 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-300"
                          placeholder="Введите новый пароль (минимум 6 символов)"
                          required
                          disabled={authLoading}
                          minLength="6"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Подтвердите новый пароль</label>
                        <input
                          type="password"
                          name="confirmNewPassword"
                          value={formData.confirmNewPassword}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 bg-[#142b45] border border-yellow-400 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-300"
                          placeholder="Повторите новый пароль"
                          required
                          disabled={authLoading}
                          minLength="6"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={authLoading}
                        className="w-full bg-yellow-500 hover:bg-yellow-600 text-[#0a1b2a] font-bold py-2 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {authLoading ? 'Изменение...' : 'Изменить пароль'}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}
            
            <button
              onClick={() => {
                setShowAccount(false);
                setAuthError('');
                setAuthSuccess('');
              }}
              className="absolute top-3 right-3 text-gray-400 hover:text-white text-xl"
              aria-label="Закрыть окно аккаунта"
            >
              ✖
            </button>
          </div>
        </div>
      )}

      {/* Модальное окно: Мини-игра */}
      {showGame && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 px-4">
          <div className="bg-[#1a1f2e] text-white rounded-xl shadow-2xl max-w-lg w-full p-6 relative border border-yellow-500">
            <h2 className="text-2xl font-bold mb-4">Мини-игра</h2>
            <p className="text-sm text-gray-300">Скоро появится увлекательная мини-игра с возможностью выигрыша призов!</p>
            <button onClick={() => setShowGame(false)} className="absolute top-3 right-3 text-gray-400 hover:text-white text-xl">✖</button>
          </div>
        </div>
      )}

      {/* Модальное окно: FAQ */}
      {showFAQ && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 px-4">
          <div className="bg-[#1c2a38] text-white rounded-xl shadow-2xl max-w-lg w-full p-6 relative border border-yellow-500 max-h-[80vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">FAQ — Частые вопросы</h2>
            <ul className="text-sm space-y-2">
            <li>
              <strong>❓ Кто вы такие?</strong> — Мы команда профессиональных спортивных аналитиков с более чем 7-летним опытом. 
              Наша работа основана на глубоком анализе статистики, формы команд, состава игроков и других факторов, влияющих на исход спортивных событий. 
              Мы не гонимся за хайпом, а предоставляем качественные и продуманные прогнозы.
            </li>

            <li>
              <strong>💼 Как подписаться?</strong> — Всё очень просто. Нажмите кнопку Telegram на сайте и перейдите в наш канал. 
              После подключения вы получите инструкции по активации подписки через нашего бота. Оплата производится быстро и безопасно.
            </li>

            <li>
              <strong>📈 Что значит "точность прогноза"?</strong> — Это процент успешных прогнозов по отношению к общему числу. 
              Например, если из 100 прогнозов 85 зашли — это 85% точности. Мы регулярно публикуем статистику, чтобы вы могли видеть нашу реальную эффективность.
            </li>

            <li>
              <strong>💸 Безопасна ли оплата?</strong> — Да. Мы принимаем оплату через проверенные и защищённые методы: Telegram-бот, банковские переводы, криптовалюта. 
              Ваши данные не передаются третьим лицам. Мы дорожим своей репутацией и безопасностью клиентов.
            </li>

            <li>
              <strong>🎁 Есть ли пробный доступ?</strong> — Да. Мы регулярно публикуем бесплатные прогнозы в Telegram, чтобы вы могли протестировать наш подход перед покупкой. 
              Это честный способ убедиться в нашем уровне.
            </li>

            <li>
              <strong>📊 Какие услуги вы предлагаете?</strong> — Мы делаем ОРДИНАРЫ, ДВОЙНИКИ и ЭКСПРЕССЫ с высокой проходимостью. 
              Также доступна VIP-подписка, куда попадают только самые надёжные события. Подписки доступны на неделю, месяц или год.
            </li>

            <li>
              <strong>🔐 Есть ли гарантии?</strong> — Мы не обещаем 100% успех — в ставках это невозможно. 
              Но если прогноз не заходит, мы компенсируем это бонусным прогнозом. 
              Наша главная цель — долгосрочная прибыль клиентов, а не разовые ставки.
            </li>

            <li>
              <strong>📞 Как связаться с вами?</strong> — Мы всегда на связи в Telegram. Просто напишите нам — отвечаем оперативно и по существу. 
              Поддержка доступна ежедневно, без выходных.
            </li>

            <li>
              <strong>🤝 Почему вам стоит доверять?</strong> — У нас открытая статистика, настоящие отзывы клиентов, постоянная обратная связь и прозрачные условия. 
              Мы не скрываем ни успехов, ни неудач. Наша задача — стабильный доход для вас и честный сервис.
            </li>

            <li>
              <strong>📦 Что входит в подписку?</strong> — В зависимости от тарифа вы получаете:
              <ul className="list-disc list-inside ml-4">
                <li>Доступ к прогнозам в закрытом канале</li>
                <li>Подробную аналитику и разбор матчей</li>
                <li>Рекомендации по суммам ставок</li>
                <li>Бесплатные бонус-прогнозы и акции</li>
                <li>Консультации и помощь по ставкам</li>
              </ul>
            </li>
          </ul>

            <button onClick={() => setShowFAQ(false)} className="absolute top-3 right-3 text-gray-400 hover:text-white text-xl">✖</button>
          </div>
        </div>
      )}

      {/* Модальное окно: Контакты */}
      {showContact && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 px-4">
          <div className="bg-[#1d2f3a] text-white rounded-xl shadow-2xl max-w-lg w-full p-6 relative border border-yellow-500">
            <h2 className="text-2xl font-bold mb-4">Контакты</h2>

            <p className="text-sm text-gray-300 mb-2">
              🛠️ Вы можете обращаться в поддержку через форму на сайте — мы оперативно ответим на все вопросы.
            </p>

            <p className="text-sm text-gray-300 mb-2">
              📞 Админ: <a href="https://t.me/bos0009" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">@bos0009</a>
            </p>

            <p className="text-sm text-gray-300 mb-2">
              📢 Telegram-канал: <a href="https://t.me/+UD8DYv3MgfUxNWU6" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">t.me/+UD8DYv3MgfUxNWU6</a>
            </p>

            <p className="text-sm text-gray-300 mb-4">
              Присоединяйтесь к нашему каналу, чтобы получать надёжные прогнозы, бесплатные разборы и новости из мира спорта каждый день. Мы — за честную аналитику и долгосрочный профит.
            </p>

            <p className="text-sm text-gray-300">
              🌍 Мы доступны 24/7 для ваших вопросов и предложений.
            </p>

            <button 
              onClick={() => setShowContact(false)} 
              className="absolute top-3 right-3 text-gray-400 hover:text-white text-xl"
            >
              ✖
            </button>
          </div>
        </div>
      )}


      {/* Модальное окно: Спонсор */}
      {showSponsor && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 px-4">
        <div className="bg-[#0a1b2a] text-white rounded-xl shadow-2xl max-w-lg w-full p-6 relative border border-yellow-500">
            <h2 className="text-2xl font-bold mb-4">Наш спонсор — 1WIN</h2>
            <div className="space-y-4 text-sm">
              <p><strong>1WIN</strong> — ведущая международная букмекерская компания.</p>
              <p>🎁 Бонус до 25 000₽ на первый депозит</p>
              <p>📱 Удобное приложение и круглосуточная поддержка</p>
              <img
                src={onewin_logo}
                alt="1WIN Logo"
                className="w-full rounded"
              />
            </div>
            <button
              onClick={() => setShowSponsor(false)}
              className="absolute top-3 right-3 text-gray-600 hover:text-black text-xl"
            >
              ✖
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;