import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEnvelope, faLock, faEye, faEyeSlash, faUser, faPhone, faRightToBracket, faUserPlus, faKey, faCircleCheck,
} from '@fortawesome/free-solid-svg-icons';
import logo from '../assets/logo.png';
import api, { apiError, tokens } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useFeedback } from '../context/FeedbackContext';
import { ErrorState, Field, Loader, SubmitButton, useForm } from '../components/ui';

function AuthShell({ children, title, subtitle }) {
  return (
    <div className="auth-page">
      <div className="auth-side">
        <img src={logo} alt="Ivoire Style" />
        <p className="muted mt-3" style={{ maxWidth: 380 }}>Rejoignez la communauté Ivoire Style : achetez auprès de boutiques vérifiées ou ouvrez la vôtre.</p>
      </div>
      <div className="auth-form">
        <div className="box">
          <h1 className="brand-title">{title}</h1>
          {subtitle && <p className="muted">{subtitle}</p>}
          {children}
        </div>
      </div>
    </div>
  );
}

function PasswordInput({ value, onChange, id, autoComplete, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div className="input-icon">
      <FontAwesomeIcon icon={faLock} />
      <input id={id} className="input" type={show ? 'text' : 'password'} value={value} onChange={onChange} autoComplete={autoComplete} placeholder={placeholder} />
      <button type="button" className="toggle" onClick={() => setShow((s) => !s)} aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
        <FontAwesomeIcon icon={show ? faEyeSlash : faEye} />
      </button>
    </div>
  );
}

const useRedirect = () => {
  const [params] = useSearchParams();
  const r = params.get('redirect');
  return r && r.startsWith('/') ? r : '/';
};

export function Login() {
  const { login } = useAuth();
  const { reload } = useCart();
  const navigate = useNavigate();
  const redirect = useRedirect();
  const { values, set, errors, submitting, submit } = useForm({ login: '', password: '' });

  const onSubmit = submit(async (v) => {
    const res = await login(v.login, v.password);
    await reload();
    navigate(redirect, { replace: true });
    return { message: `Bon retour parmi nous, ${res.user.first_name} !` };
  });

  return (
    <AuthShell title="Connexion" subtitle="Accédez à votre compte Ivoire Style.">
      <form className="stack" onSubmit={onSubmit} noValidate>
        <Field label="E-mail ou téléphone" error={errors.login} required>
          <div className="input-icon"><FontAwesomeIcon icon={faEnvelope} />
            <input className="input" value={values.login} onChange={set('login')} autoComplete="username" placeholder="exemple@mail.com" />
          </div>
        </Field>
        <Field label="Mot de passe" error={errors.password} required>
          <PasswordInput value={values.password} onChange={set('password')} autoComplete="current-password" />
        </Field>
        <div className="flex between"><span /><Link to="/mot-de-passe-oublie" className="small gold">Mot de passe oublié ?</Link></div>
        <SubmitButton loading={submitting} className="btn-block btn-lg"><FontAwesomeIcon icon={faRightToBracket} /> Se connecter</SubmitButton>
        <p className="center muted small">Pas encore de compte ? <Link className="gold" to={`/inscription${redirect !== '/' ? `?redirect=${encodeURIComponent(redirect)}` : ''}`}><b>Créer un compte</b></Link></p>
      </form>
    </AuthShell>
  );
}

export function Register() {
  const { register } = useAuth();
  const { showResult } = useFeedback();
  const navigate = useNavigate();
  const redirect = useRedirect();
  const { values, set, errors, submitting, submit } = useForm({
    first_name: '', last_name: '', email: '', phone: '', password: '', confirm: '', accept: false,
  });

  const onSubmit = submit(async (v) => {
    const { confirm: _c, accept: _a, ...form } = v;
    const res = await register(form);
    await showResult({
      title: `Bienvenue ${res.user.first_name} !`,
      message: 'Votre compte Ivoire Style a été créé avec succès.',
      confirmLabel: redirect === '/vendre' ? 'Continuer ma demande vendeur' : 'Découvrir les collections',
    });
    navigate(redirect === '/' ? '/catalogue' : redirect, { replace: true });
  }, {
    toastSuccess: false,
    validate: (v) => ({
      confirm: v.password !== v.confirm && 'Les mots de passe ne correspondent pas',
      accept: !v.accept && 'Veuillez accepter les conditions d’utilisation',
    }),
  });

  return (
    <AuthShell title="Créer un compte" subtitle="Inscription gratuite en moins d’une minute.">
      <form className="form-grid" onSubmit={onSubmit} noValidate>
        <Field label="Prénom" error={errors.first_name} required>
          <div className="input-icon"><FontAwesomeIcon icon={faUser} /><input className="input" value={values.first_name} onChange={set('first_name')} autoComplete="given-name" /></div>
        </Field>
        <Field label="Nom" error={errors.last_name} required>
          <input className="input" value={values.last_name} onChange={set('last_name')} autoComplete="family-name" />
        </Field>
        <Field label="E-mail" error={errors.email} required className="full">
          <div className="input-icon"><FontAwesomeIcon icon={faEnvelope} /><input className="input" type="email" value={values.email} onChange={set('email')} autoComplete="email" /></div>
        </Field>
        <Field label="Téléphone" error={errors.phone} required className="full" hint="Ex. : 07 07 07 07 07">
          <div className="input-icon"><FontAwesomeIcon icon={faPhone} /><input className="input" type="tel" value={values.phone} onChange={set('phone')} autoComplete="tel" /></div>
        </Field>
        <Field label="Mot de passe" error={errors.password} required hint="8 caractères min., lettres et chiffres">
          <PasswordInput value={values.password} onChange={set('password')} autoComplete="new-password" />
        </Field>
        <Field label="Confirmation" error={errors.confirm} required>
          <PasswordInput value={values.confirm} onChange={set('confirm')} autoComplete="new-password" />
        </Field>
        <Field error={errors.accept} className="full">
          <label className="check"><input type="checkbox" checked={values.accept} onChange={set('accept')} />
            <span>J’accepte les <Link to="/page/cgu" className="gold" target="_blank">conditions d’utilisation</Link> et la <Link to="/page/confidentialite" className="gold" target="_blank">politique de confidentialité</Link>.</span>
          </label>
        </Field>
        <div className="full stack">
          <SubmitButton loading={submitting} className="btn-block btn-lg"><FontAwesomeIcon icon={faUserPlus} /> Créer mon compte</SubmitButton>
          <p className="center muted small mb-0">Déjà inscrit ? <Link className="gold" to={`/connexion${redirect !== '/' ? `?redirect=${encodeURIComponent(redirect)}` : ''}`}><b>Se connecter</b></Link></p>
        </div>
      </form>
    </AuthShell>
  );
}

export function ForgotPassword() {
  const { showResult } = useFeedback();
  const [devLink, setDevLink] = useState(null);
  const { values, set, errors, submitting, submit } = useForm({ email: '' });
  const onSubmit = submit(async (v) => {
    const { data } = await api.post('/auth/forgot-password', v);
    setDevLink(data.data?.dev_reset_link || null);
    await showResult({ title: 'Vérifiez vos e-mails', message: data.message, icon: faEnvelope, type: 'info', confirmLabel: 'Compris' });
  }, { toastSuccess: false });
  return (
    <AuthShell title="Mot de passe oublié" subtitle="Saisissez votre e-mail pour recevoir un lien de réinitialisation.">
      <form className="stack" onSubmit={onSubmit} noValidate>
        <Field label="E-mail" error={errors.email} required>
          <div className="input-icon"><FontAwesomeIcon icon={faEnvelope} /><input className="input" type="email" value={values.email} onChange={set('email')} /></div>
        </Field>
        <SubmitButton loading={submitting} className="btn-block"><FontAwesomeIcon icon={faKey} /> Envoyer le lien</SubmitButton>
        {devLink && (
          <div className="alert alert-gold small"><span>Mode développement : <a className="gold" href={devLink}><b>ouvrir le lien de réinitialisation</b></a></span></div>
        )}
        <Link to="/connexion" className="center small gold">Retour à la connexion</Link>
      </form>
    </AuthShell>
  );
}

export function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { showResult } = useFeedback();
  const { values, set, errors, submitting, submit } = useForm({ password: '' });
  const onSubmit = submit(async (v) => {
    const { data } = await api.post('/auth/reset-password', { token: params.get('token'), password: v.password });
    await showResult({ title: 'Mot de passe modifié', message: data.message, icon: faCircleCheck, confirmLabel: 'Se connecter' });
    navigate('/connexion');
  }, { toastSuccess: false });
  return (
    <AuthShell title="Nouveau mot de passe">
      <form className="stack" onSubmit={onSubmit} noValidate>
        <Field label="Nouveau mot de passe" error={errors.password || errors.token} required hint="8 caractères min., lettres et chiffres">
          <PasswordInput value={values.password} onChange={set('password')} autoComplete="new-password" />
        </Field>
        <SubmitButton loading={submitting} className="btn-block">Enregistrer</SubmitButton>
      </form>
    </AuthShell>
  );
}

/**
 * Arrivée depuis l'application mobile (« Ouvrir l'espace vendeur web ») : le code à usage unique, placé après le #
 * (jamais envoyé au serveur web ni gardé dans l'historique), est échangé contre une session du compte de l'application.
 * Une éventuelle autre session ouverte dans ce navigateur est fermée.
 */
export function AppHandoff() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return; // une seule tentative (le code ne sert qu'une fois)
    started.current = true;
    const code = window.location.hash.slice(1);
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    const raw = params.get('next') || '/vendeur';
    const next = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/vendeur';
    if (!/^[a-f0-9]{64}$/.test(code)) { setError('Lien de connexion invalide. Rouvrez-le depuis l’application.'); return; }
    (async () => {
      if (tokens.refresh) {
        await api.post('/auth/logout', { refresh_token: tokens.refresh }).catch(() => {});
        tokens.clear();
      }
      try {
        const { data } = await api.post('/auth/handoff/redeem', { code });
        tokens.set(data.data);
        setUser(data.data.user);
        navigate(next, { replace: true });
      } catch (e) {
        setUser(null);
        setError(apiError(e));
      }
    })();
  }, [params, navigate, setUser]);

  if (!error) return <Loader label="Connexion à votre compte…" />;
  return (
    <div className="container" style={{ maxWidth: 520, padding: '48px 16px' }}>
      <ErrorState message={error} />
      <div className="mt-2" style={{ textAlign: 'center' }}><Link to="/connexion" className="btn">Se connecter</Link></div>
    </div>
  );
}
