import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faLocationDot, faTruckFast, faWallet, faPlus, faLock, faHouse, faBuilding, faStore,
  faCheck, faPen, faTicket, faXmark, faCircleCheck, faCircleExclamation, faGift, faMoneyBillWave, faCircleHalfStroke,
  faMobileScreenButton, faHandHoldingDollar,
} from '@fortawesome/free-solid-svg-icons';
import api, { apiError } from '../api/client';
import { useCart } from '../context/CartContext';
import AddressForm from '../components/AddressForm';
import { Loader, ProductImage, SubmitButton, useFetch, useForm } from '../components/ui';
import PaymentLogo, { paymentLabel } from '../components/PaymentLogo';
import { price } from '../utils/format';

const MODE_ICONS = { home: faHouse, office: faBuilding, shop_pickup: faStore };

export default function Checkout() {
  const { cart, ready: cartReady, reload } = useCart();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const addresses = useFetch('/account/addresses');
  const { data: settings } = useFetch('/settings/public');
  const myPromos = useFetch('/account/promotions');
  const [editing, setEditing] = useState(null);
  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState(null);
  const [promoInput, setPromoInput] = useState('');

  // Une commande = une boutique (paramètre ?boutique=, ou la seule boutique du panier)
  const shopIds = [...new Set(cart.items.map((i) => i.shop_id))];
  const shopId = Number(params.get('boutique')) || (shopIds.length === 1 ? shopIds[0] : null);
  const items = cart.items.filter((i) => i.shop_id === shopId);

  const { values, set, setValues, errors, submitting, submit } = useForm({
    address_id: null, delivery_mode: 'home', payment_plan: 'full', payment_method: 'orange_money', note: '', promo_code: '',
  });
  const applyPromo = (code) => { setPromoInput(code); set('promo_code')(code.trim().toUpperCase()); };

  useEffect(() => {
    if (addresses.data?.length && !values.address_id) {
      setValues((v) => ({ ...v, address_id: (addresses.data.find((a) => a.is_default) || addresses.data[0]).id }));
    }
  }, [addresses.data]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!values.address_id || !shopId) return;
    api.post('/orders/quote', {
      shop_id: shopId, address_id: values.address_id, delivery_mode: values.delivery_mode,
      payment_plan: values.payment_plan, promo_code: values.promo_code || undefined,
    }).then((r) => { setQuote(r.data.data); setQuoteError(null); })
      // Ex. : zone non desservie par la boutique → message affiché à l'étape Livraison
      .catch((e) => { setQuote(null); setQuoteError(apiError(e).message); });
  }, [shopId, values.address_id, values.delivery_mode, values.payment_plan, values.promo_code, cart.subtotal]);

  if (!cartReady || addresses.loading) return <Loader />;
  if (!submitting && (!shopId || !items.length)) return <Navigate to="/panier" replace />;

  const operators = settings?.payment_methods || [];
  const plans = [
    { code: 'full', icon: faWallet, title: 'Payer la totalité maintenant', sub: 'Tout est réglé en ligne, rien à payer à la livraison.' },
    { code: 'half', icon: faCircleHalfStroke, title: 'Payer la moitié maintenant',
      sub: `${settings?.half_payment_rate ?? 50} % en ligne, le reste au vendeur à la livraison.` },
    ...(settings?.cash_on_delivery ? [{ code: 'deposit', icon: faMoneyBillWave, title: 'Paiement à la livraison',
      sub: `Acompte obligatoire de ${settings?.deposit_rate ?? 10} % en ligne, le reste à la livraison.` }] : []),
  ];

  const onSubmit = submit(async (v) => {
    const { data } = await api.post('/orders', {
      ...v, shop_id: shopId, delivery_mode: quote?.delivery_mode || v.delivery_mode,
      promo_code: quote?.promo ? v.promo_code : undefined, // code transmis seulement s'il a été validé par le devis
    });
    await reload();
    const { order, payment } = data.data;
    navigate(`/paiement/${payment.id}?commande=${order.id}`, { replace: true });
    return data;
  }, { validate: (v) => ({ address_id: !v.address_id && 'Ajoutez une adresse de livraison' }) });

  const shopName = items[0]?.shop_name;
  const deposit = values.payment_plan !== 'full';

  return (
    <div className="container" style={{ paddingTop: 28 }}>
      <div className="steps" aria-label="Étapes">
        {['Adresse', 'Livraison', 'Paiement', 'Confirmation'].map((s, i) => (
          <div key={s} className={`step ${!values.address_id ? (i === 0 ? 'on' : '') : i < 2 ? 'done' : i === 2 ? 'on' : ''}`}>
            <span className="n">{values.address_id && i < 2 ? <FontAwesomeIcon icon={faCheck} /> : i + 1}</span>{s}
          </div>
        ))}
      </div>
      <form className="two-col" style={{ paddingTop: 0 }} onSubmit={onSubmit} noValidate>
        <div className="stack" style={{ gap: 20 }}>
          <section className="card">
            <div className="card-title"><FontAwesomeIcon icon={faLocationDot} /> 1. Adresse de livraison</div>
            <div className="stack">
              {addresses.data?.map((a) => (
                <label key={a.id} className={`choice ${values.address_id === a.id ? 'on' : ''}`}>
                  <input type="radio" name="address" checked={values.address_id === a.id} onChange={() => set('address_id')(a.id)} />
                  <div className="grow">
                    <b>{a.label}</b> — {a.recipient_name} · {a.phone}
                    <div className="small muted">{[a.street, a.district, a.commune, a.city].filter(Boolean).join(', ')}</div>
                  </div>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={(e) => { e.preventDefault(); setEditing(a); }} aria-label="Modifier"><FontAwesomeIcon icon={faPen} /></button>
                </label>
              ))}
              {errors.address_id && <span className="field-error">{errors.address_id}</span>}
              <button type="button" className="btn btn-outline" onClick={() => setEditing({})}><FontAwesomeIcon icon={faPlus} /> Ajouter une adresse</button>
            </div>
          </section>

          <section className="card">
            <div className="card-title"><FontAwesomeIcon icon={faTruckFast} /> 2. Livraison par {shopName}</div>
            <div className="choice-grid">
              {(quote?.delivery_options || []).map((o) => (
                <label key={o.mode} className={`choice ${quote?.delivery_mode === o.mode ? 'on' : ''}`}>
                  <input type="radio" name="mode" checked={quote?.delivery_mode === o.mode} onChange={() => set('delivery_mode')(o.mode)} />
                  <span className="ic"><FontAwesomeIcon icon={MODE_ICONS[o.mode] || faTruckFast} /></span>
                  <span className="grow">{o.label}<div className="small muted">
                    {o.fee === 0 ? 'Gratuit' : price(o.fee)}{o.zone ? ` · ${o.zone}` : ''}</div></span>
                </label>
              ))}
            </div>
            {quoteError && <div className="alert alert-danger small"><FontAwesomeIcon icon={faCircleExclamation} /> {quoteError}</div>}
            {quote?.shop?.delivery_info && <p className="small muted mt-1 mb-0"><FontAwesomeIcon icon={faTruckFast} /> {quote.shop.delivery_info}</p>}
          </section>

          <section className="card">
            <div className="card-title"><FontAwesomeIcon icon={faWallet} /> 3. Comment voulez-vous payer ?</div>
            <div className="stack">
              {plans.map((p) => (
                <label key={p.code} className={`choice ${values.payment_plan === p.code ? 'on' : ''}`}>
                  <input type="radio" name="plan" checked={values.payment_plan === p.code} onChange={() => set('payment_plan')(p.code)} />
                  <span className="ic"><FontAwesomeIcon icon={p.icon} /></span>
                  <span className="grow"><b>{p.title}</b><div className="small muted">{p.sub}</div></span>
                </label>
              ))}
            </div>
            <div className="label mt-2 mb-1" style={{ fontWeight: 600, fontSize: '.9rem' }}>
              <FontAwesomeIcon icon={faMobileScreenButton} className="gold" /> {deposit ? 'Payer la part en ligne avec' : 'Payer avec'}
            </div>
            <div className="choice-grid">
              {operators.map((m) => (
                <label key={m} className={`choice ${values.payment_method === m ? 'on' : ''}`} style={{ padding: 10 }}>
                  <input type="radio" name="pay" checked={values.payment_method === m} onChange={() => set('payment_method')(m)} />
                  <PaymentLogo code={m} size={36} />
                  <span>{paymentLabel(m)}</span>
                </label>
              ))}
            </div>
            {errors.payment_method && <span className="field-error">{errors.payment_method}</span>}
            {settings?.payment_mode === 'sandbox' && (
              <div className="alert alert-gold small mt-2">Mode démonstration : le paiement Mobile Money est simulé, aucun débit réel.</div>
            )}
            <div className="field mt-2">
              <label htmlFor="note">Note pour le vendeur (facultatif)</label>
              <textarea id="note" className="textarea" style={{ minHeight: 70 }} value={values.note} onChange={set('note')} maxLength={500} />
            </div>
          </section>
        </div>

        <aside className="card summary">
          <div className="card-title"><FontAwesomeIcon icon={faStore} /> {shopName}</div>
          <div className="stack" style={{ gap: 10, maxHeight: 240, overflowY: 'auto' }}>
            {items.map((it) => (
              <div key={it.id} className="flex" style={{ alignItems: 'flex-start' }}>
                <div style={{ width: 48, height: 58, borderRadius: 6, overflow: 'hidden', flexShrink: 0 }}><ProductImage src={it.image} alt="" w={120} /></div>
                <div className="grow small"><b>{it.name}</b><div className="muted">{it.size} · {it.color} · x{it.quantity}</div></div>
                <span className="small"><b>{price(it.line_total)}</b></span>
              </div>
            ))}
          </div>
          <hr className="divider" />
          <div className="field">
            <label htmlFor="promo"><FontAwesomeIcon icon={faTicket} className="gold" /> Code promo</label>
            <div className="flex" style={{ gap: 8 }}>
              <input id="promo" className="input" value={promoInput} placeholder="Ex. : IVS-AB12CD"
                onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyPromo(promoInput); } }} />
              {values.promo_code
                ? <button type="button" className="btn btn-ghost btn-sm" onClick={() => applyPromo('')} aria-label="Retirer le code"><FontAwesomeIcon icon={faXmark} /></button>
                : <button type="button" className="btn btn-outline btn-sm" disabled={!promoInput.trim()} onClick={() => applyPromo(promoInput)}>Appliquer</button>}
            </div>
            {values.promo_code && quote?.promo && (
              <span className="small" style={{ color: 'var(--success)' }}><FontAwesomeIcon icon={faCircleCheck} /> {quote.promo.title} : code appliqué</span>
            )}
            {values.promo_code && quote?.promo_error && <span className="field-error"><FontAwesomeIcon icon={faCircleExclamation} /> {quote.promo_error}</span>}
            {!values.promo_code && myPromos.data?.length > 0 && (
              <div className="chips mt-1">
                {myPromos.data.map((p) => (
                  <button key={p.id} type="button" className="chip" onClick={() => applyPromo(p.code)} title={p.title}>
                    <FontAwesomeIcon icon={faGift} className="gold" /> {p.code} · {p.discount_type === 'percent' ? `-${Number(p.discount_value)} %` : `-${price(p.discount_value)}`}
                  </button>
                ))}
              </div>
            )}
          </div>
          <hr className="divider" />
          <div className="summary-row"><span>Sous-total</span><b>{price(quote?.subtotal ?? 0)}</b></div>
          {quote?.discount > 0 && (
            <div className="summary-row" style={{ color: 'var(--success)' }}><span>Remise ({quote.promo.code})</span><b>-{price(quote.discount)}</b></div>
          )}
          <div className="summary-row"><span>Livraison</span><b>{quote ? (quote.delivery_fee === 0 ? 'Gratuite' : price(quote.delivery_fee)) : '—'}</b></div>
          <div className="summary-row summary-total"><span>Total</span><span>{price(quote?.total ?? 0)}</span></div>
          {quote && (
            <div className="pay-split">
              <div className="summary-row"><span><FontAwesomeIcon icon={faMobileScreenButton} /> À payer maintenant</span><b>{price(quote.upfront)}</b></div>
              {quote.balance > 0 && (
                <div className="summary-row"><span><FontAwesomeIcon icon={faHandHoldingDollar} /> À régler au vendeur à la livraison</span><b>{price(quote.balance)}</b></div>
              )}
            </div>
          )}
          <SubmitButton loading={submitting} className="btn-block btn-lg mt-2">
            <FontAwesomeIcon icon={faLock} /> {quote ? `Payer ${price(quote.upfront)}` : 'Commander'}
          </SubmitButton>
          <p className="small muted center mt-1 mb-0">En validant, vous acceptez les <a href="/page/cgv" target="_blank" className="gold">conditions de vente</a>.</p>
        </aside>
      </form>
      {editing && (
        <AddressForm address={editing.id ? editing : null} onClose={() => setEditing(null)}
          onSaved={(a) => { setEditing(null); addresses.reload(); set('address_id')(a.id); }} />
      )}
    </div>
  );
}
