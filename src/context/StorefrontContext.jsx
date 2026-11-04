import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import api from '../api/client';
import { Loader } from '../components/ui';

/**
 * Vitrine dédiée d'une boutique : un client arrivé par le lien partagé par le vendeur (/b/:slug)
 * ne voit que les produits de cette boutique pendant sa visite (mémorisé pour la session de l'onglet).
 */
const KEY = 'ivs_vitrine';
const StorefrontContext = createContext({ shop: null, slug: null, enter: () => {}, exit: () => {} });

const readSlug = () => { try { return sessionStorage.getItem(KEY); } catch { return null; } };

export function StorefrontProvider({ children }) {
  const [slug, setSlug] = useState(readSlug);
  const [shop, setShop] = useState(null);

  useEffect(() => {
    if (!slug) return undefined;
    let active = true;
    api.get(`/shops/${slug}`)
      .then((r) => active && setShop(r.data.data))
      .catch(() => { if (active) { setSlug(null); try { sessionStorage.removeItem(KEY); } catch { /* indisponible */ } } });
    return () => { active = false; };
  }, [slug]);

  const enter = useCallback((s) => {
    try { sessionStorage.setItem(KEY, s); } catch { /* indisponible */ }
    setShop((prev) => (prev?.slug === s ? prev : null));
    setSlug(s);
  }, []);

  const exit = useCallback(() => {
    try { sessionStorage.removeItem(KEY); } catch { /* indisponible */ }
    setSlug(null);
    setShop(null);
  }, []);

  return (
    <StorefrontContext.Provider value={{ slug, shop: shop?.slug === slug ? shop : null, enter, exit }}>
      {children}
    </StorefrontContext.Provider>
  );
}

export const useStorefront = () => useContext(StorefrontContext);

/** Point d'entrée du lien partagé : /b/:slug → vitrine de la boutique. */
export function StorefrontEntry() {
  const { slug } = useParams();
  const { enter, slug: current } = useStorefront();
  useEffect(() => { enter(slug); }, [slug, enter]);
  if (current !== slug) return <Loader />;
  return <Navigate to={`/boutique/${slug}`} replace />;
}

/** En mode vitrine, les pages « marketplace » (accueil, catalogue, boutiques) renvoient vers la vitrine. */
export function StorefrontGuard({ children, keepQuery = false }) {
  const { slug } = useStorefront();
  if (!slug) return children;
  const qs = keepQuery ? window.location.search : '';
  return <Navigate to={`/boutique/${slug}${qs}`} replace />;
}
