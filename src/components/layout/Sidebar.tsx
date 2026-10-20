import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useSynapse } from '../../context/SynapseContext';

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const { setIsUploadModalOpen } = useSynapse();

  const navItems = [
    { label: 'Visão Geral', path: '/', icon: 'dashboard' },
    { label: 'Workspace', path: '/workspace', icon: 'workspaces' },
    { label: 'Fontes de Dados', path: '/datasources', icon: 'database' },
    { label: 'Descoberta Inteligente', path: '/discovery', icon: 'auto_awesome', badge: '3 novas' },
    { label: 'Pipelines', path: '/pipelines', icon: 'account_tree' },
    { label: 'Qualidade dos Dados', path: '/quality', icon: 'verified' },
    { label: 'Execuções', path: '/executions', icon: 'terminal' },
    { label: 'Relatórios', path: '/reports', icon: 'analytics' },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 z-40 bg-surface-container-low border-r border-outline-variant flex flex-col justify-between py-space-md px-space-xs select-none">
      {/* Top Area: Brand & Navigation */}
      <div className="flex flex-col gap-space-md">
        {/* Brand Header */}
        <div 
          onClick={() => navigate('/')}
          className="px-space-md py-space-xs flex items-center gap-space-sm cursor-pointer group"
        >
          <div className="w-8 h-8 rounded bg-surface-container-high border border-outline-variant flex items-center justify-center glow-primary group-hover:border-primary transition-all">
            <span className="material-symbols-outlined text-primary text-[20px]">hub</span>
          </div>
          <div className="flex flex-col">
            <span className="text-headline-md font-semibold tracking-tight text-primary leading-tight">SYNAPSE</span>
            <span className="text-[10px] text-on-surface-variant font-code-compact tracking-tight">Sistemas que entendem sistemas</span>
          </div>
        </div>

        {/* Quick Action CTA */}
        <div className="px-space-sm pt-space-xs">
          <button 
            onClick={() => navigate('/pipelines')}
            className="w-full flex items-center justify-center gap-space-sm py-space-xs px-space-md rounded bg-surface-container border border-outline-variant hover:border-primary text-primary transition-all duration-150 text-body-default font-medium hover:shadow-[0_0_12px_rgba(39,224,195,0.25)]"
          >
            <span className="material-symbols-outlined text-primary text-[18px]">add_circle</span>
            <span className="text-code-base text-xs font-semibold">Novo Pipeline</span>
          </button>
        </div>

        {/* Primary Nav Tabs */}
        <nav className="flex flex-col gap-0.5 mt-space-xs">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center justify-between px-space-md py-space-xs text-xs font-medium transition-colors ${
                  isActive
                    ? 'text-primary bg-surface-container border-l-2 border-primary font-semibold'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                }`
              }
            >
              <div className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
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
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            <span className="text-label-caps text-on-surface-variant text-[10px]">DAEMON v3.14</span>
          </div>
          <span className="text-code-compact text-secondary text-[10px] font-medium">SYNC 100%</span>
        </div>

        <button 
          onClick={() => setIsUploadModalOpen(true)}
          className="flex items-center gap-space-sm px-space-md py-space-xs text-on-surface-variant text-xs hover:bg-surface-container-high hover:text-primary transition-colors text-left"
        >
          <span className="material-symbols-outlined text-[17px] text-secondary">upload_file</span>
          <span className="font-code-compact text-[11px]">Upload CSV / Excel</span>
        </button>

        <a 
          href="#docs" 
          className="flex items-center gap-space-sm px-space-md py-space-xs text-on-surface-variant text-xs hover:bg-surface-container-high hover:text-on-surface transition-colors"
        >
          <span className="material-symbols-outlined text-[17px]">menu_book</span>
          <span className="text-[11px]">Documentação</span>
        </a>

        {/* Engineer Profile Card */}
        <div className="mt-space-xs px-space-sm py-space-xs bg-surface-container-lowest rounded border border-outline-variant flex items-center justify-between">
          <div className="flex items-center gap-space-sm">
            <div className="w-7 h-7 rounded bg-surface-variant border border-outline-variant flex items-center justify-center font-code-compact text-primary text-xs font-bold">
              SR
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-on-surface">S. Ribeiro</span>
              <span className="text-[10px] font-code-compact text-on-surface-variant">Arquiteto de Sistemas</span>
            </div>
          </div>
          <button className="text-on-surface-variant hover:text-primary transition-colors p-1" title="Perfil de Engenheiro">
            <span className="material-symbols-outlined text-[16px]">tune</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
