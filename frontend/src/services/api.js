import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 45000,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('geocommerce_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token on 401 and redirect to login if not already there
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        localStorage.removeItem('geocommerce_token');
        localStorage.removeItem('geocommerce_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

