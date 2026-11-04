import { Link, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCompass, faEnvelope, faPhone, faLocationDot, faPaperPlane } from '@fortawesome/free-solid-svg-icons';
import { Empty, Field, SubmitButton, useForm } from '../components/ui';
import { useFeedback } from '../context/FeedbackContext';
import { useSeo } from '../utils/seo';

// Contenus indicatifs : à faire valider juridiquement avant le lancement.
const PAGES = {
  'a-propos': ['À propos', [
    ['Notre mission', 'Ivoire Style est la marketplace dédiée à la mode en Côte d’Ivoire. Nous rapprochons les clients des meilleures boutiques et créateurs du pays : tenues africaines, prêt-à-porter, sport, cérémonie et vêtements pour enfants.'],
    ['Notre promesse', 'Des boutiques vérifiées, des paiements Mobile Money sécurisés, une livraison suivie et un service client à l’écoute. Votre style, votre signature.'],
  ]],
  faq: ['Questions fréquentes', [
    ['Comment passer commande ?', 'Choisissez vos articles, sélectionnez taille et couleur, ajoutez-les au panier puis validez votre adresse, le mode de livraison et le paiement.'],
    ['Quels moyens de paiement acceptez-vous ?', 'Orange Money, MTN MoMo, Wave, Moov Money et, selon les cas, le paiement à la livraison. Une commande n’est confirmée qu’après validation du paiement par l’opérateur.'],
    ['Quels sont les délais de livraison ?', 'En général 24 à 72 h à Abidjan et 2 à 5 jours à l’intérieur du pays, selon la boutique et le transporteur.'],
    ['Comment devenir vendeur ?', 'Cliquez sur « Je veux vendre sur Ivoire Style », créez votre compte et remplissez la demande. Notre équipe valide les boutiques sous 48 h.'],
    ['Puis-je annuler ma commande ?', 'Oui, tant qu’elle n’est pas en préparation. Après livraison, une demande de retour est possible sous 7 jours.'],
  ]],
  livraison: ['Livraison', [
    ['Zones', 'Nous livrons dans tout le district d’Abidjan et dans les principales villes de Côte d’Ivoire.'],
    ['Modes', 'Livraison à domicile, au bureau, en point de retrait ou retrait directement en boutique lorsque disponible.'],
    ['Frais', 'Les frais dépendent de la zone et du mode choisis. Ils sont calculés automatiquement et affichés avant le paiement. La livraison peut être offerte au-delà d’un certain montant.'],
  ]],
  retours: ['Retours et remboursements', [
    ['Délai', 'Vous disposez de 7 jours après la livraison pour demander un retour depuis votre espace « Mes commandes ».'],
    ['Conditions', 'Les articles doivent être non portés, non lavés et dans leur état d’origine. Les articles personnalisés ou sur mesure peuvent être exclus.'],
    ['Remboursement', 'Après réception et contrôle, le remboursement est effectué sur le moyen de paiement d’origine.'],
    ['Annulation', 'Une commande payée peut être annulée tant qu’elle n’est pas en préparation. La somme payée en ligne est remboursée automatiquement '
      + 'sur le numéro Mobile Money que vous confirmez, après déduction de 3 % de frais de remboursement conservés par Ivoire Style.'],
  ]],
  cgu: ['Conditions d’utilisation', [
    ['Objet', 'Les présentes conditions encadrent l’utilisation du site et de l’application Ivoire Style.'],
    ['Compte', 'L’utilisateur est responsable de la confidentialité de ses identifiants et de l’exactitude des informations fournies.'],
    ['Comportement', 'Tout usage frauduleux, abusif ou contraire à la loi peut entraîner la suspension du compte.'],
  ]],
  cgv: ['Conditions de vente', [
    ['Prix', 'Les prix sont indiqués en francs CFA (XOF), toutes taxes comprises. Le montant final est recalculé et confirmé au moment de la commande.'],
    ['Commande', 'La commande est ferme après confirmation du paiement par l’opérateur ou, pour le paiement à la livraison, après validation.'],
    ['Vendeurs', 'Les articles sont vendus par des boutiques partenaires. Ivoire Style agit en qualité d’intermédiaire et de garant du parcours d’achat.'],
  ]],
  confidentialite: ['Politique de confidentialité', [
    ['Données collectées', 'Nom, prénom, e-mail, téléphone, adresses de livraison et historique de commandes, strictement nécessaires au service.'],
    ['Sécurité', 'Mots de passe chiffrés, échanges sécurisés, documents vendeurs stockés de façon privée. Nous ne stockons jamais votre code PIN Mobile Money.'],
    ['Vos droits', 'Vous pouvez consulter, modifier ou supprimer vos données depuis votre compte, conformément à la réglementation ivoirienne.'],
  ]],
  'conditions-vendeurs': ['Conditions vendeurs', [
    ['Validation', 'Chaque boutique est vérifiée (identité ou RCCM) avant activation. Les produits peuvent être soumis à validation avant publication.'],
    ['Commission', 'Une commission (10 % par défaut) est prélevée sur chaque vente livrée. Le taux applicable est indiqué dans votre espace vendeur.'],
    ['Reversements', 'Les gains nets sont reversés sur le compte Mobile Money ou bancaire indiqué, avec une référence traçable.'],
    ['Engagements', 'Le vendeur s’engage à proposer des articles conformes aux descriptions, à maintenir ses stocks à jour et à préparer les commandes rapidement.'],
  ]],
};

function Contact() {
  const { showResult } = useFeedback();
  const { values, set, setValues, submitting, submit } = useForm({ name: '', email: '', message: '' });
  const onSubmit = submit(async () => {
    await new Promise((r) => setTimeout(r, 400));
    setValues({ name: '', email: '', message: '' });
    await showResult({ title: 'Message envoyé', message: 'Merci ! Notre service client vous répondra rapidement.', icon: faPaperPlane });
  }, { toastSuccess: false, validate: (v) => ({ message: v.message.trim().length < 10 && 'Votre message est trop court' }) });
  return (
    <div className="two-col" style={{ paddingTop: 0 }}>
      <form className="card stack" onSubmit={onSubmit} noValidate>
        <Field label="Nom" required><input className="input" value={values.name} onChange={set('name')} required /></Field>
        <Field label="E-mail" required><input className="input" type="email" value={values.email} onChange={set('email')} required /></Field>
        <Field label="Message" required><textarea className="textarea" value={values.message} onChange={set('message')} /></Field>
        <SubmitButton loading={submitting}><FontAwesomeIcon icon={faPaperPlane} /> Envoyer</SubmitButton>
      </form>
      <div className="card small stack">
        <span><FontAwesomeIcon icon={faPhone} className="gold" /> +225 07 12176799</span>
        <span><FontAwesomeIcon icon={faEnvelope} className="gold" /> contact@ivoirestyle.ci</span>
        <span><FontAwesomeIcon icon={faLocationDot} className="gold" /> Cocody, Abidjan</span>
      </div>
    </div>
  );
}

export default function StaticPage() {
  const { slug } = useParams();
  const page = PAGES[slug];
  // FAQ : questions / réponses balisées pour les résultats enrichis Google
  const faqLd = slug === 'faq' && page ? {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: page[1].map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  } : null;
  useSeo(slug === 'contact'
    ? { title: 'Contact', description: 'Contactez le service client Ivoire Style : téléphone +225 07 12176799, e-mail contact@ivoirestyle.ci, Cocody, Abidjan.', path: '/page/contact' }
    : page ? { title: page[0], description: page[1].map(([, t]) => t).join(' '), path: `/page/${slug}`, jsonLd: faqLd }
      : { title: 'Page introuvable', noindex: true });
  if (slug === 'contact') {
    return <div className="container section"><h1 className="brand-title">Contact</h1><Contact /></div>;
  }
  if (!page) return <NotFound />;
  const [title, sections] = page;
  return (
    <div className="container section prose">
      <h1 className="brand-title">{title}</h1>
      {sections.map(([h, t]) => <div key={h}><h2>{h}</h2><p>{t}</p></div>)}
    </div>
  );
}

export function NotFound() {
  useSeo({ title: 'Page introuvable', noindex: true });
  return (
    <div className="container">
      <Empty icon={faCompass} title="Page introuvable" text="La page que vous cherchez n’existe pas ou a été déplacée.">
        <Link to="/" className="btn">Retour à l’accueil</Link>
      </Empty>
    </div>
  );
}
