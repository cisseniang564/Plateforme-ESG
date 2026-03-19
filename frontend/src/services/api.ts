import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { ApiError } from '@/types/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Ajouter le token d'accès
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Refresh simple une seule fois
let isRefreshing = false;

const isAuthRoute = (url?: string) => {
  if (!url) return false;
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/register') ||
    url.includes('/auth/refresh') ||
    url.includes('/auth/logout')
  );
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Si pas de réponse backend, on ne déconnecte pas
    if (!error.response) {
      return Promise.reject(error);
    }

    // Gérer les 401
    if (error.response.status === 401 && !originalRequest?._retry) {
      const refreshToken = localStorage.getItem('refresh_token');

      // Si pas de refresh token, on ne force pas la déconnexion automatique.
      // On laisse la page gérer l'erreur pour éviter les redirections brutales
      // quand un endpoint détail répond 401 à tort.
      if (!refreshToken) {
        console.error('401 reçu sans refresh token :', error.response.data);
        return Promise.reject(error);
      }

      // Ne jamais tenter de refresh sur les routes d'auth elles-mêmes
      if (isAuthRoute(originalRequest?.url)) {
        return Promise.reject(error);
      }

      // Éviter les boucles
      if (isRefreshing) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshResponse = await axios.post(`${API_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const newAccessToken =
          refreshResponse.data?.access_token ||
          refreshResponse.data?.tokens?.access_token;

        const newRefreshToken =
          refreshResponse.data?.refresh_token ||
          refreshResponse.data?.tokens?.refresh_token;

        if (!newAccessToken) {
          throw new Error('Aucun nouveau token reçu');
        }

        localStorage.setItem('access_token', newAccessToken);
        if (newRefreshToken) {
          localStorage.setItem('refresh_token', newRefreshToken);
        }

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        isRefreshing = false;

        return api(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        console.error('Échec du refresh token :', refreshError);
        // Ne pas supprimer la session automatiquement ici.
        // On laisse le composant appelant gérer le 401 pour éviter
        // les déconnexions intempestives sur les pages détail.
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;