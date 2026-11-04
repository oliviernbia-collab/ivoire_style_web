import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTruckFast, faShieldHalved, faRotateLeft, faHeadset, faStore, faEnvelope, faPhone, faLocationDot } from '@fortawesome/free-solid-svg-icons';
import { faFacebookF, faInstagram, faTiktok, faWhatsapp } from '@fortawesome/free-brands-svg-icons';
import logo from '../assets/logo.png';
import PaymentLogo from './PaymentLogo';
import { fileUrl } from '../api/client';

export function Features() {
  const items = [
    [faTruckFast, 'Livraison rapide', 'Abidjan et toute la Côte d’Ivoire'],
    [faShieldHalved, 'Paiement sécurisé', 'Orange, MTN, Wave, Moov'],
    [faRotateLeft, 'Retours faciles', '7 jours après livraison'],
    [faHeadset, 'Service client', 'À votre écoute 7j/7'],
  ];
  return (
    <div className="features">
      {items.map(([icon, title, text]) => (
        <div className="feature" key={title}>
          <div className="ic"><FontAwesomeIcon icon={icon} /></div>
          <div><b>{title}</b><span>{text}</span></div>
        </div>
      ))}
    </div>
  );
}

/** Pied de page de la vitrine d'une boutique (lien partagé par le vendeur). */
export function StorefrontFooter({ shop, onExit }) {
  return (
    <footer className="footer">
      <div className="container flex between flex-wrap" style={{ padding: '24px 16px' }}>
        <div className="flex">
          <div className="shop-logo" style={{ width: 44, height: 44, fontSize: '1rem' }}>{shop.logo_url ? <img src={fileUrl(shop.logo_url, { w: 100 })} alt="" /> : shop.name[0]}</div>
          <div>
            <b>{shop.name}</b>
            <div className="small muted">{shop.city}{shop.commune ? `, ${shop.commune}` : ''} · paiement sécurisé par Ivoire Style</div>
          </div>
        </div>
        <div className="pay-row">
          {['orange_money', 'mtn_momo', 'wave', 'moov_money'].map((c) => <PaymentLogo key={c} code={c} size={26} wide />)}
        </div>
      </div>
      <div className="footer-bottom">
        <div className="container flex between flex-wrap">
          <span className="flex" style={{ gap: 6 }}><img src={logo} alt="" style={{ height: 22 }} /> Boutique propulsée par Ivoire Style</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onExit}>Découvrir toute la marketplace</button>
        </div>
      </div>
    </footer>
  );
}

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <img src={logo} alt="Ivoire Style" style={{ height: 70 }} />
          <p className="muted small mt-2">La marketplace de la mode ivoirienne : tenues africaines, prêt-à-porter, sport et cérémonie, par des boutiques vérifiées.</p>
          <div className="socials">
            {[faFacebookF, faInstagram, faTiktok, faWhatsapp].map((ic, i) => (
              <a key={i} href="#" className="icon-btn" aria-label="Réseau social"><FontAwesomeIcon icon={ic} /></a>
            ))}
          </div>
        </div>
        <div>
          <h4>Acheter</h4>
          <ul>
            <li><Link to="/catalogue">Tout le catalogue</Link></li>
            <li><Link to="/catalogue?new=1">Nouveautés</Link></li>
            <li><Link to="/catalogue?promo=1">Promotions</Link></li>
            <li><Link to="/boutiques">Boutiques</Link></li>
            <li><Link to="/page/livraison">Livraison</Link></li>
            <li><Link to="/page/retours">Retours et remboursements</Link></li>
          </ul>
        </div>
        <div>
          <h4>Vendre</h4>
          <ul>
            <li><Link to="/vendre"><FontAwesomeIcon icon={faStore} className="gold" /> Je veux vendre sur Ivoire Style</Link></li>
            <li><Link to="/page/conditions-vendeurs">Conditions vendeurs</Link></li>
            <li><Link to="/page/faq">FAQ</Link></li>
          </ul>
          <h4 className="mt-3">Informations</h4>
          <ul>
            <li><Link to="/page/a-propos">À propos</Link></li>
            <li><Link to="/page/cgu">Conditions d’utilisation</Link></li>
            <li><Link to="/page/cgv">Conditions de vente</Link></li>
            <li><Link to="/page/confidentialite">Confidentialité</Link></li>
          </ul>
        </div>
        <div>
          <h4>Contact</h4>
          <ul>
            <li><FontAwesomeIcon icon={faLocationDot} className="gold" /> Cocody, Abidjan – Côte d’Ivoire</li>
            <li><FontAwesomeIcon icon={faPhone} className="gold" /> <a href="tel:+2250712176799">+225 07 12176799</a></li>
            <li><FontAwesomeIcon icon={faEnvelope} className="gold" /> contact@ivoirestyle.ci</li>
            <li><Link to="/page/contact">Nous écrire</Link></li>
          </ul>
          <h4 className="mt-3">Paiement sécurisé</h4>
          <div className="pay-row">
            {['orange_money', 'mtn_momo', 'wave', 'moov_money'].map((c) => <PaymentLogo key={c} code={c} size={30} wide />)}
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <div className="container flex between flex-wrap">
          <span>© {new Date().getFullYear()} Ivoire Style — Votre style, votre signature.</span>
          <span>Prix en FCFA (XOF)</span>
        </div>
      </div>
    </footer>
  );
}
