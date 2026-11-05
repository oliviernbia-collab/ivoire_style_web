import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMagnifyingGlass, faCartShopping, faHeart, faUser, faStore, faBell, faRightFromBracket, faBoxOpen,
  faLocationDot, faGaugeHigh, faTruckFast, faPhone, faShieldHalved, faFire, faTags, faUserPlus, faRightToBracket,
} from '@fortawesome/free-solid-svg-icons';
import logo from '../assets/logo.png';
import { useAuth } from '../context/AuthContext';
import { useLive } from '../context/RealtimeContext';
import { UserAvatar } from './Avatar';
import { useCart } from '../context/CartContext';
import { useFeedback } from '../context/FeedbackContext';
import { useFetch } from './ui';
import { categoryIcon } from '../utils/icons';
import api, { fileUrl } from '../api/client';
import { useStorefront } from '../context/StorefrontContext';

export default function Header() {
  const { user, logout, isSeller, has } = useAuth();
  const { shop: vitrine } = useStorefront();
  const { cart } = useCart();
  const { notify, confirm } = useFeedback();
  const navigate = useNavigate();
  const location = useLocation();
  const [q, setQ] = useState('');
  const [menu, setMenu] = useState(false);
  const [unread, setUnread] = useState(0);
  const menuRef = useRef(null);
  const headerRef = useRef(null);

  // Variables CSS publiées pour les barres latérales :
  //  --header-h      : hauteur réelle de l'en-tête (barres collantes)
  //  --header-bottom : position à l'écran du bas de l'en-tête (barre fixe de l'administration),
  //                    qui varie tant que le bandeau d'information du haut est visible
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return undefined;
    const root = document.documentElement.style;
    let frame = null;
    const publish = () => {
      frame = null;
      root.setProperty('--header-h', `${el.offsetHeight}px`);
      root.setProperty('--header-bottom', `${Math.max(0, Math.round(el.getBoundingClientRect().bottom))}px`);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(publish); };
    publish();
    const observer = new ResizeObserver(schedule);
    observer.observe(el);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
  const { data: categories } = useFetch('/categories');
  const { data: settings } = useFetch('/settings/public');

  useEffect(() => { setMenu(false); }, [location.pathname]);
  useEffect(() => {
    const close = (e) => menuRef.current && !menuRef.current.contains(e.target) && setMenu(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  useEffect(() => {
    if (!user) return setUnread(0);
    api.get('/account/notifications').then((r) => setUnread(r.data.data.unread)).catch(() => {});
  }, [user, location.pathname]);
  // Nouvelle notification en temps réel : pastille mise à jour sans recharger la page
  useLive('*', () => {
    if (user) api.get('/account/notifications').then((r) => setUnread(r.data.data.unread)).catch(() => {});
  });

  const search = (e) => {
    e.preventDefault();
    const qs = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : '';
    // En vitrine, la recherche porte uniquement sur les articles de la boutique
    navigate(vitrine ? `/boutique/${vitrine.slug}${qs}` : `/catalogue${qs}`);
  };

  const doLogout = async () => {
    const ok = await confirm({ title: 'Se déconnecter ?', message: 'Vous devrez vous reconnecter pour accéder à votre compte.', confirmLabel: 'Me déconnecter' });
    if (!ok) return;
    await logout();
    notify.success('Vous êtes déconnecté. À bientôt !');
    navigate('/');
  };

  // Numéro affiché au-dessus du menu : celui de la boutique, en vitrine (lien partagé) ou dans l'espace vendeur.
  // Ailleurs, aucun numéro (celui de la plateforme reste dans le pied de page).
  const phoneShop = vitrine || (location.pathname.startsWith('/vendeur') ? user?.shop : null);
  const shopPhone = phoneShop?.phone;

  return (
    <>
      <div className={`topbar ${shopPhone ? 'has-phone' : 'hide-mobile'}`}>
        <div className="container">
          <span><FontAwesomeIcon icon={faTruckFast} /> Livraison assurée par chaque boutique, partout en Côte d’Ivoire</span>
          <span><FontAwesomeIcon icon={faShieldHalved} /> Payez en ligne la totalité, la moitié, ou seulement {settings?.deposit_rate ?? 10} % et le reste à la livraison</span>
          {shopPhone && (
            <a className="topbar-phone" href={`tel:${shopPhone.replace(/\s/g, '')}`}>
              <FontAwesomeIcon icon={faPhone} /> {phoneShop.name} : <b>{shopPhone}</b>
            </a>
          )}
        </div>
      </div>
      <header className="header" ref={headerRef}>
        <div className="container header-main">
          {vitrine ? (
            <Link to={`/boutique/${vitrine.slug}`} className="logo storefront-logo" aria-label={`Boutique ${vitrine.name}`}>
              <span className="shop-logo" style={{ width: 48, height: 48, fontSize: '1.2rem' }}>
                {vitrine.logo_url ? <img src={fileUrl(vitrine.logo_url, { w: 120 })} alt="" /> : vitrine.name[0]}
              </span>
              <span><span className="name">{vitrine.name}</span><span className="tag">sur Ivoire Style</span></span>
            </Link>
          ) : (
            <Link to="/" className="logo" aria-label="Ivoire Style – accueil">
              <img src={logo} alt="Ivoire Style" />
            </Link>
          )}
          <form className="search" onSubmit={search} role="search">
            <label htmlFor="q" className="sr-only">Rechercher</label>
            <input id="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder={vitrine ? `Rechercher chez ${vitrine.name}…` : 'Robe, boubou, boutique…'} />
            <button type="submit" aria-label="Rechercher"><FontAwesomeIcon icon={faMagnifyingGlass} /></button>
          </form>
          <div className="header-actions">
            {isSeller ? (
              <Link to="/vendeur" className="btn btn-outline btn-sm sell-link"><FontAwesomeIcon icon={faStore} /> Ma boutique</Link>
            ) : (
              <Link to="/vendre" className="btn btn-sm sell-link"><FontAwesomeIcon icon={faStore} /> Je veux vendre</Link>
            )}
            {/* Version compacte (icône) du bouton vendeur sur mobile */}
            <Link to={isSeller ? '/vendeur' : '/vendre'} className="icon-btn sell-icon"
              aria-label={isSeller ? 'Ma boutique' : 'Je veux vendre sur Ivoire Style'} title={isSeller ? 'Ma boutique' : 'Je veux vendre'}>
              <FontAwesomeIcon icon={faStore} />
            </Link>
            {user && (
              <Link to="/compte/notifications" className="icon-btn" aria-label="Notifications" title="Notifications">
                <FontAwesomeIcon icon={faBell} />{unread > 0 && <span className="count">{unread}</span>}
              </Link>
            )}
            <Link to="/compte/favoris" className="icon-btn hide-xs" aria-label="Favoris" title="Favoris"><FontAwesomeIcon icon={faHeart} /></Link>
            <Link to="/panier" className="icon-btn" aria-label="Panier" title="Panier">
              <FontAwesomeIcon icon={faCartShopping} />{cart.count > 0 && <span className="count">{cart.count}</span>}
            </Link>
            {user ? (
              <div className="dropdown" ref={menuRef}>
                <button className="icon-btn" style={{ padding: 0, overflow: 'hidden' }} onClick={() => setMenu((m) => !m)} aria-label="Mon compte" aria-expanded={menu}>
                  <UserAvatar user={user} size={40} />
                </button>
                {menu && (
                  <div className="dropdown-menu">
                    <div className="dropdown-head">
                      <b>{user.first_name} {user.last_name}</b>
                      <div className="small muted">{user.email}</div>
                    </div>
                    <Link to="/compte"><FontAwesomeIcon icon={faUser} /> Mon profil</Link>
                    <Link to="/compte/commandes"><FontAwesomeIcon icon={faBoxOpen} /> Mes commandes</Link>
                    <Link to="/compte/adresses"><FontAwesomeIcon icon={faLocationDot} /> Mes adresses</Link>
                    <Link to="/compte/favoris"><FontAwesomeIcon icon={faHeart} /> Mes favoris</Link>
                    {user.shop
                      ? <Link to="/vendeur"><FontAwesomeIcon icon={faStore} /> Espace vendeur</Link>
                      : <Link to="/vendre"><FontAwesomeIcon icon={faStore} /> Je veux vendre</Link>}
                    {(has('admin') || has('support')) && (
                      <Link to="/admin"><FontAwesomeIcon icon={faGaugeHigh} /> Administration</Link>
                    )}
                    <hr className="divider" style={{ margin: '6px 0' }} />
                    <button onClick={doLogout}><FontAwesomeIcon icon={faRightFromBracket} /> Déconnexion</button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link to="/connexion" className="btn btn-ghost btn-sm hide-mobile"><FontAwesomeIcon icon={faRightToBracket} /> Connexion</Link>
                <Link to="/inscription" className="icon-btn" aria-label="Créer un compte" title="Créer un compte"><FontAwesomeIcon icon={faUserPlus} /></Link>
              </>
            )}
          </div>
        </div>
        {vitrine ? (
          <nav className="nav" aria-label={`Boutique ${vitrine.name}`}>
            <div className="container">
              <NavLink to={`/boutique/${vitrine.slug}`} end><FontAwesomeIcon icon={faStore} /> Tous les articles</NavLink>
              <Link to={`/boutique/${vitrine.slug}?new=1`}><FontAwesomeIcon icon={faFire} /> Nouveautés</Link>
              <Link to={`/boutique/${vitrine.slug}?promo=1`}><FontAwesomeIcon icon={faTags} /> Promotions</Link>
            </div>
          </nav>
        ) : (
        <nav className="nav" aria-label="Catégories">
          <div className="container">
            <NavLink to="/catalogue?new=1"><FontAwesomeIcon icon={faFire} /> Nouveautés</NavLink>
            <NavLink to="/catalogue?promo=1"><FontAwesomeIcon icon={faTags} /> Promotions</NavLink>
            {categories?.filter((c) => !c.parent_id).map((c) => (
              <NavLink key={c.id} to={`/catalogue?category=${c.slug}`}><FontAwesomeIcon icon={categoryIcon(c.icon)} /> {c.name}</NavLink>
            ))}
            <NavLink to="/boutiques"><FontAwesomeIcon icon={faStore} /> Boutiques</NavLink>
          </div>
        </nav>
        )}
      </header>
    </>
  );
}
