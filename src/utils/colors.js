/**
 * Teinte d'une couleur saisie en toutes lettres (« Bleu marine », « bordeaux », « #1E3A5F »…),
 * pour remplir automatiquement la pastille de couleur des variantes. Renvoie null si inconnue.
 */
const NAMED = {
  noir: '#111111', blanc: '#FFFFFF', 'blanc casse': '#F4F1EA', ecru: '#F3EBDD', creme: '#F5EBD7', ivoire: '#FFFDF0',
  gris: '#8A8A8A', 'gris clair': '#C8C8C8', 'gris fonce': '#4A4A4A', anthracite: '#383E42', argent: '#C0C0C0', argente: '#C0C0C0',
  rouge: '#D32F2F', bordeaux: '#7B1E2B', cerise: '#B71C3B', framboise: '#C72C5B', corail: '#FF7F50', saumon: '#FA8072',
  rose: '#F48FB1', 'rose pale': '#F8C8D8', 'vieux rose': '#C08081', fuchsia: '#D81B8C', magenta: '#C2185B',
  orange: '#F57C00', peche: '#FFCBA4', abricot: '#F6A96B', mandarine: '#F37A1F',
  jaune: '#FBC02D', moutarde: '#D4A017', or: '#C9A227', dore: '#C9A227', 'jaune pale': '#FFF3A6',
  vert: '#2E7D32', 'vert clair': '#81C784', 'vert fonce': '#1B5E20', 'vert olive': '#6B7A2A', olive: '#6B7A2A',
  kaki: '#8A7F4E', menthe: '#98D8C1', emeraude: '#1F9D6B', 'vert sapin': '#1F4D3A', 'vert bouteille': '#0F4D2E',
  bleu: '#1E63C4', 'bleu clair': '#7FB3E6', 'bleu ciel': '#87CEEB', 'bleu marine': '#1A2A4F', marine: '#1A2A4F',
  'bleu roi': '#2A4BD7', 'bleu nuit': '#14213D', 'bleu canard': '#0F5E6E', 'bleu electrique': '#2C75FF',
  turquoise: '#1ABC9C', cyan: '#00BCD4', indigo: '#3F3D99', jean: '#4A6A8F',
  violet: '#7B3FA0', mauve: '#B784A7', lilas: '#C8A2C8', lavande: '#B9A6E0', prune: '#6E2C5A', aubergine: '#4B1E3C',
  marron: '#6D4C41', chocolat: '#4E2A1E', camel: '#C19A6B', caramel: '#B5651D', cognac: '#9A4E1C', taupe: '#8B7D6B',
  beige: '#D8C3A5', sable: '#D9C4A0', nude: '#E3BC9A', bronze: '#9C6B30', cuivre: '#B87333', rouille: '#A0461F',
  terracotta: '#C8643B', brique: '#A7402C',
};
const KEYS = Object.keys(NAMED).sort((a, b) => b.length - a.length); // « bleu marine » avant « bleu »

const normalize = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9#\s]/g, ' ').replace(/\s+/g, ' ').trim();

let ctx;
/** Couleur CSS (anglais : navy, gold…) reconnue par le navigateur. */
function cssColor(name) {
  try {
    ctx ??= document.createElement('canvas').getContext('2d');
    ctx.fillStyle = '#010203';
    ctx.fillStyle = name;
    const v = ctx.fillStyle;
    return v === '#010203' ? null : v.toUpperCase();
  } catch {
    return null;
  }
}

export function colorFromName(input) {
  const raw = String(input || '').trim();
  const hex = raw.match(/#?([0-9a-f]{6}|[0-9a-f]{3})\b/i);
  if (hex && (raw.startsWith('#') || /^[0-9a-f]{6}$/i.test(raw))) {
    const h = hex[1].length === 3 ? hex[1].split('').map((c) => c + c).join('') : hex[1];
    return `#${h.toUpperCase()}`;
  }
  const n = normalize(raw);
  if (!n) return null;
  if (NAMED[n]) return NAMED[n];
  const key = KEYS.find((k) => ` ${n} `.includes(` ${k} `));
  if (key) return NAMED[key];
  return /^[a-z]+$/.test(n.replace(/\s/g, '')) ? cssColor(n.replace(/\s/g, '')) : null;
}
