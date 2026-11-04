import { useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCamera, faSpinner, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import api, { apiError, fileUrl } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useFeedback } from '../context/FeedbackContext';
import { initials } from '../utils/format';

/** Avatar d'un utilisateur : sa photo de profil, sinon ses initiales. */
export function UserAvatar({ user, size = 42, style }) {
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.36, ...style }}>
      {user?.avatar_url ? <img src={fileUrl(user.avatar_url, { w: size * 3 })} alt="" /> : initials(user)}
    </span>
  );
}

const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_MB = 5;

/** Photo de profil modifiable : choix d'une image (aperçu immédiat), envoi, suppression. */
export function AvatarEditor() {
  const { user, setUser } = useAuth();
  const { notify, confirm } = useFeedback();
  const input = useRef(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);

  const choose = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permet de rechoisir le même fichier
    if (!file) return;
    if (!TYPES.includes(file.type)) { notify.error('Formats acceptés : JPG, PNG ou WEBP'); return; }
    if (file.size > MAX_MB * 1024 * 1024) { notify.error(`Photo trop lourde (${MAX_MB} Mo maximum)`); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const { data } = await api.put('/auth/me/avatar', fd, { timeout: 60000 });
      setUser(data.data);
      notify.success(data.message);
    } catch (err) {
      notify.error(apiError(err).message);
    } finally {
      setBusy(false);
      setPreview(null);
      URL.revokeObjectURL(url);
    }
  };

  const remove = async () => {
    if (!(await confirm({ title: 'Retirer votre photo de profil ?', message: 'Vos initiales seront affichées à la place.', confirmLabel: 'Retirer', danger: true }))) return;
    setBusy(true);
    try {
      const { data } = await api.delete('/auth/me/avatar');
      setUser(data.data);
      notify.success(data.message);
    } catch (err) { notify.error(apiError(err).message); } finally { setBusy(false); }
  };

  return (
    <div className="avatar-editor">
      <button type="button" className="avatar-editor-photo" onClick={() => input.current?.click()} disabled={busy}
        aria-label={user.avatar_url ? 'Changer la photo de profil' : 'Ajouter une photo de profil'}>
        {preview ? <span className="avatar" style={{ width: 96, height: 96 }}><img src={preview} alt="" /></span> : <UserAvatar user={user} size={96} />}
        <span className="avatar-editor-badge"><FontAwesomeIcon icon={busy ? faSpinner : faCamera} className={busy ? 'spin' : ''} /></span>
      </button>
      <div>
        <b>Photo de profil</b>
        <p className="small muted mb-1">JPG, PNG ou WEBP, {MAX_MB} Mo maximum.</p>
        <div className="flex flex-wrap" style={{ gap: 8 }}>
          <button type="button" className="btn btn-sm" onClick={() => input.current?.click()} disabled={busy}>
            <FontAwesomeIcon icon={faCamera} /> {user.avatar_url ? 'Changer la photo' : 'Ajouter une photo'}
          </button>
          {user.avatar_url && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={remove} disabled={busy}><FontAwesomeIcon icon={faTrashCan} /> Retirer</button>
          )}
        </div>
      </div>
      <input ref={input} type="file" accept={TYPES.join(',')} hidden onChange={choose} />
    </div>
  );
}
