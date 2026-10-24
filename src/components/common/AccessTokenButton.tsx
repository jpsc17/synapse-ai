import React, { useState } from 'react';
import { useAuth } from '../../context/authState';
import { Icon } from './Icon';

interface AccessTokenButtonProps {
  readonly compact?: boolean;
}

export const AccessTokenButton: React.FC<AccessTokenButtonProps> = ({ compact = false }) => {
  const { user, logout } = useAuth();
  const [busy, setBusy] = useState(false);

  const disconnect = async () => {
    setBusy(true);
    try {
      await logout();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-8 items-center gap-2 rounded border border-outline-variant bg-surface-container px-2 text-[11px] font-code-compact text-on-surface-variant">
      <Icon name="verified" className="h-3.5 w-3.5 text-primary" />
      {!compact && <span className="hidden max-w-36 truncate lg:inline">{user?.email ?? user?.role ?? 'Sessão ativa'}</span>}
      <button type="button" disabled={busy} onClick={() => void disconnect()} className="border-l border-outline-variant pl-2 text-error hover:text-on-error-container disabled:opacity-50" aria-label="Encerrar sessão">
        {busy ? 'Saindo...' : 'Sair'}
      </button>
    </div>
  );
};
