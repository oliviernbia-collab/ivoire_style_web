import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart as faHeartSolid, faStore } from '@fortawesome/free-solid-svg-icons';
import { faHeart } from '@fortawesome/free-regular-svg-icons';
import { useCart } from '../context/CartContext';
import { Price, ProductImage, Stars } from './ui';

const isNew = (d) => d && Date.now() - new Date(d).getTime() < 14 * 86400000;

export default function ProductCard({ product: p }) {
  const { favorites, toggleFavorite } = useCart();
  const fav = favorites.has(p.id);
  const off = p.on_sale ? Math.round((1 - p.price / p.compare_at_price) * 100) : 0;

  return (
    <article className="product-card">
      <Link to={`/produit/${p.slug}`} className="product-media" aria-label={p.name}>
        <ProductImage src={p.image} alt={p.name} />
        <div className="tags">
          {off > 0 && <span className="badge tag-sale">-{off}%</span>}
          {isNew(p.created_at) && <span className="badge tag-new">Nouveau</span>}
          {!p.in_stock && <span className="badge tag-out">Rupture</span>}
        </div>
      </Link>
      <button
        className={`icon-btn fav ${fav ? 'on' : ''}`}
        style={{ position: 'absolute', top: 10, right: 10 }}
        onClick={() => toggleFavorite(p.id)}
        aria-label={fav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        title={fav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      >
        <FontAwesomeIcon icon={fav ? faHeartSolid : faHeart} />
      </button>
      <div className="product-body">
        <Link to={`/boutique/${p.shop_slug}`} className="product-shop"><FontAwesomeIcon icon={faStore} /> {p.shop_name}</Link>
        <Link to={`/produit/${p.slug}`} className="product-name">{p.name}</Link>
        {p.rating_count > 0 && <Stars value={Number(p.rating_avg)} count={p.rating_count} />}
        <div className="price-row"><Price value={p.price} old={p.on_sale ? p.compare_at_price : null} /></div>
      </div>
    </article>
  );
}

export function ProductGrid({ products, loading }) {
  if (loading) {
    return (
      <div className="product-grid">
        {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton" style={{ aspectRatio: '4 / 6.2' }} />)}
      </div>
    );
  }
  return <div className="product-grid">{products.map((p) => <ProductCard key={p.id} product={p} />)}</div>;
}
