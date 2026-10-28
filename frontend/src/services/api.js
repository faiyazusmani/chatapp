import axios from 'axios';

// Production: same-origin by default (Vercel frontend + Render backend behind
// the same domain via rewrites). Override with VITE_API_URL when split-hosted.
const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? 'https://chatapp-jlfd.onrender.com/api' : 'http://localhost:5000/api');

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30-second timeout for Cloud Host (Render/Railway) cold starts
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Read token without importing AuthContext (avoids circular import)
const getStoredToken = () => {
  try {
    return localStorage.getItem('token');
  } catch {
    return null;
  }
};

// 🔒 Cross-origin deployments (Vercel frontend + Render backend) can't rely on
// SameSite=Lax HttpOnly cookies — they are not sent cross-site. Attach the
// JWT from localStorage as `Authorization: Bearer` on every request instead.
api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, clear the stale token so the user is bounced to /login cleanly
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && getStoredToken()) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Only redirect when the app is actually running (not during SSR/tests)
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
