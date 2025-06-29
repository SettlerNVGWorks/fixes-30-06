import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

const EmailVerification = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      setStatus('error');
      setMessage('Неверная ссылка подтверждения');
      return;
    }

    verifyEmail(token);
  }, [searchParams]);

  const verifyEmail = async (token) => {
    try {
      const response = await authAPI.verifyEmail(token);
      const { token: jwtToken, user } = response.data;
      
      // Save token and user data for auto-login
      localStorage.setItem('authToken', jwtToken);
      localStorage.setItem('userData', JSON.stringify(user));
      
      setStatus('success');
      setMessage('Email успешно подтверждён! Вы автоматически вошли в систему.');
      
      // Redirect to main page after 3 seconds
      setTimeout(() => {
        navigate('/');
        window.location.reload(); // Refresh to update auth state
      }, 3000);
      
    } catch (error) {
      setStatus('error');
      setMessage(error.response?.data?.error || 'Ошибка подтверждения email');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8 text-center">
        {status === 'verifying' && (
          <div>
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-6"></div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Подтверждение email</h2>
            <p className="text-gray-600">Пожалуйста, подождите...</p>
          </div>
        )}
        
        {status === 'success' && (
          <div>
            <div className="text-6xl mb-6">✅</div>
            <h2 className="text-2xl font-bold text-green-600 mb-4">Успешно!</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <p className="text-sm text-gray-500">Перенаправляем на главную страницу...</p>
          </div>
        )}
        
        {status === 'error' && (
          <div>
            <div className="text-6xl mb-6">❌</div>
            <h2 className="text-2xl font-bold text-red-600 mb-4">Ошибка</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <button
              onClick={() => navigate('/')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
            >
              Вернуться на главную
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailVerification;