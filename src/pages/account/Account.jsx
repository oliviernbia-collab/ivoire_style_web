import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUser, faBoxOpen, faLocationDot, faHeart, faBell, faFloppyDisk, faKey, faTrashCan, faPlus, faPen, faStar,
  faCircleCheck, faBan, faRotateLeft, faCreditCard, faTruckFast, faStore, faArrowLeft, faCheckDouble, faEnvelopeOpen,
  faGift, faCopy,
} from '@fortawesome/free-solid-svg-icons';
import api, { apiError } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useFeedback } from '../../context/FeedbackContext';
import { PageHead, SpaceLayout } from '../../components/Layouts';
import AddressForm from '../../components/AddressForm';
import { PaymentLabel } from '../../components/PaymentLogo';
import { ProductGrid } from '../../components/ProductCard';
import {
  Empty, ErrorState, Field, Loader, Modal, Pagination, ProductImage, StatusBadge, SubmitButton, useFetch, useForm,
} from '../../components/ui';
import {
  date, DELIVERY_MODES, ORDER_STATUS, PAYMENT_PLANS, PAYMENT_STATUS, price, showPaymentStatus,
} from '../../utils/format';

export function AccountLayout() {
  const { user } = useAuth();
  return (
    <SpaceLayout title={`${user.first_name} ${user.last_name}`} subtitle="Mon compte" links={[
      { to: '/compte', end: true, icon: faUser, label: 'Mon profil' },
      { to: '/compte/commandes', icon: faBoxOpen, label: 'Mes commandes' },
      { to: '/compte/adresses', icon: faLocationDot, label: 'Mes adresses' },
      { to: '/compte/favoris', icon: faHeart, label: 'Mes favoris' },
      { to: '/compte/avantages', icon: faGift, label: 'Mes avantages' },
      { to: '/compte/notifications', icon: faBell, label: 'Notifications' },
      user.shop ? { to: '/vendeur', icon: faStore, label: 'Espace vendeur' } : { to: '/vendre', icon: faStore, label: 'Je veux vendre' },
    ]} />
  );
}

export function Profile() {
  const { user, setUser, logout } = useAuth();
  const { confirm, showResult } = useFeedback();
  const navigate = useNavigate();
  const profile = useForm({ first_name: user.first_name, last_name: user.last_name, phone: user.phone });
  const pwd = useForm({ current_password: '', new_password: '', confirm: '' });

  const saveProfile = profile.submit(async (v) => {
    const { data } = await api.patch('/auth/me', v);
    setUser(data.data);
    return data;
  });
  const savePwd = pwd.submit(async (v) => {
    const { data } = await api.post('/auth/change-password', { current_password: v.current_password, new_password: v.new_password });
    pwd.setValues({ current_password: '', new_password: '', confirm: '' });
    return data;
  }, { validate: (v) => ({ confirm: v.new_password !== v.confirm && 'Les mots de passe ne correspondent pas' }) });

  const deleteAccount = async () => {
    const ok = await confirm({
      title: 'Supprimer définitivement votre compte ?',
      message: 'Vos données personnelles seront anonymisées. Les commandes passées sont conservées pour nos obligations légales.',
      confirmLabel: 'Supprimer mon compte', danger: true, type: 'error',
    });
    if (!ok) return;
    await api.delete('/auth/me');
    await logout();
    await showResult({ title: 'Compte supprimé', message: 'Votre compte a bien été supprimé. Merci d’avoir utilisé Ivoire Style.', type: 'info' });
    navigate('/');
  };

  return (
    <>
      <PageHead icon={faUser} title="Mon profil" />
      <form className="card form-grid" onSubmit={saveProfile} noValidate>
        <Field label="Prénom" error={profile.errors.first_name} required><input className="input" value={profile.values.first_name} onChange={profile.set('first_name')} /></Field>
        <Field label="Nom" error={profile.errors.last_name} required><input className="input" value={profile.values.last_name} onChange={profile.set('last_name')} /></Field>
        <Field label="E-mail" hint="L’e-mail ne peut pas être modifié"><input className="input" value={user.email} disabled /></Field>
        <Field label="Téléphone" error={profile.errors.phone} required><input className="input" type="tel" value={profile.values.phone} onChange={profile.set('phone')} /></Field>
        <div className="full"><SubmitButton loading={profile.submitting}><FontAwesomeIcon icon={faFloppyDisk} /> Enregistrer</SubmitButton></div>
      </form>

      <form className="card form-grid mt-3" onSubmit={savePwd} noValidate>
        <div className="card-title full mb-0"><FontAwesomeIcon icon={faKey} /> Changer de mot de passe</div>
        <Field label="Mot de passe actuel" error={pwd.errors.current_password} required className="full">
          <input className="input" type="password" value={pwd.values.current_password} onChange={pwd.set('current_password')} autoComplete="current-password" />
        </Field>
        <Field label="Nouveau mot de passe" error={pwd.errors.new_password} required hint="8 caractères min., lettres et chiffres">
          <input className="input" type="password" value={pwd.values.new_password} onChange={pwd.set('new_password')} autoComplete="new-password" />
        </Field>
        <Field label="Confirmation" error={pwd.errors.confirm} required>
          <input className="input" type="password" value={pwd.values.confirm} onChange={pwd.set('confirm')} autoComplete="new-password" />
        </Field>
        <div className="full"><SubmitButton loading={pwd.submitting}><FontAwesomeIcon icon={faKey} /> Modifier le mot de passe</SubmitButton></div>
      </form>

      <div className="card mt-3">
        <div className="card-title"><FontAwesomeIcon icon={faTrashCan} /> Suppression du compte</div>
        <p className="muted small">Vous pouvez demander la suppression de votre compte à tout moment.</p>
        <button className="btn btn-danger" onClick={deleteAccount}><FontAwesomeIcon icon={faTrashCan} /> Supprimer mon compte</button>
      </div>
    </>
  );
}

export function Addresses() {
  const { data, loading, error, reload } = useFetch('/account/addresses');
  const { confirm, notify } = useFeedback();
  const [editing, setEditing] = useState(null);
  const del = async (a) => {
    if (!(await confirm({ title: 'Supprimer cette adresse ?', message: `${a.label} – ${a.city}`, confirmLabel: 'Supprimer', danger: true }))) return;
    const { data: r } = await api.delete(`/account/addresses/${a.id}`);
    notify.success(r.message);
    reload();
  };
  return (
    <>
      <PageHead icon={faLocationDot} title="Mes adresses">
        <button className="btn" onClick={() => setEditing({})}><FontAwesomeIcon icon={faPlus} /> Nouvelle adresse</button>
      </PageHead>
      {loading ? <Loader /> : error ? <ErrorState message={error} onRetry={reload} /> : data.length === 0 ? (
        <Empty icon={faLocationDot} title="Aucune adresse" text="Ajoutez une adresse pour accélérer vos commandes." />
      ) : (
        <div className="shop-grid">
          {data.map((a) => (
            <div key={a.id} className="card">
              <div className="flex between"><b>{a.label}</b>{a.is_default ? <span className="badge badge-gold">Par défaut</span> : null}</div>
              <p className="small mt-1 mb-1">{a.recipient_name} · {a.phone}<br />
                <span className="muted">{[a.street, a.district, a.commune, a.city].filter(Boolean).join(', ')}</span></p>
              {a.instructions && <p className="small muted">« {a.instructions} »</p>}
              <div className="flex">
                <button className="btn btn-outline btn-sm" onClick={() => setEditing(a)}><FontAwesomeIcon icon={faPen} /> Modifier</button>
                <button className="btn btn-danger btn-sm" onClick={() => del(a)}><FontAwesomeIcon icon={faTrashCan} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      {editing && <AddressForm address={editing.id ? editing : null} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
    </>
  );
}

export function Orders() {
  const [page, setPage] = useState(1);
  const { data, meta, loading, error, reload } = useFetch('/orders', { page });
  return (
    <>
      <PageHead icon={faBoxOpen} title="Mes commandes" />
      {loading ? <Loader /> : error ? <ErrorState message={error} onRetry={reload} /> : data.length === 0 ? (
        <Empty icon={faBoxOpen} title="Aucune commande" text="Vos commandes apparaîtront ici."><Link to="/catalogue" className="btn">Commencer mes achats</Link></Empty>
      ) : (
        <div className="stack">
          {data.map((o) => (
            <Link key={o.id} to={`/compte/commandes/${o.id}`} className="card flex" style={{ padding: 14 }}>
              <div style={{ width: 56, height: 68, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}><ProductImage src={o.image} alt="" /></div>
              <div className="grow">
                <b>{o.order_number}</b>
                <div className="small muted">{date(o.created_at, true)} · {o.item_count} article(s)</div>
                <div className="small mt-1"><PaymentLabel code={o.payment_method} size={20} /> · {PAYMENT_PLANS[o.payment_plan]}</div>
                {Number(o.balance_amount) > 0 && !o.balance_paid_at && !['cancelled', 'refunding', 'refunded'].includes(o.status) && (
                  <div className="small gold">{price(o.balance_amount)} à régler au vendeur à la livraison</div>
                )}
                <div className="flex flex-wrap mt-1" style={{ gap: 6 }}>
                  <StatusBadge map={ORDER_STATUS} value={o.status} />
                  {showPaymentStatus(o) && <StatusBadge map={PAYMENT_STATUS} value={o.payment_status} />}
                </div>
              </div>
              <b>{price(o.total_amount)}</b>
            </Link>
          ))}
        </div>
      )}
      <Pagination meta={meta} onChange={setPage} />
    </>
  );
}

function ReviewModal({ item, onClose, onDone }) {
  const { values, set, errors, submitting, submit } = useForm({ rating: 5, comment: '' });
  const onSubmit = submit(async (v) => {
    const { data } = await api.post(`/products/${item.product_id}/reviews`, v);
    onDone();
    return data;
  });
  return (
    <Modal title="Donner mon avis" onClose={onClose}>
      <form onSubmit={onSubmit} className="stack" noValidate>
        <p className="mb-0"><b>{item.product_name}</b></p>
        <div className="stars" style={{ fontSize: '1.7rem' }} role="radiogroup" aria-label="Note">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => set('rating')(n)} aria-label={`${n} étoile(s)`}
              style={{ background: 'none', border: 0, cursor: 'pointer', color: n <= values.rating ? 'var(--gold)' : '#ddd', fontSize: 'inherit' }}>
              <FontAwesomeIcon icon={faStar} />
            </button>
          ))}
        </div>
        <Field label="Commentaire" error={errors.comment}><textarea className="textarea" value={values.comment} onChange={set('comment')} maxLength={1000} /></Field>
        <div className="modal-actions"><button type="button" className="btn btn-outline" onClick={onClose}>Annuler</button><SubmitButton loading={submitting}>Publier mon avis</SubmitButton></div>
      </form>
    </Modal>
  );
}

export function OrderDetail() {
  const { id } = useParams();
  const { data: o, loading, error, reload } = useFetch(`/orders/${id}`);
  const { confirm, notify, showResult } = useFeedback();
  const [reviewing, setReviewing] = useState(null);
  const [returning, setReturning] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  if (loading) return <Loader />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const pendingPayment = o.status === 'pending' && !['succeeded', 'partially_paid'].includes(o.payment_status);
  const lastPayment = o.payments[0];

  const cancel = async () => {
    const ok = await confirm({ title: 'Annuler cette commande ?', message: 'Les articles seront remis en stock. Si vous avez déjà payé, vous serez remboursé.', confirmLabel: 'Annuler la commande', cancelLabel: 'Garder', danger: true });
    if (!ok) return;
    try {
      const { data } = await api.post(`/orders/${o.id}/cancel`, { reason: 'Annulée par le client' });
      await showResult({ title: 'Commande annulée', message: data.message, icon: faCircleCheck });
      reload();
    } catch (e) { notify.error(apiError(e).message); }
  };

  const sendReturn = async () => {
    setBusy(true);
    try {
      const { data } = await api.post(`/orders/${o.id}/return`, { reason });
      setReturning(false);
      await showResult({ title: 'Demande de retour envoyée', message: 'Notre équipe va l’examiner et vous tiendra informé.', icon: faRotateLeft });
      notify.success(data.message);
      reload();
    } catch (e) { notify.error(apiError(e).message); } finally { setBusy(false); }
  };

  return (
    <>
      <Link to="/compte/commandes" className="btn btn-ghost btn-sm mb-1"><FontAwesomeIcon icon={faArrowLeft} /> Mes commandes</Link>
      <PageHead icon={faBoxOpen} title={`Commande ${o.order_number}`}>
        <StatusBadge map={ORDER_STATUS} value={o.status} />
        {showPaymentStatus(o) && <StatusBadge map={PAYMENT_STATUS} value={o.payment_status} />}
      </PageHead>

      {pendingPayment && (
        <div className="alert alert-warning mb-2">
          <FontAwesomeIcon icon={faCreditCard} />
          <div className="grow">Votre commande attend le paiement. Sans paiement, elle sera annulée automatiquement.</div>
          <Link to={`/paiement/${lastPayment?.id}?commande=${o.id}`} className="btn btn-sm">Payer maintenant</Link>
        </div>
      )}

      <div className="two-col" style={{ paddingTop: 0, paddingBottom: 0 }}>
        <div className="stack" style={{ gap: 20 }}>
          <div className="card">
            <div className="card-title"><FontAwesomeIcon icon={faBoxOpen} /> Articles</div>
            {o.items.map((it) => (
              <div key={it.id} className="cart-item order-line">
                <div style={{ width: 64, height: 78, borderRadius: 8, overflow: 'hidden' }}><ProductImage src={it.image_url} alt="" /></div>
                <div>
                  {it.product_slug ? <Link to={`/produit/${it.product_slug}`}><b>{it.product_name}</b></Link> : <b>{it.product_name}</b>}
                  <div className="small muted">{it.size} · {it.color} · x{it.quantity} · <FontAwesomeIcon icon={faStore} /> {it.shop_name}</div>
                  <div className="flex flex-wrap mt-1" style={{ gap: 6 }}>
                    <StatusBadge map={ORDER_STATUS} value={it.fulfillment_status} />
                    {it.tracking_number && <span className="badge"><FontAwesomeIcon icon={faTruckFast} /> {it.carrier} {it.tracking_number}</span>}
                  </div>
                </div>
                <div className="stack" style={{ alignItems: 'flex-end' }}>
                  <b>{price(it.line_total)}</b>
                  {it.fulfillment_status === 'delivered' && !it.reviewed && it.product_id && (
                    <button className="btn btn-outline btn-sm" onClick={() => setReviewing(it)}><FontAwesomeIcon icon={faStar} /> Donner mon avis</button>
                  )}
                  {it.reviewed && <span className="small muted"><FontAwesomeIcon icon={faCircleCheck} className="gold" /> Avis publié</span>}
                </div>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="card-title"><FontAwesomeIcon icon={faTruckFast} /> Suivi</div>
            <ul className="timeline">
              {[...o.history].reverse().map((h, i) => (
                <li key={i}><span className="dot" />
                  <b>{ORDER_STATUS[h.status]?.[0] || h.status}</b>
                  <div className="small muted">{date(h.created_at, true)}{h.comment ? ` — ${h.comment}` : ''}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <aside className="stack" style={{ gap: 20 }}>
          <div className="card">
            <div className="card-title">Récapitulatif</div>
            <div className="summary-row"><span>Sous-total</span><span>{price(o.subtotal)}</span></div>
            {Number(o.discount_total) > 0 && (
              <div className="summary-row" style={{ color: 'var(--success)' }}><span>Remise ({o.promo_code})</span><span>-{price(o.discount_total)}</span></div>
            )}
            <div className="summary-row"><span>Livraison</span><span>{Number(o.delivery_fee) ? price(o.delivery_fee) : 'Offerte'}</span></div>
            <div className="summary-row summary-total"><span>Total</span><span>{price(o.total_amount)}</span></div>
            <div className="pay-split">
              <div className="small muted mb-1">{PAYMENT_PLANS[o.payment_plan]}</div>
              <div className="summary-row"><span>Payé en ligne</span><b>{price(o.upfront_amount)}</b></div>
              {Number(o.balance_amount) > 0 && (
                <div className="summary-row">
                  <span>{o.balance_paid_at ? 'Réglé au vendeur à la livraison' : 'À régler au vendeur à la livraison'}</span>
                  <b>{price(o.balance_amount)}</b>
                </div>
              )}
            </div>
            <div className="small mt-2"><PaymentLabel code={o.payment_method} size={24} /></div>
            <p className="small muted mt-1 mb-0">Commandée le {date(o.created_at, true)}</p>
          </div>
          <div className="card small">
            <div className="card-title"><FontAwesomeIcon icon={faLocationDot} /> Livraison</div>
            <b>{DELIVERY_MODES[o.delivery_mode]}</b><br />
            {o.ship_recipient} · {o.ship_phone}<br />
            <span className="muted">{[o.ship_street, o.ship_district, o.ship_commune, o.ship_city].filter(Boolean).join(', ')}</span>
          </div>
          {['pending', 'confirmed'].includes(o.status) && (
            <button className="btn btn-danger" onClick={cancel}><FontAwesomeIcon icon={faBan} /> Annuler la commande</button>
          )}
          {o.status === 'delivered' && (
            <button className="btn btn-outline" onClick={() => setReturning(true)}><FontAwesomeIcon icon={faRotateLeft} /> Demander un retour</button>
          )}
          {o.returns.map((r) => (
            <div key={r.id} className="alert alert-info small"><FontAwesomeIcon icon={faRotateLeft} />
              <span>Retour {r.status === 'requested' ? 'en cours d’examen' : r.status === 'accepted' ? 'accepté' : r.status === 'refunded' ? 'remboursé' : 'refusé'}{r.decision_note ? ` — ${r.decision_note}` : ''}</span></div>
          ))}
        </aside>
      </div>
      {reviewing && <ReviewModal item={reviewing} onClose={() => setReviewing(null)} onDone={() => { setReviewing(null); reload(); }} />}
      {returning && (
        <Modal title="Demander un retour" onClose={() => setReturning(false)}
          footer={<><button className="btn btn-outline" onClick={() => setReturning(false)}>Annuler</button>
            <button className="btn" disabled={busy || reason.trim().length < 10} onClick={sendReturn}>Envoyer la demande</button></>}>
          <Field label="Motif du retour" hint="10 caractères minimum (taille, défaut, article non conforme…)">
            <textarea className="textarea" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
          </Field>
        </Modal>
      )}
    </>
  );
}

export function Advantages() {
  const { data, loading, error, reload } = useFetch('/account/promotions');
  const { notify } = useFeedback();
  const copy = (code) => navigator.clipboard?.writeText(code).then(() => notify.success(`Code ${code} copié`));
  return (
    <>
      <PageHead icon={faGift} title="Mes avantages" />
      {loading ? <Loader /> : error ? <ErrorState message={error} onRetry={reload} /> : data.length === 0 ? (
        <Empty icon={faGift} title="Aucun avantage pour le moment" text="Nos clients les plus fidèles reçoivent régulièrement des codes promo personnels." />
      ) : (
        <div className="shop-grid">
          {data.map((p) => (
            <div key={p.id} className="card" style={{ borderColor: 'var(--gold-light)', background: 'var(--gold-soft)' }}>
              <div className="flex between">
                <span className="badge badge-gold"><FontAwesomeIcon icon={faGift} /> {p.discount_type === 'percent' ? `-${Number(p.discount_value)} %` : `-${price(p.discount_value)}`}</span>
                {p.ends_at && <span className="small muted">Jusqu’au {date(p.ends_at)}</span>}
              </div>
              <h3 className="mt-1 mb-0">{p.title}</h3>
              {p.description && <p className="small muted mb-0">{p.description}</p>}
              <p className="small mb-1">
                {Number(p.min_order_amount) > 0 ? `Dès ${price(p.min_order_amount)} d’achat · ` : ''}
                {p.remaining_uses} utilisation{p.remaining_uses > 1 ? 's' : ''} restante{p.remaining_uses > 1 ? 's' : ''}
              </p>
              <div className="flex">
                <code style={{ fontSize: '1.05rem', fontWeight: 700, padding: '6px 12px', background: '#fff', border: '1.5px dashed var(--gold)', borderRadius: 8 }}>{p.code}</code>
                <button className="btn btn-outline btn-sm" onClick={() => copy(p.code)}><FontAwesomeIcon icon={faCopy} /> Copier</button>
              </div>
              <Link to="/catalogue" className="btn btn-sm btn-block mt-2">J’en profite</Link>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export function Wishlist() {
  const { data, loading, error, reload } = useFetch('/wishlist');
  return (
    <>
      <PageHead icon={faHeart} title="Mes favoris" />
      {error ? <ErrorState message={error} onRetry={reload} /> : !loading && data.length === 0
        ? <Empty icon={faHeart} title="Aucun favori" text="Cliquez sur le cœur d’un article pour le retrouver ici."><Link to="/catalogue" className="btn">Explorer</Link></Empty>
        : <ProductGrid products={data || []} loading={loading} />}
    </>
  );
}

export function Notifications() {
  const { data, loading, error, reload } = useFetch('/account/notifications');
  const { notify } = useFeedback();
  const navigate = useNavigate();
  const readAll = async () => {
    const { data: r } = await api.post('/account/notifications/read-all');
    notify.success(r.message);
    reload();
  };
  const open = async (n) => {
    if (!n.read_at) await api.patch(`/account/notifications/${n.id}/read`).catch(() => {});
    if (n.link) navigate(n.link); else reload();
  };
  return (
    <>
      <PageHead icon={faBell} title="Notifications">
        {data?.unread > 0 && <button className="btn btn-outline btn-sm" onClick={readAll}><FontAwesomeIcon icon={faCheckDouble} /> Tout marquer comme lu</button>}
      </PageHead>
      {loading ? <Loader /> : error ? <ErrorState message={error} onRetry={reload} /> : data.items.length === 0 ? (
        <Empty icon={faEnvelopeOpen} title="Aucune notification" />
      ) : (
        <div className="stack">
          {data.items.map((n) => (
            <button key={n.id} onClick={() => open(n)} className="card flex"
              style={{ textAlign: 'left', cursor: 'pointer', font: 'inherit', background: n.read_at ? '#fff' : 'var(--gold-soft)', borderColor: n.read_at ? 'var(--line)' : 'var(--gold-light)' }}>
              <span className="avatar" style={{ background: n.read_at ? 'var(--line-2)' : undefined }}><FontAwesomeIcon icon={faBell} /></span>
              <div className="grow"><b>{n.title}</b>{n.body && <div className="small muted">{n.body}</div>}</div>
              <span className="small muted">{date(n.created_at, true)}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
