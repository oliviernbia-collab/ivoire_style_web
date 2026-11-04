import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';
const FILES_URL = import.meta.env.VITE_FILES_URL || '';

const ACCESS = 'ivs_access';
const REFRESH = 'ivs_refresh';

export const tokens = {
  get access() { return localStorage.getItem(ACCESS); },
  get refresh() { return localStorage.getItem(REFRESH); },
  set({ access_token, refresh_token }) {
    if (access_token) localStorage.setItem(ACCESS, access_token);
    if (refresh_token) localStorage.setItem(REFRESH, refresh_token);
  },
  clear() {
    localStorage.removeItem(ACCESS);
    localStorage.removeItem(REFRESH);
  },
};

const api = axios.create({ baseURL: API_URL, timeout: 20000 });

api.interceptors.request.use((config) => {
  const t = tokens.access;
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

let refreshing = null;
let onSessionExpired = () => {};
export const setSessionExpiredHandler = (fn) => { onSessionExpired = fn; };

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const isAuthCall = original?.url?.startsWith('/auth/');
    if (status === 401 && tokens.refresh && !original._retry && !isAuthCall) {
      original._retry = true;
      try {
        refreshing = refreshing || axios.post(`${API_URL}/auth/refresh`, { refresh_token: tokens.refresh })
          .then((r) => { tokens.set(r.data.data); return r.data.data; })
          .finally(() => { refreshing = null; });
        await refreshing;
        return api(original);
      } catch {
        tokens.clear();
        onSessionExpired();
      }
    }
    return Promise.reject(error);
  },
);

/** Message d'erreur lisible + erreurs par champ. */
export function apiError(err) {
  if (!err?.response) {
    return { message: 'Connexion impossible. Vérifiez votre réseau et réessayez.', errors: {} };
  }
  const d = err.response.data || {};
  return { message: d.message || 'Une erreur est survenue', errors: d.errors || {} };
}

const CLOUDINARY = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/(image|video)\/upload\/)(.*)$/;

/**
 * URL d'un média. Pour Cloudinary, ajoute les transformations de diffusion :
 * format et qualité automatiques (WebP/AVIF selon le navigateur) et largeur adaptée (w).
 */
export function fileUrl(url, { w } = {}) {
  if (!url) return null;
  const m = url.match(CLOUDINARY);
  if (m && m[2] === 'image') return `${m[1]}f_auto,q_auto${w ? `,c_limit,w_${w}` : ''}/${m[3]}`;
  if (m) return `${m[1]}q_auto/${m[3]}`;
  return /^https?:\/\//.test(url) ? url : `${FILES_URL}${url}`;
}

export const isVideoUrl = (url) => /\/video\/upload\//.test(url || '');

/** Image d'aperçu d'une vidéo Cloudinary (première seconde, en JPEG). */
export function videoPoster(url, w = 600) {
  const m = (url || '').match(CLOUDINARY);
  if (!m || m[2] !== 'video') return null;
  return `${m[1]}so_1,f_jpg,q_auto,c_limit,w_${w}/${m[3].replace(/\.[a-z0-9]+$/i, '.jpg')}`;
}

export default api;
