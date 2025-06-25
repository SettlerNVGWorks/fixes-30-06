import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
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
};

// Sports API functions
export const sportsAPI = {
  getStats: () => api.get('/api/stats'),
  getPredictions: (params = {}) => api.get('/api/predictions', { params }),
  getPrediction: (id) => api.get(`/api/predictions/${id}`),
  getSportStats: (sport) => api.get(`/api/sports/${sport}/stats`),
  getTelegramStats: () => api.get('/api/telegram/stats'),
};

// Health check
export const healthAPI = {
  check: () => api.get('/api/health'),
};

export default api;