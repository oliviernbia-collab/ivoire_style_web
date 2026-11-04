import { useEffect } from 'react';

/**
 * Sur mobile, les tableaux `.table` munis d'un <thead> s'affichent en cartes (voir global.css).
 * Ce composant recopie l'intitulé de chaque colonne dans l'attribut data-label des cellules,
 * pour tous les tableaux présents et à venir (rendus React, pagination, filtres…).
 */
function labelTables() {
  document.querySelectorAll('table.table').forEach((table) => {
    const heads = [...table.querySelectorAll('thead th')].map((th) => th.textContent.trim());
    if (!heads.length) return;
    table.classList.add('stack-mobile');
    table.querySelectorAll('tbody tr').forEach((tr) => {
      [...tr.children].forEach((cell, i) => {
        const label = heads[i] ?? '';
        if (cell.getAttribute('data-label') !== label) cell.setAttribute('data-label', label);
      });
    });
  });
}

export default function ResponsiveTables() {
  useEffect(() => {
    let frame = null;
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => { frame = null; labelTables(); });
    };
    labelTables();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => { observer.disconnect(); if (frame) cancelAnimationFrame(frame); };
  }, []);
  return null;
}
