import { createContext, useContext, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import api, { REALTIME_URL, recentOwnAction, tokens } from '../api/client';
import { useAuth } from './AuthContext';
import { useFeedback } from './FeedbackContext';

/**
 * Temps réel : connexion Socket.IO tant que l'utilisateur est connecté.
 * - « notification » : toast + rechargement des écrans abonnés (useLive) ;
 * - « refresh » (administration / support) : rechargement des écrans de gestion, sans toast.
 */
const RealtimeContext = createContext(null);

export function RealtimeProvider({ children }) {
  const { user } = useAuth();
  const { notify } = useFeedback();
  const listeners = useRef(new Set());
  const notifyRef = useRef(notify);
  useEffect(() => { notifyRef.current = notify; }, [notify]);

  const userId = user?.id;
  useEffect(() => {
    if (!userId) return undefined;
    const socket = io(REALTIME_URL, {
      path: '/api/v1/realtime',
      auth: (cb) => cb({ token: tokens.access }), // jeton relu à chaque (re)connexion
    });
    let retries = 0;
    socket.on('connect', () => { retries = 0; });
    socket.on('connect_error', (err) => {
      // Jeton expiré : un appel à l'API le renouvelle, puis on se reconnecte
      if (err.message === 'unauthorized' && retries < 3) {
        retries += 1;
        api.get('/auth/me').then(() => socket.connect()).catch(() => {});
      }
    });
    const dispatch = (event) => listeners.current.forEach((l) => l(event));
    socket.on('notification', (n) => {
      if (!recentOwnAction()) notifyRef.current.info(n.title);
      dispatch({ ...n, kind: 'notification' });
    });
    socket.on('refresh', (e) => dispatch({ ...e, kind: 'refresh' }));
    return () => { socket.disconnect(); };
  }, [userId]);

  return <RealtimeContext.Provider value={listeners}>{children}</RealtimeContext.Provider>;
}

/**
 * Recharge un écran quand un événement temps réel le concerne.
 * types : liste de types de notification (order, payment, refund, payout…) ou '*' pour tous.
 * staff : écouter aussi les signaux de rafraîchissement de l'administration.
 */
export function useLive(types, callback, { staff = false } = {}) {
  const listeners = useContext(RealtimeContext);
  const cb = useRef(callback);
  useEffect(() => { cb.current = callback; }, [callback]);
  const key = Array.isArray(types) ? types.join(',') : types;
  useEffect(() => {
    if (!listeners) return undefined;
    let timer = null;
    const wanted = key === '*' ? null : key.split(',');
    const listener = (e) => {
      if (e.kind === 'refresh' && !staff) return;
      if (wanted && !wanted.includes(e.type)) return;
      // Plusieurs événements pour une même action : un seul rechargement
      clearTimeout(timer);
      timer = setTimeout(() => cb.current(e), 400);
    };
    const set = listeners.current;
    set.add(listener);
    return () => { clearTimeout(timer); set.delete(listener); };
  }, [listeners, key, staff]);
}
