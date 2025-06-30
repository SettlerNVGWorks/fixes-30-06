import axios from 'axios';

// Smart backend URL detection
const getBackendURL = () => {
  console.log('🔍 Detecting backend URL...');
  console.log('   hostname:', window.location.hostname);
  console.log('   protocol:', window.location.protocol);
  
  // For localhost, use direct backend URL
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    const url = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
    console.log('   → Using localhost backend:', url);
    return url;
  }
  
  // For external tunnels (ngrok, localtunnel, etc.), use current domain + direct backend port
  if (window.location.hostname.includes('ngrok') || 
      window.location.hostname.includes('loca.lt') || 
      window.location.hostname.includes('trycloudflare.com')) {
    
    // Check if there's a specific tunnel backend URL set
    if (process.env.REACT_APP_BACKEND_URL_NGROK) {
      console.log('   → Using tunnel backend URL:', process.env.REACT_APP_BACKEND_URL_NGROK);
      return process.env.REACT_APP_BACKEND_URL_NGROK;
    }
    
    // Otherwise use the direct backend URL (this won't work for tunnels)
    const directUrl = 'http://localhost:8001';
    console.log('   → Using direct backend (may not work for tunnels):', directUrl);
    return directUrl;
  }
  
  // For any other domain, use current origin (for production)
  const origin = window.location.origin;
  console.log('   → Using current origin:', origin);
  return origin;
};

const API_BASE_URL = getBackendURL();

console.log('🔗 API Base URL:', API_BASE_URL);
console.log('🌐 Environment Variables:', {
  REACT_APP_BACKEND_URL: process.env.REACT_APP_BACKEND_URL,
  NODE_ENV: process.env.NODE_ENV,
  hostname: window.location.hostname,
  protocol: window.location.protocol,
  isNgrok: window.location.hostname.includes('ngrok')
});

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 секунд таймаут
});

// Add request logging
api.interceptors.request.use(
  (config) => {
    console.log(`🔄 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
    return response;
  },
  (error) => {
    console.error('❌ API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.message,
      response: error.response?.data
    });
    
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// Auth API functions
export const authAPI = {
  register: (userData) => api.post('/api/auth/register', userData),
  login: (credentials) => api.post('/api/auth/login', credentials),
  logout: () => api.post('/api/auth/logout'),
  getProfile: () => api.get('/api/auth/profile'),
  changePassword: (passwordData) => api.put('/api/auth/change-password', passwordData),
  verifyEmail: (token) => api.post('/api/auth/verify-email', { token }),
  resendVerification: (email) => api.post('/api/auth/resend-verification', { email }),
  forgotPassword: (email) => api.post('/api/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/api/auth/reset-password', data),
  telegramAuthStart: (email) => api.post('/api/auth/telegram-auth-start', { email }),
  telegramAuthStatus: (token) => api.get(`/api/auth/telegram-auth-status/${token}`),
};

// Sports API functions
export const sportsAPI = {
  getStats: () => api.get('/api/stats'),
  getPredictions: (params = {}) => api.get('/api/predictions', { params }),
  getPrediction: (id) => api.get(`/api/predictions/${id}`),
  getSportStats: (sport) => api.get(`/api/sports/${sport}/stats`),
  getTelegramStats: () => api.get('/api/telegram/stats'),
};

// Matches API functions
export const matchesAPI = {
  getTodayMatches: () => api.get('/api/matches/today'),
  getMatchesBySport: (sport) => api.get(`/api/matches/sport/${sport}`),
  refreshMatches: () => api.post('/api/matches/refresh'),
};

// Health check
export const healthAPI = {
  check: () => api.get('/api/health'),
};

export default api;