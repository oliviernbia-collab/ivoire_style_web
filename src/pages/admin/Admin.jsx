import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faGaugeHigh, faStore, faShirt, faBoxOpen, faUsers, faTags, faHandHoldingDollar, faGear, faClipboardList, faStar,
  faCircleCheck, faCircleXmark, faBan, faRotateLeft, faEye, faMagnifyingGlass, faFileShield, faChartLine, faCoins,
  faUserCheck, faClock, faMoneyBillTransfer, faPlus, faPen, faTrashCan, faFloppyDisk, faArrowLeft, faTruckFast,
  faCrown, faUserSlash, faUserShield, faGift, faSackDollar, faXmark,
} from '@fortawesome/free-solid-svg-icons';
import api, { apiError, fileUrl } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useFeedback } from '../../context/FeedbackContext';
import { useLive } from '../../context/RealtimeContext';
import { PageHead, SpaceLayout } from '../../components/Layouts';
import { PaymentLabel } from '../../components/PaymentLogo';
import {
  BarChart, Empty, ErrorState, Field, Loader, Modal, Pagination, ProductImage, StatusBadge, SubmitButton, useFetch, useForm, Stars,
} from '../../components/ui';
import {
  date, DELIVERY_MODES, ORDER_STATUS, PAYMENT_PLANS, PAYMENT_STATUS, price, PRODUCT_STATUS, SHOP_STATUS, showPaymentStatus,
} from '../../utils/format';
import { categoryIcon, CATEGORY_ICON_NAMES } from '../../utils/icons';

export function AdminLayout() {
  const { has } = useAuth();
  const { data, reload: reloadCounts } = useFetch(has('admin') ? '/admin/dashboard' : null);
  // Compteurs du menu (boutiques, produits, commandes à traiter) mis à jour en direct
  useLive('*', () => has('admin') && reloadCounts({ silent: true }), { staff: true });
  const links = has('admin') ? [
    { to: '/admin', end: true, icon: faGaugeHigh, label: 'Tableau de bord' },
    { to: '/admin/boutiques', icon: faStore, label: 'Boutiques', count: data?.shops_pending },
    { to: '/admin/produits', icon: faShirt, label: 'Modération', count: data?.products_pending },
    { to: '/admin/commandes', icon: faBoxOpen, label: 'Commandes', count: (data?.returns_pending || 0) + (data?.refunds_pending || 0) },
    { to: '/admin/utilisateurs', icon: faUsers, label: 'Utilisateurs' },
    { to: '/admin/categories', icon: faTags, label: 'Catégories' },
    { to: '/admin/reversements', icon: faHandHoldingDollar, label: 'Reversements' },
    { to: '/admin/promotions', icon: faGift, label: 'Promotions', count: data?.active_promotions },
    { to: '/admin/boutique-officielle', icon: faCrown, label: 'Boutique officielle' },
    { to: '/admin/avis', icon: faStar, label: 'Avis' },
    { to: '/admin/parametres', icon: faGear, label: 'Paramètres' },
    { to: '/admin/journal', icon: faClipboardList, label: 'Journal d’activité' },
  ] : [{ to: '/admin/commandes', icon: faBoxOpen, label: 'Commandes' }];
  return <SpaceLayout fixed title="Administration" subtitle={has('admin') ? 'Administrateur' : 'Support'} avatar={<FontAwesomeIcon icon={faUserShield} />} links={links} />;
}

function Stat({ icon, label, value, to }) {
  const content = (<><div className="ic"><FontAwesomeIcon icon={icon} /></div><div><div className="v">{value}</div><div className="l">{label}</div></div></>);
  return to ? <Link to={to} className="stat">{content}</Link> : <div className="stat">{content}</div>;
}

export function AdminDashboard() {
  const { data: d, loading, error, reload } = useFetch('/admin/dashboard');
  useLive('*', () => reload({ silent: true }), { staff: true });
  if (loading) return <Loader />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  return (
    <>
      <PageHead icon={faGaugeHigh} title="Tableau de bord" />
      {d.refunds_pending > 0 && (
        <div className="alert alert-warning mb-2">
          <FontAwesomeIcon icon={faRotateLeft} />
          <span className="grow"><b>{d.refunds_pending} remboursement(s) à traiter</b> pour {price(d.refunds_pending_amount)} :
            des clients ont annulé des commandes déjà payées en ligne.</span>
          <Link to="/admin/commandes?statut=refunding" className="btn btn-sm">Traiter</Link>
        </div>
      )}
      <div className="stats">
        <Stat icon={faChartLine} label="Valeur des commandes (hors annulées)" value={price(d.gmv)} />
        <Stat icon={faCoins} label="Frais plateforme (payés par les clients)" value={price(d.platform_revenue)} />
        <Stat icon={faGift} label="Remises promotionnelles offertes" value={price(d.promo_discounts)} to="/admin/promotions" />
        <Stat icon={faSackDollar} label="Revenu net (frais − remises)" value={price(d.net_revenue)} />
        <Stat icon={faMoneyBillTransfer} label="À reverser aux vendeurs" value={price(d.due_to_sellers)} to="/admin/reversements" />
        <Stat icon={faRotateLeft} label="Remboursements" value={price(d.refunds)} />
        <Stat icon={faUsers} label="Utilisateurs actifs" value={d.users} to="/admin/utilisateurs" />
        <Stat icon={faStore} label="Vendeurs actifs" value={d.sellers} to="/admin/boutiques" />
        <Stat icon={faClock} label="Boutiques en attente" value={d.shops_pending} to="/admin/boutiques" />
        <Stat icon={faShirt} label="Produits en ligne" value={d.products_published} />
        <Stat icon={faBoxOpen} label="Commandes" value={d.orders} to="/admin/commandes" />
        <Stat icon={faUserCheck} label="Produits à modérer" value={d.products_pending} to="/admin/produits" />
      </div>
      <div className="two-col side-340" style={{ paddingTop: 0 }}>
        <div className="card">
          <div className="card-title"><FontAwesomeIcon icon={faChartLine} /> Évolution des ventes (30 jours)</div>
          <BarChart data={d.sales_by_day} />
        </div>
        <div className="stack" style={{ gap: 20 }}>
          <div className="card">
            <div className="card-title"><FontAwesomeIcon icon={faBoxOpen} /> Répartition des statuts</div>
            {Object.entries(d.orders_by_status).map(([s, n]) => (
              <div key={s} className="summary-row"><StatusBadge map={ORDER_STATUS} value={s} /><b>{n}</b></div>
            ))}
          </div>
          <div className="card">
            <div className="card-title"><FontAwesomeIcon icon={faCrown} /> Meilleures boutiques</div>
            {d.top_shops.map((s) => <div key={s.slug} className="summary-row"><span>{s.name}</span><b>{price(s.sales)}</b></div>)}
            {d.top_shops.length === 0 && <p className="small muted mb-0">Aucune vente.</p>}
          </div>
        </div>
      </div>
    </>
  );
}

// ------------------------------------------------------------- Boutiques
function ShopDetail({ id, onClose, onDone }) {
  const { data: s, loading } = useFetch(`/admin/shops/${id}`);
  const { notify, showResult } = useFeedback();
  const [reason, setReason] = useState('');
  const [settings, setSettings] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (s) setSettings({ is_featured: Boolean(s.is_featured) }); }, [s]);

  const decide = async (decision) => {
    if (['reject', 'suspend'].includes(decision) && !reason.trim()) return notify.error('Indiquez un motif pour informer le vendeur');
    setBusy(true);
    try {
      const { data } = await api.patch(`/admin/shops/${id}/decision`, { decision, reason });
      await showResult({
        type: decision === 'approve' || decision === 'reactivate' ? 'success' : 'info',
        title: data.message, message: 'Le vendeur a été notifié de la décision.',
      });
      onDone();
    } catch (e) { notify.error(apiError(e).message); } finally { setBusy(false); }
  };

  const saveSettings = async () => {
    try {
      const { data } = await api.patch(`/admin/shops/${id}`, settings);
      notify.success(data.message);
      onDone(false);
    } catch (e) { notify.error(apiError(e).message); }
  };

  const openDoc = async (doc) => {
    try {
      const res = await api.get(`/admin/shops/${id}/documents/${doc.id}`, { responseType: 'blob' });
      window.open(URL.createObjectURL(res.data), '_blank');
    } catch (e) { notify.error(apiError(e).message); }
  };

  return (
    <Modal title="Demande vendeur" onClose={onClose} wide>
      {loading || !settings ? <Loader /> : (
        <div className="stack">
          <div className="flex">
            <div className="shop-logo">{s.logo_url ? <img src={fileUrl(s.logo_url)} alt="" /> : s.name[0]}</div>
            <div className="grow"><b className="brand-title" style={{ fontSize: '1.15rem' }}>{s.name}</b><div><StatusBadge map={SHOP_STATUS} value={s.status} /></div></div>
          </div>
          <p className="small mb-0">{s.description}</p>
          <div className="form-grid small">
            <div><b>Responsable</b><br />{s.responsible_name}</div>
            <div><b>Compte</b><br />{s.owner_name} ({s.owner_email})</div>
            <div><b>Contact boutique</b><br />{s.phone} · {s.email}</div>
            <div><b>Localisation</b><br />{[s.address, s.commune, s.city].filter(Boolean).join(', ')}</div>
            <div><b>RCCM</b><br />{s.rccm || '—'}</div>
            <div><b>Reversement</b><br /><PaymentLabel code={s.payout_method} size={20} /> {s.payout_account}{s.payout_holder ? ` (${s.payout_holder})` : ''}</div>
          </div>
          <div>
            <b className="small">Pièces justificatives (stockage privé)</b>
            <div className="flex flex-wrap mt-1">
              {s.documents.length === 0 && <span className="small muted">Aucun document</span>}
              {s.documents.map((d) => (
                <button key={d.id} className="btn btn-outline btn-sm" onClick={() => openDoc(d)}><FontAwesomeIcon icon={faFileShield} /> {d.original_name || d.doc_type}</button>
              ))}
            </div>
          </div>
          {s.status === 'approved' && (
            <div className="form-grid">
              <Field label="Mise en avant"><label className="check" style={{ marginTop: 10 }}><input type="checkbox" checked={settings.is_featured} onChange={(e) => setSettings({ ...settings, is_featured: e.target.checked })} /> Boutique à la une</label></Field>
              <div className="full"><button className="btn btn-outline btn-sm" onClick={saveSettings}><FontAwesomeIcon icon={faFloppyDisk} /> Enregistrer les réglages</button></div>
            </div>
          )}
          <Field label="Motif (obligatoire pour refuser / suspendre)">
            <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex. : pièce d’identité illisible" />
          </Field>
          <div className="modal-actions">
            {s.status === 'pending' && <>
              <button className="btn btn-danger" disabled={busy} onClick={() => decide('reject')}><FontAwesomeIcon icon={faCircleXmark} /> Refuser</button>
              <button className="btn" disabled={busy} onClick={() => decide('approve')}><FontAwesomeIcon icon={faCircleCheck} /> Valider la boutique</button>
            </>}
            {s.status === 'approved' && <button className="btn btn-danger" disabled={busy} onClick={() => decide('suspend')}><FontAwesomeIcon icon={faBan} /> Suspendre</button>}
            {s.status === 'suspended' && <button className="btn" disabled={busy} onClick={() => decide('reactivate')}><FontAwesomeIcon icon={faCircleCheck} /> Réactiver</button>}
          </div>
        </div>
      )}
    </Modal>
  );
}

export function AdminShops() {
  const [status, setStatus] = useState('pending');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(null);
  const { data, meta, loading, error, reload } = useFetch('/admin/shops', { status, page });
  useLive('*', () => reload({ silent: true }), { staff: true });
  return (
    <>
      <PageHead icon={faStore} title="Boutiques" />
      <div className="chips mb-2">
        {[['', 'Toutes'], ...Object.entries(SHOP_STATUS).map(([k, [l]]) => [k, l])].map(([k, l]) => (
          <button key={k} className={`chip ${status === k ? 'on' : ''}`} onClick={() => { setStatus(k); setPage(1); }}>{l}</button>
        ))}
      </div>
      {loading ? <Loader /> : error ? <ErrorState message={error} onRetry={reload} /> : data.length === 0 ? <Empty icon={faStore} title="Aucune boutique" /> : (
        <div className="table-wrap"><table className="table">
          <thead><tr><th>Boutique</th><th>Propriétaire</th><th>Ville</th><th>Produits</th><th>Livraison Abidjan</th><th>Statut</th><th /></tr></thead>
          <tbody>
            {data.map((s) => (
              <tr key={s.id}>
                <td><b>{s.name}</b><div className="small muted">Demande du {date(s.created_at)}</div></td>
                <td className="small">{s.owner_name}<br /><span className="muted">{s.owner_email}</span></td>
                <td>{s.city}</td><td>{s.product_count}</td><td>{s.delivery_fee_abidjan != null ? price(s.delivery_fee_abidjan) : '—'}</td>
                <td><StatusBadge map={SHOP_STATUS} value={s.status} /></td>
                <td><button className="btn btn-sm" onClick={() => setOpen(s.id)}><FontAwesomeIcon icon={faEye} /> Examiner</button></td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
      <Pagination meta={meta} onChange={setPage} />
      {open && <ShopDetail id={open} onClose={() => setOpen(null)} onDone={(close = true) => { if (close) setOpen(null); reload(); }} />}
    </>
  );
}

// ------------------------------------------------------------- Produits
export function AdminProducts() {
  const [status, setStatus] = useState('pending');
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [rejecting, setRejecting] = useState(null);
  const [note, setNote] = useState('');
  const { data, meta, loading, error, reload } = useFetch('/admin/products', { status, page, q: search });
  useLive('*', () => reload({ silent: true }), { staff: true });
  const { notify } = useFeedback();

  const moderate = async (p, action, n) => {
    try {
      const { data: r } = await api.patch(`/admin/products/${p.id}/moderate`, { action, note: n });
      notify.success(r.message);
      setRejecting(null); setNote('');
      reload();
    } catch (e) { notify.error(apiError(e).message); }
  };
  const feature = async (p) => {
    const { data: r } = await api.patch(`/admin/products/${p.id}/featured`, { is_featured: !p.is_featured });
    notify.success(r.message);
    reload();
  };

  return (
    <>
      <PageHead icon={faShirt} title="Modération des produits" />
      <div className="flex flex-wrap mb-2">
        <div className="chips">
          {[['', 'Tous'], ...Object.entries(PRODUCT_STATUS).map(([k, [l]]) => [k, l])].map(([k, l]) => (
            <button key={k} className={`chip ${status === k ? 'on' : ''}`} onClick={() => { setStatus(k); setPage(1); }}>{l}</button>
          ))}
        </div>
        <form className="search" style={{ maxWidth: 280, marginLeft: 'auto' }} onSubmit={(e) => { e.preventDefault(); setSearch(q); }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Produit ou boutique" aria-label="Rechercher" />
          <button aria-label="Rechercher"><FontAwesomeIcon icon={faMagnifyingGlass} /></button>
        </form>
      </div>
      {loading ? <Loader /> : error ? <ErrorState message={error} onRetry={reload} /> : data.length === 0 ? <Empty icon={faCircleCheck} title="Rien à modérer" text="Tous les produits ont été traités." /> : (
        <div className="stack">
          {data.map((p) => (
            <div key={p.id} className="card flex" style={{ alignItems: 'flex-start' }}>
              <div style={{ width: 80, height: 98, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}><ProductImage src={p.image} alt="" /></div>
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="flex flex-wrap"><b>{p.name}</b><StatusBadge map={PRODUCT_STATUS} value={p.status} />{p.is_featured ? <span className="badge badge-gold">À la une</span> : null}</div>
                <div className="small muted">{p.shop_name} · {p.category_name} · {price(p.price)} · stock {p.stock}</div>
                <p className="small mt-1 mb-1" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.description}</p>
                {p.moderation_note && <div className="small field-error">{p.moderation_note}</div>}
                <div className="flex flex-wrap">
                  <a href={`/produit/${p.slug}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm"><FontAwesomeIcon icon={faEye} /> Aperçu</a>
                  {p.status !== 'published' && <button className="btn btn-sm" onClick={() => moderate(p, 'approve')}><FontAwesomeIcon icon={faCircleCheck} /> Publier</button>}
                  {p.status === 'pending' && <button className="btn btn-danger btn-sm" onClick={() => setRejecting({ p, action: 'reject' })}><FontAwesomeIcon icon={faCircleXmark} /> Refuser</button>}
                  {p.status === 'published' && <>
                    <button className="btn btn-outline btn-sm" onClick={() => feature(p)}><FontAwesomeIcon icon={faStar} /> {p.is_featured ? 'Retirer de la une' : 'Mettre à la une'}</button>
                    <button className="btn btn-danger btn-sm" onClick={() => setRejecting({ p, action: 'disable' })}><FontAwesomeIcon icon={faBan} /> Désactiver</button>
                  </>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <Pagination meta={meta} onChange={setPage} />
      {rejecting && (
        <Modal title={rejecting.action === 'reject' ? 'Refuser le produit' : 'Désactiver le produit'} onClose={() => setRejecting(null)}
          footer={<><button className="btn btn-outline" onClick={() => setRejecting(null)}>Annuler</button>
            <button className="btn btn-danger" disabled={!note.trim()} onClick={() => moderate(rejecting.p, rejecting.action, note)}>Confirmer</button></>}>
          <Field label="Motif communiqué au vendeur" required>
            <textarea className="textarea" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex. : photos floues, description insuffisante…" />
          </Field>
        </Modal>
      )}
    </>
  );
}

// ------------------------------------------------------------- Commandes
export function AdminOrders() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState(params.get('statut') || '');
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const { data, meta, loading, error, reload } = useFetch('/admin/orders', { status, page, q: search });
  useLive('*', () => reload({ silent: true }), { staff: true });
  return (
    <>
      <PageHead icon={faBoxOpen} title="Commandes" />
      <div className="flex flex-wrap mb-2">
        <select className="select" style={{ width: 'auto' }} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Statut">
          <option value="">Tous les statuts</option>
          {Object.entries(ORDER_STATUS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <form className="search" style={{ maxWidth: 320, marginLeft: 'auto' }} onSubmit={(e) => { e.preventDefault(); setSearch(q); setPage(1); }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="N° commande, e-mail, téléphone" aria-label="Rechercher" />
          <button aria-label="Rechercher"><FontAwesomeIcon icon={faMagnifyingGlass} /></button>
        </form>
      </div>
      {loading ? <Loader /> : error ? <ErrorState message={error} onRetry={reload} /> : data.length === 0 ? <Empty icon={faBoxOpen} title="Aucune commande" /> : (
        <div className="table-wrap"><table className="table">
          <thead><tr><th>Commande</th><th>Client</th><th>Paiement</th><th>Statut</th><th style={{ textAlign: 'right' }}>Total</th><th /></tr></thead>
          <tbody>
            {data.map((o) => (
              <tr key={o.id}>
                <td><b>{o.order_number}</b><div className="small muted">{date(o.created_at, true)} · {o.shop_count} boutique(s)</div></td>
                <td className="small">{o.customer}<br /><span className="muted">{o.email}</span></td>
                <td className="small"><PaymentLabel code={o.payment_method} size={20} />{showPaymentStatus(o) && <><br /><StatusBadge map={PAYMENT_STATUS} value={o.payment_status} /></>}</td>
                <td><StatusBadge map={ORDER_STATUS} value={o.status} /></td>
                <td style={{ textAlign: 'right' }}><b>{price(o.total_amount)}</b></td>
                <td><Link to={`/admin/commandes/${o.id}`} className="btn btn-sm"><FontAwesomeIcon icon={faEye} /></Link></td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
      <Pagination meta={meta} onChange={setPage} />
    </>
  );
}

const REFUND_STATUS = { pending: 'à traiter', processing: 'virement en cours', succeeded: 'effectué', failed: 'échec — à relancer' };

export function AdminOrderDetail() {
  const { id } = useParams();
  const { has } = useAuth();
  const isAdmin = has('admin');
  const { data: o, loading, error, reload } = useFetch(`/admin/orders/${id}`);
  useLive('*', () => reload({ silent: true }), { staff: true });
  const { notify, showResult, confirm } = useFeedback();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ reason: '', amount: '', status: 'shipped' });

  if (loading) return <Loader />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const act = async (fn, title) => {
    try {
      const { data } = await fn();
      setModal(null);
      await showResult({ title: title || data.message, message: title ? data.message : undefined });
      reload();
    } catch (e) { notify.error(apiError(e).message); }
  };
  const refundable = ['succeeded', 'partially_paid', 'refunding', 'partially_refunded'].includes(o.payment_status);
  const openReturn = o.returns.find((r) => r.status === 'requested');

  const decideReturn = async (decision) => {
    const ok = await confirm({ title: decision === 'accept' ? 'Accepter le retour ?' : 'Refuser le retour ?', message: decision === 'accept' ? 'Les articles seront remis en stock ; procédez ensuite au remboursement.' : 'Le client sera notifié.', danger: decision !== 'accept' });
    if (ok) act(() => api.patch(`/admin/returns/${openReturn.id}`, { decision, note: form.reason }));
  };

  return (
    <>
      <Link to="/admin/commandes" className="btn btn-ghost btn-sm mb-1"><FontAwesomeIcon icon={faArrowLeft} /> Commandes</Link>
      <PageHead icon={faBoxOpen} title={o.order_number}>
        <StatusBadge map={ORDER_STATUS} value={o.status} />{showPaymentStatus(o) && <StatusBadge map={PAYMENT_STATUS} value={o.payment_status} />}
      </PageHead>
      {isAdmin && (
        <div className="flex flex-wrap mb-2">
          {!['cancelled', 'refunded', 'delivered'].includes(o.status) && <button className="btn btn-outline btn-sm" onClick={() => setModal('status')}><FontAwesomeIcon icon={faTruckFast} /> Changer le statut</button>}
          {['pending', 'confirmed', 'preparing', 'ready'].includes(o.status) && <button className="btn btn-danger btn-sm" onClick={() => setModal('cancel')}><FontAwesomeIcon icon={faBan} /> Annuler</button>}
          {refundable && <button className="btn btn-sm" onClick={() => setModal('refund')}><FontAwesomeIcon icon={faRotateLeft} /> Rembourser</button>}
        </div>
      )}
      {openReturn && (
        <div className="alert alert-warning mb-2">
          <FontAwesomeIcon icon={faRotateLeft} />
          <div className="grow"><b>Demande de retour :</b> {openReturn.reason}</div>
          {isAdmin && <div className="flex"><button className="btn btn-sm" onClick={() => decideReturn('accept')}>Accepter</button><button className="btn btn-danger btn-sm" onClick={() => decideReturn('reject')}>Refuser</button></div>}
        </div>
      )}
      <div className="two-col" style={{ paddingTop: 0 }}>
        <div className="stack" style={{ gap: 20 }}>
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Article</th><th>Boutique</th><th>Statut</th><th>Total client</th><th>Frais plateforme</th></tr></thead>
            <tbody>
              {o.items.map((it) => (
                <tr key={it.id}>
                  <td><b>{it.product_name}</b><div className="small muted">{it.size} · {it.color} · x{it.quantity}</div></td>
                  <td className="small">{it.shop_name}</td>
                  <td><StatusBadge map={ORDER_STATUS} value={it.fulfillment_status} /></td>
                  <td>{price(it.line_total)}</td>
                  <td className="small">{price(it.commission_amount)} ({it.commission_rate} %)</td>
                </tr>
              ))}
            </tbody>
          </table></div>
          <div className="card">
            <div className="card-title">Historique</div>
            <ul className="timeline">
              {[...o.history].reverse().map((h, i) => (
                <li key={i}><span className="dot" /><b>{ORDER_STATUS[h.status]?.[0] || h.status}</b>
                  <div className="small muted">{date(h.created_at, true)}{h.comment ? ` — ${h.comment}` : ''}</div></li>
              ))}
            </ul>
          </div>
        </div>
        <aside className="stack" style={{ gap: 20 }}>
          <div className="card small">
            <div className="card-title">Client</div>
            <b>{o.customer.first_name} {o.customer.last_name}</b><br />{o.customer.email}<br />{o.customer.phone}
            <hr className="divider" />
            <b>{DELIVERY_MODES[o.delivery_mode]}</b><br />{o.ship_recipient} · {o.ship_phone}<br />
            <span className="muted">{[o.ship_street, o.ship_district, o.ship_commune, o.ship_city].filter(Boolean).join(', ')}</span>
          </div>
          <div className="card">
            <div className="summary-row"><span>Sous-total</span><span>{price(o.subtotal)}</span></div>
            {Number(o.discount_total) > 0 && (
              <div className="summary-row" style={{ color: 'var(--success)' }}><span>Remise ({o.promo_code}) — à la charge de la plateforme</span><span>-{price(o.discount_total)}</span></div>
            )}
            <div className="summary-row"><span>Livraison</span><span>{price(o.delivery_fee)}</span></div>
            <div className="summary-row summary-total"><span>Total</span><span>{price(o.total_amount)}</span></div>
            <hr className="divider" />
            <div className="small muted mb-1">{PAYMENT_PLANS[o.payment_plan] || o.payment_plan}</div>
            <div className="summary-row"><span>Payé en ligne</span><b>{price(o.upfront_amount)}</b></div>
            {Number(o.balance_amount) > 0 && (
              <div className="summary-row"><span>Solde au vendeur à la livraison</span>
                <b>{price(o.balance_amount)} <span className="small muted">· {o.balance_paid_at ? 'encaissé' : 'à encaisser'}</span></b></div>
            )}
            <div className="summary-row small muted"><span>Dont frais plateforme</span><span>{price(o.platform_fee)}</span></div>
          </div>
          <div className="card small">
            <div className="card-title">Paiements</div>
            {o.payments.map((p) => (
              <div key={p.id} className="summary-row"><span><PaymentLabel code={p.provider} size={20} /><br /><span className="muted">{p.reference}</span></span><StatusBadge map={PAYMENT_STATUS} value={p.status} /></div>
            ))}
            {o.refunds.length > 0 && <><hr className="divider" /><b>Remboursements</b>
              {o.refunds.map((r) => (
                <div key={r.id} className="summary-row">
                  <span>{r.reference}{r.failure_reason && <><br /><span className="muted">{r.failure_reason}</span></>}</span>
                  <span>{price(r.amount)} · {REFUND_STATUS[r.status] || r.status}</span>
                </div>
              ))}</>}
          </div>
        </aside>
      </div>
      {modal === 'cancel' && (
        <Modal title="Annuler la commande" onClose={() => setModal(null)} footer={<><button className="btn btn-outline" onClick={() => setModal(null)}>Fermer</button>
          <button className="btn btn-danger" onClick={() => act(() => api.post(`/admin/orders/${o.id}/cancel`, { reason: form.reason }))}>Annuler la commande</button></>}>
          <Field label="Motif" required><input className="input" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></Field>
        </Modal>
      )}
      {modal === 'refund' && (
        <Modal title="Rembourser" onClose={() => setModal(null)} footer={<><button className="btn btn-outline" onClick={() => setModal(null)}>Fermer</button>
          <button className="btn" onClick={() => act(() => api.post(`/admin/orders/${o.id}/refund`, { reason: form.reason, ...(form.amount ? { amount: form.amount } : {}) }))}>Confirmer le remboursement</button></>}>
          <div className="stack">
            <Field label="Montant (FCFA)" hint="Laisser vide pour rembourser la totalité restante"><input className="input" type="number" min="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
            <Field label="Motif" required><input className="input" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></Field>
          </div>
        </Modal>
      )}
      {modal === 'status' && (
        <Modal title="Changer le statut" onClose={() => setModal(null)} footer={<><button className="btn btn-outline" onClick={() => setModal(null)}>Fermer</button>
          <button className="btn" onClick={() => act(() => api.patch(`/admin/orders/${o.id}/status`, { status: form.status, comment: form.reason || undefined }))}>Appliquer</button></>}>
          <div className="stack">
            <Field label="Nouveau statut"><select className="select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {['confirmed', 'preparing', 'ready', 'shipped', 'in_delivery', 'delivered'].map((s) => <option key={s} value={s}>{ORDER_STATUS[s][0]}</option>)}
            </select></Field>
            <Field label="Commentaire"><input className="input" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></Field>
          </div>
        </Modal>
      )}
    </>
  );
}

// ------------------------------------------------------------- Utilisateurs
const ROLE_LABELS = { customer: 'Client', seller: 'Vendeur', admin: 'Admin', support: 'Support' };

export function AdminUsers() {
  const { user: me } = useAuth();
  const [page, setPage] = useState(1);
  const [role, setRole] = useState('');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const { data, meta, loading, error, reload } = useFetch('/admin/users', { page, role, q: search });
  const { notify, confirm } = useFeedback();

  const toggle = async (u) => {
    const suspend = u.status === 'active';
    if (!(await confirm({ title: suspend ? `Suspendre ${u.first_name} ?` : `Réactiver ${u.first_name} ?`, message: suspend ? 'L’utilisateur sera déconnecté et ne pourra plus se connecter.' : undefined, danger: suspend }))) return;
    try {
      const { data: r } = await api.patch(`/admin/users/${u.id}/status`, { status: suspend ? 'suspended' : 'active' });
      notify.success(r.message); reload();
    } catch (e) { notify.error(apiError(e).message); }
  };
  const saveRoles = async () => {
    try {
      const { data: r } = await api.put(`/admin/users/${editing.id}/roles`, { roles: editing.roles });
      notify.success(r.message); setEditing(null); reload();
    } catch (e) { notify.error(apiError(e).message); }
  };

  return (
    <>
      <PageHead icon={faUsers} title="Utilisateurs" />
      <div className="flex flex-wrap mb-2">
        <div className="chips">{[['', 'Tous'], ...Object.entries(ROLE_LABELS)].map(([k, l]) => <button key={k} className={`chip ${role === k ? 'on' : ''}`} onClick={() => { setRole(k); setPage(1); }}>{l}</button>)}</div>
        <form className="search" style={{ maxWidth: 300, marginLeft: 'auto' }} onSubmit={(e) => { e.preventDefault(); setSearch(q); setPage(1); }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom, e-mail, téléphone" aria-label="Rechercher" />
          <button aria-label="Rechercher"><FontAwesomeIcon icon={faMagnifyingGlass} /></button>
        </form>
      </div>
      {loading ? <Loader /> : error ? <ErrorState message={error} onRetry={reload} /> : (
        <div className="table-wrap"><table className="table">
          <thead><tr><th>Utilisateur</th><th>Rôles</th><th>Commandes</th><th>Inscription</th><th>Statut</th><th /></tr></thead>
          <tbody>
            {data.map((u) => (
              <tr key={u.id}>
                <td><b>{u.first_name} {u.last_name}</b><div className="small muted">{u.email} · {u.phone}</div>{u.shop_name && <div className="small gold"><FontAwesomeIcon icon={faStore} /> {u.shop_name}</div>}</td>
                <td><div className="flex flex-wrap" style={{ gap: 4 }}>{u.roles.map((r) => <span key={r} className="badge">{ROLE_LABELS[r]}</span>)}</div></td>
                <td>{u.orders_count}</td>
                <td className="small">{date(u.created_at)}</td>
                <td><span className={`badge ${u.status === 'active' ? 'badge-success' : 'badge-danger'}`}>{u.status === 'active' ? 'Actif' : 'Suspendu'}</span></td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button className="btn btn-ghost btn-sm" title="Rôles" onClick={() => setEditing({ ...u })}><FontAwesomeIcon icon={faUserShield} /></button>
                  {u.id !== me.id && <button className="btn btn-ghost btn-sm" title={u.status === 'active' ? 'Suspendre' : 'Réactiver'} onClick={() => toggle(u)}>
                    <FontAwesomeIcon icon={u.status === 'active' ? faUserSlash : faUserCheck} /></button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
      <Pagination meta={meta} onChange={setPage} />
      {editing && (
        <Modal title={`Rôles de ${editing.first_name}`} onClose={() => setEditing(null)} footer={<><button className="btn btn-outline" onClick={() => setEditing(null)}>Annuler</button><button className="btn" onClick={saveRoles}>Enregistrer</button></>}>
          <div className="stack">
            {Object.entries(ROLE_LABELS).map(([k, l]) => (
              <label key={k} className="check"><input type="checkbox" checked={editing.roles.includes(k)}
                onChange={(e) => setEditing({ ...editing, roles: e.target.checked ? [...editing.roles, k] : editing.roles.filter((r) => r !== k) })} /> {l}</label>
            ))}
            <p className="small muted mb-0">Le rôle « Support » consulte les commandes sans accès aux finances.</p>
          </div>
        </Modal>
      )}
    </>
  );
}

// ------------------------------------------------------------- Catégories
export function AdminCategories() {
  const { data, loading, error, reload } = useFetch('/admin/categories');
  const { notify, confirm } = useFeedback();
  const [editing, setEditing] = useState(null);
  const { values, setValues, set, errors, submitting, submit } = useForm({ name: '', icon: 'shirt', sort_order: 0, is_active: true, parent_id: '' });

  const open = (c) => {
    setValues(c ? { name: c.name, icon: c.icon || 'shirt', sort_order: c.sort_order, is_active: Boolean(c.is_active), parent_id: c.parent_id || '' } : { name: '', icon: 'shirt', sort_order: (data?.length || 0), is_active: true, parent_id: '' });
    setEditing(c || {});
  };
  const onSubmit = submit(async (v) => {
    const body = { ...v, parent_id: v.parent_id || null };
    const { data: r } = editing.id ? await api.put(`/admin/categories/${editing.id}`, body) : await api.post('/admin/categories', body);
    setEditing(null); reload();
    return r;
  });
  const del = async (c) => {
    if (!(await confirm({ title: `Supprimer « ${c.name} » ?`, danger: true, confirmLabel: 'Supprimer' }))) return;
    try { const { data: r } = await api.delete(`/admin/categories/${c.id}`); notify.success(r.message); reload(); } catch (e) { notify.error(apiError(e).message); }
  };

  return (
    <>
      <PageHead icon={faTags} title="Catégories"><button className="btn" onClick={() => open(null)}><FontAwesomeIcon icon={faPlus} /> Nouvelle catégorie</button></PageHead>
      {loading ? <Loader /> : error ? <ErrorState message={error} /> : (
        <div className="table-wrap"><table className="table">
          <thead><tr><th>Catégorie</th><th>Produits</th><th>Ordre</th><th>Statut</th><th /></tr></thead>
          <tbody>{data.map((c) => (
            <tr key={c.id}>
              <td><FontAwesomeIcon icon={categoryIcon(c.icon)} className="gold" /> <b>{c.name}</b> <span className="small muted">/{c.slug}</span></td>
              <td>{c.product_count}</td><td>{c.sort_order}</td>
              <td><span className={`badge ${c.is_active ? 'badge-success' : ''}`}>{c.is_active ? 'Active' : 'Inactive'}</span></td>
              <td style={{ whiteSpace: 'nowrap' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => open(c)} aria-label="Modifier"><FontAwesomeIcon icon={faPen} /></button>
                <button className="btn btn-ghost btn-sm" onClick={() => del(c)} aria-label="Supprimer"><FontAwesomeIcon icon={faTrashCan} /></button>
              </td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
      {editing && (
        <Modal title={editing.id ? 'Modifier la catégorie' : 'Nouvelle catégorie'} onClose={() => setEditing(null)}>
          <form className="stack" onSubmit={onSubmit} noValidate>
            <Field label="Nom" error={errors.name} required><input className="input" value={values.name} onChange={set('name')} /></Field>
            <Field label="Catégorie parente"><select className="select" value={values.parent_id} onChange={set('parent_id')}>
              <option value="">— Aucune —</option>{data.filter((c) => c.id !== editing.id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select></Field>
            <Field label="Icône">
              <div className="chips">{CATEGORY_ICON_NAMES.map((n) => (
                <button type="button" key={n} className={`chip ${values.icon === n ? 'on' : ''}`} onClick={() => set('icon')(n)} aria-label={n}><FontAwesomeIcon icon={categoryIcon(n)} /></button>
              ))}</div>
            </Field>
            <Field label="Ordre d’affichage"><input className="input" type="number" value={values.sort_order} onChange={set('sort_order')} /></Field>
            <label className="check"><input type="checkbox" checked={values.is_active} onChange={set('is_active')} /> Catégorie active</label>
            <div className="modal-actions"><button type="button" className="btn btn-outline" onClick={() => setEditing(null)}>Annuler</button><SubmitButton loading={submitting}>Enregistrer</SubmitButton></div>
          </form>
        </Modal>
      )}
    </>
  );
}

// ------------------------------------------------------------- Reversements
export function AdminPayouts() {
  const { data, loading, error, reload } = useFetch('/admin/payouts');
  useLive('*', () => reload({ silent: true }), { staff: true });
  const { notify, showResult, confirm } = useFeedback();
  const [creating, setCreating] = useState(null);
  const [amount, setAmount] = useState('');

  const create = async () => {
    try {
      const { data: r } = await api.post('/admin/payouts', { shop_id: creating.id, amount });
      setCreating(null);
      await showResult({ title: 'Reversement créé', message: `${r.message} pour ${creating.name}. Marquez-le payé une fois le transfert effectué.` });
      reload();
    } catch (e) { notify.error(apiError(e).message); }
  };
  const mark = async (p, status) => {
    if (!(await confirm({ title: status === 'paid' ? 'Confirmer le paiement ?' : 'Marquer en échec ?', message: `${p.reference} – ${price(p.amount)}`, danger: status !== 'paid' }))) return;
    try { const { data: r } = await api.patch(`/admin/payouts/${p.id}`, { status }); notify.success(r.message); reload(); } catch (e) { notify.error(apiError(e).message); }
  };

  if (loading) return <Loader />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  return (
    <>
      <PageHead icon={faHandHoldingDollar} title="Reversements vendeurs" />
      <h3>Soldes des boutiques</h3>
      <div className="table-wrap mb-3"><table className="table">
        <thead><tr><th>Boutique</th><th>Moyen</th><th>Gains nets</th><th>Solde</th><th /></tr></thead>
        <tbody>{data.balances.map((b) => (
          <tr key={b.id}><td><b>{b.name}</b></td>
            <td className="small"><PaymentLabel code={b.payout_method} size={20} /><br />{b.payout_account}{b.payout_holder ? <><br /><span className="muted">{b.payout_holder}</span></> : null}</td>
            <td>{price(b.earned)}</td><td><b>{price(b.balance)}</b></td>
            <td><button className="btn btn-sm" disabled={b.balance <= 0} onClick={() => { setCreating(b); setAmount(b.balance); }}><FontAwesomeIcon icon={faMoneyBillTransfer} /> Reverser</button></td></tr>
        ))}</tbody>
      </table></div>
      <h3>Historique</h3>
      <div className="table-wrap"><table className="table">
        <thead><tr><th>Référence</th><th>Boutique</th><th>Montant</th><th>Date</th><th>Statut</th><th /></tr></thead>
        <tbody>
          {data.payouts.length === 0 && <tr><td colSpan={6} className="center muted">Aucun reversement</td></tr>}
          {data.payouts.map((p) => (
            <tr key={p.id}><td className="small">{p.reference}</td><td>{p.shop_name}</td><td><b>{price(p.amount)}</b></td><td className="small">{date(p.created_at)}</td>
              <td><span className={`badge ${p.status === 'paid' ? 'badge-success' : p.status === 'failed' ? 'badge-danger' : 'badge-warning'}`}>
                {p.status === 'paid' ? 'Payé' : p.status === 'failed' ? 'Échec' : p.provider_reference ? 'Virement Jèko en cours' : 'À payer'}</span>
                {p.failure_reason && <div className="small muted">{p.failure_reason}</div>}</td>
              {/* Un virement Jèko se termine automatiquement ; seuls les reversements manuels se valident ici */}
              <td style={{ whiteSpace: 'nowrap' }}>{p.status === 'pending' && !p.provider_reference && <>
                <button className="btn btn-sm" onClick={() => mark(p, 'paid')}><FontAwesomeIcon icon={faCircleCheck} /> Payé</button>{' '}
                <button className="btn btn-danger btn-sm" onClick={() => mark(p, 'failed')}><FontAwesomeIcon icon={faCircleXmark} /></button></>}</td></tr>
          ))}
        </tbody>
      </table></div>
      {creating && (
        <Modal title={`Reverser à ${creating.name}`} onClose={() => setCreating(null)} footer={<><button className="btn btn-outline" onClick={() => setCreating(null)}>Annuler</button><button className="btn" onClick={create}>Créer le reversement</button></>}>
          <Field label="Montant (FCFA)" hint={`Solde disponible : ${price(creating.balance)}`}><input className="input" type="number" min="1" max={creating.balance} value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
        </Modal>
      )}
    </>
  );
}

// ------------------------------------------------------------- Boutique officielle (super admin)
export function AdminOfficialShop() {
  const { user, setUser } = useAuth();
  const { showResult } = useFeedback();
  const navigate = useNavigate();
  const official = user.shop?.is_official && user.shop.status === 'approved';
  const { values, set, errors, submitting, submit } = useForm({
    name: 'Ivoire Style Officiel', description: 'La boutique officielle Ivoire Style : sélection exclusive de vêtements et créations signées par la plateforme.',
    phone: user.phone || '', email: user.email || '', city: 'Abidjan', commune: '',
  });

  const onSubmit = submit(async (v) => {
    const { data } = await api.post('/admin/official-shop', v);
    setUser(data.data.user);
    const r = await showResult({
      icon: faStore, title: 'Boutique officielle activée !',
      message: 'Elle est validée d’office, sans commission, et vos produits sont publiés sans modération.',
      confirmLabel: 'Ajouter un produit', secondaryLabel: 'Espace vendeur',
    });
    navigate(r === 'secondary' ? '/vendeur' : '/vendeur/produits/nouveau');
  }, { toastSuccess: false });

  if (official) {
    return (
      <>
        <PageHead icon={faStore} title="Boutique officielle" />
        <div className="card">
          <div className="flex flex-wrap">
            <div className="shop-logo">{user.shop.logo_url ? <img src={fileUrl(user.shop.logo_url)} alt="" /> : user.shop.name[0]}</div>
            <div className="grow">
              <b className="brand-title" style={{ fontSize: '1.2rem' }}>{user.shop.name}</b> <span className="badge badge-gold"><FontAwesomeIcon icon={faCircleCheck} /> Officielle</span>
              <p className="small muted mb-0">Validée d’office · commission 0 % · publication sans modération · toujours en tête des boutiques.</p>
            </div>
          </div>
          <div className="flex flex-wrap mt-2">
            <Link to="/vendeur/produits/nouveau" className="btn"><FontAwesomeIcon icon={faPlus} /> Ajouter un produit</Link>
            <Link to="/vendeur" className="btn btn-outline"><FontAwesomeIcon icon={faGaugeHigh} /> Espace vendeur</Link>
            <Link to={`/boutique/${user.shop.slug}`} className="btn btn-ghost"><FontAwesomeIcon icon={faEye} /> Voir la vitrine</Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHead icon={faStore} title="Boutique officielle" />
      <div className="alert alert-gold mb-2">
        <FontAwesomeIcon icon={faCrown} />
        <span>Vendez vos propres produits sur Ivoire Style. La boutique officielle est <b>validée d’office</b>, <b>sans commission</b>,
          vos produits sont <b>publiés sans modération</b> et elle apparaît <b>en tête des boutiques</b>.</span>
      </div>
      <form className="card form-grid" onSubmit={onSubmit} noValidate>
        <Field label="Nom de la boutique" error={errors.name} required><input className="input" value={values.name} onChange={set('name')} /></Field>
        <Field label="E-mail" error={errors.email} required><input className="input" type="email" value={values.email} onChange={set('email')} /></Field>
        <Field label="Description" error={errors.description} required className="full"><textarea className="textarea" value={values.description} onChange={set('description')} /></Field>
        <Field label="Téléphone" error={errors.phone} required><input className="input" type="tel" value={values.phone} onChange={set('phone')} /></Field>
        <Field label="Ville" error={errors.city} required><input className="input" value={values.city} onChange={set('city')} /></Field>
        <Field label="Commune" error={errors.commune}><input className="input" value={values.commune} onChange={set('commune')} /></Field>
        <div className="full"><SubmitButton loading={submitting}><FontAwesomeIcon icon={faStore} /> Activer la boutique officielle</SubmitButton></div>
      </form>
    </>
  );
}

// ------------------------------------------------------------- Promotions ciblées
const PERIODS = [[7, '7 jours'], [30, '30 jours'], [90, '3 mois'], [365, '12 mois']];
const toDateInput = (d) => d.toISOString().slice(0, 10);

function Audience({ target, selected, setSelected }) {
  // Seuils par défaut : vendeurs « très actifs » = 3 commandes ; clients actifs = au moins 1 commande sur la période
  const [filters, setFilters] = useState({ days: 30, min_orders: target === 'sellers' ? 3 : 1, min_amount: 0 });
  const { data, loading, error, reload } = useFetch('/admin/promotions/audience', { target, ...filters });
  const rows = data || [];
  const allOn = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggle = (id) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleAll = () => setSelected(allOn ? new Set() : new Set(rows.map((r) => r.id)));
  const isSellers = target === 'sellers';

  return (
    <div className="card">
      <div className="card-title"><FontAwesomeIcon icon={faUsers} /> {isSellers ? 'Vendeurs les plus actifs' : 'Clients les plus actifs'}</div>
      <div className="form-grid mb-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
        <Field label="Période">
          <select className="select" value={filters.days} onChange={(e) => setFilters({ ...filters, days: Number(e.target.value) })}>
            {PERIODS.map(([d, l]) => <option key={d} value={d}>{l}</option>)}
          </select>
        </Field>
        <Field label="Commandes minimum">
          <input className="input" type="number" min="0" value={filters.min_orders} onChange={(e) => setFilters({ ...filters, min_orders: e.target.value })} />
        </Field>
        <Field label={isSellers ? 'Chiffre d’affaires minimum' : 'Achats minimum (FCFA)'}>
          <input className="input" type="number" min="0" step="1000" value={filters.min_amount} onChange={(e) => setFilters({ ...filters, min_amount: e.target.value })} />
        </Field>
      </div>
      {loading ? <Loader /> : error ? <ErrorState message={error} onRetry={reload} /> : rows.length === 0 ? (
        <Empty icon={faUsers} title="Personne ne correspond" text="Élargissez la période ou baissez les seuils." />
      ) : (
        <>
          <div className="flex between mb-1">
            <label className="check"><input type="checkbox" checked={allOn} onChange={toggleAll} /> Tout sélectionner ({rows.length})</label>
            <span className="badge badge-gold">{selected.size} sélectionné(s)</span>
          </div>
          <div className="table-wrap" style={{ maxHeight: 420, overflowY: 'auto' }}>
            <table className="table">
              <thead><tr><th>{isSellers ? 'Boutique' : 'Client'}</th><th>Commandes</th><th>{isSellers ? 'Ventes' : 'Achats'}</th><th>{isSellers ? 'Ville' : 'Dernière commande'}</th><th>Choisir</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} onClick={() => toggle(r.id)} style={{ cursor: 'pointer', background: selected.has(r.id) ? 'var(--gold-soft)' : undefined }}>
                    <td>{isSellers
                      ? <><b>{r.name}</b><div className="small muted">{r.owner_name} · {r.city} · {r.products} produit(s)</div></>
                      : <><b>{r.first_name} {r.last_name}</b><div className="small muted">{r.email}</div></>}</td>
                    <td><b>{r.orders}</b></td>
                    <td>{price(isSellers ? r.revenue : r.spent)}</td>
                    <td className="small">{isSellers ? r.city : date(r.last_order)}</td>
                    <td><input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} onClick={(e) => e.stopPropagation()}
                      aria-label={`Sélectionner ${isSellers ? r.name : r.first_name}`} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function PromotionForm({ target, selected, onCreated }) {
  const { confirm, showResult } = useFeedback();
  const isSellers = target === 'sellers';
  const inMonth = new Date(Date.now() + 30 * 86400000);
  const { values, set, errors, submitting, submit } = useForm(isSellers
    ? { title: 'Récompense vendeur actif', description: '', feature_shops: true, starts_at: toDateInput(new Date()), ends_at: toDateInput(inMonth) }
    : { title: 'Merci pour votre fidélité', description: '', discount_type: 'percent', discount_value: 10, min_order_amount: 10000, max_uses_per_user: 1, code: '', starts_at: toDateInput(new Date()), ends_at: toDateInput(inMonth) });

  const onSubmit = submit(async (v) => {
    const ok2 = await confirm({
      title: isSellers ? `Récompenser ${selected.size} vendeur(s) ?` : `Offrir ce code à ${selected.size} client(s) ?`,
      message: 'Chaque bénéficiaire recevra une notification immédiatement.', confirmLabel: 'Envoyer la promotion', type: 'info', icon: faGift,
    });
    if (!ok2) return null;
    const body = { ...v, target, ...(isSellers ? { shop_ids: [...selected] } : { user_ids: [...selected] }),
      // fin de journée incluse
      ends_at: v.ends_at ? `${v.ends_at}T23:59:59` : null, starts_at: v.starts_at ? `${v.starts_at}T00:00:00` : null };
    const { data } = await api.post('/admin/promotions', body);
    await showResult({
      icon: faGift, title: 'Promotion envoyée !',
      message: isSellers ? data.message : `${data.message}. Code : ${data.data.code}`,
    });
    onCreated();
    return data;
  }, {
    toastSuccess: false,
    validate: () => ({ _: selected.size === 0 && `Sélectionnez au moins un ${isSellers ? 'vendeur' : 'client'}` }),
  });

  return (
    <form className="card stack" onSubmit={onSubmit} noValidate>
      <div className="card-title mb-0"><FontAwesomeIcon icon={faGift} /> {isSellers ? 'Avantage vendeur' : 'Code promo client'}</div>
      <Field label="Titre" error={errors.title} required><input className="input" value={values.title} onChange={set('title')} /></Field>
      {isSellers ? (
        <>
          <div className="alert alert-gold small"><FontAwesomeIcon icon={faStore} />
            <span>Les boutiques sélectionnées sont mises en avant sur l’accueil pendant la période choisie, et leurs vendeurs sont notifiés.</span></div>
        </>
      ) : (
        <>
          <div className="form-grid">
            <Field label="Type de remise">
              <select className="select" value={values.discount_type} onChange={set('discount_type')}>
                <option value="percent">Pourcentage (%)</option><option value="fixed">Montant fixe (FCFA)</option>
              </select>
            </Field>
            <Field label={values.discount_type === 'percent' ? 'Remise (%)' : 'Remise (FCFA)'} error={errors.discount_value} required>
              <input className="input" type="number" min="1" value={values.discount_value} onChange={set('discount_value')} />
            </Field>
            <Field label="Achat minimum (FCFA)" error={errors.min_order_amount}>
              <input className="input" type="number" min="0" step="1000" value={values.min_order_amount} onChange={set('min_order_amount')} />
            </Field>
            <Field label="Utilisations par client" error={errors.max_uses_per_user}>
              <input className="input" type="number" min="1" max="100" value={values.max_uses_per_user} onChange={set('max_uses_per_user')} />
            </Field>
          </div>
          <Field label="Code (facultatif)" error={errors.code} hint="Laisser vide pour un code généré automatiquement">
            <input className="input" value={values.code} onChange={(e) => set('code')(e.target.value.toUpperCase())} placeholder="Ex. : FIDELE10" />
          </Field>
        </>
      )}
      <div className="form-grid">
        <Field label="Début" error={errors.starts_at}><input className="input" type="date" value={values.starts_at} onChange={set('starts_at')} /></Field>
        <Field label="Fin" error={errors.ends_at}><input className="input" type="date" value={values.ends_at} onChange={set('ends_at')} /></Field>
      </div>
      <Field label="Message (facultatif)" error={errors.description}><textarea className="textarea" style={{ minHeight: 70 }} value={values.description} onChange={set('description')} maxLength={500} /></Field>
      {errors._ && <div className="field-error">{errors._}</div>}
      <SubmitButton loading={submitting} disabled={selected.size === 0}>
        <FontAwesomeIcon icon={faGift} /> {selected.size ? `Envoyer à ${selected.size} ${isSellers ? 'vendeur(s)' : 'client(s)'}` : 'Sélectionnez des bénéficiaires'}
      </SubmitButton>
    </form>
  );
}

function PromotionHistory({ reloadKey }) {
  const { data, loading, error, reload } = useFetch('/admin/promotions', null, [reloadKey]);
  const { notify, confirm } = useFeedback();
  const toggle = async (p) => {
    const stopping = Boolean(p.is_active);
    if (stopping && !(await confirm({ title: `Arrêter « ${p.title} » ?`, message: 'Le code ou l’avantage cessera immédiatement de s’appliquer.', danger: true, confirmLabel: 'Arrêter' }))) return;
    try { const { data: r } = await api.patch(`/admin/promotions/${p.id}`, { is_active: !stopping }); notify.success(r.message); reload(); } catch (e) { notify.error(apiError(e).message); }
  };
  if (loading) return <Loader />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data.length) return <Empty icon={faGift} title="Aucune promotion" text="Récompensez vos meilleurs clients et vendeurs depuis les onglets ci-dessus." />;
  return (
    <div className="table-wrap"><table className="table">
      <thead><tr><th>Promotion</th><th>Avantage</th><th>Bénéficiaires</th><th>Utilisation</th><th>Période</th><th>Statut</th><th /></tr></thead>
      <tbody>{data.map((p) => (
        <tr key={p.id}>
          <td><b>{p.title}</b><div className="small muted">{p.target === 'clients' ? 'Clients actifs' : 'Vendeurs actifs'}{p.code ? <> · <code>{p.code}</code></> : null}</div></td>
          <td className="small">{p.target === 'clients'
            ? `${p.discount_type === 'percent' ? `-${Number(p.discount_value)} %` : `-${price(p.discount_value)}`}${Number(p.min_order_amount) ? ` dès ${price(p.min_order_amount)}` : ''}`
            : [p.commission_rate != null && `Ancienne commission ${Number(p.commission_rate)} %`, p.feature_shops ? 'Mise en avant' : null].filter(Boolean).join(' · ')}</td>
          <td>{p.target === 'clients' ? `${p.client_count} client(s)` : `${p.shop_count} boutique(s)`}</td>
          <td className="small">{p.target === 'clients' ? <>{p.uses} commande(s)<br />{price(p.discount_given)} offerts</> : '—'}</td>
          <td className="small">{p.starts_at ? date(p.starts_at) : 'Immédiat'} → {p.ends_at ? date(p.ends_at) : 'sans fin'}</td>
          <td><span className={`badge ${p.running ? 'badge-success' : p.is_active ? 'badge-warning' : ''}`}>{p.running ? 'En cours' : p.is_active ? 'Programmée / terminée' : 'Arrêtée'}</span></td>
          <td><button className={`btn btn-sm ${p.is_active ? 'btn-danger' : 'btn-outline'}`} onClick={() => toggle(p)}>{p.is_active ? 'Arrêter' : 'Réactiver'}</button></td>
        </tr>
      ))}</tbody>
    </table></div>
  );
}

export function AdminPromotions() {
  const [tab, setTab] = useState('clients');
  const [selected, setSelected] = useState(new Set());
  const [reloadKey, setReloadKey] = useState(0);
  const switchTab = (t) => { setTab(t); setSelected(new Set()); };
  return (
    <>
      <PageHead icon={faGift} title="Promotions" />
      <div className="tabs">
        <button className={tab === 'clients' ? 'on' : ''} onClick={() => switchTab('clients')}><FontAwesomeIcon icon={faUsers} /> Clients actifs</button>
        <button className={tab === 'sellers' ? 'on' : ''} onClick={() => switchTab('sellers')}><FontAwesomeIcon icon={faStore} /> Vendeurs très actifs</button>
        <button className={tab === 'history' ? 'on' : ''} onClick={() => switchTab('history')}><FontAwesomeIcon icon={faClipboardList} /> Historique</button>
      </div>
      {tab === 'history' ? <PromotionHistory reloadKey={reloadKey} /> : (
        <div className="two-col side-340" style={{ paddingTop: 0 }}>
          <Audience key={tab} target={tab} selected={selected} setSelected={setSelected} />
          <PromotionForm key={`f-${tab}`} target={tab} selected={selected}
            onCreated={() => { setSelected(new Set()); setReloadKey((k) => k + 1); setTab('history'); }} />
        </div>
      )}
    </>
  );
}

// ------------------------------------------------------------- Avis
export function AdminReviews() {
  const { data, loading, error, reload } = useFetch('/admin/reviews');
  const { notify } = useFeedback();
  const setStatus = async (r, status) => {
    const { data: res } = await api.patch(`/admin/reviews/${r.id}`, { status });
    notify.success(res.message); reload();
  };
  return (
    <>
      <PageHead icon={faStar} title="Avis clients" />
      {loading ? <Loader /> : error ? <ErrorState message={error} /> : data.length === 0 ? <Empty icon={faStar} title="Aucun avis" /> : (
        <div className="stack">{data.map((r) => (
          <div key={r.id} className="card flex" style={{ alignItems: 'flex-start' }}>
            <div className="grow"><b>{r.product_name}</b> <Stars value={r.rating} /><div className="small muted">{r.author} · {date(r.created_at)}</div>
              {r.comment && <p className="mt-1 mb-0">{r.comment}</p>}</div>
            {r.status === 'approved'
              ? <button className="btn btn-danger btn-sm" onClick={() => setStatus(r, 'rejected')}><FontAwesomeIcon icon={faEye} /> Masquer</button>
              : <button className="btn btn-sm" onClick={() => setStatus(r, 'approved')}><FontAwesomeIcon icon={faCircleCheck} /> Publier</button>}
          </div>
        ))}</div>
      )}
    </>
  );
}

// ------------------------------------------------------------- Paramètres
export function AdminSettings() {
  const { data, loading, error } = useFetch('/admin/settings');
  const { values, setValues, submitting, submit } = useForm({});
  useEffect(() => { if (data) setValues(Object.fromEntries(data.map((s) => [s.setting_key, s.setting_value]))); }, [data, setValues]);
  const onSubmit = submit(async (v) => (await api.put('/admin/settings', { settings: v })).data);
  if (loading) return <Loader />;
  if (error) return <ErrorState message={error} />;
  return (
    <>
      <PageHead icon={faGear} title="Paramètres de la plateforme" />
      <form className="card form-grid" onSubmit={onSubmit}>
        {data.map((s) => (
          <Field key={s.setting_key} label={s.description || s.setting_key} hint={s.setting_key}>
            <input className="input" value={values[s.setting_key] ?? ''} onChange={(e) => setValues((x) => ({ ...x, [s.setting_key]: e.target.value }))} />
          </Field>
        ))}
        <div className="full"><SubmitButton loading={submitting}><FontAwesomeIcon icon={faFloppyDisk} /> Enregistrer</SubmitButton></div>
      </form>
    </>
  );
}

const dayInput = (d) => {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};
const daysAgo = (n) => dayInput(new Date(Date.now() - n * 86400000));
const LOG_PRESETS = [['Aujourd’hui', 0], ['7 jours', 6], ['30 jours', 29], ['90 jours', 89]];

export function AdminLogs() {
  const [page, setPage] = useState(1);
  const [range, setRange] = useState({ from: '', to: '' });
  const invalid = range.from && range.to && range.from > range.to;
  const { data, meta, loading, error, reload } = useFetch('/admin/audit-logs', invalid ? { page } : { page, ...range });
  const setDate = (k) => (e) => { setRange((r) => ({ ...r, [k]: e.target.value })); setPage(1); };
  const preset = (n) => { setRange({ from: daysAgo(n), to: dayInput(new Date()) }); setPage(1); };
  const activePreset = LOG_PRESETS.find(([, n]) => range.from === daysAgo(n) && range.to === dayInput(new Date()))?.[1];

  return (
    <>
      <PageHead icon={faClipboardList} title="Journal d’activité">
        {meta && <span className="badge badge-gold">{meta.total} action(s)</span>}
      </PageHead>
      <div className="card mb-2">
        <div className="flex flex-wrap" style={{ alignItems: 'flex-end' }}>
          <Field label="Du" error={invalid ? 'Doit précéder la date de fin' : null}>
            <input className="input" type="date" value={range.from} max={range.to || dayInput(new Date())} onChange={setDate('from')} />
          </Field>
          <Field label="Au">
            <input className="input" type="date" value={range.to} min={range.from || undefined} max={dayInput(new Date())} onChange={setDate('to')} />
          </Field>
          <div className="chips" style={{ paddingBottom: 6 }}>
            {LOG_PRESETS.map(([label, n]) => (
              <button key={n} type="button" className={`chip ${activePreset === n ? 'on' : ''}`} onClick={() => preset(n)}>{label}</button>
            ))}
            {(range.from || range.to) && (
              <button type="button" className="chip" onClick={() => { setRange({ from: '', to: '' }); setPage(1); }}>
                <FontAwesomeIcon icon={faXmark} /> Tout afficher
              </button>
            )}
          </div>
        </div>
      </div>
      {loading ? <Loader /> : error ? <ErrorState message={error} onRetry={reload} /> : data.length === 0 ? (
        <Empty icon={faClipboardList} title="Aucune action sur cette période" text="Élargissez la période ou affichez tout le journal." />
      ) : (
        <div className="table-wrap"><table className="table">
          <thead><tr><th>Date</th><th>Utilisateur</th><th>Action</th><th>Cible</th><th>IP</th></tr></thead>
          <tbody>{data.map((l) => (
            <tr key={l.id}><td className="small">{date(l.created_at, true)}</td><td className="small">{l.user_name || '—'}</td>
              <td><code>{l.action}</code></td><td className="small">{l.entity ? `${l.entity} #${l.entity_id}` : '—'}</td><td className="small muted">{l.ip_address}</td></tr>
          ))}</tbody>
        </table></div>
      )}
      <Pagination meta={meta} onChange={setPage} />
    </>
  );
}
