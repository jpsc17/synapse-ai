import { Icon } from '../common/Icon';
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSynapse } from '../../context/SynapseContext';
import { AccessTokenButton } from '../common/AccessTokenButton';

interface HeaderProps {
  readonly onMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenu }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { backendOnline, n8nReachable } = useSynapse();

  const getBreadcrumbTitle = () => {
    switch (location.pathname) {
      case '/':
      case '/overview':
        return 'Visão Geral Executiva';
      case '/workspace':
        return 'Workspace Inteligente — Grafo de Relações';
      case '/discovery':
        return 'Descoberta Inteligente — Motor Heurístico';
      case '/pipelines':
        return 'Construtor Visual de Pipelines DAG';
      case '/datasources':
        return 'Fontes de Dados Conectadas';
      case '/quality':
        return 'Auditoria & Qualidade de Dados';
      default:
        return 'Console';
    }
  };

  return (
    <header className="fixed left-0 top-0 z-30 flex h-14 w-full items-center justify-between border-b border-outline-variant bg-surface-container-lowest px-margin-mobile select-none md:left-60 md:w-[calc(100%-15rem)] md:px-margin">
      {/* Left: Breadcrumbs & Cluster status */}
      <div className="flex min-w-0 items-center gap-space-sm md:gap-space-md">
        <button onClick={onMenu} aria-label="Abrir navegação" className="rounded p-1.5 text-primary md:hidden"><Icon name="menu" className="h-5 w-5" /></button>
        <div className="hidden min-w-0 items-center gap-space-xs text-code-compact text-xs sm:flex">
          <span className="text-on-surface-variant font-medium">SYNAPSE</span>
          <span className="text-outline">/</span>
          <span className="text-primary font-semibold">{getBreadcrumbTitle()}</span>
        </div>

        <div className="h-4 w-[1px] bg-outline-variant hidden lg:block"></div>

        {/* Operational Status Pill */}
        <div className="hidden xl:flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-container border border-outline-variant text-[11px] font-code-compact text-on-surface-variant">
          <span className={`w-2 h-2 rounded-full ${backendOnline && n8nReachable ? 'bg-primary animate-pulse' : 'bg-amber-400'}`}></span>
          <span className="text-on-surface font-medium">
            {backendOnline && n8nReachable ? 'FastAPI + n8n operacionais' : 'Integração indisponível'}
          </span>
        </div>
      </div>

      {/* Trailing Actions & Icons */}
      <div className="flex items-center gap-1 md:gap-space-sm">
        <AccessTokenButton compact={false} />
        {/* Primary Action Button */}
        {location.pathname !== '/workspace' ? (
          <button 
            onClick={() => navigate('/workspace')}
            className="h-8 px-space-md rounded bg-primary text-on-primary font-medium text-xs font-semibold flex items-center gap-1.5 hover:shadow-[0_0_12px_rgba(39,224,195,0.4)] transition-all"
          >
            <Icon name="hub" className="text-[16px]" />
            <span className="hidden sm:inline">Explorar Workspace</span>
          </button>
        ) : (
          <button 
            onClick={() => navigate('/discovery')}
            className="h-8 px-space-md rounded bg-secondary-container border border-secondary/40 text-on-surface font-medium text-xs font-semibold flex items-center gap-1.5 hover:shadow-[0_0_12px_rgba(113,139,255,0.4)] transition-all"
          >
            <Icon name="auto_awesome" className="text-[16px] text-primary" />
            <span className="hidden sm:inline">Descoberta Inteligente</span>
          </button>
        )}
      </div>
    </header>
  );
};
