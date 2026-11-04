import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCartShopping, faTrashCan, faMinus, faPlus, faLock, faStore, faTriangleExclamation, faArrowLeft, faTruckFast, faCircleInfo,
} from '@fortawesome/free-solid-svg-icons';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useFeedback } from '../context/FeedbackContext';
import { Empty, Loader, ProductImage } from '../components/ui';
import { price } from '../utils/format';

/** Articles du panier regroupés par boutique : chaque boutique gère sa livraison, on commande boutique par boutique. */
function groupByShop(items) {
  const groups = new Map();
  for (const it of items) {
    if (!groups.has(it.shop_id)) groups.set(it.shop_id, { shop_id: it.shop_id, shop_name: it.shop_name, shop_slug: it.shop_slug, items: [] });
    groups.get(it.shop_id).items.push(it);
  }
  return [...groups.values()].map((g) => ({
    ...g,
    subtotal: g.items.filter((i) => i.available).reduce((s, i) => s + i.line_total, 0),
    count: g.items.filter((i) => i.available).reduce((s, i) => s + i.quantity, 0),
    hasIssue: g.items.some((i) => i.issue),
  }));
}

export default function Cart() {
  const { user } = useAuth();
  const { cart, ready, update, remove, clear } = useCart();
  const { confirm } = useFeedback();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="container">
        <Empty icon={faCartShopping} title="Votre panier vous attend" text="Connectez-vous pour retrouver votre panier et passer commande.">
          <Link to="/connexion?redirect=/panier" className="btn">Se connecter</Link>
        </Empty>
      </div>
    );
  }
  if (!ready) return <Loader />;
  if (!cart.items.length) {
    return (
      <div className="container">
        <Empty icon={faCartShopping} title="Votre panier est vide" text="Parcourez nos collections et laissez-vous inspirer.">
          <Link to="/catalogue" className="btn">Découvrir le catalogue</Link>
        </Empty>
      </div>
    );
  }

  const groups = groupByShop(cart.items);
  const askRemove = async (item) => {
    if (await confirm({ title: 'Retirer cet article ?', message: item.name, confirmLabel: 'Retirer', danger: true })) remove(item.id);
  };
  const askClear = async () => {
    if (await confirm({ title: 'Vider le panier ?', message: 'Tous les articles seront retirés.', confirmLabel: 'Vider', danger: true })) clear();
  };

  return (
    <div className="container" style={{ paddingTop: 28, paddingBottom: 48 }}>
      <div className="page-head">
        <h1><FontAwesomeIcon icon={faCartShopping} /> Mon panier <span className="muted small">({cart.count} article{cart.count > 1 ? 's' : ''})</span></h1>
        <button className="btn btn-ghost btn-sm" onClick={askClear}><FontAwesomeIcon icon={faTrashCan} /> Vider</button>
      </div>
      {groups.length > 1 && (
        <div className="alert alert-gold mb-2">
          <FontAwesomeIcon icon={faCircleInfo} />
          <span>Votre panier contient des articles de <b>{groups.length} boutiques</b>. Chaque boutique assure sa propre livraison : vous validez une commande par boutique.</span>
        </div>
      )}
      <div className="stack" style={{ gap: 20 }}>
        {groups.map((g) => (
          <section key={g.shop_id} className="card">
            <div className="flex between flex-wrap mb-1">
              <Link to={`/boutique/${g.shop_slug}`} className="card-title mb-0"><FontAwesomeIcon icon={faStore} /> {g.shop_name}</Link>
              <span className="small muted"><FontAwesomeIcon icon={faTruckFast} /> Livraison assurée par la boutique</span>
            </div>
            {g.items.map((it) => (
              <div className="cart-item" key={it.id}>
                <Link to={`/produit/${it.slug}`}><ProductImage src={it.image} alt={it.name} w={200} /></Link>
                <div style={{ minWidth: 0 }}>
                  <Link to={`/produit/${it.slug}`}><b>{it.name}</b></Link>
                  <div className="small mt-1">
                    <span className="badge">Taille {it.size}</span>{' '}
                    <span className="badge"><span className="swatch" style={{ background: it.color_hex || '#ddd' }} /> {it.color}</span>
                  </div>
                  <div className="mt-1"><b>{price(it.price)}</b></div>
                  {it.issue && <div className="field-error mt-1"><FontAwesomeIcon icon={faTriangleExclamation} /> {it.issue}</div>}
                </div>
                <div className="actions stack" style={{ alignItems: 'flex-end' }}>
                  <div className="qty">
                    <button disabled={it.quantity <= 1} onClick={() => update(it.id, { quantity: it.quantity - 1 })} aria-label="Diminuer"><FontAwesomeIcon icon={faMinus} /></button>
                    <span>{it.quantity}</span>
                    <button disabled={it.quantity >= it.stock} onClick={() => update(it.id, { quantity: it.quantity + 1 })} aria-label="Augmenter"><FontAwesomeIcon icon={faPlus} /></button>
                  </div>
                  <b>{price(it.line_total)}</b>
                  <button className="btn btn-ghost btn-sm" onClick={() => askRemove(it)}><FontAwesomeIcon icon={faTrashCan} /> Retirer</button>
                </div>
              </div>
            ))}
            <div className="flex between flex-wrap mt-2">
              <div>
                <div className="small muted">Sous-total ({g.count} article{g.count > 1 ? 's' : ''}) — livraison calculée à l’étape suivante</div>
                <b style={{ fontSize: '1.15rem' }}>{price(g.subtotal)}</b>
              </div>
              <button className="btn btn-lg" disabled={g.hasIssue} onClick={() => navigate(`/commande?boutique=${g.shop_id}`)}>
                <FontAwesomeIcon icon={faLock} /> Commander chez {g.shop_name}
              </button>
            </div>
            {g.hasIssue && <div className="alert alert-warning small mt-1"><FontAwesomeIcon icon={faTriangleExclamation} /> Corrigez les articles signalés pour commander.</div>}
          </section>
        ))}
      </div>
      <Link to="/catalogue" className="btn btn-ghost mt-2"><FontAwesomeIcon icon={faArrowLeft} /> Continuer mes achats</Link>
    </div>
  );
}
