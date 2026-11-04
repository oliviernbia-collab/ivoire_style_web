import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBuildingColumns, faCreditCard, faMoneyBillWave, faWallet } from '@fortawesome/free-solid-svg-icons';
import api, { fileUrl } from '../api/client';
import { PAYMENT_METHODS, PAYOUT_METHODS } from '../utils/format';

/** Catalogue des moyens de paiement (logos officiels sur Cloudinary), chargé une seule fois. */
let catalog = null;
function loadCatalog() {
  catalog = catalog || api.get('/settings/public')
    .then((r) => r.data.data.payment_providers || {})
    .catch(() => { catalog = null; return {}; });
  return catalog;
}

export function usePaymentProviders() {
  const [providers, setProviders] = useState({});
  useEffect(() => {
    let active = true;
    loadCatalog().then((p) => active && setProviders(p));
    return () => { active = false; };
  }, []);
  return providers;
}

const ICONS = { 'credit-card': faCreditCard, 'money-bill-wave': faMoneyBillWave, 'building-columns': faBuildingColumns };

export const paymentLabel = (code) => PAYMENT_METHODS[code]?.label || PAYOUT_METHODS[code] || code;

/**
 * Logo d'un moyen de paiement. wide : version bandeau (pied de page, en-têtes).
 * size : hauteur en pixels (la vignette carrée fait size × size).
 */
export default function PaymentLogo({ code, size = 32, wide = false, className = '' }) {
  const providers = usePaymentProviders();
  const p = providers[code];
  const label = p?.label || paymentLabel(code);
  const width = wide ? size * 3 : size;
  const src = p && (wide ? p.logo_wide : p.logo);
  if (src) {
    return (
      <img src={fileUrl(src, { w: width * 2 })} alt={label} title={label} width={width} height={size}
        className={`pay-logo ${wide ? 'wide' : ''} ${className}`} loading="lazy" />
    );
  }
  return (
    <span className={`pay-logo pay-icon ${className}`} title={label} aria-label={label}
      style={{ width, height: size, color: p?.color || PAYMENT_METHODS[code]?.color || 'var(--ink-2)', fontSize: size * 0.45 }}>
      <FontAwesomeIcon icon={ICONS[p?.icon] || faWallet} />
    </span>
  );
}

/** Choix du mode de reversement vendeur, sous forme de vignettes avec logos. */
export function PayoutPicker({ value, onChange, name = 'payout_method' }) {
  return (
    <div className="choice-grid" role="radiogroup" aria-label="Mode de reversement">
      {Object.keys(PAYOUT_METHODS).map((code) => (
        <label key={code} className={`choice ${value === code ? 'on' : ''}`} style={{ padding: 10 }}>
          <input type="radio" name={name} checked={value === code} onChange={() => onChange(code)} />
          <PaymentLogo code={code} size={34} />
          <span>{PAYOUT_METHODS[code]}</span>
        </label>
      ))}
    </div>
  );
}

/** Logo + libellé, pour les listes et récapitulatifs. */
export function PaymentLabel({ code, size = 22 }) {
  return (
    <span className="pay-label">
      <PaymentLogo code={code} size={size} /> <span>{paymentLabel(code)}</span>
    </span>
  );
}
