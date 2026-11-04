import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useAuth } from '../context/AuthContext';
import { Loader } from './ui';
import { initials } from '../utils/format';

/** Protège une route : connexion requise (+ rôle éventuel). */
export function RequireAuth({ roles, children }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <Loader />;
  if (!user) return <Navigate to={`/connexion?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (roles && !roles.some((r) => user.roles.includes(r))) return <Navigate to="/" replace />;
  return children || <Outlet />;
}

/**
 * Mise en page avec barre latérale (compte, vendeur, administration).
 * fixed : barre fixée au bord gauche sur toute la hauteur de l'écran (panneau d'administration).
 */
export function SpaceLayout({ links, title, subtitle, avatar, fixed = false }) {
  const { user } = useAuth();
  return (
    <div className={fixed ? 'space space-fixed' : 'container space'}>
      <aside className="sidebar" aria-label={title}>
        <div className="who">
          <div className="avatar">{avatar || initials(user)}</div>
          <div style={{ minWidth: 0 }}>
            <b style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</b>
            <span className="small muted">{subtitle}</span>
          </div>
        </div>
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end}>
            <FontAwesomeIcon icon={l.icon} /> {l.label}
            {l.count > 0 && <span className="pill">{l.count}</span>}
          </NavLink>
        ))}
      </aside>
      <main style={{ minWidth: 0 }}><Outlet /></main>
    </div>
  );
}

export function PageHead({ icon, title, children }) {
  return (
    <div className="page-head">
      <h1>{icon && <FontAwesomeIcon icon={icon} />} {title}</h1>
      {children && <div className="flex flex-wrap">{children}</div>}
    </div>
  );
}
