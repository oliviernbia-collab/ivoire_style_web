import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSliders, faMagnifyingGlass, faXmark, faShirt } from '@fortawesome/free-solid-svg-icons';
import { Empty, ErrorState, Pagination, useFetch } from '../components/ui';
import { ProductGrid } from '../components/ProductCard';
import { categoryIcon } from '../utils/icons';
import { AUDIENCES } from '../utils/format';
import { breadcrumbLd, useSeo } from '../utils/seo';

const SORTS = { newest: 'Plus récents', popular: 'Popularité', price_asc: 'Prix croissant', price_desc: 'Prix décroissant', rating: 'Mieux notés' };

export function Filters({ params, setParam, hideShop, open }) {
  const { data: categories } = useFetch('/categories');
  const { data: f } = useFetch('/products/filters');
  const [min, setMin] = useState(params.get('min_price') || '');
  const [max, setMax] = useState(params.get('max_price') || '');
  const chip = (key, value, label, extra) => {
    const on = params.get(key) === value;
    return (
      <button type="button" key={value} className={`chip ${on ? 'on' : ''}`} onClick={() => setParam(key, on ? null : value)}>
        {extra}{label}
      </button>
    );
  };

  return (
    <aside className={`filters ${open ? 'open' : ''}`} aria-label="Filtres">
      {!hideShop && (
        <div>
          <h4>Catégories</h4>
          <div className="chips">
            {categories?.map((c) => chip('category', c.slug, c.name, <FontAwesomeIcon icon={categoryIcon(c.icon)} />))}
          </div>
        </div>
      )}
      <div>
        <h4>Public</h4>
        <div className="chips">{Object.entries(AUDIENCES).map(([k, v]) => chip('audience', k, v))}</div>
      </div>
      {f?.sizes?.length > 0 && (
        <div>
          <h4>Taille</h4>
          <div className="chips">{f.sizes.map((s) => chip('size', s, s))}</div>
        </div>
      )}
      {f?.colors?.length > 0 && (
        <div>
          <h4>Couleur</h4>
          <div className="chips">
            {f.colors.map((c) => chip('color', c.color, c.color, <span className="swatch" style={{ background: c.hex || '#ddd' }} />))}
          </div>
        </div>
      )}
      <div>
        <h4>Prix (FCFA)</h4>
        <form className="flex" onSubmit={(e) => { e.preventDefault(); setParam({ min_price: min || null, max_price: max || null }); }}>
          <input className="input" type="number" min="0" placeholder="Min" value={min} onChange={(e) => setMin(e.target.value)} aria-label="Prix minimum" />
          <input className="input" type="number" min="0" placeholder="Max" value={max} onChange={(e) => setMax(e.target.value)} aria-label="Prix maximum" />
          <button className="btn btn-sm" aria-label="Appliquer le prix"><FontAwesomeIcon icon={faMagnifyingGlass} /></button>
        </form>
      </div>
      <div>
        <h4>Disponibilité</h4>
        <div className="chips">
          {chip('in_stock', '1', 'En stock')}
          {chip('promo', '1', 'En promotion')}
          {chip('new', '1', 'Nouveautés')}
        </div>
      </div>
    </aside>
  );
}

export function useParamsState() {
  const [params, setParams] = useSearchParams();
  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    const updates = typeof key === 'object' ? key : { [key]: value };
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === '' || v === undefined) next.delete(k); else next.set(k, v);
    }
    // Tout changement de filtre revient à la première page
    if (!('page' in updates)) next.delete('page');
    setParams(next);
  };
  return [params, setParam, setParams];
}

export default function Catalog() {
  const [params, setParam, setParams] = useParamsState();
  const [open, setOpen] = useState(false);
  const query = Object.fromEntries(params.entries());
  const { data, meta, loading, error, reload } = useFetch('/products', { limit: 12, ...query });
  const active = [...params.entries()].filter(([k]) => !['page', 'sort'].includes(k));
  // Référencement : une page par catégorie / public ; recherches et combinaisons de filtres non indexées
  const { data: categories } = useFetch('/categories');
  const category = categories?.find((c) => c.slug === query.category);
  const audience = AUDIENCES[query.audience];
  const indexable = !query.q && active.every(([k]) => ['category', 'audience'].includes(k)) && active.length <= 1;
  const heading = [category?.name, audience].filter(Boolean).join(' ') || 'Tous les vêtements';
  useSeo({
    title: query.q ? `Recherche « ${query.q} »` : `${heading} – mode ivoirienne en ligne`,
    description: `${heading} : ${meta?.total ?? 'des centaines d’'} article(s) des boutiques ivoiriennes sur Ivoire Style. `
      + 'Paiement Mobile Money, en une ou deux fois, et livraison partout en Côte d’Ivoire.',
    path: `/catalogue${query.category ? `?category=${query.category}` : query.audience ? `?audience=${query.audience}` : ''}`,
    noindex: !indexable,
    jsonLd: category ? { '@context': 'https://schema.org', ...breadcrumbLd([['Accueil', '/'], [category.name, `/catalogue?category=${category.slug}`]]) } : null,
  }, !query.category || Boolean(categories));

  return (
    <div className="container catalog">
      <Filters params={params} setParam={setParam} open={open} />
      <div style={{ minWidth: 0 }}>
        <div className="catalog-toolbar">
          <div>
            <h1 className="mb-0" style={{ fontSize: '1.5rem' }}>{query.q ? `Résultats pour « ${query.q} »` : 'Catalogue'}</h1>
            <span className="muted small">{meta ? `${meta.total} article(s)` : ' '}</span>
          </div>
          <div className="flex">
            <button className="btn btn-outline btn-sm filters-toggle" onClick={() => setOpen((o) => !o)}><FontAwesomeIcon icon={faSliders} /> Filtres</button>
            <label className="sr-only" htmlFor="sort">Trier</label>
            <select id="sort" className="select" style={{ width: 'auto' }} value={query.sort || 'newest'} onChange={(e) => setParam('sort', e.target.value)}>
              {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
        {active.length > 0 && (
          <div className="chips mb-2">
            {active.map(([k, v]) => (
              <button key={k} className="chip on" onClick={() => setParam(k, null)}>{v} <FontAwesomeIcon icon={faXmark} /></button>
            ))}
            <button className="btn btn-ghost btn-sm" onClick={() => setParams({})}>Tout effacer</button>
          </div>
        )}
        {error ? <ErrorState message={error} onRetry={reload} />
          : !loading && data?.length === 0 ? (
            <Empty icon={faShirt} title="Aucun vêtement trouvé" text="Essayez d’élargir vos critères de recherche.">
              <button className="btn" onClick={() => setParams({})}>Réinitialiser les filtres</button>
            </Empty>
          ) : <ProductGrid products={data || []} loading={loading} />}
        <Pagination meta={meta} onChange={(p) => { setParam('page', p); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
      </div>
    </div>
  );
}
