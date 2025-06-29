import React, { useState } from 'react';
import { authAPI } from '../services/api';

const AuthModal = ({ isOpen, onClose, onSuccess }) => {
  const [authMode, setAuthMode] = useState('login'); // 'login', 'register', 'verify', 'forgot'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [telegramLoading, setTelegramLoading] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    confirmPassword: '',
    verificationToken: ''
  });

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError('');
    if (success) setSuccess('');
  };

  // Handle login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authAPI.login({
        email: formData.email,
        password: formData.password
      });

      const { token, user } = response.data;
      
      // Save token and user data
      if (rememberMe) {
        localStorage.setItem('authToken', token);
        localStorage.setItem('userData', JSON.stringify(user));
      } else {
        sessionStorage.setItem('authToken', token);
        sessionStorage.setItem('userData', JSON.stringify(user));
      }
      
      setSuccess('Вход выполнен успешно!');
      onSuccess && onSuccess(user);
      setTimeout(() => onClose(), 1000);
      
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Ошибка входа';
      
      if (error.response?.data?.require_verification) {
        setError(errorMessage);
        setAuthMode('verify');
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle registration
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await authAPI.register({
        email: formData.email,
        username: formData.username,
        password: formData.password,
        confirmPassword: formData.confirmPassword
      });

      setSuccess('Регистрация успешна! Проверьте email для подтверждения');
      setAuthMode('verify');
      
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Ошибка регистрации';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle email verification
  const handleVerifyEmail = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authAPI.verifyEmail(formData.verificationToken);
      
      const { token, user } = response.data;
      
      // Auto-login after verification
      localStorage.setItem('authToken', token);
      localStorage.setItem('userData', JSON.stringify(user));
      
      setSuccess('Email успешно подтверждён!');
      onSuccess && onSuccess(user);
      setTimeout(() => onClose(), 1000);
      
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Ошибка подтверждения';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle resend verification
  const handleResendVerification = async () => {
    if (!formData.email) {
      setError('Введите email для повторной отправки');
      return;
    }

    setLoading(true);
    try {
      await authAPI.resendVerification(formData.email);
      setSuccess('Письмо подтверждения отправлено повторно');
    } catch (error) {
      setError(error.response?.data?.error || 'Ошибка отправки');
    } finally {
      setLoading(false);
    }
  };

  // Handle forgot password
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await authAPI.forgotPassword(formData.email);
      setSuccess('Инструкции по сбросу пароля отправлены на email');
    } catch (error) {
      setError(error.response?.data?.error || 'Ошибка отправки');
    } finally {
      setLoading(false);
    }
  };

  // Handle Telegram auth
  const handleTelegramAuth = async () => {
    setTelegramLoading(true);
    setError('');

    try {
      const response = await authAPI.telegramAuthStart(formData.email || '');
      const { telegram_url, auth_token } = response.data;
      
      // Open Telegram bot in new window
      window.open(telegram_url, '_blank');
      
      // Start polling for auth status
      pollTelegramAuthStatus(auth_token);
      
    } catch (error) {
      setError(error.response?.data?.error || 'Ошибка Telegram авторизации');
      setTelegramLoading(false);
    }
  };

  // Poll Telegram auth status
  const pollTelegramAuthStatus = async (authToken) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await authAPI.telegramAuthStatus(authToken);
        const data = response.data;
        
        if (data.status === 'confirmed') {
          clearInterval(pollInterval);
          
          // Save token and user data
          localStorage.setItem('authToken', data.token);
          localStorage.setItem('userData', JSON.stringify(data.user));
          
          setSuccess('Вход через Telegram выполнен успешно!');
          setTelegramLoading(false);
          onSuccess && onSuccess(data.user);
          setTimeout(() => onClose(), 1000);
        }
      } catch (error) {
        clearInterval(pollInterval);
        setError('Ошибка авторизации через Telegram');
        setTelegramLoading(false);
      }
    }, 2000);

    // Stop polling after 5 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
      if (telegramLoading) {
        setTelegramLoading(false);
        setError('Время ожидания истекло');
      }
    }, 5 * 60 * 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 px-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-0 relative overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl z-10"
          aria-label="Закрыть"
        >
          ✖
        </button>

        {/* Header */}
        <div className="text-center py-6 px-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {authMode === 'login' && 'АВТОРИЗАЦИЯ'}
            {authMode === 'register' && 'РЕГИСТРАЦИЯ'}
            {authMode === 'verify' && 'ПОДТВЕРЖДЕНИЕ EMAIL'}
            {authMode === 'forgot' && 'СБРОС ПАРОЛЯ'}
          </h2>
        </div>

        <div className="px-6 pb-6">
          {/* Error/Success messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
          
          {success && (
            <div className="mb-4 p-3 bg-green-100 border border-green-400 rounded-lg text-green-700 text-sm">
              {success}
            </div>
          )}

          {/* Login Form */}
          {authMode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Введите e-mail
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e-mail"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Введите пароль
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Пароль"
                  required
                  disabled={loading}
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-600">Запомнить</span>
                </label>
                <button
                  type="button"
                  onClick={() => setAuthMode('forgot')}
                  className="text-sm text-gray-600 hover:text-gray-800 underline"
                >
                  Забыли пароль?
                </button>
              </div>

              {/* Telegram Auth Button */}
              <button
                type="button"
                onClick={handleTelegramAuth}
                disabled={telegramLoading}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <span>📱</span>
                <span>{telegramLoading ? 'Ожидание подтверждения...' : 'Войти через Telegram'}</span>
              </button>

              {/* Login Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Вход...' : 'Войти'}
              </button>

              <div className="text-center mt-4">
                <span className="text-sm text-gray-600">Нет аккаунта? </span>
                <button
                  type="button"
                  onClick={() => setAuthMode('register')}
                  className="text-sm text-blue-600 hover:text-blue-800 underline font-medium"
                >
                  Зарегистрироваться
                </button>
              </div>
            </form>
          )}

          {/* Registration Form */}
          {authMode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="your@email.com"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Имя пользователя
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ваше имя"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Пароль
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Минимум 6 символов"
                  required
                  disabled={loading}
                  minLength="6"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Подтвердите пароль
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Повторите пароль"
                  required
                  disabled={loading}
                  minLength="6"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Регистрация...' : 'Зарегистрироваться'}
              </button>

              <div className="text-center mt-4">
                <span className="text-sm text-gray-600">Уже есть аккаунт? </span>
                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className="text-sm text-blue-600 hover:text-blue-800 underline font-medium"
                >
                  Войти
                </button>
              </div>
            </form>
          )}

          {/* Email Verification Form */}
          {authMode === 'verify' && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-6xl mb-4">📧</div>
                <p className="text-gray-600 mb-4">
                  Мы отправили письмо с кодом подтверждения на ваш email
                </p>
              </div>

              <form onSubmit={handleVerifyEmail}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Код подтверждения из email
                  </label>
                  <input
                    type="text"
                    name="verificationToken"
                    value={formData.verificationToken}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Введите код из письма"
                    required
                    disabled={loading}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 mt-4"
                >
                  {loading ? 'Подтверждение...' : 'Подтвердить'}
                </button>
              </form>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={loading}
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  Отправить код повторно
                </button>
              </div>
            </div>
          )}

          {/* Forgot Password Form */}
          {authMode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="text-center mb-4">
                <div className="text-6xl mb-4">🔐</div>
                <p className="text-gray-600">
                  Введите ваш email для сброса пароля
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="your@email.com"
                  required
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Отправка...' : 'Отправить инструкции'}
              </button>

              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  Вернуться к входу
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;