import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFloppyDisk } from '@fortawesome/free-solid-svg-icons';
import api from '../api/client';
import { Field, Modal, SubmitButton, useForm } from './ui';
import { ABIDJAN_COMMUNES, CITIES } from '../utils/format';
import { useAuth } from '../context/AuthContext';

export default function AddressForm({ address, onClose, onSaved }) {
  const { user } = useAuth();
  const { values, set, errors, submitting, submit } = useForm({
    label: address?.label || 'Domicile',
    recipient_name: address?.recipient_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim(),
    phone: address?.phone || user?.phone || '',
    city: address?.city || 'Abidjan',
    commune: address?.commune || '',
    district: address?.district || '',
    street: address?.street || '',
    instructions: address?.instructions || '',
    is_default: Boolean(address?.is_default),
  });

  const onSubmit = submit(async (v) => {
    const { data } = address ? await api.put(`/account/addresses/${address.id}`, v) : await api.post('/account/addresses', v);
    onSaved(data.data);
    return data;
  });

  return (
    <Modal title={address ? 'Modifier l’adresse' : 'Nouvelle adresse de livraison'} onClose={onClose} wide>
      <form className="form-grid" onSubmit={onSubmit} noValidate>
        <Field label="Libellé" error={errors.label}>
          <select className="select" value={values.label} onChange={set('label')}>
            {['Domicile', 'Bureau', 'Famille', 'Autre'].map((l) => <option key={l}>{l}</option>)}
          </select>
        </Field>
        <Field label="Destinataire" error={errors.recipient_name} required>
          <input className="input" value={values.recipient_name} onChange={set('recipient_name')} />
        </Field>
        <Field label="Téléphone" error={errors.phone} required>
          <input className="input" type="tel" value={values.phone} onChange={set('phone')} />
        </Field>
        <Field label="Ville" error={errors.city} required>
          <input className="input" list="cities" value={values.city} onChange={set('city')} />
          <datalist id="cities">{CITIES.map((c) => <option key={c} value={c} />)}</datalist>
        </Field>
        <Field label="Commune" error={errors.commune}>
          <input className="input" list="communes" value={values.commune} onChange={set('commune')} />
          <datalist id="communes">{ABIDJAN_COMMUNES.map((c) => <option key={c} value={c} />)}</datalist>
        </Field>
        <Field label="Quartier" error={errors.district}>
          <input className="input" value={values.district} onChange={set('district')} placeholder="Ex. : Riviera 2" />
        </Field>
        <Field label="Rue ou point de repère" error={errors.street} className="full">
          <input className="input" value={values.street} onChange={set('street')} placeholder="Ex. : derrière la pharmacie Sainte-Anne" />
        </Field>
        <Field label="Instructions au livreur" error={errors.instructions} className="full">
          <input className="input" value={values.instructions} onChange={set('instructions')} placeholder="Ex. : appeler avant d’arriver" />
        </Field>
        <label className="check full"><input type="checkbox" checked={values.is_default} onChange={set('is_default')} /> Adresse par défaut</label>
        <div className="full modal-actions" style={{ marginTop: 0 }}>
          <button type="button" className="btn btn-outline" onClick={onClose}>Annuler</button>
          <SubmitButton loading={submitting}><FontAwesomeIcon icon={faFloppyDisk} /> Enregistrer</SubmitButton>
        </div>
      </form>
    </Modal>
  );
}
