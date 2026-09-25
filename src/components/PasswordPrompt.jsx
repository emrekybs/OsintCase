import { useEffect, useState } from 'react';

/**
 * Şifreli dosya / kurtarma kaydı açarken parola sorar.
 * onSubmit(password) bir Promise döndürmeli; hata fırlatırsa mesaj gösterilir.
 */
export default function PasswordPrompt({ title = 'Şifreli dosya', subtitle, onSubmit, onClose }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, busy]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password) {
      setError('Parola girin.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onSubmit(password);
    } catch (err) {
      setError(err?.message || 'Açılamadı.');
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={() => !busy && onClose()}>
      <form
        className="modal"
        onMouseDown={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="modal-kicker">AES-256-GCM</div>
        <h2>{title}</h2>
        <p className="modal-sub">
          {subtitle ?? 'Bu dosya parolayla şifrelenmiş. Açmak için dosya parolasını girin.'}
        </p>
        <div className="field">
          <label htmlFor="pw-prompt">Dosya parolası</label>
          <input
            id="pw-prompt"
            type="password"
            autoFocus
            autoComplete="off"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <div className="form-error">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
            Vazgeç
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Çözülüyor…' : 'Aç'}
          </button>
        </div>
      </form>
    </div>
  );
}
