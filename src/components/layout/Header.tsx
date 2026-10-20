import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

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
    <header className="fixed top-0 ml-60 z-30 h-14 w-[calc(100%-15rem)] bg-surface-container-lowest border-b border-outline-variant flex items-center justify-between px-margin select-none">
      {/* Left: Breadcrumbs & Cluster status */}
      <div className="flex items-center gap-space-md">
        <div className="flex items-center gap-space-xs text-code-compact text-xs">
          <span className="text-on-surface-variant font-medium">SYNAPSE</span>
          <span className="text-outline">/</span>
          <span className="text-primary font-semibold">{getBreadcrumbTitle()}</span>
        </div>

        <div className="h-4 w-[1px] bg-outline-variant hidden lg:block"></div>

        {/* Operational Status Pill */}
        <div className="hidden xl:flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-container border border-outline-variant text-[11px] font-code-compact text-on-surface-variant">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
          <span className="text-on-surface font-medium">Sistemas Operacionais</span>
          <span className="text-outline">(4 clusters)</span>
        </div>
      </div>

      {/* Center Search Bar */}
      <div className="relative w-72 max-w-sm hidden md:block">
        <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-[16px]">
          search
        </span>
        <input 
          type="text"
          placeholder="Filtrar pipelines, fontes ou alertas (⌘K)..."
          className="w-full h-8 pl-8 pr-10 text-xs bg-surface-container-low border border-outline-variant rounded text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-body-default"
        />
        <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-code-compact bg-surface-container-high border border-outline-variant px-1 rounded text-on-surface-variant">
          ⌘K
        </kbd>
      </div>

      {/* Trailing Actions & Icons */}
      <div className="flex items-center gap-space-sm">
        <button className="p-1.5 rounded hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors" title="Notificações">
          <span className="material-symbols-outlined text-[18px]">notifications</span>
        </button>
        <button className="p-1.5 rounded hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors" title="Central de Ajuda">
          <span className="material-symbols-outlined text-[18px]">help_center</span>
        </button>
        <button className="p-1.5 rounded hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors" title="Terminal Interativo">
          <span className="material-symbols-outlined text-[18px]">terminal</span>
        </button>
        
        <div className="h-5 w-[1px] bg-outline-variant mx-1"></div>

        {/* Primary Action Button */}
        {location.pathname !== '/workspace' ? (
          <button 
            onClick={() => navigate('/workspace')}
            className="h-8 px-space-md rounded bg-primary text-on-primary font-medium text-xs font-semibold flex items-center gap-1.5 hover:shadow-[0_0_12px_rgba(39,224,195,0.4)] transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">hub</span>
            <span>Explorar Workspace</span>
          </button>
        ) : (
          <button 
            onClick={() => navigate('/discovery')}
            className="h-8 px-space-md rounded bg-secondary-container border border-secondary/40 text-on-surface font-medium text-xs font-semibold flex items-center gap-1.5 hover:shadow-[0_0_12px_rgba(113,139,255,0.4)] transition-all"
          >
            <span className="material-symbols-outlined text-[16px] text-primary">auto_awesome</span>
            <span>Descoberta Inteligente</span>
          </button>
        )}
      </div>
    </header>
  );
};
