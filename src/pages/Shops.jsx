import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStore, faLocationDot, faShirt, faStar, faCalendar, faMagnifyingGlass, faTruckFast } from '@fortawesome/free-solid-svg-icons';
import { Empty, ErrorState, Loader, OfficialBadge, Pagination, useFetch } from '../components/ui';
import { ProductGrid } from '../components/ProductCard';
import { Filters, useParamsState } from './Catalog';
import { fileUrl } from '../api/client';
import { date, price } from '../utils/format';
import { absoluteUrl, breadcrumbLd, shareImage, snippet, useSeo } from '../utils/seo';
import DeliveryRates from '../components/DeliveryRates';
import { useAuth } from '../context/AuthContext';

export function ShopList() {
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { data, meta, loading, error, reload } = useFetch('/shops', { q: search, page });
  useSeo({
    title: 'Boutiques de mode en Côte d’Ivoire',
    description: 'Découvrez les boutiques et créateurs ivoiriens vérifiés sur Ivoire Style : tenues africaines, prêt-à-porter, '
      + 'sport et cérémonie. Chaque boutique livre elle-même partout en Côte d’Ivoire.',
    path: '/boutiques',
  });
  return (
    <div className="container section">
      <div className="section-head">
        <div><div className="eyebrow">Nos partenaires</div><h1 className="mb-0"><FontAwesomeIcon icon={faStore} className="gold" /> Boutiques</h1></div>
        <form className="search" style={{ maxWidth: 360 }} onSubmit={(e) => { e.preventDefault(); setSearch(q); setPage(1); }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher une boutique" aria-label="Rechercher une boutique" />
          <button aria-label="Rechercher"><FontAwesomeIcon icon={faMagnifyingGlass} /></button>
        </form>
      </div>
      {loading ? <Loader /> : error ? <ErrorState message={error} onRetry={reload} /> : data.length === 0 ? (
        <Empty icon={faStore} title="Aucune boutique trouvée" />
      ) : (
        <div className="shop-grid">
          {data.map((s) => (
            <Link key={s.id} to={`/boutique/${s.slug}`} className="shop-card">
              <div className="shop-logo">{s.logo_url ? <img src={fileUrl(s.logo_url)} alt="" /> : s.name[0]}</div>
              <div style={{ minWidth: 0 }}>
                <b>{s.name}</b> {s.is_official ? <OfficialBadge /> : null}
                <div className="small muted"><FontAwesomeIcon icon={faLocationDot} /> {s.city}{s.commune ? `, ${s.commune}` : ''} · <FontAwesomeIcon icon={faShirt} /> {s.product_count} article(s)</div>
                <p className="small muted mb-0 mt-1" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{s.description}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
      <Pagination meta={meta} onChange={setPage} />
    </div>
  );
}

export function ShopPage() {
  const { slug } = useParams();
  const [params, setParam] = useParamsState();
  const { data: shop, loading, error } = useFetch(`/shops/${slug}`);
  const { user } = useAuth();
  const isOwner = user?.shop?.slug === slug;
  const query = Object.fromEntries(params.entries());
  const products = useFetch(`/shops/${slug}/products`, query);
  // Boutique : fiche « magasin de vêtements » (schema.org) ; filtres et pages suivantes non indexés
  const place = shop ? [shop.commune, shop.city].filter(Boolean).join(', ') : '';
  useSeo(shop ? {
    title: `${shop.name} – boutique de mode à ${shop.city}`,
    description: `${shop.name} (${place}) sur Ivoire Style : ${shop.product_count} article(s). ${shop.description || ''}`,
    path: `/boutique/${shop.slug}`,
    image: shareImage(shop.banner_url || shop.logo_url),
    noindex: Object.keys(query).length > 0,
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'ClothingStore', name: shop.name, url: absoluteUrl(`/boutique/${shop.slug}`), description: snippet(shop.description, 300),
          image: shop.logo_url || undefined, telephone: shop.phone || undefined,
          address: { '@type': 'PostalAddress', addressLocality: shop.city, addressRegion: shop.commune || undefined, addressCountry: 'CI' },
          ...(shop.rating && shop.review_count ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: shop.rating, reviewCount: shop.review_count } } : {}),
        },
        breadcrumbLd([['Accueil', '/'], ['Boutiques', '/boutiques'], [shop.name, `/boutique/${shop.slug}`]]),
      ],
    },
  } : {}, Boolean(shop));
  if (loading) return <Loader />;
  if (error) return <div className="container"><ErrorState message={error} /></div>;
  return (
    <>
      {isOwner && (
        // Le vendeur qui ouvre son propre lien voit son compte en haut de page : ses clients, eux, ne le voient pas
        <div className="container mt-1">
          <div className="alert alert-gold small mb-0">
            <FontAwesomeIcon icon={faStore} /> C’est votre boutique : vous la voyez connecté à votre compte. Vos clients
            voient seulement vos articles, sans accès à votre compte ni à votre espace vendeur. Pour la voir comme eux,
            ouvrez le lien dans une fenêtre de navigation privée.
          </div>
        </div>
      )}
      {shop.banner_url && (
        <div className="shop-banner"><img src={fileUrl(shop.banner_url, { w: 1600 })} alt={`Bannière de ${shop.name}`} /></div>
      )}
      <div className="shop-hero">
        <div className="container flex" style={{ gap: 20 }}>
          <div className="shop-logo" style={{ width: 96, height: 96, fontSize: '2.2rem' }}>
            {shop.logo_url ? <img src={fileUrl(shop.logo_url)} alt="" /> : shop.name[0]}
          </div>
          <div>
            <h1 className="brand-title mb-0">{shop.name} {shop.is_official ? <OfficialBadge /> : null}</h1>
            <div className="flex flex-wrap small muted mt-1">
              <span><FontAwesomeIcon icon={faLocationDot} /> {shop.city}{shop.commune ? `, ${shop.commune}` : ''}</span>
              <span><FontAwesomeIcon icon={faShirt} /> {shop.product_count} article(s)</span>
              {shop.rating && <span><FontAwesomeIcon icon={faStar} className="gold" /> {shop.rating}/5</span>}
              <span><FontAwesomeIcon icon={faCalendar} /> Depuis {date(shop.created_at)}</span>
            </div>
            <p className="mt-1 mb-0" style={{ maxWidth: 720 }}>{shop.description}</p>
            <p className="small mt-1 mb-0">
              <FontAwesomeIcon icon={faTruckFast} className="gold" /> Livraison Abidjan {price(shop.delivery_fee_abidjan)} · Intérieur {price(shop.delivery_fee_other)}
              {Number(shop.free_delivery_threshold) > 0 && ` · offerte dès ${price(shop.free_delivery_threshold)}`}
              {shop.allow_shop_pickup ? ' · retrait gratuit en boutique' : ''}
              {shop.delivery_info ? ` — ${shop.delivery_info}` : ''}
            </p>
            <DeliveryRates zones={shop.delivery_zones} abidjan={Number(shop.delivery_fee_abidjan)} other={Number(shop.delivery_fee_other)} />
          </div>
        </div>
      </div>
      <div className="container catalog">
        {query.q && <div className="full" style={{ gridColumn: '1 / -1' }}><h2 className="mb-0">Résultats pour « {query.q} »</h2></div>}
        <Filters params={params} setParam={setParam} hideShop />
        <div>
          {products.error ? <ErrorState message={products.error} /> : !products.loading && products.data?.length === 0
            ? <Empty icon={faShirt} title="Aucun article" text="Cette boutique n’a pas encore d’article correspondant." />
            : <ProductGrid products={products.data || []} loading={products.loading} />}
          <Pagination meta={products.meta} onChange={(p) => setParam('page', p)} />
        </div>
      </div>
    </>
  );
}
