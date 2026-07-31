import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30-second timeout for Cloud Host (Render/Railway) cold starts
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});


export default api;
