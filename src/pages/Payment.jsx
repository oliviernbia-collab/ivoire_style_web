import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCircleCheck, faCircleXmark, faShieldHalved, faRotateRight, faSpinner, faMobileScreenButton,
} from '@fortawesome/free-solid-svg-icons';
import api, { apiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useFeedback } from '../context/FeedbackContext';
import { useLive } from '../context/RealtimeContext';
import { ErrorState, Field, Loader, useFetch } from '../components/ui';
import PaymentLogo, { paymentLabel } from '../components/PaymentLogo';
import { PAYMENT_PLANS, price } from '../utils/format';

const POLL_MS = 5000;
// Opérateurs qui confirment par USSD (demande de code sur le téléphone)
const USSD = ['mtn_momo', 'moov_money'];

/**
 * Parcours de paiement Mobile Money.
 * - sandbox : la réponse du prestataire est simulée ;
 * - jeko : le client valide chez son opérateur (redirection Orange / Wave, code USSD MTN / Moov),
 *   puis la page attend la confirmation (webhook ou vérification auprès de Jèko).
 */
export default function Payment() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const orderId = params.get('commande');
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notify, showResult } = useFeedback();
  const [paymentId, setPaymentId] = useState(Number(id));
  const order = useFetch(`/orders/${orderId}`);
  const payment = useFetch(`/payments/${paymentId}`);
  const { data: settings } = useFetch('/settings/public');
  const [phone, setPhone] = useState(user?.phone || '');
  const [provider, setProvider] = useState(null);
  const [busy, setBusy] = useState(null);
  const [phoneError, setPhoneError] = useState(null);
  // Attente de la confirmation : retour de l'opérateur (?retour=1) ou demande USSD envoyée
  const [waiting, setWaiting] = useState(params.get('retour') === '1');
  const [live, setLive] = useState(null);
  const announced = useRef(false);

  const jeko = settings?.payment_mode === 'jeko';
  const p = live?.id === paymentId ? live : payment.data;
  const o = order.data;

  // Vérifie l'état du paiement toutes les 5 s pendant l'attente
  useEffect(() => {
    if (!waiting) return undefined;
    let active = true;
    const tick = async () => {
      try {
        const { data } = await api.get(`/payments/${paymentId}`);
        if (active) setLive(data.data);
      } catch { /* réseau : nouvel essai au prochain passage */ }
    };
    tick();
    const t = setInterval(tick, POLL_MS);
    return () => { active = false; clearInterval(t); };
  }, [waiting, paymentId]);

  // Confirmation reçue en temps réel (webhook Jèko) : mise à jour immédiate, sans attendre le prochain passage
  useLive(['payment', 'order'], () => {
    if (!waiting) return;
    api.get(`/payments/${paymentId}`).then(({ data }) => setLive(data.data)).catch(() => {});
    order.reload({ silent: true });
  });

  const status = p?.status;
  useEffect(() => {
    if (!waiting || !o || announced.current) return;
    if (status === 'succeeded') {
      announced.current = true;
      showResult({
        title: 'Paiement réussi !',
        message: Number(o.balance_amount) > 0
          ? `Votre paiement de ${price(p.amount)} est confirmé. Commande ${o.order_number} validée : ${price(o.balance_amount)} seront à régler au vendeur à la livraison.`
          : `Votre paiement de ${price(p.amount)} est confirmé. Votre commande ${o.order_number} est validée.`,
        confirmLabel: 'Suivre ma commande',
      }).then(() => navigate(`/compte/commandes/${o.id}`, { replace: true }));
    } else if (status === 'failed') {
      announced.current = true;
      showResult({
        type: 'error', title: 'Paiement non abouti',
        message: p.failure_reason || 'La transaction n’a pas abouti. Aucun montant n’a été débité. Réessayez ou changez d’opérateur.',
        confirmLabel: 'Réessayer',
      }).then(() => { setWaiting(false); announced.current = false; order.reload(); });
    }
  }, [status, waiting, o, p, showResult, navigate, order]);

  if (order.loading || payment.loading) return <Loader />;
  if (order.error || payment.error) return <div className="container"><ErrorState message={order.error || payment.error} /></div>;

  const current = provider || p.provider;
  const methods = settings?.payment_methods || [];

  if (!waiting && (['succeeded', 'partially_paid'].includes(o.payment_status) || o.status !== 'pending')) {
    return <Navigate to={`/compte/commandes/${o.id}`} replace />;
  }

  const checkPhone = () => {
    const digits = phone.replace(/\D/g, '').replace(/^(00)?225/, '');
    const okPhone = jeko ? /^(01|05|07)\d{8}$/.test(digits) : /^\+?[0-9 ]{8,20}$/.test(phone);
    setPhoneError(okPhone ? null : 'Numéro ivoirien à 10 chiffres (01, 05 ou 07…)');
    if (!okPhone) notify.error('Saisissez votre numéro Mobile Money');
    return okPhone;
  };

  /** Mode Jèko : nouvelle tentative (une référence par essai), puis redirection ou attente du code USSD. */
  const payWithJeko = async () => {
    if (!checkPhone()) return;
    setBusy('success');
    try {
      const { data } = await api.post('/payments/initiate',
        { order_id: o.id, provider: current, payer_phone: phone, return_to: 'web' },
        { headers: { 'Idempotency-Key': crypto.randomUUID() } });
      const { payment: attempt, instructions } = data.data;
      setPaymentId(attempt.id);
      if (instructions.type === 'redirect' && instructions.url) {
        window.location.assign(instructions.url);
        return;
      }
      notify.info(instructions.message);
      setWaiting(true);
      setBusy(null);
    } catch (e) {
      notify.error(apiError(e).message);
      payment.reload();
      setBusy(null);
    }
  };

  const simulate = async (outcome) => {
    if (!checkPhone()) return;
    setBusy(outcome);
    try {
      let attempt = p;
      // Changement d'opérateur ou nouvelle tentative après échec : nouvelle transaction
      if (!['initiated', 'pending'].includes(p.status) || (provider && provider !== p.provider)) {
        const { data } = await api.post('/payments/initiate', { order_id: o.id, provider: current, payer_phone: phone });
        attempt = data.data.payment;
        setPaymentId(attempt.id);
      }
      const { data } = await api.post(`/payments/${attempt.id}/sandbox`, { outcome, payer_phone: phone });
      if (data.data.result.status === 'succeeded') {
        await showResult({
          title: 'Paiement réussi !',
          message: Number(o.balance_amount) > 0
            ? `Votre paiement de ${price(p.amount)} est confirmé. Commande ${o.order_number} validée : ${price(o.balance_amount)} seront à régler au vendeur à la livraison.`
            : `Votre paiement de ${price(p.amount)} est confirmé. Votre commande ${o.order_number} est validée.`,
          confirmLabel: 'Suivre ma commande',
        });
        navigate(`/compte/commandes/${o.id}`, { replace: true });
      } else {
        await showResult({
          type: 'error',
          title: 'Paiement refusé',
          message: 'La transaction n’a pas abouti. Aucun montant n’a été débité. Vous pouvez réessayer ou changer d’opérateur.',
          confirmLabel: 'Réessayer',
        });
        payment.reload();
        order.reload();
      }
    } catch (e) {
      notify.error(apiError(e).message);
      payment.reload();
    } finally {
      setBusy(null);
    }
  };

  if (waiting && status !== 'failed') {
    return (
      <div className="container" style={{ maxWidth: 560, paddingTop: 40, paddingBottom: 60 }}>
        <div className="card center" style={{ padding: 28 }}>
          <div className="mb-1"><PaymentLogo code={p.provider} size={64} /></div>
          <h1 style={{ fontSize: '1.4rem' }}>
            {USSD.includes(p.provider) ? 'Validez le paiement sur votre téléphone' : 'Confirmation du paiement en cours'}
          </h1>
          <div className="pdp-price">{price(p.amount)}</div>
          <p className="muted">
            {USSD.includes(p.provider)
              ? <><FontAwesomeIcon icon={faMobileScreenButton} className="gold" /> Une demande {paymentLabel(p.provider)} a été envoyée au <b>{p.payer_phone}</b> : composez votre code secret pour confirmer.</>
              : 'Nous attendons la confirmation de votre opérateur. Cela prend généralement quelques secondes.'}
          </p>
          <p className="small muted"><FontAwesomeIcon icon={faSpinner} className="spin" /> Cette page se met à jour automatiquement.</p>
          <div className="stack mt-2">
            <button className="btn btn-outline" onClick={() => { setWaiting(false); setLive(null); }}>Changer d’opérateur ou de numéro</button>
            <button className="btn btn-ghost" onClick={() => navigate(`/compte/commandes/${o.id}`)}>Suivre ma commande</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: 560, paddingTop: 40, paddingBottom: 60 }}>
      <div className="card" style={{ padding: 28 }}>
        <div className="center">
          <div className="mb-1"><PaymentLogo code={current} size={64} /></div>
          <h1 style={{ fontSize: '1.4rem' }}>Paiement {paymentLabel(current)}</h1>
          <p className="muted mb-1">Commande <b>{o.order_number}</b></p>
          <div className="pdp-price">{price(p.amount)}</div>
          {Number(o.balance_amount) > 0 && (
            <p className="small muted mb-0">
              {PAYMENT_PLANS[o.payment_plan]} · total {price(o.total_amount)}<br />
              Reste <b>{price(o.balance_amount)}</b> à régler au vendeur à la livraison
            </p>
          )}
        </div>
        {p.status === 'failed' && (
          <div className="alert alert-danger mt-2"><FontAwesomeIcon icon={faCircleXmark} /> {p.failure_reason || 'La dernière tentative a échoué.'} Réessayez ou changez d’opérateur.</div>
        )}
        <div className="option-group">
          <div className="label">Opérateur</div>
          <div className="chips">
            {methods.map((m) => (
              <button key={m} type="button" className={`chip ${current === m ? 'on' : ''}`} onClick={() => setProvider(m)} style={{ padding: '5px 12px 5px 5px' }}>
                <PaymentLogo code={m} size={26} /> {paymentLabel(m)}
              </button>
            ))}
          </div>
        </div>
        <Field label={`Votre numéro ${paymentLabel(current)}`} error={phoneError} required
          hint={`${USSD.includes(current) ? 'Vous recevrez une demande de code secret sur ce numéro. ' : 'Saisissez le numéro du compte qui va payer. '}`
            + 'En cas d’annulation, le remboursement y sera envoyé.'}>
          <input className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07 00 00 00 00" />
        </Field>
        {settings?.payment_mode === 'sandbox' && (
          <div className="alert alert-gold small mt-2">
            <FontAwesomeIcon icon={faShieldHalved} />
            <span><b>Mode démonstration.</b> Aucun débit réel : choisissez le résultat de la transaction simulée. La confirmation passe par le même webhook signé qu’en production.</span>
          </div>
        )}
        {jeko && (
          <div className="alert alert-gold small mt-2">
            <FontAwesomeIcon icon={faShieldHalved} />
            <span>Paiement sécurisé par <b>Jèko</b>. {USSD.includes(current)
              ? 'Vous validerez avec votre code secret sur votre téléphone.'
              : `Vous serez redirigé vers ${paymentLabel(current)} pour valider.`}</span>
          </div>
        )}
        <div className="stack mt-3">
          <button className="btn btn-lg btn-block" disabled={!!busy} onClick={() => (jeko ? payWithJeko() : simulate('success'))}>
            <FontAwesomeIcon icon={busy === 'success' ? faSpinner : faCircleCheck} className={busy === 'success' ? 'spin' : ''} />
            {p.status === 'failed' ? ' Réessayer le paiement' : ` Payer ${price(p.amount)}`}
          </button>
          {settings?.payment_mode === 'sandbox' && (
            <button className="btn btn-danger btn-block" disabled={!!busy} onClick={() => simulate('failure')}>
              <FontAwesomeIcon icon={busy === 'failure' ? faSpinner : faRotateRight} className={busy === 'failure' ? 'spin' : ''} /> Simuler un refus
            </button>
          )}
          <button className="btn btn-ghost" onClick={() => navigate(`/compte/commandes/${o.id}`)}>Payer plus tard</button>
        </div>
      </div>
    </div>
  );
}
