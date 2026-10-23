import { Icon } from '../components/common/Icon';
import React from 'react';
import { useNavigate } from 'react-router-dom';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
      <div className="w-16 h-16 rounded-full bg-surface-container border border-outline-variant flex items-center justify-center text-primary glow-primary">
        <Icon name="error_outline" className="text-[32px]" />
      </div>
      <div>
        <h1 className="text-2xl font-bold font-code-compact text-on-surface">404 — Módulo Não Encontrado</h1>
        <p className="text-xs text-on-surface-variant max-w-md mt-1">
          A rota solicitada não existe ou foi transferida para outro cluster de processamento do SYNAPSE.
        </p>
      </div>
      <button
        onClick={() => navigate('/')}
        className="px-4 py-2 rounded bg-primary text-on-primary text-xs font-semibold hover:shadow-teal-glow transition-all"
      >
        Voltar à Visão Geral
      </button>
    </div>
  );
};
