import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { apiError } from '../api/client';
import { useAuth } from './AuthContext';
import { useFeedback } from './FeedbackContext';

const CartContext = createContext(null);
const EMPTY = { items: [], subtotal: 0, count: 0 };

export function CartProvider({ children }) {
  const { user } = useAuth();
  const { notify } = useFeedback();
  const navigate = useNavigate();
  const [cart, setCart] = useState(EMPTY);
  const [favorites, setFavorites] = useState(new Set());
  // Identifiant de l'utilisateur dont le panier a été chargé (évite les redirections avant chargement)
  const [loadedFor, setLoadedFor] = useState(null);

  const reload = useCallback(async () => {
    if (!user) {
      setCart(EMPTY);
      setFavorites(new Set());
      return;
    }
    try {
      const [c, w] = await Promise.all([api.get('/cart'), api.get('/wishlist')]);
      setCart(c.data.data);
      setFavorites(new Set(w.data.data.map((p) => p.id)));
    } catch { /* silencieux */ } finally {
      setLoadedFor(user.id);
    }
  }, [user]);
  const ready = !user || loadedFor === user.id;

  useEffect(() => { reload(); }, [reload]);

  const requireLogin = (msg) => {
    notify.info(msg);
    navigate(`/connexion?redirect=${encodeURIComponent(window.location.pathname)}`);
  };

  const run = async (fn, { silent = false } = {}) => {
    try {
      const { data } = await fn();
      if (data.data?.items) setCart(data.data);
      if (!silent && data.message) notify.success(data.message);
      return data;
    } catch (e) {
      notify.error(apiError(e).message);
      throw e;
    }
  };

  const add = (variantId, quantity = 1) => {
    if (!user) return requireLogin('Connectez-vous pour ajouter des articles au panier');
    return run(() => api.post('/cart/items', { variant_id: variantId, quantity }));
  };
  const update = (itemId, body) => run(() => api.patch(`/cart/items/${itemId}`, body), { silent: true });
  const remove = (itemId) => run(() => api.delete(`/cart/items/${itemId}`));
  const clear = () => run(() => api.delete('/cart'));

  const toggleFavorite = async (productId) => {
    if (!user) return requireLogin('Connectez-vous pour enregistrer vos favoris');
    const on = favorites.has(productId);
    try {
      const { data } = on ? await api.delete(`/wishlist/items/${productId}`) : await api.post('/wishlist/items', { product_id: productId });
      setFavorites((prev) => {
        const next = new Set(prev);
        if (on) next.delete(productId); else next.add(productId);
        return next;
      });
      notify.success(data.message);
    } catch (e) {
      notify.error(apiError(e).message);
    }
  };

  return (
    <CartContext.Provider value={{ cart, ready, setCart, reload, add, update, remove, clear, favorites, toggleFavorite }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
