import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faGaugeHigh, faShirt, faBoxOpen, faWallet, faGear, faPlus, faPen, faEye, faEyeSlash, faTrashCan, faCoins,
  faTriangleExclamation, faChartLine, faClock, faCircleCheck, faFloppyDisk, faPaperPlane, faImage, faXmark,
  faTruckFast, faArrowLeft, faStore, faMagnifyingGlass, faPlay, faGift, faHandHoldingDollar, faPercent, faPhone, faLocationDot, faCopy,
  faCircleInfo, faLink, faShareNodes, faArrowUpRightFromSquare, faMoneyBillWave,
} from '@fortawesome/free-solid-svg-icons';
import { faWhatsapp, faFacebookF } from '@fortawesome/free-brands-svg-icons';
import api, { apiError, fileUrl } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useFeedback } from '../../context/FeedbackContext';
import { useLive } from '../../context/RealtimeContext';
import { PageHead, SpaceLayout } from '../../components/Layouts';
import { PaymentLabel, PayoutPicker } from '../../components/PaymentLogo';
import {
  BarChart, Empty, ErrorState, Field, Loader, Modal, Pagination, ProductImage, StatusBadge, SubmitButton, useFetch, useForm,
} from '../../components/ui';
import {
  ABIDJAN_COMMUNES, AUDIENCES, CITIES, date, DELIVERY_MODES, ORDER_STATUS, PAYMENT_PLANS, PAYMENT_STATUS, price, PRODUCT_STATUS,
  showPaymentStatus,
} from '../../utils/format';

export function SellerLayout() {
  const { user } = useAuth();
  if (user.shop?.status !== 'approved') return <Navigate to="/vendre" replace />;
  return (
    <SpaceLayout title={user.shop.name} subtitle="Espace vendeur"
      avatar={user.shop.logo_url ? <img src={fileUrl(user.shop.logo_url)} alt="" /> : user.shop.name[0]}
      links={[
        { to: '/vendeur', end: true, icon: faGaugeHigh, label: 'Tableau de bord' },
        { to: '/vendeur/produits', icon: faShirt, label: 'Mes vêtements' },
        { to: '/vendeur/commandes', icon: faBoxOpen, label: 'Commandes' },
        { to: '/vendeur/finances', icon: faWallet, label: 'Finances' },
        { to: '/vendeur/boutique', icon: faGear, label: 'Ma boutique' },
        { to: `/boutique/${user.shop.slug}`, icon: faStore, label: 'Voir ma vitrine' },
      ]} />
  );
}

function Stat({ icon, label, value }) {
  return (
    <div className="stat">
      <div className="ic"><FontAwesomeIcon icon={icon} /></div>
      <div><div className="v">{value}</div><div className="l">{label}</div></div>
    </div>
  );
}

/** Lien de vitrine à partager (publicités, réseaux sociaux) : le client n'y voit que les produits de la boutique. */
export function ShopLinkCard({ slug, name, compact = false }) {
  const { notify } = useFeedback();
  const { data: settings } = useFetch('/settings/public');
  // Lien de partage servi par l'API : WhatsApp et Facebook y lisent le nom, la description et l'image de la
  // boutique (aperçu), puis le visiteur est redirigé vers la vitrine. Sinon, lien direct vers la vitrine.
  const base = settings?.share_base_url;
  const url = /^https:\/\//.test(base || '') ? `${base}/partage/b/${slug}` : `${window.location.origin}/b/${slug}`;
  const message = `Découvrez ma boutique ${name} sur Ivoire Style : ${url}`;
  const copy = () => navigator.clipboard?.writeText(url).then(() => notify.success('Lien de la boutique copié'));
  return (
    <div className={`card shop-link-card ${compact ? 'mb-2' : ''}`}>
      <div className="card-title mb-1"><FontAwesomeIcon icon={faLink} /> Lien de ma boutique</div>
      <p className="small muted mt-0">Partagez-le dans vos publicités et sur vos réseaux : vos clients n’y verront que vos articles.</p>
      <div className="flex flex-wrap">
        <code className="shop-link grow">{url}</code>
        <button type="button" className="btn btn-sm" onClick={copy}><FontAwesomeIcon icon={faCopy} /> Copier</button>
        <a className="btn btn-outline btn-sm" href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">
          <FontAwesomeIcon icon={faWhatsapp} /> WhatsApp
        </a>
        <a className="btn btn-outline btn-sm" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noreferrer">
          <FontAwesomeIcon icon={faFacebookF} /> Facebook
        </a>
        {navigator.share && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigator.share({ title: name, text: message, url }).catch(() => {})}>
            <FontAwesomeIcon icon={faShareNodes} /> Partager
          </button>
        )}
        <a className="btn btn-ghost btn-sm" href={`/b/${slug}`} target="_blank" rel="noreferrer"><FontAwesomeIcon icon={faArrowUpRightFromSquare} /> Ouvrir</a>
      </div>
    </div>
  );
}

export function SellerDashboard() {
  const { user } = useAuth();
  const { data: d, loading, error, reload } = useFetch('/seller/dashboard');
  useLive([...['seller_order', 'order', 'return', 'payout', 'refund'], 'moderation'], () => reload({ silent: true }));
  if (loading) return <Loader />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  return (
    <>
      <PageHead icon={faGaugeHigh} title="Tableau de bord">
        <Link to="/vendeur/produits/nouveau" className="btn"><FontAwesomeIcon icon={faPlus} /> Ajouter un vêtement</Link>
      </PageHead>
      {!d.payout_ready && (
        <div className="alert alert-warning mb-2">
          <FontAwesomeIcon icon={faTriangleExclamation} />
          <span className="grow">Indiquez où recevoir votre argent (moyen de paiement, numéro et titulaire) pour être payé après chaque vente.</span>
          <Link to="/vendeur/boutique#paiement" className="btn btn-sm">Compléter</Link>
        </div>
      )}
      <ShopLinkCard slug={user.shop.slug} name={user.shop.name} compact />
      {user.shop?.is_official && (
        <div className="alert alert-gold mb-2"><FontAwesomeIcon icon={faCircleCheck} />
          <span><b>Boutique officielle</b> : sans commission, vos produits sont publiés immédiatement.</span></div>
      )}
      {d.promotions?.map((p) => (
        <div key={p.id} className="alert alert-success mb-2">
          <FontAwesomeIcon icon={faGift} />
          <span><b>{p.title}</b> — boutique mise en avant sur l’accueil
          {p.ends_at ? ` jusqu’au ${date(p.ends_at)}` : ''}. Merci pour votre activité !{p.description ? ` ${p.description}` : ''}</span>
        </div>
      ))}
      <div className="stats">
        <Stat icon={faChartLine} label="Mes ventes (mon prix)" value={price(d.gross_sales)} />
        <Stat icon={faBoxOpen} label="Commandes" value={d.orders_count} />
        <Stat icon={faClock} label="À préparer" value={d.to_prepare} />
        <Stat icon={faShirt} label="Produits en ligne" value={`${d.products.published} / ${d.products.total}`} />
        <Stat icon={faMoneyBillWave} label={`À encaisser à la livraison (${d.to_collect_orders} cmd)`} value={price(d.to_collect)} />
        <Stat icon={faHandHoldingDollar} label="À recevoir de la plateforme" value={price(d.balance)} />
      </div>
      <div className="two-col side-340" style={{ paddingTop: 0 }}>
        <div className="stack" style={{ gap: 20 }}>
          <div className="card">
            <div className="card-title"><FontAwesomeIcon icon={faChartLine} /> Ventes des 14 derniers jours</div>
            <BarChart data={d.sales_by_day} />
          </div>
          <div className="card">
            <div className="card-title"><FontAwesomeIcon icon={faBoxOpen} /> Dernières ventes</div>
            {d.recent_items.length === 0 ? <p className="muted small">Aucune vente pour l’instant.</p> : (
              <div className="table-wrap"><table className="table">
                <thead><tr><th>Article</th><th>Statut</th><th style={{ textAlign: 'right' }}>Montant</th></tr></thead>
                <tbody>
                {d.recent_items.map((i) => (
                  <tr key={i.id}>
                    <td><b>{i.product_name}</b><div className="small muted">{i.order_number} · {i.size}/{i.color} x{i.quantity}</div></td>
                    <td><StatusBadge map={ORDER_STATUS} value={i.fulfillment_status} /></td>
                    <td style={{ textAlign: 'right' }}><b>{price(i.line_total)}</b></td>
                  </tr>
                ))}
              </tbody></table></div>
            )}
          </div>
        </div>
        <div className="stack" style={{ gap: 20 }}>
          <div className="card">
            <div className="card-title"><FontAwesomeIcon icon={faBoxOpen} /> Statut des commandes</div>
            {['confirmed', 'preparing', 'ready', 'shipped', 'delivered'].map((s) => (
              <div key={s} className="summary-row"><StatusBadge map={ORDER_STATUS} value={s} /><b>{d.orders_by_status[s] || 0}</b></div>
            ))}
          </div>
          <div className="card">
            <div className="card-title"><FontAwesomeIcon icon={faTriangleExclamation} /> Stocks faibles</div>
            {d.low_stock.length === 0 ? <p className="small muted mb-0"><FontAwesomeIcon icon={faCircleCheck} className="gold" /> Tous vos stocks sont suffisants.</p>
              : d.low_stock.map((v) => (
                <Link key={v.id} to={`/vendeur/produits/${v.product_id}`} className="summary-row small">
                  <span>{v.name} <span className="muted">({v.size}/{v.color})</span></span>
                  <span className={`badge ${v.stock_quantity === 0 ? 'badge-danger' : 'badge-warning'}`}>{v.stock_quantity}</span>
                </Link>
              ))}
          </div>
          {d.products.pending > 0 && (
            <div className="alert alert-gold small"><FontAwesomeIcon icon={faClock} /> {d.products.pending} produit(s) en attente de validation.</div>
          )}
        </div>
      </div>
    </>
  );
}

export function SellerProducts() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const { data, meta, loading, error, reload } = useFetch('/seller/products', { page, status, q: search });
  useLive(['moderation'], () => reload({ silent: true }));
  const { confirm, notify } = useFeedback();

  const toggle = async (p) => {
    const disabling = p.status !== 'disabled';
    const ok = await confirm({
      title: disabling ? 'Désactiver ce vêtement ?' : 'Réactiver ce vêtement ?',
      message: disabling ? 'Il ne sera plus visible par les clients.' : 'Il sera de nouveau proposé (après validation si nécessaire).',
      confirmLabel: disabling ? 'Désactiver' : 'Réactiver', danger: disabling,
    });
    if (!ok) return;
    try {
      const { data: r } = await api.patch(`/seller/products/${p.id}/status`, { status: disabling ? 'disabled' : 'active' });
      notify.success(r.message);
      reload();
    } catch (e) { notify.error(apiError(e).message); }
  };

  return (
    <>
      <PageHead icon={faShirt} title="Mes vêtements">
        <Link to="/vendeur/produits/nouveau" className="btn"><FontAwesomeIcon icon={faPlus} /> Ajouter</Link>
      </PageHead>
      <div className="flex flex-wrap mb-2">
        <div className="chips">
          {[['', 'Tous'], ...Object.entries(PRODUCT_STATUS).map(([k, [l]]) => [k, l])].map(([k, l]) => (
            <button key={k} className={`chip ${status === k ? 'on' : ''}`} onClick={() => { setStatus(k); setPage(1); }}>{l}</button>
          ))}
        </div>
        <form className="search" style={{ maxWidth: 280, marginLeft: 'auto' }} onSubmit={(e) => { e.preventDefault(); setSearch(q); setPage(1); }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher" aria-label="Rechercher un produit" />
          <button aria-label="Rechercher"><FontAwesomeIcon icon={faMagnifyingGlass} /></button>
        </form>
      </div>
      {loading ? <Loader /> : error ? <ErrorState message={error} onRetry={reload} /> : data.length === 0 ? (
        <Empty icon={faShirt} title="Aucun vêtement" text="Publiez votre premier article en quelques minutes.">
          <Link to="/vendeur/produits/nouveau" className="btn"><FontAwesomeIcon icon={faPlus} /> Ajouter un vêtement</Link>
        </Empty>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Article</th><th>Prix client</th><th>Stock</th><th>Ventes</th><th>Statut</th><th /></tr></thead>
            <tbody>
              {data.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="flex">
                      <div className="thumb" style={{ overflow: 'hidden' }}><ProductImage src={p.image} alt="" /></div>
                      <div><b>{p.name}</b><div className="small muted">{p.category_name} · {p.variant_count} variante(s)</div>
                        {p.moderation_note && <div className="small field-error">{p.moderation_note}</div>}</div>
                    </div>
                  </td>
                  <td>{price(p.price)}</td>
                  <td><span className={`badge ${p.stock <= 3 ? 'badge-warning' : ''}`}>{p.stock}</span></td>
                  <td>{p.sales_count}</td>
                  <td><StatusBadge map={PRODUCT_STATUS} value={p.status} /></td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <Link to={`/vendeur/produits/${p.id}`} className="btn btn-ghost btn-sm" title="Modifier"><FontAwesomeIcon icon={faPen} /></Link>
                    <button className="btn btn-ghost btn-sm" onClick={() => toggle(p)} title={p.status === 'disabled' ? 'Réactiver' : 'Désactiver'}>
                      <FontAwesomeIcon icon={p.status === 'disabled' ? faEye : faEyeSlash} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination meta={meta} onChange={setPage} />
    </>
  );
}

const SIZE_PRESETS = {
  Adulte: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  Enfant: ['2 ans', '4 ans', '6 ans', '8 ans', '10 ans', '12 ans'],
  Bébé: ['0-3 mois', '3 mois', '6 mois', '12 mois', '18 mois'],
  'Taille unique': ['Unique'],
};

// Médias produit (stockés sur Cloudinary) : limites alignées sur celles de l'API
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const MB = 1024 * 1024;
const MAX_IMAGE_MB = 5;
const MAX_VIDEO_MB = 50;
const MAX_MEDIA = 8;
const MAX_VIDEOS = 2;
const isVideoFile = (f) => VIDEO_TYPES.includes(f.type);

const emptyVariant = () => ({ size: '', color: '', color_hex: '#C9A227', price: '', compare_at_price: '', stock_quantity: '' });

export function SellerProductForm() {
  const { id } = useParams();
  const isNew = !id || id === 'nouveau';
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showResult, notify } = useFeedback();
  const { data: categories } = useFetch('/categories');
  const { data: pubSettings } = useFetch('/settings/public');
  const existing = useFetch(isNew ? null : `/seller/products/${id}`);
  const [variants, setVariants] = useState([emptyVariant()]);
  const [images, setImages] = useState([]);
  const [newFiles, setNewFiles] = useState([]);
  const [progress, setProgress] = useState(null); // % d'envoi des médias
  const [removed, setRemoved] = useState([]);
  const fileRef = useRef(null);
  const [bulk, setBulk] = useState({ color: '', color_hex: '#C9A227', price: '', stock: '', preset: 'Adulte' });
  const [showBulk, setShowBulk] = useState(false);
  const { values, set, setValues, errors, submitting, submit } = useForm({
    name: '', category_id: '', description: '', audience: 'unisexe', material: '', fit: '', care: '', origin: 'Côte d’Ivoire', size_guide: '',
  });

  useEffect(() => {
    const p = existing.data;
    if (!p) return;
    setValues({
      name: p.name, category_id: p.category_id, description: p.description || '', audience: p.audience, material: p.material || '',
      fit: p.fit || '', care: p.care || '', origin: p.origin || '', size_guide: p.size_guide || '',
    });
    setVariants(p.variants.map((v) => ({ ...v, compare_at_price: v.compare_at_price || '', color_hex: v.color_hex || '#C9A227' })));
    setImages(p.images);
  }, [existing.data, setValues]);

  // Aperçus des nouvelles photos
  const previews = newFiles.map((f) => URL.createObjectURL(f));
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [newFiles]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isNew && existing.loading) return <Loader />;
  if (!isNew && existing.error) return <ErrorState message={existing.error} />;

  const keptMedia = images.filter((im) => !removed.includes(im.id));
  // Le client paie votre prix + les frais plateforme ; au reversement, la commission vendeur est retenue sur votre prix
  const feeRate = existing.data?.platform_fee_rate ?? pubSettings?.platform_fee_rate ?? 5;
  const commissionRate = user.shop?.is_official ? 0 : (existing.data?.seller_commission_rate ?? pubSettings?.seller_commission_rate ?? 5);
  const clientPrice = (p) => Math.round(Number(p) * (1 + feeRate / 100));
  const sellerNet = (p) => Number(p) - Math.round((Number(p) * commissionRate) / 100);

  const setV = (i, k) => (e) => setVariants((vs) => vs.map((v, j) => (j === i ? { ...v, [k]: e.target.value } : v)));
  const addFiles = (files) => {
    const all = [...files];
    const accepted = all.filter((f) => {
      const video = VIDEO_TYPES.includes(f.type);
      if (!video && !IMAGE_TYPES.includes(f.type)) return false;
      if (f.size > (video ? MAX_VIDEO_MB : MAX_IMAGE_MB) * MB) {
        notify.warning(`« ${f.name} » dépasse ${video ? MAX_VIDEO_MB : MAX_IMAGE_MB} Mo`);
        return false;
      }
      return true;
    });
    if (all.some((f) => !IMAGE_TYPES.includes(f.type) && !VIDEO_TYPES.includes(f.type))) {
      notify.warning('Formats acceptés : photos JPG, PNG, WEBP et vidéos MP4, WEBM, MOV');
    }
    setNewFiles((s) => {
      const keptVideos = keptMedia.filter((m) => m.media_type === 'video').length;
      const next = [];
      let videos = keptVideos + s.filter(isVideoFile).length;
      for (const f of accepted) {
        if (isVideoFile(f)) {
          if (videos >= MAX_VIDEOS) { notify.warning(`${MAX_VIDEOS} vidéos maximum par vêtement`); continue; }
          videos++;
        }
        next.push(f);
      }
      return [...s, ...next].slice(0, MAX_MEDIA - keptMedia.length);
    });
  };
  const applyBulk = () => {
    if (!bulk.color || !bulk.price) return notify.error('Indiquez au moins la couleur et le prix');
    const rows = SIZE_PRESETS[bulk.preset].map((size) => ({ ...emptyVariant(), size, color: bulk.color, color_hex: bulk.color_hex, price: bulk.price, stock_quantity: bulk.stock || 0 }));
    setVariants((vs) => [...vs.filter((v) => v.size || v.color), ...rows]);
    setShowBulk(false);
    notify.success(`${rows.length} variantes ajoutées`);
  };

  const save = (submitForReview) => submit(async (v) => {
    const fd = new FormData();
    Object.entries(v).forEach(([k, val]) => fd.append(k, val ?? ''));
    fd.append('variants', JSON.stringify(variants.map((x) => ({
      ...(x.id ? { id: x.id } : {}), size: x.size, color: x.color, color_hex: x.color_hex,
      price: Number(x.price), compare_at_price: x.compare_at_price ? Number(x.compare_at_price) : null, stock_quantity: Number(x.stock_quantity || 0),
    }))));
    fd.append('remove_image_ids', JSON.stringify(removed));
    fd.append('submit', String(submitForReview));
    newFiles.forEach((f) => fd.append('images', f));
    // Pas de délai maximal (vidéos) + suivi de la progression de l'envoi
    const config = {
      timeout: 0,
      onUploadProgress: newFiles.length ? (e) => e.total && setProgress(Math.round((e.loaded / e.total) * 100)) : undefined,
    };
    let data;
    try {
      ({ data } = isNew ? await api.post('/seller/products', fd, config) : await api.put(`/seller/products/${id}`, fd, config));
    } finally {
      setProgress(null);
    }
    const st = data.data.status;
    await showResult({
      type: st === 'draft' ? 'info' : 'success',
      icon: st === 'pending' ? faPaperPlane : st === 'draft' ? faFloppyDisk : faCircleCheck,
      title: st === 'pending' ? 'Envoyé en validation' : st === 'published' ? 'Vêtement publié !' : 'Brouillon enregistré',
      message: st === 'pending' ? 'Notre équipe vérifie votre article. Il sera en ligne dès sa validation.' : data.message,
      confirmLabel: 'Voir mes vêtements',
      secondaryLabel: isNew ? 'Ajouter un autre' : null,
    }).then((r) => (r === 'secondary' ? window.location.reload() : navigate('/vendeur/produits')));
  }, {
    toastSuccess: false,
    validate: (v) => ({
      category_id: !v.category_id && 'Choisissez une catégorie',
      images: submitForReview && !keptMedia.some((m) => m.media_type !== 'video') && !newFiles.some((f) => !isVideoFile(f))
        && 'Ajoutez au moins une photo',
      variants: variants.some((x) => !x.size || !x.color || !x.price) && 'Complétez la taille, la couleur et le prix de chaque variante',
    }),
  });

  return (
    <>
      <Link to="/vendeur/produits" className="btn btn-ghost btn-sm mb-1"><FontAwesomeIcon icon={faArrowLeft} /> Mes vêtements</Link>
      <PageHead icon={faShirt} title={isNew ? 'Nouveau vêtement' : 'Modifier le vêtement'}>
        {!isNew && <StatusBadge map={PRODUCT_STATUS} value={existing.data.status} />}
      </PageHead>
      {existing.data?.moderation_note && (
        <div className="alert alert-danger mb-2"><FontAwesomeIcon icon={faTriangleExclamation} /> Motif du refus : {existing.data.moderation_note}</div>
      )}
      <form className="stack" style={{ gap: 20 }} onSubmit={save(true)} noValidate>
        <section className="card form-grid">
          <div className="card-title full mb-0"><FontAwesomeIcon icon={faShirt} /> Informations</div>
          <Field label="Nom du vêtement" error={errors.name} required className="full">
            <input className="input" value={values.name} onChange={set('name')} placeholder="Ex. : Robe pagne wax évasée" />
          </Field>
          <Field label="Catégorie" error={errors.category_id} required>
            <select className="select" value={values.category_id} onChange={set('category_id')}>
              <option value="">— Choisir —</option>
              {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Public" error={errors.audience} required>
            <select className="select" value={values.audience} onChange={set('audience')}>
              {Object.entries(AUDIENCES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </Field>
          <Field label="Description" error={errors.description} required className="full" hint="Matière, coupe, occasion… (20 caractères min.)">
            <textarea className="textarea" value={values.description} onChange={set('description')} maxLength={5000} />
          </Field>
          <Field label="Matière" error={errors.material}><input className="input" value={values.material} onChange={set('material')} placeholder="Ex. : Coton wax" /></Field>
          <Field label="Coupe" error={errors.fit}><input className="input" value={values.fit} onChange={set('fit')} placeholder="Ex. : Ajustée" /></Field>
          <Field label="Entretien" error={errors.care}><input className="input" value={values.care} onChange={set('care')} placeholder="Ex. : Lavage à 30°C" /></Field>
          <Field label="Origine" error={errors.origin}><input className="input" value={values.origin} onChange={set('origin')} /></Field>
          <Field label="Guide des tailles (facultatif)" error={errors.size_guide} className="full">
            <textarea className="textarea" style={{ minHeight: 70 }} value={values.size_guide} onChange={set('size_guide')} placeholder="Ex. : M = tour de poitrine 92-96 cm" />
          </Field>
        </section>

        <section className="card">
          <div className="card-title"><FontAwesomeIcon icon={faImage} /> Photos et vidéos <span className="small muted">({keptMedia.length + newFiles.length}/{MAX_MEDIA})</span></div>
          <div className="flex flex-wrap" style={{ alignItems: 'stretch' }}>
            {keptMedia.map((im) => (
              <div key={im.id} className="media-tile">
                <ProductImage src={im.url} alt="" w={240} />
                {im.media_type === 'video' && <span className="thumb-play"><FontAwesomeIcon icon={faPlay} /></span>}
                <button type="button" className="icon-btn media-remove" onClick={() => setRemoved((r) => [...r, im.id])}
                  aria-label={im.media_type === 'video' ? 'Retirer la vidéo' : 'Retirer la photo'}><FontAwesomeIcon icon={faXmark} /></button>
              </div>
            ))}
            {previews.map((u, i) => (
              <div key={u} className="media-tile new">
                {isVideoFile(newFiles[i])
                  ? <video src={u} muted playsInline preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#000' }} />
                  : <img src={u} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                {isVideoFile(newFiles[i]) && <span className="thumb-play"><FontAwesomeIcon icon={faPlay} /></span>}
                <button type="button" className="icon-btn media-remove" onClick={() => setNewFiles((s) => s.filter((_, j) => j !== i))}
                  aria-label="Retirer"><FontAwesomeIcon icon={faXmark} /></button>
              </div>
            ))}
            {keptMedia.length + newFiles.length < MAX_MEDIA && (
              <div className="file-drop" style={{ width: 110, height: 135, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
                onClick={() => fileRef.current.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
                role="button" tabIndex={0}>
                <FontAwesomeIcon icon={faPlus} size="lg" /><span className="small">Ajouter</span>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept={[...IMAGE_TYPES, ...VIDEO_TYPES].join(',')} multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
          {errors.images && <div className="field-error mt-1">{errors.images}</div>}
          <p className="small muted mt-1 mb-0">
            Photos nettes sur fond clair (JPG, PNG, WEBP – {MAX_IMAGE_MB} Mo max) et jusqu’à {MAX_VIDEOS} vidéos (MP4, WEBM, MOV – {MAX_VIDEO_MB} Mo max).
            La première photo sera l’image principale.
          </p>
        </section>

        <section className="card">
          <div className="flex between mb-2">
            <div className="card-title mb-0"><FontAwesomeIcon icon={faCoins} /> Variantes, prix et stocks</div>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowBulk(true)}><FontAwesomeIcon icon={faPlus} /> Ajout rapide</button>
          </div>
          <div className="alert alert-gold small mb-2">
            <FontAwesomeIcon icon={faCircleInfo} />
            <span>Saisissez <b>votre prix</b>. Le client voit votre prix <b>+ {feeRate} %</b> de frais plateforme (colonne « Prix client »)
              {commissionRate > 0
                ? <>, et <b>{commissionRate} % de commission</b> sont retenus sur votre prix au reversement (colonne « Vous recevez »). La livraison vous revient en totalité.</>
                : <> ; vous recevez votre prix en totalité.</>}</span>
          </div>
          {errors.variants && <div className="alert alert-danger small mb-2">{errors.variants}</div>}
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Taille</th><th>Couleur</th><th>Votre prix (FCFA)</th><th>Prix client</th>{commissionRate > 0 && <th>Vous recevez</th>}<th>Votre prix barré</th><th>Stock</th><th /></tr></thead>
              <tbody>
                {variants.map((v, i) => (
                  <tr key={v.id || `n${i}`}>
                    <td><input className="input" style={{ minWidth: 80 }} value={v.size} onChange={setV(i, 'size')} placeholder="M" aria-label="Taille" /></td>
                    <td>
                      <div className="flex" style={{ gap: 6 }}>
                        <input type="color" value={v.color_hex} onChange={setV(i, 'color_hex')} aria-label="Teinte" style={{ width: 38, height: 38, border: 0, background: 'none', padding: 0 }} />
                        <input className="input" style={{ minWidth: 100 }} value={v.color} onChange={setV(i, 'color')} placeholder="Noir" aria-label="Couleur" />
                      </div>
                    </td>
                    <td><input className="input" type="number" min="0" style={{ minWidth: 100 }} value={v.price} onChange={setV(i, 'price')} aria-label="Votre prix" /></td>
                    <td className="small" style={{ whiteSpace: 'nowrap' }}>{Number(v.price) > 0 ? <b>{price(clientPrice(v.price))}</b> : '—'}</td>
                    {commissionRate > 0 && (
                      <td className="small gold" style={{ whiteSpace: 'nowrap' }}>{Number(v.price) > 0 ? <b>{price(sellerNet(v.price))}</b> : '—'}</td>
                    )}
                    <td><input className="input" type="number" min="0" style={{ minWidth: 100 }} value={v.compare_at_price} onChange={setV(i, 'compare_at_price')} placeholder="—" aria-label="Prix barré" /></td>
                    <td><input className="input" type="number" min="0" style={{ minWidth: 70 }} value={v.stock_quantity} onChange={setV(i, 'stock_quantity')} aria-label="Stock" /></td>
                    <td><button type="button" className="btn btn-ghost btn-sm" disabled={variants.length === 1}
                      onClick={() => setVariants((vs) => vs.filter((_, j) => j !== i))} aria-label="Supprimer la variante"><FontAwesomeIcon icon={faTrashCan} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" className="btn btn-ghost btn-sm mt-1" onClick={() => setVariants((vs) => [...vs, emptyVariant()])}><FontAwesomeIcon icon={faPlus} /> Ajouter une variante</button>
        </section>

        <div className="flex flex-wrap" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-outline" disabled={submitting} onClick={save(false)}><FontAwesomeIcon icon={faFloppyDisk} /> Enregistrer en brouillon</button>
          <SubmitButton loading={submitting} className="btn-lg"><FontAwesomeIcon icon={faPaperPlane} /> {isNew ? 'Publier' : 'Enregistrer et publier'}</SubmitButton>
        </div>
        {progress !== null && (
          <div className="upload-progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div className="bar"><span style={{ width: `${progress}%` }} /></div>
            <span className="small muted">{progress < 100 ? `Envoi des médias : ${progress} %` : 'Traitement sur Cloudinary…'}</span>
          </div>
        )}
      </form>

      {showBulk && (
        <Modal title="Ajout rapide de variantes" onClose={() => setShowBulk(false)}
          footer={<><button className="btn btn-outline" onClick={() => setShowBulk(false)}>Annuler</button><button className="btn" onClick={applyBulk}>Ajouter</button></>}>
          <div className="form-grid">
            <Field label="Gamme de tailles" className="full">
              <select className="select" value={bulk.preset} onChange={(e) => setBulk({ ...bulk, preset: e.target.value })}>
                {Object.entries(SIZE_PRESETS).map(([k, s]) => <option key={k} value={k}>{k} ({s.join(', ')})</option>)}
              </select>
            </Field>
            <Field label="Couleur"><div className="flex" style={{ gap: 6 }}>
              <input type="color" value={bulk.color_hex} onChange={(e) => setBulk({ ...bulk, color_hex: e.target.value })} style={{ width: 38, height: 38, border: 0, padding: 0 }} aria-label="Teinte" />
              <input className="input" value={bulk.color} onChange={(e) => setBulk({ ...bulk, color: e.target.value })} placeholder="Noir" />
            </div></Field>
            <Field label="Votre prix (FCFA)" hint={Number(bulk.price) > 0 ? `Prix client : ${price(clientPrice(bulk.price))}` : `Le client paiera +${feeRate} %`}>
              <input className="input" type="number" min="0" value={bulk.price} onChange={(e) => setBulk({ ...bulk, price: e.target.value })} />
            </Field>
            <Field label="Stock par taille"><input className="input" type="number" min="0" value={bulk.stock} onChange={(e) => setBulk({ ...bulk, stock: e.target.value })} /></Field>
          </div>
        </Modal>
      )}
    </>
  );
}

const NEXT_LABELS = { preparing: 'Mettre en préparation', ready: 'Prête à expédier', shipped: 'Marquer expédiée', in_delivery: 'En livraison', delivered: 'Marquer livrée' };

export function SellerOrders() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const { data, meta, loading, error, reload } = useFetch('/seller/orders', { status, page });
  useLive(['seller_order', 'order', 'return', 'payout', 'refund'], () => reload({ silent: true }));
  const { notify } = useFeedback();
  const [shipping, setShipping] = useState(null);
  const [ship, setShip] = useState({ carrier: '', tracking_number: '' });

  const { confirm } = useFeedback();
  const advance = async (item, next, extra = {}, order = null) => {
    // Livraison d'une commande avec solde : le vendeur confirme l'avoir encaissé auprès du client
    if (next === 'delivered' && order?.balance_due > 0) {
      const ok = await confirm({
        title: `Avez-vous encaissé ${price(order.balance_due)} ?`,
        message: `Solde de la commande ${order.order_number} réglé par le client à la livraison (espèces ou Mobile Money).`,
        confirmLabel: 'Oui, solde encaissé', cancelLabel: 'Pas encore', type: 'info', icon: faMoneyBillWave,
      });
      if (!ok) return;
      extra = { ...extra, balance_collected: true };
    }
    try {
      const { data: r } = await api.patch(`/seller/order-items/${item.id}/status`, { status: next, ...extra });
      notify.success(r.message);
      setShipping(null);
      reload();
    } catch (e) { notify.error(apiError(e).message); }
  };

  return (
    <>
      <PageHead icon={faBoxOpen} title="Commandes" />
      <div className="chips mb-2">
        {[['', 'Toutes'], ['confirmed', 'À traiter'], ['preparing', 'En préparation'], ['ready', 'Prêtes'], ['shipped', 'Expédiées'], ['delivered', 'Livrées'], ['cancelled', 'Annulées']].map(([k, l]) => (
          <button key={k} className={`chip ${status === k ? 'on' : ''}`} onClick={() => { setStatus(k); setPage(1); }}>{l}</button>
        ))}
      </div>
      {loading ? <Loader /> : error ? <ErrorState message={error} onRetry={reload} /> : data.length === 0 ? (
        <Empty icon={faBoxOpen} title="Aucune commande" text="Les commandes payées ou à payer à la livraison apparaîtront ici." />
      ) : (
        <div className="stack">
          {data.map((o) => {
            const first = o.items[0];
            const next = first?.next_statuses?.[0];
            return (
              <div key={o.id} className="card">
                <div className="flex between flex-wrap">
                  <div><b>{o.order_number}</b> <span className="small muted">· {date(o.created_at, true)}</span></div>
                  <div className="flex" style={{ gap: 6 }}>
                    {showPaymentStatus(o) && <StatusBadge map={PAYMENT_STATUS} value={o.payment_status} />}
                    <span className="badge" style={{ padding: '2px 10px 2px 3px' }}><PaymentLabel code={o.payment_method} size={20} /></span>
                    <span className="badge badge-gold">{PAYMENT_PLANS[o.payment_plan]}</span>
                  </div>
                </div>
                <div className="two-col side-280" style={{ padding: '12px 0 0', gap: 16 }}>
                  <div>
                    {o.items.map((it) => (
                      <div key={it.id} className="flex" style={{ padding: '6px 0' }}>
                        <div style={{ width: 44, height: 54, borderRadius: 6, overflow: 'hidden', flexShrink: 0 }}><ProductImage src={it.image_url} alt="" /></div>
                        <div className="grow small"><b>{it.product_name}</b><div className="muted">{it.size} · {it.color} · x{it.quantity} · {it.sku}</div></div>
                        <StatusBadge map={ORDER_STATUS} value={it.fulfillment_status} />
                      </div>
                    ))}
                  </div>
                  <div className="small" style={{ background: 'var(--gold-soft)', borderRadius: 10, padding: 12 }}>
                    <b>{DELIVERY_MODES[o.delivery_mode]}</b>
                    <div><FontAwesomeIcon icon={faPhone} className="gold" /> {o.ship_recipient} · {o.ship_phone}</div>
                    <div className="muted"><FontAwesomeIcon icon={faLocationDot} className="gold" /> {[o.ship_street, o.ship_district, o.ship_commune, o.ship_city].filter(Boolean).join(', ')}</div>
                    {o.ship_instructions && <div className="muted">« {o.ship_instructions} »</div>}
                  </div>
                </div>
                <hr className="divider" />
                <div className="flex between flex-wrap">
                  <span className="small">
                    Client : <b>{price(o.total_amount)}</b> (dont livraison {price(o.delivery_fee)}) · Payé en ligne : <b>{price(o.upfront_amount)}</b>
                    {o.balance_due > 0 && <> · <b className="gold">À encaisser à la livraison : {price(o.balance_due)}</b></>}
                    {Number(o.balance_amount) > 0 && o.balance_paid_at && <> · Solde encaissé <FontAwesomeIcon icon={faCircleCheck} className="gold" /></>}
                    <br />Votre part nette (vos prix + livraison{Number(o.seller_commission) > 0 ? ` − commission ${price(o.seller_commission)}` : ''}) : <b className="gold">{price(o.seller_amount)}</b>
                  </span>
                  {next && (
                    <button className="btn btn-sm" onClick={() => (next === 'shipped' ? (setShipping(first), setShip({ carrier: '', tracking_number: '' })) : advance(first, next, {}, o))}>
                      <FontAwesomeIcon icon={next === 'shipped' ? faTruckFast : faCircleCheck} /> {next === 'delivered' && o.balance_due > 0 ? `Livrée — solde de ${price(o.balance_due)} encaissé` : NEXT_LABELS[next]}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <Pagination meta={meta} onChange={setPage} />
      {shipping && (
        <Modal title="Expédition" onClose={() => setShipping(null)}
          footer={<><button className="btn btn-outline" onClick={() => setShipping(null)}>Annuler</button>
            <button className="btn" onClick={() => advance(shipping, 'shipped', ship)}><FontAwesomeIcon icon={faTruckFast} /> Confirmer l’expédition</button></>}>
          <div className="stack">
            <Field label="Transporteur / livreur"><input className="input" value={ship.carrier} onChange={(e) => setShip({ ...ship, carrier: e.target.value })} placeholder="Ex. : Yango, Glovo, livreur interne" /></Field>
            <Field label="Numéro de suivi (facultatif)"><input className="input" value={ship.tracking_number} onChange={(e) => setShip({ ...ship, tracking_number: e.target.value })} /></Field>
          </div>
        </Modal>
      )}
    </>
  );
}

export function SellerFinances() {
  const { data: f, loading, error, reload } = useFetch('/seller/finances');
  useLive(['seller_order', 'order', 'return', 'payout', 'refund'], () => reload({ silent: true }));
  if (loading) return <Loader />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const TYPES = { sale: 'Payé en ligne', commission: 'Frais plateforme', payout: 'Reversement', refund: 'Remboursement', adjustment: 'Ajustement' };
  return (
    <>
      <PageHead icon={faWallet} title="Finances" />
      <div className="stats">
        <Stat icon={faChartLine} label="Encaissé en ligne (commandes livrées)" value={price(f.gross_sales)} />
        <Stat icon={faPercent} label={`Frais plateforme (${f.platform_fee_rate} % client) et commission (${f.seller_commission_rate} %)`} value={price(f.commissions)} />
        <Stat icon={faCoins} label="Dû par la plateforme" value={price(f.net_earned)} />
        <Stat icon={faMoneyBillWave} label="À encaisser vous-même à la livraison" value={price(f.to_collect)} />
        <Stat icon={faCircleCheck} label="Déjà reversé" value={price(f.paid_out)} />
        <Stat icon={faClock} label="Reversements en cours" value={price(f.pending_payouts)} />
        <Stat icon={faHandHoldingDollar} label="Solde disponible" value={price(f.balance)} />
      </div>
      <div className="alert alert-gold mb-3">
        <FontAwesomeIcon icon={faWallet} />
        <span>Commandes en cours : <b>{price(f.upcoming)}</b> déjà payés en ligne, crédités à la livraison.<br />
          Votre part vous est <b>versée automatiquement</b> sur votre compte Mobile Money après chaque livraison.<br />
          Reversements sur <PaymentLabel code={f.payout_method} size={22} /> <b>{f.payout_account}</b>{f.payout_holder ? ` (${f.payout_holder})` : ''} ·{' '}
          <Link to="/vendeur/boutique#paiement" className="gold">modifier</Link></span>
      </div>
      <div className="two-col halves" style={{ paddingTop: 0 }}>
        <div>
          <h3>Écritures</h3>
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Date</th><th>Type</th><th>Libellé</th><th style={{ textAlign: 'right' }}>Montant</th></tr></thead>
            <tbody>
              {f.entries.length === 0 && <tr><td colSpan={4} className="muted center">Aucune écriture</td></tr>}
              {f.entries.map((e) => (
                <tr key={e.id}><td className="small">{date(e.created_at)}</td><td>{TYPES[e.entry_type]}</td><td className="small">{e.description}</td>
                  <td style={{ textAlign: 'right', color: e.amount < 0 ? 'var(--danger)' : 'var(--success)' }}><b>{e.amount > 0 ? '+' : ''}{price(e.amount)}</b></td></tr>
              ))}
            </tbody>
          </table></div>
        </div>
        <div>
          <h3>Reversements</h3>
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Référence</th><th>Date</th><th>Statut</th><th style={{ textAlign: 'right' }}>Montant</th></tr></thead>
            <tbody>
              {f.payouts.length === 0 && <tr><td colSpan={4} className="muted center">Aucun reversement</td></tr>}
              {f.payouts.map((p) => (
                <tr key={p.id}><td className="small">{p.reference}</td><td className="small">{date(p.paid_at || p.created_at)}</td>
                  <td><span className={`badge ${p.status === 'paid' ? 'badge-success' : p.status === 'failed' ? 'badge-danger' : 'badge-warning'}`}>{p.status === 'paid' ? 'Payé' : p.status === 'failed' ? 'Échec' : 'En cours'}</span></td>
                  <td style={{ textAlign: 'right' }}><b>{price(p.amount)}</b></td></tr>
              ))}
            </tbody>
          </table></div>
        </div>
      </div>
    </>
  );
}

export function SellerShop() {
  const { refreshUser } = useAuth();
  const { data: shop, loading, error } = useFetch('/seller/shop');
  const [files, setFiles] = useState({});
  const { values, set, setValues, errors, submitting, submit } = useForm({
    description: '', phone: '', email: '', city: '', commune: '', address: '',
    payout_method: 'orange_money', payout_account: '', payout_holder: '',
    delivery_fee_abidjan: 1500, delivery_fee_other: 3000, free_delivery_threshold: 0, allow_shop_pickup: false, delivery_info: '',
  });
  useEffect(() => {
    if (shop) setValues({
      description: shop.description || '', phone: shop.phone, email: shop.email, city: shop.city, commune: shop.commune || '',
      address: shop.address || '', payout_method: shop.payout_method || 'orange_money', payout_account: shop.payout_account || '',
      payout_holder: shop.payout_holder || '',
      delivery_fee_abidjan: shop.delivery_fee_abidjan ?? 1500, delivery_fee_other: shop.delivery_fee_other ?? 3000,
      free_delivery_threshold: shop.free_delivery_threshold ?? 0, allow_shop_pickup: Boolean(shop.allow_shop_pickup),
      delivery_info: shop.delivery_info || '',
    });
  }, [shop, setValues]);
  // Ancre /vendeur/boutique#paiement depuis le tableau de bord
  useEffect(() => {
    if (shop && window.location.hash === '#paiement') document.getElementById('paiement')?.scrollIntoView({ behavior: 'smooth' });
  }, [shop]);
  if (loading) return <Loader />;
  if (error) return <ErrorState message={error} />;

  const validate = (v) => {
    const e = {};
    if (!String(v.payout_account).trim()) e.payout_account = 'Numéro de réception requis';
    if (String(v.payout_holder).trim().length < 3) e.payout_holder = 'Nom du titulaire requis';
    ['delivery_fee_abidjan', 'delivery_fee_other', 'free_delivery_threshold'].forEach((k) => {
      if (v[k] === '' || Number.isNaN(Number(v[k])) || Number(v[k]) < 0) e[k] = 'Montant invalide';
    });
    return e;
  };
  const onSubmit = submit(async (v) => {
    const fd = new FormData();
    Object.entries(v).forEach(([k, val]) => fd.append(k, val));
    if (files.logo) fd.append('logo', files.logo);
    if (files.banner) fd.append('banner', files.banner);
    const { data } = await api.patch('/seller/shop', fd);
    await refreshUser();
    return data;
  }, { validate });

  return (
    <>
      <PageHead icon={faGear} title="Ma boutique" />
      <ShopLinkCard slug={shop.slug} name={shop.name} />
      <form className="card form-grid mt-2" onSubmit={onSubmit} noValidate>
        <div className="full flex">
          <div className="shop-logo" style={{ width: 80, height: 80 }}>{shop.logo_url ? <img src={fileUrl(shop.logo_url)} alt="" /> : shop.name[0]}</div>
          <div><b className="brand-title" style={{ fontSize: '1.2rem' }}>{shop.name}</b>
            <div className="small muted">{shop.is_official ? 'Boutique officielle : sans commission' : 'Commission de 5 % sur vos prix, retenue au reversement (livraison exclue)'} · Validée le {date(shop.approved_at)}</div></div>
        </div>
        <Field label="Nouveau logo"><input className="input" type="file" accept="image/*" onChange={(e) => setFiles({ ...files, logo: e.target.files[0] })} /></Field>
        <Field label="Bannière"><input className="input" type="file" accept="image/*" onChange={(e) => setFiles({ ...files, banner: e.target.files[0] })} /></Field>
        <Field label="Description" error={errors.description} required className="full"><textarea className="textarea" value={values.description} onChange={set('description')} /></Field>
        <Field label="Téléphone" error={errors.phone} required><input className="input" value={values.phone} onChange={set('phone')} /></Field>
        <Field label="E-mail" error={errors.email} required><input className="input" value={values.email} onChange={set('email')} /></Field>
        <Field label="Ville" error={errors.city} required><input className="input" value={values.city} onChange={set('city')} /></Field>
        <Field label="Commune" error={errors.commune}><input className="input" value={values.commune} onChange={set('commune')} /></Field>
        <Field label="Adresse" error={errors.address} className="full"><input className="input" value={values.address} onChange={set('address')} /></Field>

        <h3 className="full mb-0 mt-2"><FontAwesomeIcon icon={faTruckFast} className="gold" /> Livraison (gérée par vous)</h3>
        <p className="full small muted mt-0 mb-0">Vous livrez vous-même vos clients. Les frais de livraison sont ajoutés à la commande et vous reviennent intégralement.
          Ces tarifs par défaut s’appliquent aux zones sans tarif propre : réglez chaque commune et chaque ville <a href="#tarifs-livraison" className="gold">plus bas</a>.</p>
        <Field label="Tarif par défaut à Abidjan (FCFA)" error={errors.delivery_fee_abidjan} required>
          <input className="input" type="number" min="0" step="100" value={values.delivery_fee_abidjan} onChange={set('delivery_fee_abidjan')} />
        </Field>
        <Field label="Tarif par défaut à l’intérieur (FCFA)" error={errors.delivery_fee_other} required>
          <input className="input" type="number" min="0" step="100" value={values.delivery_fee_other} onChange={set('delivery_fee_other')} />
        </Field>
        <Field label="Livraison offerte dès (FCFA, 0 = jamais)" error={errors.free_delivery_threshold}>
          <input className="input" type="number" min="0" step="1000" value={values.free_delivery_threshold} onChange={set('free_delivery_threshold')} />
        </Field>
        <Field label="Retrait en boutique">
          <label className="flex small"><input type="checkbox" checked={values.allow_shop_pickup} onChange={set('allow_shop_pickup')} /> Autoriser le retrait gratuit à ma boutique</label>
        </Field>
        <Field label="Informations de livraison (délais, zones…)" error={errors.delivery_info} className="full">
          <textarea className="textarea" maxLength={500} value={values.delivery_info} onChange={set('delivery_info')}
            placeholder="Ex. : livraison sous 24 h à Abidjan, 48 à 72 h à l’intérieur." />
        </Field>

        <h3 className="full mb-0 mt-2" id="paiement"><FontAwesomeIcon icon={faHandHoldingDollar} className="gold" /> Recevoir mon argent</h3>
        <p className="full small muted mt-0 mb-0">Les montants payés en ligne par vos clients vous sont reversés sur ce compte après la livraison.
          Le solde payé à la livraison, vous l’encaissez directement auprès du client.</p>
        <Field label="Moyen de réception" error={errors.payout_method} required className="full">
          <PayoutPicker value={values.payout_method} onChange={set('payout_method')} />
        </Field>
        <Field label="Numéro du compte" error={errors.payout_account} required>
          <input className="input" inputMode="tel" value={values.payout_account} onChange={set('payout_account')} placeholder="07 00 00 00 00" />
        </Field>
        <Field label="Nom du titulaire du compte" error={errors.payout_holder} required>
          <input className="input" value={values.payout_holder} onChange={set('payout_holder')} />
        </Field>
        <div className="full"><SubmitButton loading={submitting}><FontAwesomeIcon icon={faFloppyDisk} /> Enregistrer</SubmitButton></div>
      </form>
      <DeliveryZonesEditor defaults={{ abidjan: values.delivery_fee_abidjan, other: values.delivery_fee_other }} />
    </>
  );
}

const zoneKey = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * Tarifs de livraison du vendeur commune par commune (Abidjan) et ville par ville.
 * Champ vide = tarif par défaut de la boutique ; case décochée = « je ne livre pas dans cette zone ».
 */
/** Toutes les communes d'Abidjan, complétées par les tarifs déjà enregistrés (communes ajoutées, villes). */
function zoneRows(saved) {
  const byKey = new Map(saved.map((z) => [`${z.zone_type}:${zoneKey(z.name)}`, z]));
  const communes = ABIDJAN_COMMUNES.map((name) => {
    const z = byKey.get(`commune:${zoneKey(name)}`);
    byKey.delete(`commune:${zoneKey(name)}`);
    return { zone_type: 'commune', name: z?.name || name, fee: z?.fee ?? '', delivers: z ? z.delivers : true };
  });
  const extra = [...byKey.values()].map((z) => ({ ...z, fee: z.fee ?? '' }));
  return [...communes, ...extra.filter((z) => z.zone_type === 'commune'), ...extra.filter((z) => z.zone_type === 'city')];
}

function DeliveryZonesEditor({ defaults }) {
  const { data, loading, error, reload } = useFetch('/seller/delivery-zones');
  if (loading || !data) return error ? <ErrorState message={error} onRetry={reload} /> : <Loader />;
  // Clé : le formulaire repart des données enregistrées après chaque sauvegarde
  return <DeliveryZonesForm key={JSON.stringify(data)} saved={data} defaults={defaults} onSaved={() => reload({ silent: true })} />;
}

function DeliveryZonesForm({ saved, defaults, onSaved }) {
  const { notify } = useFeedback();
  const [rows, setRows] = useState(() => zoneRows(saved));
  const [newCity, setNewCity] = useState('');
  const [saving, setSaving] = useState(false);

  const update = (i, patch) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const cities = rows.map((r, i) => [r, i]).filter(([r]) => r.zone_type === 'city');
  const communes = rows.map((r, i) => [r, i]).filter(([r]) => r.zone_type === 'commune');
  const addCity = (name) => {
    const n = name.trim();
    if (n.length < 2) return;
    if (/abidjan/i.test(n)) { notify.warning('Pour Abidjan, indiquez vos tarifs commune par commune ci-dessus.'); return; }
    if (rows.some((r) => r.zone_type === 'city' && zoneKey(r.name) === zoneKey(n))) { notify.info(`${n} est déjà dans la liste`); return; }
    setRows((rs) => [...rs, { zone_type: 'city', name: n, fee: '', delivers: true }]);
    setNewCity('');
  };
  const save = async () => {
    const bad = rows.find((r) => r.fee !== '' && (Number.isNaN(Number(r.fee)) || Number(r.fee) < 0));
    if (bad) { notify.error(`Tarif invalide pour ${bad.name}`); return; }
    setSaving(true);
    try {
      const { data: r } = await api.put('/seller/delivery-zones', { zones: rows.map((z) => ({ ...z, fee: z.fee === '' ? null : Number(z.fee) })) });
      notify.success(r.message);
      onSaved();
    } catch (e) { notify.error(apiError(e).message); } finally { setSaving(false); }
  };
  const table = (list, def, label) => (
    <div className="table-wrap"><table className="table">
      <thead><tr><th>{label}</th><th>Tarif (FCFA)</th><th>Je livre</th>{label === 'Ville' && <th />}</tr></thead>
      <tbody>{list.map(([r, i]) => (
        <tr key={`${r.zone_type}-${r.name}`} style={r.delivers ? undefined : { opacity: 0.6 }}>
          <td><b>{r.name}</b></td>
          <td style={{ minWidth: 150 }}>
            <input className="input" type="number" min="0" step="100" value={r.fee} disabled={!r.delivers}
              onChange={(e) => update(i, { fee: e.target.value })} placeholder={`${price(def)} (défaut)`} aria-label={`Tarif ${r.name}`} />
          </td>
          <td><label className="flex small"><input type="checkbox" checked={r.delivers} onChange={(e) => update(i, { delivers: e.target.checked })} /> {r.delivers ? 'Oui' : 'Non'}</label></td>
          {label === 'Ville' && (
            <td><button type="button" className="btn btn-ghost btn-sm" onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))} aria-label={`Retirer ${r.name}`}>
              <FontAwesomeIcon icon={faTrashCan} /></button></td>
          )}
        </tr>
      ))}</tbody>
    </table></div>
  );

  return (
    <div className="card mt-2 stack" id="tarifs-livraison">
      <div>
        <div className="card-title mb-0"><FontAwesomeIcon icon={faLocationDot} /> Tarifs de livraison par commune et par ville</div>
        <p className="small muted mb-0">Fixez un prix pour chaque commune d’Abidjan et chaque ville où vous livrez. Laissez vide pour appliquer
          votre tarif par défaut ({price(defaults.abidjan)} à Abidjan, {price(defaults.other)} à l’intérieur). Décochez « Je livre » pour une zone
          que vous ne desservez pas : vos clients n’y pourront que retirer en boutique (si vous l’autorisez).</p>
      </div>
      <h4 className="mb-0">Communes d’Abidjan</h4>
      {table(communes, defaults.abidjan, 'Commune')}
      <h4 className="mb-0">Villes de l’intérieur</h4>
      {cities.length > 0 ? table(cities, defaults.other, 'Ville') : <p className="small muted mb-0">Aucune ville ajoutée : votre tarif « intérieur » s’applique partout.</p>}
      <div className="flex flex-wrap">
        <input className="input" style={{ maxWidth: 260 }} list="zone-cities" value={newCity} placeholder="Ajouter une ville (ex. : Bouaké)"
          onChange={(e) => setNewCity(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCity(newCity); } }} />
        <datalist id="zone-cities">{CITIES.filter((c) => c !== 'Abidjan').map((c) => <option key={c} value={c} />)}</datalist>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => addCity(newCity)}><FontAwesomeIcon icon={faPlus} /> Ajouter</button>
      </div>
      <div><button type="button" className="btn" disabled={saving} onClick={save}>
        <FontAwesomeIcon icon={faFloppyDisk} /> {saving ? 'Enregistrement…' : 'Enregistrer les tarifs de livraison'}</button></div>
    </div>
  );
}
