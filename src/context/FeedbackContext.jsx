import { createContext, useCallback, useContext, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCircleCheck, faCircleExclamation, faTriangleExclamation, faCircleInfo,
} from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';

/**
 * Retours utilisateur après validation :
 *  - notify.success / error / info : toasts discrets
 *  - showResult : modale de confirmation (grande icône) pour les actions importantes
 *  - confirm : demande de confirmation avant une action sensible (renvoie une promesse)
 */
const FeedbackContext = createContext(null);

const ICONS = { success: faCircleCheck, error: faCircleExclamation, warning: faTriangleExclamation, info: faCircleInfo };

export function FeedbackProvider({ children }) {
  const [dialog, setDialog] = useState(null);

  const showResult = useCallback((opts) => new Promise((resolve) => {
    setDialog({ kind: 'result', type: 'success', confirmLabel: 'Continuer', ...opts, resolve });
  }), []);

  const confirm = useCallback((opts) => new Promise((resolve) => {
    setDialog({ kind: 'confirm', type: 'warning', confirmLabel: 'Confirmer', cancelLabel: 'Annuler', ...opts, resolve });
  }), []);

  const close = (value) => {
    dialog?.resolve(value);
    setDialog(null);
  };

  const notify = {
    success: (m) => toast.success(m, { icon: <FontAwesomeIcon icon={faCircleCheck} color="#2E7D4F" /> }),
    error: (m) => toast.error(m, { icon: <FontAwesomeIcon icon={faCircleExclamation} color="#C0392B" /> }),
    info: (m) => toast.info(m, { icon: <FontAwesomeIcon icon={faCircleInfo} color="#C9A227" /> }),
    warning: (m) => toast.warning(m, { icon: <FontAwesomeIcon icon={faTriangleExclamation} color="#B9770E" /> }),
  };

  return (
    <FeedbackContext.Provider value={{ notify, showResult, confirm }}>
      {children}
      {dialog && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="fb-title"
          onClick={(e) => e.target === e.currentTarget && close(false)}>
          <div className="modal feedback">
            <div className={`big-ic ${dialog.type}`}><FontAwesomeIcon icon={dialog.icon || ICONS[dialog.type]} /></div>
            <h3 id="fb-title">{dialog.title}</h3>
            {dialog.message && <p className="muted">{dialog.message}</p>}
            {dialog.children}
            <div className="modal-actions">
              {dialog.kind === 'confirm' && (
                <button className="btn btn-outline" onClick={() => close(false)}>{dialog.cancelLabel}</button>
              )}
              {dialog.secondaryLabel && (
                <button className="btn btn-outline" onClick={() => close('secondary')}>{dialog.secondaryLabel}</button>
              )}
              <button className={`btn ${dialog.danger ? 'btn-danger' : ''}`} onClick={() => close(true)} autoFocus>
                {dialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </FeedbackContext.Provider>
  );
}

export const useFeedback = () => useContext(FeedbackContext);
