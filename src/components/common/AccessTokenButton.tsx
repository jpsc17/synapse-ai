import React, { useEffect, useState } from 'react';
import { apiService, getStoredAuthToken, setStoredAuthToken } from '../../services/apiService';
import { Icon } from './Icon';

interface AccessTokenButtonProps {
  readonly compact?: boolean;
}

export const AccessTokenButton: React.FC<AccessTokenButtonProps> = ({ compact = false }) => {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState('');
  const [role, setRole] = useState<string | null>(() => getStoredAuthToken() ? 'sessão' : null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setRole(getStoredAuthToken() ? 'sessão' : null);
    window.addEventListener('synapse-auth-change', sync);
    return () => window.removeEventListener('synapse-auth-change', sync);
  }, []);

  const authenticate = async () => {
    if (!token.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const result = await apiService.verifyAccessToken(token.trim());
      setStoredAuthToken(token.trim());
      setRole(result.role);
      setToken('');
      setOpen(false);
      window.location.reload();
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Não foi possível validar a credencial.');
    } finally {
      setBusy(false);
    }
  };

  const disconnect = () => {
    setStoredAuthToken('');
    setRole(null);
    setToken('');
    setOpen(false);
    window.location.reload();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-8 items-center gap-1.5 rounded border border-outline-variant bg-surface-container px-2 text-[11px] font-code-compact text-on-surface-variant hover:border-primary/60"
        aria-label="Configurar acesso de operador"
      >
        <Icon name={role ? 'lock' : 'key'} className="h-3.5 w-3.5 text-primary" />
        {!compact && <span>{role ? `Acesso ${role}` : 'Acesso operador'}</span>}
      </button>

      {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Acesso de operador"><div className="w-full max-w-md rounded-lg border border-outline-variant bg-surface-container-low p-5 shadow-2xl"><div className="flex items-start justify-between gap-3"><div><h2 className="text-sm font-bold text-on-surface">Credencial de operador</h2><p className="mt-1 text-xs text-on-surface-variant">A credencial fica somente nesta aba e é validada pelo FastAPI. Ela não é compilada no frontend.</p></div><button onClick={() => setOpen(false)} aria-label="Fechar acesso"><Icon name="close" className="h-5 w-5 text-on-surface-variant" /></button></div><label className="mt-4 block text-[10px] uppercase tracking-wider text-on-surface-variant">Token Bearer</label><input type="password" autoComplete="off" value={token} onChange={event => setToken(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') void authenticate(); }} className="mt-1 h-9 w-full rounded border border-outline-variant bg-surface-container-lowest px-3 font-code-compact text-xs text-on-surface focus:border-primary focus:outline-none" placeholder="Cole a credencial fornecida para a demonstração" />{error && <p role="alert" className="mt-2 text-xs text-error">{error}</p>}<div className="mt-5 flex justify-end gap-2">{role && <button onClick={disconnect} className="rounded border border-error/50 px-3 py-1.5 text-xs text-error">Encerrar sessão</button>}<button onClick={() => setOpen(false)} className="rounded border border-outline-variant px-3 py-1.5 text-xs text-on-surface">Cancelar</button><button disabled={busy || !token.trim()} onClick={() => void authenticate()} className="rounded bg-primary px-3 py-1.5 text-xs font-semibold text-on-primary disabled:opacity-40">{busy ? 'Validando...' : 'Validar acesso'}</button></div></div></div>}
    </>
  );
};
