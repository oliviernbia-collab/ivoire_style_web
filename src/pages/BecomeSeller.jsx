import { useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faStore, faUserPlus, faRightToBracket, faFileShield, faCircleCheck, faHourglassHalf, faCircleXmark,
  faPaperPlane, faImage, faIdCard, faWallet, faChartLine, faTruckFast, faBullhorn, faHandshake, faBan,
} from '@fortawesome/free-solid-svg-icons';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useFeedback } from '../context/FeedbackContext';
import { Field, Loader, SubmitButton, useFetch, useForm } from '../components/ui';
import { PayoutPicker } from '../components/PaymentLogo';
import { ABIDJAN_COMMUNES, CITIES } from '../utils/format';
import { useSeo } from '../utils/seo';

const BENEFITS = [
  [faStore, 'Votre boutique en ligne', 'Une vitrine à votre nom, visible sur le web et l’application.'],
  [faWallet, 'Paiements sécurisés', 'Vos clients paient en Mobile Money, vous êtes reversé régulièrement.'],
  [faChartLine, 'Tableau de bord', 'Suivez ventes, commandes, stocks et reversements en temps réel.'],
  [faTruckFast, 'Vos livraisons, vos règles', 'Vous livrez vos clients et fixez vos frais de livraison, partout en Côte d’Ivoire.'],
];

function FilePicker({ label, accept, file, onChange, icon, error, hint }) {
  const ref = useRef(null);
  return (
    <Field label={label} error={error} hint={hint}>
      <div className="file-drop" onClick={() => ref.current.click()} role="button" tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && ref.current.click()}>
        <FontAwesomeIcon icon={file ? faCircleCheck : icon} size="lg" className={file ? 'gold' : ''} />
        <div className="small mt-1">{file ? file.name : 'Cliquez pour choisir un fichier'}</div>
      </div>
      <input ref={ref} type="file" accept={accept} hidden onChange={(e) => onChange(e.target.files[0] || null)} />
    </Field>
  );
}

function Intro() {
  return (
    <div className="container section" style={{ maxWidth: 900 }}>
      <div className="center">
        <span className="badge badge-gold"><FontAwesomeIcon icon={faHandshake} /> Devenez partenaire</span>
        <h1 className="brand-title mt-1">Je veux vendre sur Ivoire Style</h1>
        <p className="muted" style={{ maxWidth: 620, margin: '0 auto' }}>Créez votre compte (ou connectez-vous), puis remplissez la demande d’ouverture de boutique. Notre équipe la valide sous 48 h.</p>
        <div className="hero-actions" style={{ justifyContent: 'center' }}>
          <Link to="/inscription?redirect=/vendre" className="btn btn-lg"><FontAwesomeIcon icon={faUserPlus} /> Créer mon compte</Link>
          <Link to="/connexion?redirect=/vendre" className="btn btn-outline btn-lg"><FontAwesomeIcon icon={faRightToBracket} /> J’ai déjà un compte</Link>
        </div>
      </div>
      <Benefits />
    </div>
  );
}

function Benefits() {
  return (
    <div className="features mt-4">
      {BENEFITS.map(([icon, title, text]) => (
        <div key={title} className="feature" style={{ alignItems: 'flex-start' }}>
          <div className="ic"><FontAwesomeIcon icon={icon} /></div>
          <div><b>{title}</b><span>{text}</span></div>
        </div>
      ))}
    </div>
  );
}

function StatusCard({ shop }) {
  if (shop.status === 'pending') {
    return (
      <div className="container section center" style={{ maxWidth: 640 }}>
        <div className="feedback">
          <div className="big-ic warning"><FontAwesomeIcon icon={faHourglassHalf} /></div>
          <h1 style={{ fontSize: '1.5rem' }}>Demande en cours de validation</h1>
          <p className="muted">La boutique <b>{shop.name}</b> est en cours de vérification par notre équipe. Vous recevrez une notification dès qu’elle sera validée.</p>
          <div className="flex" style={{ justifyContent: 'center' }}>
            <Link to="/compte/notifications" className="btn btn-outline">Mes notifications</Link>
            <Link to="/catalogue" className="btn">Continuer mes achats</Link>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="container section center" style={{ maxWidth: 640 }}>
      <div className="feedback">
        <div className="big-ic error"><FontAwesomeIcon icon={faBan} /></div>
        <h1 style={{ fontSize: '1.5rem' }}>Boutique suspendue</h1>
        <p className="muted">{shop.rejection_reason || 'Contactez le support pour plus d’informations.'}</p>
        <Link to="/page/contact" className="btn">Contacter le support</Link>
      </div>
    </div>
  );
}

export default function BecomeSeller() {
  const { user, ready, setUser } = useAuth();
  const { showResult } = useFeedback();
  useSeo({
    title: 'Vendre en ligne sur Ivoire Style',
    description: 'Ouvrez votre boutique de vêtements en ligne en Côte d’Ivoire : paiement Mobile Money, reversement automatique, '
      + 'vous fixez vos prix et vos frais de livraison. Inscription gratuite, validation sous 48 h.',
    path: '/vendre',
  });
  const shopFull = useFetch(user?.shop ? '/seller/shop' : null);
  const { data: pub } = useFetch('/settings/public');
  const fee = pub?.platform_fee_rate ?? 5;
  const [files, setFiles] = useState({ logo: null, document: null });
  const shop = user?.shop;
  const rejected = shop?.status === 'rejected';
  const prev = shopFull.data || {};

  const { values, set, errors, submitting, submit } = useForm({
    shop_name: '', responsible_name: user ? `${user.first_name} ${user.last_name}` : '', phone: user?.phone || '',
    email: user?.email || '', city: 'Abidjan', commune: '', address: '', description: '', rccm: '',
    payout_method: 'orange_money', payout_account: user?.phone || '', payout_holder: '', accept_terms: false,
  });

  if (!ready) return <Loader />;
  if (!user) return <Intro />;
  if (shop?.status === 'approved') return <Navigate to="/vendeur" replace />;
  // Le super admin ouvre la boutique officielle (sans demande ni validation)
  if (!shop && user.roles.includes('admin')) return <Navigate to="/admin/boutique-officielle" replace />;
  if (shop && !rejected) return <StatusCard shop={shop} />;
  if (rejected && shopFull.loading) return <Loader />;

  // Pré-remplissage des champs vides : demande précédente (après un refus), sinon profil de l'utilisateur
  const fromUser = {
    responsible_name: `${user.first_name} ${user.last_name}`, phone: user.phone, email: user.email, payout_account: user.phone,
    payout_holder: `${user.first_name} ${user.last_name}`,
  };
  const v = (k) => values[k] || (rejected ? prev[k === 'shop_name' ? 'name' : k] : fromUser[k]) || '';

  const onSubmit = submit(async () => {
    const fd = new FormData();
    const keys = ['shop_name', 'responsible_name', 'phone', 'email', 'city', 'commune', 'address', 'description', 'rccm', 'payout_method', 'payout_account', 'payout_holder'];
    keys.forEach((k) => fd.append(k, v(k)));
    fd.append('accept_terms', String(values.accept_terms));
    if (files.logo) fd.append('logo', files.logo);
    if (files.document) fd.append('document', files.document);
    const { data } = await api.post('/seller/apply', fd);
    setUser(data.data.user);
    await showResult({
      title: 'Demande envoyée !',
      message: 'Merci ! Notre équipe vérifie votre boutique sous 48 h. Vous serez notifié dès sa validation et pourrez alors publier vos vêtements.',
      icon: faPaperPlane,
      confirmLabel: 'Compris',
    });
  }, {
    toastSuccess: false,
    validate: () => ({
      document: !files.document && !rejected && 'Ajoutez une pièce justificative',
      accept_terms: !values.accept_terms && 'Vous devez accepter les conditions vendeurs',
    }),
  });

  return (
    <div className="container section" style={{ maxWidth: 920 }}>
      <div className="center mb-3">
        <span className="badge badge-gold"><FontAwesomeIcon icon={faStore} /> Espace vendeur</span>
        <h1 className="brand-title mt-1">Je veux vendre sur Ivoire Style</h1>
        <p className="muted">Présentez votre boutique : notre équipe valide chaque vendeur pour garantir la confiance des clients.</p>
      </div>
      {rejected && (
        <div className="alert alert-danger mb-3">
          <FontAwesomeIcon icon={faCircleXmark} />
          <span><b>Votre précédente demande a été refusée.</b> Motif : {shop.rejection_reason}. Corrigez les informations et renvoyez-la.</span>
        </div>
      )}
      <form onSubmit={onSubmit} noValidate className="stack" style={{ gap: 20 }}>
        <section className="card">
          <div className="card-title"><FontAwesomeIcon icon={faStore} /> Votre boutique</div>
          <div className="form-grid">
            <Field label="Nom commercial" error={errors.shop_name} required>
              <input className="input" value={v('shop_name')} onChange={set('shop_name')} placeholder="Ex. : Maison Akwaba" />
            </Field>
            <Field label="Nom du responsable" error={errors.responsible_name} required>
              <input className="input" value={v('responsible_name')} onChange={set('responsible_name')} />
            </Field>
            <Field label="Description de la boutique" error={errors.description} required className="full" hint="Votre spécialité, votre style, vos atouts (20 caractères min.)">
              <textarea className="textarea" value={v('description')} onChange={set('description')} maxLength={2000} />
            </Field>
            <FilePicker label="Logo (facultatif)" accept="image/png,image/jpeg,image/webp" icon={faImage} file={files.logo}
              onChange={(f) => setFiles((s) => ({ ...s, logo: f }))} hint="JPG, PNG ou WEBP – 5 Mo max" />
            <Field label="N° RCCM (facultatif)" error={errors.rccm}>
              <input className="input" value={v('rccm')} onChange={set('rccm')} placeholder="CI-ABJ-..." />
            </Field>
          </div>
        </section>

        <section className="card">
          <div className="card-title"><FontAwesomeIcon icon={faIdCard} /> Coordonnées</div>
          <div className="form-grid">
            <Field label="Téléphone" error={errors.phone} required><input className="input" type="tel" value={v('phone')} onChange={set('phone')} /></Field>
            <Field label="E-mail professionnel" error={errors.email} required><input className="input" type="email" value={v('email')} onChange={set('email')} /></Field>
            <Field label="Ville" error={errors.city} required>
              <input className="input" list="s-cities" value={v('city')} onChange={set('city')} />
              <datalist id="s-cities">{CITIES.map((c) => <option key={c} value={c} />)}</datalist>
            </Field>
            <Field label="Commune" error={errors.commune}>
              <input className="input" list="s-communes" value={v('commune')} onChange={set('commune')} />
              <datalist id="s-communes">{ABIDJAN_COMMUNES.map((c) => <option key={c} value={c} />)}</datalist>
            </Field>
            <Field label="Adresse de l’atelier / boutique" error={errors.address} className="full">
              <input className="input" value={v('address')} onChange={set('address')} />
            </Field>
          </div>
        </section>

        <section className="card">
          <div className="card-title"><FontAwesomeIcon icon={faFileShield} /> Justificatif et reversements</div>
          <div className="form-grid">
            <FilePicker label="Pièce d’identité ou RCCM" accept="image/png,image/jpeg,image/webp,application/pdf" icon={faFileShield}
              file={files.document} error={errors.document} onChange={(f) => setFiles((s) => ({ ...s, document: f }))}
              hint={rejected ? 'Facultatif si déjà fourni' : 'PDF ou image – stocké de façon privée et sécurisée'} />
            <div className="stack">
              <Field label="Mode de reversement" error={errors.payout_method} required>
                <PayoutPicker value={v('payout_method')} onChange={set('payout_method')} />
              </Field>
              <Field label="Numéro / compte de reversement" error={errors.payout_account} required>
                <input className="input" value={v('payout_account')} onChange={set('payout_account')} />
              </Field>
              <Field label="Nom du titulaire du compte" error={errors.payout_holder}>
                <input className="input" value={v('payout_holder')} onChange={set('payout_holder')} />
              </Field>
            </div>
          </div>
          <div className="alert alert-gold small mt-2">
            <FontAwesomeIcon icon={faBullhorn} />
            <span>Vous fixez votre prix : la plateforme ajoute {fee} % payés par le client, et retient {pub?.seller_commission_rate ?? 5} % de
              commission sur votre prix au reversement (votre livraison vous revient en totalité).
              Vous gérez vos livraisons et vos frais de livraison. Les montants payés en ligne sont reversés sur ce compte après livraison.</span>
          </div>
        </section>

        <Field error={errors.accept_terms}>
          <label className="check"><input type="checkbox" checked={values.accept_terms} onChange={set('accept_terms')} />
            <span>J’accepte les <Link to="/page/conditions-vendeurs" target="_blank" className="gold">conditions vendeurs</Link> et certifie l’exactitude des informations fournies.</span>
          </label>
        </Field>
        <div className="center">
          <SubmitButton loading={submitting} className="btn-lg"><FontAwesomeIcon icon={faPaperPlane} /> Envoyer ma demande</SubmitButton>
        </div>
      </form>
      <Benefits />
    </div>
  );
}
