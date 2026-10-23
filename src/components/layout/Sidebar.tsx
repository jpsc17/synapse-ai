import { Icon } from '../common/Icon';
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useSynapse } from '../../context/SynapseContext';

interface SidebarProps {
  readonly mobileOpen: boolean;
  readonly onNavigate: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onNavigate }) => {
  const navigate = useNavigate();
  const { setIsUploadModalOpen, backendOnline, n8nReachable, candidates } = useSynapse();

  const navItems = [
    { label: 'Visão Geral', path: '/', icon: 'dashboard' },
    { label: 'Workspace', path: '/workspace', icon: 'workspaces' },
    { label: 'Fontes de Dados', path: '/datasources', icon: 'database' },
    { label: 'Descoberta Inteligente', path: '/discovery', icon: 'auto_awesome', badge: candidates.length > 0 ? String(candidates.length) : undefined },
    { label: 'Pipelines', path: '/pipelines', icon: 'account_tree' },
    { label: 'Qualidade dos Dados', path: '/quality', icon: 'verified' },
  ];

  return (
    <aside className={`fixed left-0 top-0 z-40 flex h-screen w-60 flex-col justify-between border-r border-outline-variant bg-surface-container-low px-space-xs py-space-md transition-transform md:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      {/* Top Area: Brand & Navigation */}
      <div className="flex flex-col gap-space-md">
        {/* Brand Header */}
        <button
          type="button"
          aria-label="Ir para a visão geral"
          onClick={() => { navigate('/'); onNavigate(); }}
          className="group flex w-full items-center gap-space-sm px-space-md py-space-xs text-left"
        >
          <div className="h-8 w-8 overflow-hidden rounded border border-outline-variant bg-black glow-primary transition-all group-hover:border-primary">
            <img
              src="/synapse-logo-official.jpg"
              alt=""
              className="h-full w-full object-cover object-center"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-headline-md font-semibold tracking-tight text-primary leading-tight">SYNAPSE</span>
            <span className="text-[10px] text-on-surface-variant font-code-compact tracking-tight">Sistemas que entendem sistemas</span>
          </div>
        </button>

        {/* Quick Action CTA */}
        <div className="px-space-sm pt-space-xs">
          <button 
            onClick={() => { navigate('/pipelines'); onNavigate(); }}
            className="w-full flex items-center justify-center gap-space-sm py-space-xs px-space-md rounded bg-surface-container border border-outline-variant hover:border-primary text-primary transition-all duration-150 text-body-default font-medium hover:shadow-[0_0_12px_rgba(39,224,195,0.25)]"
          >
            <Icon name="add_circle" className="text-primary text-[18px]" />
            <span className="text-code-base text-xs font-semibold">Abrir Pipelines</span>
          </button>
        </div>

        {/* Primary Nav Tabs */}
        <nav className="flex flex-col gap-0.5 mt-space-xs">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center justify-between px-space-md py-space-xs text-xs font-medium transition-colors ${
                  isActive
                    ? 'text-primary bg-surface-container border-l-2 border-primary font-semibold'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                }`
              }
            >
              <div className="flex items-center gap-space-sm">
                <Icon name={item.icon} className="w-[18px] h-[18px]" />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="px-1.5 py-0.2 text-[9px] font-code-compact font-semibold rounded bg-primary-container/20 text-primary border border-primary/40">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Bottom Area: Controls & Profile */}
      <div className="flex flex-col gap-0.5 border-t border-outline-variant pt-space-xs">
        {/* Engine Status Pill */}
        <div className="px-space-sm py-1 bg-surface-container-lowest border border-outline-variant rounded mb-1 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${backendOnline && n8nReachable ? 'bg-primary animate-pulse' : 'bg-amber-400'}`}></span>
            <span className="text-label-caps text-on-surface-variant text-[10px]">Integração</span>
          </div>
          <span className="text-code-compact text-secondary text-[10px] font-medium">
            {backendOnline && n8nReachable ? 'ONLINE' : 'INDISPONÍVEL'}
          </span>
        </div>

        <button 
          onClick={() => setIsUploadModalOpen(true)}
          className="flex items-center gap-space-sm px-space-md py-space-xs text-on-surface-variant text-xs hover:bg-surface-container-high hover:text-primary transition-colors text-left"
        >
          <Icon name="upload_file" className="text-[17px] text-secondary" />
          <span className="font-code-compact text-[11px]">Upload CSV / Excel</span>
        </button>

        {/* Identificação do ambiente */}
        <div className="mt-space-xs px-space-sm py-space-xs bg-surface-container-lowest rounded border border-outline-variant flex items-center justify-between">
          <div className="flex items-center gap-space-sm">
            <div className="w-7 h-7 rounded bg-surface-variant border border-outline-variant flex items-center justify-center font-code-compact text-primary text-xs font-bold">
              DEV
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-on-surface">Ambiente local</span>
              <span className="text-[10px] font-code-compact text-on-surface-variant">SYNAPSE AI</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
