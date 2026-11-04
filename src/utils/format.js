const fcfa = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

export const price = (v) => `${fcfa.format(Math.round(Number(v || 0)))} FCFA`;

export const date = (d, withTime = false) => {
  if (!d) return '';
  return new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
};

export const initials = (u) => `${u?.first_name?.[0] || ''}${u?.last_name?.[0] || ''}`.toUpperCase();

export const ORDER_STATUS = {
  pending: ['En attente de paiement', 'warning'],
  confirmed: ['Confirmée', 'info'],
  preparing: ['En préparation', 'info'],
  ready: ['Prête à expédier', 'info'],
  shipped: ['Expédiée', 'gold'],
  in_delivery: ['En livraison', 'gold'],
  delivered: ['Livrée', 'success'],
  cancelled: ['Annulée', 'danger'],
  return_requested: ['Retour demandé', 'warning'],
  return_accepted: ['Retour accepté', 'info'],
  return_rejected: ['Retour refusé', 'danger'],
  refunding: ['Remboursement en cours', 'warning'],
  refunded: ['Remboursée', 'success'],
  partially_refunded: ['Partiellement remboursée', 'warning'],
};

export const PAYMENT_STATUS = {
  initiated: ['Initié', 'warning'],
  pending: ['En attente', 'warning'],
  partially_paid: ['Acompte payé', 'gold'],
  succeeded: ['Payé', 'success'],
  failed: ['Échoué', 'danger'],
  cancelled: ['Annulé', 'danger'],
  refunding: ['Remboursement en cours', 'warning'],
  partially_refunded: ['Partiellement remboursé', 'warning'],
  refunded: ['Remboursé', 'info'],
};

// Statuts de paiement qui ne font que répéter le statut de la commande (ex. « Annulée » + « Annulé »)
const PAYMENT_REPEATS_ORDER = {
  cancelled: ['cancelled', 'failed', 'pending', 'initiated'],
  refunding: ['refunding'],
  refunded: ['refunded'],
  partially_refunded: ['partially_refunded'],
};
/** Faut-il afficher le badge de paiement à côté du statut de la commande ? */
export const showPaymentStatus = (o) => !(PAYMENT_REPEATS_ORDER[o.status] || []).includes(o.payment_status);

export const PRODUCT_STATUS = {
  draft: ['Brouillon', ''],
  pending: ['En validation', 'warning'],
  published: ['En ligne', 'success'],
  rejected: ['Refusé', 'danger'],
  disabled: ['Désactivé', ''],
};

export const SHOP_STATUS = {
  pending: ['En attente', 'warning'],
  approved: ['Validée', 'success'],
  rejected: ['Refusée', 'danger'],
  suspended: ['Suspendue', 'danger'],
};

export const PAYMENT_METHODS = {
  orange_money: { label: 'Orange Money', color: '#FF7900' },
  mtn_momo: { label: 'MTN MoMo', color: '#FFCB05' },
  wave: { label: 'Wave', color: '#1DC8F2' },
  moov_money: { label: 'Moov Money', color: '#0066B3' },
  card: { label: 'Carte bancaire', color: '#1C1C1C' },
  cash_on_delivery: { label: 'Paiement à la livraison', color: '#2E7D4F' },
};

export const PAYOUT_METHODS = {
  orange_money: 'Orange Money',
  mtn_momo: 'MTN MoMo',
  wave: 'Wave',
  moov_money: 'Moov Money',
  bank: 'Virement bancaire',
};

export const DELIVERY_MODES = {
  home: 'Livraison à domicile',
  office: 'Livraison au bureau',
  pickup_point: 'Point de retrait',
  shop_pickup: 'Retrait en boutique',
};

/** Modes de paiement : le solde éventuel est réglé au vendeur à la livraison. */
export const PAYMENT_PLANS = {
  full: 'Totalité en ligne',
  half: 'Moitié en ligne, le reste à la livraison',
  deposit: 'Paiement à la livraison (acompte en ligne)',
};

export const AUDIENCES = {
  homme: 'Homme', femme: 'Femme', enfant: 'Enfant', bebe: 'Bébé', unisexe: 'Unisexe',
};

export const CITIES = ['Abidjan', 'Abengourou', 'Aboisso', 'Adzopé', 'Agboville', 'Agnibilékrou', 'Bondoukou', 'Bongouanou', 'Bouaflé', 'Bouaké', 'Bouna', 'Boundiali', 'Dabou', 'Daloa', 'Danané', 'Daoukro', 'Dimbokro', 'Divo', 'Duékoué', 'Ferkessédougou', 'Gagnoa', 'Grand-Bassam', 'Grand-Lahou', 'Guiglo', 'Issia', 'Jacqueville', 'Katiola', 'Korhogo', 'Lakota', 'Man', 'Mankono', 'Odienné', 'Oumé', 'San-Pédro', 'Sassandra', 'Séguéla', 'Sinfra', 'Soubré', 'Tabou', 'Tanda', 'Tiassalé', 'Tingréla', 'Touba', 'Toumodi', 'Vavoua', 'Yamoussoukro', 'Zuénoula'];
export const ABIDJAN_COMMUNES = ['Abobo', 'Adjamé', 'Attécoubé', 'Cocody', 'Koumassi', 'Marcory', 'Plateau', 'Port-Bouët', 'Treichville', 'Yopougon', 'Bingerville', 'Songon', 'Anyama'];
