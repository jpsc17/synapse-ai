import React, { useState } from 'react';
import { N8N_WORKFLOW_REFS } from '../../services/apiService';

export const DemoNoticeBanner: React.FC = () => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="bg-surface-container-low border border-primary/30 rounded p-3 text-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-2 shadow-[0_0_12px_rgba(39,224,195,0.1)]">
      <div className="flex items-center gap-2.5">
        <span className="material-symbols-outlined text-primary text-[18px]">verified_user</span>
        <div>
          <span className="text-primary font-semibold font-code-compact">MODO DEMONSTRATIVO / FRONTEND VALIDATION</span>
          <span className="text-on-surface-variant mx-1.5">•</span>
          <span className="text-on-surface">
            Interface integrada ao Design System do Stitch. Os nós e regras refletem fielmente os workflows n8n existentes (
            <code className="text-primary font-code-compact">{N8N_WORKFLOW_REFS.DATA_BRIDGE_POC}</code> e{' '}
            <code className="text-primary font-code-compact">{N8N_WORKFLOW_REFS.INTELLIGENT_DISCOVERY_POC}</code>
            ) para conexão via backend.
          </span>
        </div>
      </div>
      <button 
        onClick={() => setDismissed(true)}
        className="text-on-surface-variant hover:text-on-surface p-1 self-end md:self-center"
        title="Dispensar aviso"
      >
        <span className="material-symbols-outlined text-[16px]">close</span>
      </button>
    </div>
  );
};
