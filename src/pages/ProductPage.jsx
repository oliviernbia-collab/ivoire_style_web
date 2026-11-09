import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCartPlus, faHeart as faHeartSolid, faStore, faTruckFast, faRotateLeft, faShieldHalved, faMinus, faPlus,
  faRulerHorizontal, faCircleCheck, faTriangleExclamation, faChevronRight, faBolt, faStar, faPlay, faMagnifyingGlassPlus,
} from '@fortawesome/free-solid-svg-icons';
import { faHeart } from '@fortawesome/free-regular-svg-icons';
import { ErrorState, Loader, OfficialBadge, Price, ProductImage, ProductMedia, Stars, useFetch } from '../components/ui';
import { ProductGrid } from '../components/ProductCard';
import PaymentLogo from '../components/PaymentLogo';
import DeliveryRates from '../components/DeliveryRates';
import { useStorefront } from '../context/StorefrontContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { AUDIENCES, date, price } from '../utils/format';
import { absoluteUrl, breadcrumbLd, shareImage, snippet, useSeo } from '../utils/seo';
import ImageViewer from '../components/ImageViewer';
import { isVideoUrl } from '../api/client';

const isPhoto = (im) => Boolean(im) && im.media_type !== 'video' && !isVideoUrl(im.url);

function productSeo(p) {
  const url = absoluteUrl(`/produit/${p.slug}`);
  const images = p.images.filter((im) => im.media_type !== 'video').map((im) => im.url);
  const prices = p.variants.map((v) => Number(v.price)).filter((n) => n > 0);
  const inStock = p.variants.some((v) => v.stock > 0);
  const product = {
    '@type': 'Product',
    name: p.name,
    url,
    image: images.length ? images : undefined,
    description: snippet(p.description, 500),
    sku: p.variants[0]?.sku || String(p.id),
    category: p.category_name,
    brand: { '@type': 'Brand', name: p.shop_name },
    material: p.material || undefined,
    audience: p.audience ? { '@type': 'PeopleAudience', suggestedGender: { homme: 'male', femme: 'female' }[p.audience] || 'unisex' } : undefined,
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'XOF',
      lowPrice: Math.min(...prices),
      highPrice: Math.max(...prices),
      offerCount: p.variants.length,
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: { '@type': 'Organization', name: p.shop_name, url: absoluteUrl(`/boutique/${p.shop_slug}`) },
    },
  };
  if (p.rating_count > 0) {
    product.aggregateRating = { '@type': 'AggregateRating', ratingValue: Number(p.rating_avg), reviewCount: p.rating_count };
    product.review = p.reviews.slice(0, 5).map((r) => ({
      '@type': 'Review', author: { '@type': 'Person', name: r.author }, datePublished: String(r.created_at).slice(0, 10),
      reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5 }, reviewBody: r.comment || undefined,
    }));
  }
  return {
    title: `${p.name} – ${p.shop_name}`,
    description: `${p.name} à partir de ${price(Math.min(...prices))} chez ${p.shop_name}. ${p.description || ''}`,
    path: `/produit/${p.slug}`,
    type: 'product',
    image: shareImage(images[0]),
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [product, breadcrumbLd([['Accueil', '/'], [p.category_name, `/catalogue?category=${p.category_slug}`], [p.name, `/produit/${p.slug}`]])],
    },
  };
}

export default function ProductPage() {
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { slug: vitrineSlug } = useStorefront();
  // En vitrine, les suggestions se limitent aux articles de la même boutique
  const { data: p, loading, error, reload } = useFetch(`/products/${slug}`, vitrineSlug ? { scope: 'shop' } : null, [user?.id]);
  const { add, favorites, toggleFavorite } = useCart();
  const [img, setImg] = useState(0);
  const [color, setColor] = useState(null);
  const [size, setSize] = useState(null);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState('desc');
  const [adding, setAdding] = useState(false);
  const [viewer, setViewer] = useState(null); // index de la photo ouverte en plein écran

  useEffect(() => {
    if (!p) return;
    setImg(0); setQty(1); setSize(null);
    setColor(p.variants[0]?.color || null);
  }, [p]);

  const colors = useMemo(() => {
    const m = new Map();
    p?.variants.forEach((v) => !m.has(v.color) && m.set(v.color, v.color_hex));
    return [...m.entries()];
  }, [p]);
  const sizes = useMemo(() => p?.variants.filter((v) => v.color === color) || [], [p, color]);
  const variant = sizes.find((v) => v.size === size);
  const shown = variant || sizes[0] || p?.variants[0];

  // Fiche produit schema.org : prix (XOF), disponibilité, avis et vendeur — éligible aux résultats enrichis Google
  useSeo(p ? productSeo(p) : {}, Boolean(p));

  if (loading) return <Loader />;
  if (error) return <div className="container"><ErrorState message={error} onRetry={reload} /></div>;

  const fav = favorites.has(p.id);
  const photos = p.images.filter(isPhoto);
  const outOfStock = p.variants.every((v) => v.stock <= 0);

  const handleAdd = async (buyNow = false) => {
    if (!variant) return;
    setAdding(true);
    try {
      await add(variant.id, qty);
      if (buyNow && user) navigate('/panier');
    } catch { /* message déjà affiché */ } finally { setAdding(false); }
  };

  return (
    <>
      <div className="container pdp">
        <div>
          <nav className="breadcrumb mb-2">
            <Link to="/">Accueil</Link> <FontAwesomeIcon icon={faChevronRight} size="xs" />
            <Link to={`/catalogue?category=${p.category_slug}`}>{p.category_name}</Link> <FontAwesomeIcon icon={faChevronRight} size="xs" />
            <span>{p.name}</span>
          </nav>
          {isPhoto(p.images[img]) ? (
            // Photo : ouverte dans la visionneuse plein écran (zoom limité à la photo, jamais à la page)
            <button type="button" className="gallery-main gallery-zoom" onClick={() => setViewer(photos.indexOf(p.images[img]))}
              aria-label="Agrandir la photo">
              <ProductMedia key={p.images[img]?.id} media={p.images[img]} alt={p.images[img]?.alt || p.name} />
              <span className="gallery-zoom-hint"><FontAwesomeIcon icon={faMagnifyingGlassPlus} /></span>
            </button>
          ) : (
            <div className="gallery-main"><ProductMedia key={p.images[img]?.id} media={p.images[img]} alt={p.images[img]?.alt || p.name} /></div>
          )}
          {viewer !== null && (
            <ImageViewer images={photos} start={viewer} alt={p.name} onClose={() => setViewer(null)} />
          )}
          {p.images.length > 1 && (
            <div className="gallery-thumbs">
              {p.images.map((im, i) => (
                <button key={im.id} className={i === img ? 'on' : ''} onClick={() => setImg(i)}
                  aria-label={im.media_type === 'video' ? `Vidéo ${i + 1}` : `Image ${i + 1}`} style={{ position: 'relative' }}>
                  <ProductImage src={im.url} alt="" w={160} />
                  {im.media_type === 'video' && <span className="thumb-play"><FontAwesomeIcon icon={faPlay} /></span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <Link to={`/boutique/${p.shop_slug}`} className="badge badge-gold"><FontAwesomeIcon icon={faStore} /> {p.shop_name}</Link>
          {p.shop_official ? <> <OfficialBadge /></> : null}
          <h1 className="mt-1">{p.name}</h1>
          <div className="flex flex-wrap mb-2">
            {p.rating_count > 0 ? <Stars value={Number(p.rating_avg)} count={p.rating_count} /> : <span className="small muted">Pas encore d’avis</span>}
            <span className="badge">{AUDIENCES[p.audience]}</span>
          </div>
          <div className="pdp-price"><Price value={shown?.price ?? p.min_price} old={shown?.compare_at_price} /></div>

          <div className="option-group">
            <div className="label">Couleur : <span className="muted">{color}</span></div>
            <div className="chips">
              {colors.map(([c, hex]) => (
                <button key={c} className={`chip ${c === color ? 'on' : ''}`} onClick={() => { setColor(c); setSize(null); }}>
                  <span className="swatch" style={{ background: hex || '#ddd' }} /> {c}
                </button>
              ))}
            </div>
          </div>

          <div className="option-group">
            <div className="label">
              <span>Taille {variant && <span className="muted">: {variant.size}</span>}</span>
              {p.size_guide && <button className="btn btn-ghost btn-sm" onClick={() => setTab('guide')}><FontAwesomeIcon icon={faRulerHorizontal} /> Guide des tailles</button>}
            </div>
            <div className="chips">
              {sizes.map((v) => (
                <button key={v.id} className={`size-btn ${v.size === size ? 'on' : ''}`} disabled={v.stock <= 0}
                  onClick={() => { setSize(v.size); setQty(1); }} title={v.stock <= 0 ? 'Épuisé' : `${v.stock} en stock`}>
                  {v.size}
                </button>
              ))}
            </div>
            {variant && (
              <p className={`small mt-1 mb-0 ${variant.stock <= 3 ? 'gold' : 'muted'}`}>
                <FontAwesomeIcon icon={variant.stock <= 3 ? faTriangleExclamation : faCircleCheck} />{' '}
                {variant.stock <= 3 ? `Plus que ${variant.stock} en stock !` : 'En stock'}
              </p>
            )}
          </div>

          {outOfStock ? (
            <div className="alert alert-danger"><FontAwesomeIcon icon={faTriangleExclamation} /> Cet article est actuellement en rupture de stock.</div>
          ) : (
            <div className="flex flex-wrap pdp-actions">
              <div className="qty" aria-label="Quantité">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Diminuer"><FontAwesomeIcon icon={faMinus} /></button>
                <span>{qty}</span>
                <button onClick={() => setQty((q) => Math.min(variant?.stock || 1, q + 1))} aria-label="Augmenter"><FontAwesomeIcon icon={faPlus} /></button>
              </div>
              <button className="btn grow" disabled={!variant || adding} onClick={() => handleAdd(false)}>
                <FontAwesomeIcon icon={faCartPlus} /> {variant ? 'Ajouter au panier' : 'Choisissez une taille'}
              </button>
              <button className={`icon-btn fav ${fav ? 'on' : ''}`} style={{ width: 46, height: 46 }} onClick={() => toggleFavorite(p.id)}
                aria-label={fav ? 'Retirer des favoris' : 'Ajouter aux favoris'}>
                <FontAwesomeIcon icon={fav ? faHeartSolid : faHeart} />
              </button>
            </div>
          )}
          {!outOfStock && (
            <button className="btn btn-outline btn-block mt-1" disabled={!variant || adding} onClick={() => handleAdd(true)}>
              <FontAwesomeIcon icon={faBolt} /> Acheter maintenant
            </button>
          )}

          <div className="card mt-3">
            <ul className="info-list">
              <li><FontAwesomeIcon icon={faTruckFast} /><span>Livraison par la boutique — Abidjan : <b>{price(p.delivery_info.abidjan)}</b> · Intérieur : <b>{price(p.delivery_info.other)}</b>
                {p.delivery_info.free_threshold > 0 && <><br /><span className="small muted">Offerte dès {price(p.delivery_info.free_threshold)} d’achat</span></>}
                {p.delivery_info.shop_pickup && <><br /><span className="small muted">Retrait gratuit en boutique</span></>}
                {p.delivery_info.note && <><br /><span className="small muted">{p.delivery_info.note}</span></>}
                <DeliveryRates zones={p.delivery_info.zones} abidjan={p.delivery_info.abidjan} other={p.delivery_info.other} /></span></li>
              <li><FontAwesomeIcon icon={faShieldHalved} />
                <span>Paiement Mobile Money sécurisé
                  <span className="pay-row mt-1">
                    {['orange_money', 'mtn_momo', 'wave', 'moov_money'].map((c) => <PaymentLogo key={c} code={c} size={30} />)}
                  </span>
                  <span className="small muted" style={{ display: 'block', marginTop: 6 }}>
                    Payez la totalité, ou {p.payment_terms?.half_rate ?? 50} % maintenant et le reste à la livraison
                    {p.payment_terms?.cash_on_delivery && <>, ou à la livraison avec un acompte de {p.payment_terms.deposit_rate} %</>}.
                  </span>
                </span>
              </li>
              <li><FontAwesomeIcon icon={faRotateLeft} /><span>Retour possible sous 7 jours après livraison</span></li>
              <li><FontAwesomeIcon icon={faStore} /><span>Vendu par <Link to={`/boutique/${p.shop_slug}`} className="gold"><b>{p.shop_name}</b></Link> · {p.shop_city}</span></li>
            </ul>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="tabs" role="tablist">
          <button className={tab === 'desc' ? 'on' : ''} onClick={() => setTab('desc')}>Description</button>
          <button className={tab === 'details' ? 'on' : ''} onClick={() => setTab('details')}>Caractéristiques</button>
          {p.size_guide && <button className={tab === 'guide' ? 'on' : ''} onClick={() => setTab('guide')}>Guide des tailles</button>}
          <button className={tab === 'reviews' ? 'on' : ''} onClick={() => setTab('reviews')}>Avis ({p.reviews.length})</button>
        </div>
        <div className="prose">
          {tab === 'desc' && <p style={{ whiteSpace: 'pre-line' }}>{p.description}</p>}
          {tab === 'details' && (
            <table className="table" style={{ maxWidth: 520 }}>
              <tbody>
                {[['Matière', p.material], ['Coupe', p.fit], ['Entretien', p.care], ['Origine', p.origin], ['Public', AUDIENCES[p.audience]], ['Catégorie', p.category_name]]
                  .filter(([, v]) => v).map(([k, v]) => <tr key={k}><th style={{ width: 160 }}>{k}</th><td>{v}</td></tr>)}
              </tbody>
            </table>
          )}
          {tab === 'guide' && <p style={{ whiteSpace: 'pre-line' }}>{p.size_guide}</p>}
          {tab === 'reviews' && (p.reviews.length === 0
            ? <p className="muted"><FontAwesomeIcon icon={faStar} className="gold" /> Aucun avis pour le moment. Les avis sont réservés aux clients ayant reçu l’article.</p>
            : p.reviews.map((r) => (
              <div key={r.id} className="card mb-1">
                <div className="flex between"><b>{r.author}</b><span className="small muted">{date(r.created_at)}</span></div>
                <Stars value={r.rating} />
                {r.comment && <p className="mt-1 mb-0">{r.comment}</p>}
              </div>
            )))}
        </div>
      </div>

      {p.similar.length > 0 && (
        <section className="section">
          <div className="container">
            <h2>Vous aimerez aussi</h2>
            <ProductGrid products={p.similar} />
          </div>
        </section>
      )}
    </>
  );
}
