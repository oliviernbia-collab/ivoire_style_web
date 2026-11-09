import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight, faMagnifyingGlassMinus, faMagnifyingGlassPlus, faXmark } from '@fortawesome/free-solid-svg-icons';
import { fileUrl } from '../api/client';

const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;

/**
 * Visionneuse plein écran des photos d'un produit. Le zoom (pincement, double appui, molette, boutons) ne s'applique
 * qu'à la photo : la page et son menu gardent leur taille. Glisser change de photo ; Échap ou la croix ferment.
 */
export default function ImageViewer({ images, start = 0, alt, onClose }) {
  const [index, setIndex] = useState(start);
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
  const pointers = useRef(new Map());
  const gesture = useRef(null);
  const lastTap = useRef(0);
  const count = images.length;

  const reset = () => setView({ scale: 1, x: 0, y: 0 });
  const go = useCallback((step) => {
    setIndex((i) => (i + step + count) % count);
    setView({ scale: 1, x: 0, y: 0 });
  }, [count]);

  // Déplacement limité aux bords de la photo agrandie
  const clamp = (scale, x, y) => {
    const maxX = ((scale - 1) * window.innerWidth) / 2;
    const maxY = ((scale - 1) * window.innerHeight) / 2;
    return { scale, x: Math.max(-maxX, Math.min(maxX, x)), y: Math.max(-maxY, Math.min(maxY, y)) };
  };
  const zoomTo = (scale, cx = window.innerWidth / 2, cy = window.innerHeight / 2) => setView((v) => {
    const s = Math.max(1, Math.min(MAX_SCALE, scale));
    if (s === 1) return { scale: 1, x: 0, y: 0 };
    // Le point visé reste sous le doigt / le curseur
    const ox = cx - window.innerWidth / 2;
    const oy = cy - window.innerHeight / 2;
    return clamp(s, ox - ((ox - v.x) * s) / v.scale, oy - ((oy - v.y) * s) / v.scale);
  });

  // Page figée derrière la visionneuse ; clavier : Échap, flèches
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && count > 1) go(1);
      if (e.key === 'ArrowLeft' && count > 1) go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [onClose, go, count]);

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    if (pts.length === 2) {
      gesture.current = { type: 'pinch', dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y), view };
    } else if (pts.length === 1) {
      gesture.current = { type: 'pan', x: e.clientX, y: e.clientY, view, moved: false };
    }
  };
  const onPointerMove = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (!g) return;
    const pts = [...pointers.current.values()];
    if (g.type === 'pinch' && pts.length === 2) {
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const s = Math.max(1, Math.min(MAX_SCALE, (g.view.scale * dist) / g.dist));
      setView(s === 1 ? { scale: 1, x: 0, y: 0 } : clamp(s, (g.view.x * s) / g.view.scale, (g.view.y * s) / g.view.scale));
    } else if (g.type === 'pan') {
      const dx = e.clientX - g.x;
      const dy = e.clientY - g.y;
      if (Math.abs(dx) + Math.abs(dy) > 6) g.moved = true;
      if (g.view.scale > 1) setView(clamp(g.view.scale, g.view.x + dx, g.view.y + dy));
    }
  };
  const onPointerUp = (e) => {
    const g = gesture.current;
    pointers.current.delete(e.pointerId);
    if (pointers.current.size > 0) {
      // Fin d'un pincement : le doigt restant reprend le déplacement
      const [p] = [...pointers.current.values()];
      gesture.current = { type: 'pan', x: p.x, y: p.y, view, moved: true };
      return;
    }
    gesture.current = null;
    if (!g || g.type !== 'pan') return;
    const dx = e.clientX - g.x;
    // Glisser horizontalement sur une photo non agrandie : photo suivante / précédente
    if (g.view.scale === 1 && count > 1 && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(e.clientY - g.y)) {
      go(dx < 0 ? 1 : -1);
      return;
    }
    if (!g.moved) {
      const now = Date.now();
      if (now - lastTap.current < 300) {
        lastTap.current = 0;
        if (view.scale > 1) reset(); else zoomTo(DOUBLE_TAP_SCALE, e.clientX, e.clientY);
      } else {
        lastTap.current = now;
      }
    }
  };
  const onWheel = (e) => zoomTo(view.scale * (e.deltaY < 0 ? 1.25 : 0.8), e.clientX, e.clientY);

  const media = images[index];
  return createPortal(
    <div className="image-viewer" role="dialog" aria-modal="true" aria-label={alt}>
      <div className="image-viewer-bar">
        <span>{count > 1 ? `${index + 1} / ${count}` : ''}</span>
        <div className="flex" style={{ gap: 6 }}>
          <button type="button" onClick={() => zoomTo(view.scale / 1.5)} disabled={view.scale <= 1} aria-label="Dézoomer"><FontAwesomeIcon icon={faMagnifyingGlassMinus} /></button>
          <button type="button" onClick={() => zoomTo(view.scale * 1.5)} disabled={view.scale >= MAX_SCALE} aria-label="Zoomer"><FontAwesomeIcon icon={faMagnifyingGlassPlus} /></button>
          <button type="button" onClick={onClose} aria-label="Fermer"><FontAwesomeIcon icon={faXmark} /></button>
        </div>
      </div>
      <div className="image-viewer-stage" onPointerDown={onPointerDown} onPointerMove={onPointerMove}
        onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onWheel={onWheel}>
        <img key={media.url} src={fileUrl(media.url, { w: 1600 })} alt={alt} draggable={false}
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }} />
      </div>
      {count > 1 && <>
        <button type="button" className="image-viewer-nav prev" onClick={() => go(-1)} aria-label="Photo précédente"><FontAwesomeIcon icon={faChevronLeft} /></button>
        <button type="button" className="image-viewer-nav next" onClick={() => go(1)} aria-label="Photo suivante"><FontAwesomeIcon icon={faChevronRight} /></button>
      </>}
      <p className="image-viewer-hint">Pincez ou touchez deux fois pour zoomer</p>
    </div>,
    document.body,
  );
}
