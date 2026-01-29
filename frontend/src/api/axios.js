import axios from 'axios';

// FORZAMOS EL PUERTO 8080 QUE ES EL QUE USA TU XAMPP
const API_URL = 'http://localhost:8080/gastoclaro/backend/public/api';

console.log("🚀 CONEXIÓN FORZADA A:", API_URL);

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
