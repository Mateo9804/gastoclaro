import axios from 'axios';

// Usamos variables de entorno para que sea flexible entre LOCAL y PRODUCCIÓN
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/gastoclaro/backend/public/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000, // Aumentado para OCR pesado en Render
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
