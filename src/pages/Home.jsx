import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faStore, faBagShopping, faArrowRight, faCircleCheck, faShieldHalved, faTruckFast, faStar, faTags, faFire, faGem,
} from '@fortawesome/free-solid-svg-icons';
import elephant from '../assets/elephant.png';
import { useAuth } from '../context/AuthContext';
import { ErrorState, OfficialBadge, useFetch } from '../components/ui';
import { ProductGrid } from '../components/ProductCard';
import { Features } from '../components/Footer';
import { categoryIcon } from '../utils/icons';
import { fileUrl } from '../api/client';
import { SITE_NAME, SITE_URL, useSeo } from '../utils/seo';

function Section({ eyebrow, title, icon, link, children }) {
  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <div>
            {eyebrow && <div className="eyebrow">{eyebrow}</div>}
            <h2><FontAwesomeIcon icon={icon} className="gold" /> {title}</h2>
          </div>
          {link && <Link to={link} className="btn btn-outline btn-sm">Voir tout <FontAwesomeIcon icon={faArrowRight} /></Link>}
        </div>
        {children}
      </div>
    </section>
  );
}

export default function Home() {
  const { user, isSeller } = useAuth();
  const { data, loading, error, reload } = useFetch('/home', null, [user?.id]);
  const sellHref = isSeller ? '/vendeur' : '/vendre';
  useSeo({
    path: '/',
    description: 'Achetez la mode ivoirienne en ligne : tenues africaines, pagnes, boubous, prêt-à-porter homme, femme et enfant '
      + 'des meilleures boutiques de Côte d’Ivoire. Paiement Orange Money, MTN, Wave, Moov et livraison à domicile.',
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'Organization', '@id': `${SITE_URL}/#organisation`, name: SITE_NAME, url: `${SITE_URL}/`, logo: `${SITE_URL}/favicon.png`,
          contactPoint: { '@type': 'ContactPoint', telephone: '+225-07-12-17-67-99', contactType: 'customer service', areaServed: 'CI', availableLanguage: 'French' } },
        { '@type': 'WebSite', '@id': `${SITE_URL}/#site`, name: SITE_NAME, url: `${SITE_URL}/`, inLanguage: 'fr-CI',
          publisher: { '@id': `${SITE_URL}/#organisation` },
          potentialAction: { '@type': 'SearchAction', target: `${SITE_URL}/catalogue?q={search_term_string}`, 'query-input': 'required name=search_term_string' } },
      ],
    },
  });

  return (
    <>
      <section className="hero">
        <div className="container">
          <div>
            <span className="badge badge-gold mb-2"><FontAwesomeIcon icon={faGem} /> Marketplace de la mode ivoirienne</span>
            <h1>Votre style,<br /><span>votre signature.</span></h1>
            <p className="lead">Tenues africaines, prêt-à-porter, sport et cérémonie : découvrez les créations des meilleures boutiques de Côte d’Ivoire, payez en Mobile Money et faites-vous livrer chez vous.</p>
            <div className="hero-actions">
              <Link to="/catalogue" className="btn btn-lg"><FontAwesomeIcon icon={faBagShopping} /> Découvrir les collections</Link>
              <Link to={sellHref} className="btn btn-outline btn-lg">
                <FontAwesomeIcon icon={faStore} /> {isSeller ? 'Gérer ma boutique' : 'Je veux vendre sur Ivoire Style'}
              </Link>
            </div>
            <div className="hero-trust">
              <span><FontAwesomeIcon icon={faShieldHalved} /> Boutiques vérifiées</span>
              <span><FontAwesomeIcon icon={faTruckFast} /> Livraison suivie</span>
              <span><FontAwesomeIcon icon={faStar} /> Avis clients authentiques</span>
            </div>
          </div>
          <div className="hero-visual"><img src={elephant} alt="" /></div>
        </div>
      </section>

      {error ? <ErrorState message={error} onRetry={reload} /> : (
        <>
          <section className="section" style={{ paddingBottom: 0 }}>
            <div className="container">
              <div className="cat-grid">
                {(data?.categories || []).map((c) => (
                  <Link key={c.id} to={`/catalogue?category=${c.slug}`} className="cat-tile">
                    <span className="ic"><FontAwesomeIcon icon={categoryIcon(c.icon)} /></span>{c.name}
                  </Link>
                ))}
              </div>
            </div>
          </section>

          <Section eyebrow="Fraîchement arrivés" title="Nouveautés" icon={faFire} link="/catalogue?sort=newest">
            <ProductGrid products={data?.newest || []} loading={loading} />
          </Section>

          {data?.promos?.length > 0 && (
            <Section eyebrow="Bonnes affaires" title="Promotions" icon={faTags} link="/catalogue?promo=1">
              <ProductGrid products={data.promos} />
            </Section>
          )}

          <section className="section">
            <div className="container">
              <div className="sell-banner">
                <div>
                  <div className="section-head" style={{ marginBottom: 6 }}>
                    <div>
                      <div className="eyebrow" style={{ color: 'var(--gold-dark)', fontWeight: 600, fontSize: '.8rem', letterSpacing: '.12em', textTransform: 'uppercase' }}>Vendeurs & créateurs</div>
                      <h2 className="brand-title" style={{ margin: 0 }}>Vous avez une boutique de vêtements ?</h2>
                    </div>
                  </div>
                  <p className="muted mb-0">Ouvrez gratuitement votre boutique en ligne et vendez à toute la Côte d’Ivoire.</p>
                  <ul>
                    <li><FontAwesomeIcon icon={faCircleCheck} /> Inscription gratuite</li>
                    <li><FontAwesomeIcon icon={faCircleCheck} /> Paiements Mobile Money</li>
                    <li><FontAwesomeIcon icon={faCircleCheck} /> Tableau de bord des ventes</li>
                    <li><FontAwesomeIcon icon={faCircleCheck} /> Reversements suivis</li>
                  </ul>
                </div>
                <Link to={sellHref} className="btn btn-lg">
                  <FontAwesomeIcon icon={faStore} /> {isSeller ? 'Gérer ma boutique' : 'Je veux vendre sur Ivoire Style'}
                </Link>
              </div>
            </div>
          </section>

          <Section eyebrow="Les plus demandés" title="Populaires" icon={faStar} link="/catalogue?sort=popular">
            <ProductGrid products={data?.popular || []} loading={loading} />
          </Section>

          {data?.shops?.length > 0 && (
            <Section eyebrow="Nos partenaires" title="Boutiques à la une" icon={faStore} link="/boutiques">
              <div className="shop-grid">
                {data.shops.map((s) => (
                  <Link key={s.id} to={`/boutique/${s.slug}`} className="shop-card">
                    <div className="shop-logo">{s.logo_url ? <img src={fileUrl(s.logo_url)} alt="" /> : s.name[0]}</div>
                    <div style={{ minWidth: 0 }}>
                      <b>{s.name}</b> {s.is_official ? <OfficialBadge /> : null}
                      <div className="small muted">{s.city}</div>
                      <p className="small muted mb-0" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{s.description}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </Section>
          )}

          <section className="section" style={{ paddingTop: 0 }}>
            <div className="container"><Features /></div>
          </section>
        </>
      )}
    </>
  );
}
