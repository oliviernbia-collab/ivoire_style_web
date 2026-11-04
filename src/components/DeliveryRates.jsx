import { price } from '../utils/format';

/**
 * Tarifs de livraison d'une boutique par commune d'Abidjan et par ville (repliés par défaut).
 * zones : [{ type: 'commune' | 'city', name, fee, delivers }] ; fee nul = tarif par défaut.
 */
export default function DeliveryRates({ zones, abidjan, other }) {
  if (!zones?.length) return null;
  const line = (z, def) => (
    <li key={`${z.type}-${z.name}`} className="flex between" style={{ gap: 12 }}>
      <span>{z.name}</span>
      <b className={z.delivers ? '' : 'muted'}>{z.delivers ? price(z.fee ?? def) : 'Non desservi'}</b>
    </li>
  );
  const communes = zones.filter((z) => z.type === 'commune');
  const cities = zones.filter((z) => z.type === 'city');
  return (
    <details className="delivery-rates small mt-1">
      <summary className="gold" style={{ cursor: 'pointer' }}>Voir les tarifs par commune et par ville</summary>
      <div className="delivery-rates-grid mt-1">
        {communes.length > 0 && (
          <div><b>Abidjan</b><ul className="plain-list">{communes.map((z) => line(z, abidjan))}</ul>
            <span className="muted">Autres communes : {price(abidjan)}</span></div>
        )}
        {cities.length > 0 && (
          <div><b>Intérieur du pays</b><ul className="plain-list">{cities.map((z) => line(z, other))}</ul>
            <span className="muted">Autres villes : {price(other)}</span></div>
        )}
      </div>
    </details>
  );
}
