import { useEffect } from 'react';

/**
 * Référencement page par page : titre, description, URL canonique, aperçus de partage (Open Graph / X),
 * indexation et données structurées JSON-LD (schema.org). Les balises sont mises à jour dans <head>
 * à chaque page ; les valeurs de index.html restent pour les robots qui n'exécutent pas JavaScript.
 */
export const SITE_NAME = 'Ivoire Style';
export const SITE_URL = (import.meta.env.VITE_SITE_URL || window.location.origin).replace(/\/$/, '');
const DEFAULT_DESCRIPTION = 'Ivoire Style, la marketplace de la mode ivoirienne : vêtements homme, femme et enfant, '
  + 'pagnes, boubous et créateurs locaux. Paiement Mobile Money et livraison partout en Côte d’Ivoire.';
const DEFAULT_IMAGE = `${SITE_URL}/favicon.png`;

/** URL absolue à partir d'un chemin du site. */
export const absoluteUrl = (path = '/') => (/^https?:\/\//.test(path) ? path : `${SITE_URL}${path.startsWith('/') ? '' : '/'}${path}`);

/** Image de partage 1200×630 à partir d'une image Cloudinary (sinon l'URL telle quelle). */
export function shareImage(url) {
  if (!url) return DEFAULT_IMAGE;
  const m = url.match(/^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.*)$/);
  return m ? `${m[1]}c_fill,g_auto,w_1200,h_630,f_jpg,q_auto/${m[2]}` : absoluteUrl(url);
}

/** Texte brut, sans retours à la ligne, coupé proprement (~155 caractères pour Google). */
export function snippet(text, max = 155) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).replace(/\s+\S*$/, '')}…`;
}

function setMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (content == null || content === '') { el?.remove(); return; }
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonical(href) {
  let el = document.head.querySelector('link[rel="canonical"]');
  if (!href) { el?.remove(); return; }
  if (!el) {
    el = document.createElement('link');
    el.rel = 'canonical';
    document.head.appendChild(el);
  }
  el.href = href;
}

function setJsonLd(data) {
  let el = document.getElementById('seo-jsonld');
  if (!data) { el?.remove(); return; }
  if (!el) {
    el = document.createElement('script');
    el.type = 'application/ld+json';
    el.id = 'seo-jsonld';
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

/** Applique les balises de référencement d'une page. */
export function applySeo({ title, description, path, image, type = 'website', noindex = false, jsonLd = null } = {}) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} – Votre style, votre signature`;
  const desc = snippet(description || DEFAULT_DESCRIPTION);
  const url = path != null ? absoluteUrl(path) : null;
  const img = image || DEFAULT_IMAGE;
  document.title = fullTitle;
  setMeta('name', 'description', desc);
  setMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large');
  setCanonical(noindex ? null : url);
  setMeta('property', 'og:site_name', SITE_NAME);
  setMeta('property', 'og:locale', 'fr_CI');
  setMeta('property', 'og:type', type);
  setMeta('property', 'og:title', fullTitle);
  setMeta('property', 'og:description', desc);
  setMeta('property', 'og:url', url);
  setMeta('property', 'og:image', img);
  setMeta('name', 'twitter:card', 'summary_large_image');
  setMeta('name', 'twitter:title', fullTitle);
  setMeta('name', 'twitter:description', desc);
  setMeta('name', 'twitter:image', img);
  setJsonLd(noindex ? null : jsonLd);
}

/** Hook : applique le référencement tant que la page est affichée (ignoré tant que ready est faux). */
export function useSeo(config, ready = true) {
  const key = JSON.stringify(config);
  useEffect(() => {
    if (ready) applySeo(JSON.parse(key));
  }, [key, ready]);
}

/** Fil d'Ariane schema.org : [[nom, chemin], …] */
export const breadcrumbLd = (items) => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: absoluteUrl(path) })),
});
