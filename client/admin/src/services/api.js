import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Response Interceptor: Error Normalization ─────────────────────────────────
// Ensures every rejected promise has a user-friendly `message` string.
// Internal server errors, network failures, timeouts are all caught and
// translated to meaningful text the UI can display directly.
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;

    // ── Token refresh on 401 ──
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
        localStorage.setItem('accessToken', data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch {
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(new Error('Session expired. Please log in again.'));
      }
    }

    // ── Normalize error message ──
    let message = 'Something went wrong. Please try again later.';

    if (error.response) {
      // Server responded with an error
      const serverMessage = error.response.data?.message;
      if (serverMessage && typeof serverMessage === 'string') {
        message = serverMessage;
      }
    } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      message = 'The request timed out. Please check your connection and try again.';
    } else if (error.code === 'ERR_NETWORK' || !navigator.onLine) {
      message = 'Unable to connect to the server. Please check your internet connection.';
    }

    // Attach the user-friendly message and server error code to the error object
    error.userMessage = message;
    error.errorCode = error.response?.data?.errorCode || null;
    error.requestId = error.response?.data?.requestId || null;

    return Promise.reject(error);
  }
);

export default api;
