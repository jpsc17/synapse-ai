import { Icon } from './Icon';
import React, { useState } from 'react';
import { useSynapse } from '../../context/SynapseContext';
import { N8N_WORKFLOW_REFS } from '../../services/apiService';

export const DemoNoticeBanner: React.FC = () => {
  const { backendOnline, n8nReachable } = useSynapse();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="bg-surface-container-low border border-primary/30 rounded p-3 text-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-2 shadow-[0_0_12px_rgba(39,224,195,0.1)]">
      <div className="flex items-center gap-2.5">
        <Icon name={backendOnline && n8nReachable ? 'cloud_done' : 'cloud_off'} className={`w-[18px] h-[18px] ${backendOnline && n8nReachable ? 'text-primary' : 'text-amber-400'}`} />
        <div>
          <span className={`font-semibold font-code-compact ${backendOnline && n8nReachable ? 'text-primary' : 'text-amber-400'}`}>
            {backendOnline && n8nReachable
              ? 'SISTEMA INTEGRADO: FASTAPI (8000) + n8n (5678) ATIVOS'
              : backendOnline
              ? 'FASTAPI ONLINE · n8n INDISPONÍVEL'
              : 'FASTAPI INDISPONÍVEL'}
          </span>
          <span className="text-on-surface-variant mx-1.5">•</span>
          <span className="text-on-surface">
            {backendOnline && n8nReachable ? (
              <>
                Fluxos operacionais conectados via Webhooks reais aos workflows n8n (
                <code className="text-primary font-code-compact">{N8N_WORKFLOW_REFS.DATA_BRIDGE_POC}</code> e{' '}
                <code className="text-primary font-code-compact">{N8N_WORKFLOW_REFS.INTELLIGENT_DISCOVERY_POC}</code>
                ) com governança e auditoria SQLite.
              </>
            ) : (
              <>
                {backendOnline
                  ? 'Descoberta e execução estão desabilitadas até o n8n voltar a responder.'
                  : 'Nenhum dado fictício será usado. Inicie o FastAPI na porta 8000 para operar o fluxo.'}
              </>
            )}
          </span>
        </div>
      </div>
      <button 
        onClick={() => setDismissed(true)}
        aria-label="Dispensar aviso"
        className="text-on-surface-variant hover:text-on-surface p-1 self-end md:self-center transition-colors"
        title="Dispensar aviso"
      >
        <Icon name="close" className="text-[16px]" />
      </button>
    </div>
  );
};
