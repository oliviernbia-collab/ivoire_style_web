import { useCallback, useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSpinner, faCircleExclamation, faChevronLeft, faChevronRight, faStar, faStarHalfStroke, faShirt, faXmark, faCircleCheck,
} from '@fortawesome/free-solid-svg-icons';
import { faStar as faStarO } from '@fortawesome/free-regular-svg-icons';
import api, { apiError, fileUrl, isVideoUrl, videoPoster } from '../api/client';
import { useFeedback } from '../context/FeedbackContext';
import { price as fmtPrice } from '../utils/format';

export function Loader({ label = 'Chargement…' }) {
  return (
    <div className="loader" role="status">
      <FontAwesomeIcon icon={faSpinner} className="spin" size="lg" /> <span>{label}</span>
    </div>
  );
}

export function Empty({ icon, title, text, children }) {
  return (
    <div className="empty">
      <div className="ic"><FontAwesomeIcon icon={icon} /></div>
      <h3>{title}</h3>
      {text && <p className="muted">{text}</p>}
      {children}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="empty">
      <div className="ic" style={{ color: 'var(--danger)', background: 'var(--danger-bg)' }}>
        <FontAwesomeIcon icon={faCircleExclamation} />
      </div>
      <h3>Oups…</h3>
      <p className="muted">{message}</p>
      {onRetry && <button className="btn" onClick={onRetry}>Réessayer</button>}
    </div>
  );
}

export function StatusBadge({ map, value }) {
  const [label, tone] = map[value] || [value, ''];
  return <span className={`badge ${tone ? `badge-${tone}` : ''}`}>{label}</span>;
}

/** Badge de la boutique officielle de la plateforme. */
export function OfficialBadge() {
  return (
    <span className="badge badge-gold" title="Boutique officielle Ivoire Style" style={{ verticalAlign: 'middle' }}>
      <FontAwesomeIcon icon={faCircleCheck} /> Officielle
    </span>
  );
}

export function Price({ value, old }) {
  return (
    <span>
      <span className="price">{fmtPrice(value)}</span>
      {old && Number(old) > Number(value) && <span className="price-old">{fmtPrice(old)}</span>}
    </span>
  );
}

export function Stars({ value = 0, count }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  return (
    <span className="stars" aria-label={`Note ${Number(value).toFixed(1)} sur 5`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <FontAwesomeIcon key={i} icon={i < full ? faStar : i === full && half ? faStarHalfStroke : faStarO} />
      ))}
      {count !== undefined && <span className="n">({count})</span>}
    </span>
  );
}

/** Image produit (w : largeur d'affichage, pour que Cloudinary livre une image adaptée). */
export function ProductImage({ src, alt, className, w = 600 }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return <div className={`img-placeholder ${className || ''}`} aria-label={alt}><FontAwesomeIcon icon={faShirt} /></div>;
  }
  const url = isVideoUrl(src) ? videoPoster(src, w) : fileUrl(src, { w });
  return <img src={url} alt={alt} loading="lazy" className={className} onError={() => setFailed(true)} />;
}

/** Photo ou vidéo d'un produit. */
export function ProductMedia({ media, alt, w = 1000 }) {
  if (media?.media_type === 'video' || isVideoUrl(media?.url)) {
    return (
      <video src={fileUrl(media.url)} poster={videoPoster(media.url, w)} controls playsInline preload="metadata"
        style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }} aria-label={alt} />
    );
  }
  return <ProductImage src={media?.url} alt={alt} w={w} />;
}

export function Field({ label, error, hint, required, children, className = '' }) {
  return (
    <div className={`field ${error ? 'has-error' : ''} ${className}`}>
      {label && <label>{label} {required && <span className="req">*</span>}</label>}
      {children}
      {error && <span className="field-error"><FontAwesomeIcon icon={faCircleExclamation} /> {error}</span>}
      {!error && hint && <span className="field-hint">{hint}</span>}
    </div>
  );
}

export function Pagination({ meta, onChange }) {
  if (!meta || meta.pages <= 1) return null;
  const { page, pages } = meta;
  const nums = [];
  for (let i = Math.max(1, page - 2); i <= Math.min(pages, page + 2); i++) nums.push(i);
  return (
    <nav className="pagination" aria-label="Pagination">
      <button disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Page précédente"><FontAwesomeIcon icon={faChevronLeft} /></button>
      {nums.map((n) => <button key={n} className={n === page ? 'on' : ''} onClick={() => onChange(n)}>{n}</button>)}
      <button disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Page suivante"><FontAwesomeIcon icon={faChevronRight} /></button>
    </nav>
  );
}

export function Modal({ title, onClose, children, wide, footer }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`}>
        <div className="flex between mb-2">
          <h3 className="mb-0">{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Fermer"><FontAwesomeIcon icon={faXmark} /></button>
        </div>
        {children}
        {footer && <div className="modal-actions">{footer}</div>}
      </div>
    </div>
  );
}

export function SubmitButton({ loading, children, className = '', ...props }) {
  return (
    <button type="submit" className={`btn ${className}`} disabled={loading || props.disabled} {...props}>
      {loading && <FontAwesomeIcon icon={faSpinner} className="spin" />} {children}
    </button>
  );
}

/** Mini-graphique en barres (ventes par jour). */
export function BarChart({ data, valueKey = 'total', labelKey = 'day', format = fmtPrice }) {
  if (!data?.length) return <p className="muted small">Pas encore de ventes sur la période.</p>;
  const max = Math.max(...data.map((d) => Number(d[valueKey]))) || 1;
  return (
    <div className="bars" role="img" aria-label="Évolution des ventes">
      {data.map((d) => (
        <div className="bar" key={d[labelKey]} title={`${new Date(d[labelKey]).toLocaleDateString('fr-FR')} : ${format(d[valueKey])}`}>
          <div className="fill" style={{ height: `${(Number(d[valueKey]) / max) * 100}%` }} />
          <span className="x">{new Date(d[labelKey]).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}</span>
        </div>
      ))}
    </div>
  );
}

/** Chargement de données : { data, meta, loading, error, reload }. */
export function useFetch(url, params, deps = []) {
  const [state, setState] = useState({ data: null, meta: null, loading: true, error: null });
  const key = JSON.stringify(params || {});
  const load = useCallback(async () => {
    if (!url) return;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const { data } = await api.get(url, { params });
      setState({ data: data.data, meta: data.meta || null, loading: false, error: null });
    } catch (e) {
      setState({ data: null, meta: null, loading: false, error: apiError(e).message });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, key, ...deps]);
  useEffect(() => { load(); }, [load]);
  return { ...state, reload: load, setData: (d) => setState((s) => ({ ...s, data: typeof d === 'function' ? d(s.data) : d })) };
}

/** Formulaire : valeurs, erreurs par champ (renvoyées par l'API) et soumission avec retour utilisateur. */
export function useForm(initial) {
  const { notify } = useFeedback();
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const set = (name) => (e) => {
    const v = e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e;
    setValues((s) => ({ ...s, [name]: v }));
    if (errors[name]) setErrors((s) => ({ ...s, [name]: undefined }));
  };

  /** validate(values) → { champ: message } pour un contrôle côté client avant l'appel API. */
  const submit = (fn, { toastSuccess = true, validate } = {}) => async (e) => {
    e?.preventDefault();
    const clientErrors = validate ? Object.fromEntries(Object.entries(validate(values)).filter(([, v]) => v)) : {};
    if (Object.keys(clientErrors).length) {
      setErrors(clientErrors);
      notify.error(Object.values(clientErrors)[0]);
      return;
    }
    setSubmitting(true);
    setErrors({});
    try {
      const res = await fn(values);
      if (toastSuccess && res?.message) notify.success(res.message);
      return res;
    } catch (err) {
      const { message, errors: fieldErrors } = apiError(err);
      setErrors(fieldErrors);
      notify.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return { values, setValues, set, errors, setErrors, submitting, submit };
}
