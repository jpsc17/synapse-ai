import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSynapse } from '../context/SynapseContext';

export const WorkspacePage: React.FC = () => {
  const navigate = useNavigate();
  const { dataSources, selectedDataSource, setSelectedDataSource, setIsUploadModalOpen } = useSynapse();
  const [zoom, setZoom] = useState(100);
  const [inspectorOpen, setInspectorOpen] = useState(true);

  const activeDs = selectedDataSource || dataSources[0];

  return (
    <div className="flex h-[calc(100vh-8.5rem)] overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest relative">
      {/* 1. Main Graph Canvas Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden bg-background bg-grid-dense">
        {/* Canvas Toolbar */}
        <div className="h-10 bg-surface-container-low/90 backdrop-blur-md border-b border-outline-variant px-4 flex items-center justify-between z-20">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-code-compact text-on-surface-variant uppercase tracking-wider">Topologia:</span>
            <span className="px-2 py-0.5 rounded bg-surface-container text-xs font-code-compact text-primary font-semibold">
              Cluster Prod-Alpha (4 Entidades Mapeadas)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-surface-container hover:bg-surface-container-high border border-outline-variant text-xs text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-[15px]">add</span>
              <span>+ Fonte de Dados</span>
            </button>

            <div className="flex items-center gap-1 bg-surface-container-lowest/80 border border-outline-variant rounded px-1.5 py-0.5">
              <button 
                onClick={() => setZoom(prev => Math.max(prev - 10, 50))}
                className="p-1 text-on-surface-variant hover:text-on-surface"
                title="Diminuir Zoom"
              >
                <span className="material-symbols-outlined text-[15px]">zoom_out</span>
              </button>
              <span className="text-[11px] font-code-compact text-outline px-1">{zoom}%</span>
              <button 
                onClick={() => setZoom(prev => Math.min(prev + 10, 150))}
                className="p-1 text-on-surface-variant hover:text-on-surface"
                title="Aumentar Zoom"
              >
                <span className="material-symbols-outlined text-[15px]">zoom_in</span>
              </button>
              <div className="h-3 w-px bg-outline-variant"></div>
              <button 
                onClick={() => setZoom(100)}
                className="p-1 text-on-surface-variant hover:text-on-surface" 
                title="Ajustar ao Canvas"
              >
                <span className="material-symbols-outlined text-[15px]">fit_screen</span>
              </button>
            </div>

            <button
              onClick={() => setInspectorOpen(!inspectorOpen)}
              className="p-1 text-on-surface-variant hover:text-on-surface rounded bg-surface-container border border-outline-variant"
              title="Alternar Painel de Inspeção"
            >
              <span className="material-symbols-outlined text-[16px]">dock_to_right</span>
            </button>
          </div>
        </div>

        {/* Graph Viewport */}
        <div 
          className="flex-1 relative overflow-auto p-8 flex items-center justify-center"
          style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center center' }}
        >
          {/* SVG Connection Lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#27E0C3" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#718BFF" stopOpacity="0.8" />
              </linearGradient>
            </defs>
            {/* Connection between PostgreSQL (left) and Excel (right) */}
            <path
              d="M 380 220 C 480 220, 520 220, 620 220"
              fill="none"
              stroke="url(#lineGrad)"
              strokeWidth="2.5"
              strokeDasharray="6,4"
              className="animate-pulse"
            />
            {/* Connection to Snowflake */}
            <path
              d="M 380 240 C 480 320, 520 380, 620 380"
              fill="none"
              stroke="#253247"
              strokeWidth="2"
            />
          </svg>

          {/* Interactive Topology Nodes Grid */}
          <div className="grid grid-cols-2 gap-32 z-10 relative">
            {/* Node 1: PostgreSQL Comercial (Primary) */}
            <div 
              onClick={() => setSelectedDataSource(dataSources[0])}
              className={`w-72 bg-surface-container-low border rounded-lg p-3 transition-all cursor-pointer shadow-lg ${
                activeDs?.id === dataSources[0]?.id 
                  ? 'border-primary ring-1 ring-primary shadow-teal-glow' 
                  : 'border-outline-variant hover:border-outline'
              }`}
            >
              <div className="flex items-center justify-between border-b border-outline-variant/60 pb-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[18px]">database</span>
                  <span className="text-xs font-bold text-on-surface">PostgreSQL RH</span>
                </div>
                <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary text-[10px] font-code-compact font-bold">
                  Fonte Primária
                </span>
              </div>
              <div className="space-y-1.5 text-xs font-code-compact">
                <div className="flex justify-between text-on-surface-variant">
                  <span>MATVINC (PK)</span>
                  <span className="text-primary font-bold">14.820 reg</span>
                </div>
                <div className="flex justify-between text-on-surface-variant">
                  <span>NOME_SERVIDOR</span>
                  <span className="text-outline">string</span>
                </div>
                <div className="flex justify-between text-on-surface-variant">
                  <span>SETOR</span>
                  <span className="text-outline">categórico</span>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-outline-variant/50 flex items-center justify-between text-[10px] font-code-compact text-on-surface-variant">
                <span>Latência: 12ms</span>
                <span className="text-primary font-semibold">1 Relação Ativa</span>
              </div>
            </div>

            {/* Node 2: Excel Pagamentos (Secondary) */}
            <div 
              onClick={() => setSelectedDataSource(dataSources[1])}
              className={`w-72 bg-surface-container-low border rounded-lg p-3 transition-all cursor-pointer shadow-lg ${
                activeDs?.id === dataSources[1]?.id 
                  ? 'border-primary ring-1 ring-primary shadow-teal-glow' 
                  : 'border-outline-variant hover:border-outline'
              }`}
            >
              <div className="flex items-center justify-between border-b border-outline-variant/60 pb-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[18px]">table_chart</span>
                  <span className="text-xs font-bold text-on-surface">Excel Pagamentos</span>
                </div>
                <span className="px-1.5 py-0.5 rounded bg-secondary/20 text-secondary text-[10px] font-code-compact font-bold">
                  Financeiro
                </span>
              </div>
              <div className="space-y-1.5 text-xs font-code-compact">
                <div className="flex justify-between text-on-surface-variant">
                  <span>matricula_funcional (FK)</span>
                  <span className="text-primary font-bold">14.790 reg</span>
                </div>
                <div className="flex justify-between text-on-surface-variant">
                  <span>valor_pagamento</span>
                  <span className="text-outline">float</span>
                </div>
                <div className="flex justify-between text-on-surface-variant">
                  <span>competencia</span>
                  <span className="text-outline">2026-10</span>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-outline-variant/50 flex items-center justify-between text-[10px] font-code-compact text-on-surface-variant">
                <span>Sincronia: 32s</span>
                <span className="text-secondary font-semibold">Match 94%</span>
              </div>
            </div>

            {/* Node 3: Snowflake DW */}
            <div 
              onClick={() => setSelectedDataSource(dataSources[2])}
              className={`w-72 bg-surface-container-low border rounded-lg p-3 transition-all cursor-pointer shadow-lg ${
                activeDs?.id === dataSources[2]?.id 
                  ? 'border-primary ring-1 ring-primary shadow-teal-glow' 
                  : 'border-outline-variant hover:border-outline'
              }`}
            >
              <div className="flex items-center justify-between border-b border-outline-variant/60 pb-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[18px]">cloud</span>
                  <span className="text-xs font-bold text-on-surface">Snowflake Data Lake</span>
                </div>
                <span className="px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant text-[10px] font-code-compact">
                  Analytics
                </span>
              </div>
              <div className="space-y-1 text-xs font-code-compact text-on-surface-variant">
                <div className="flex justify-between">
                  <span>cpf_anonimizado</span>
                  <span>2.4M reg</span>
                </div>
                <div className="flex justify-between">
                  <span>exercicio_fiscal</span>
                  <span>anual</span>
                </div>
              </div>
            </div>

            {/* Node 4: SAP ERP */}
            <div 
              onClick={() => setSelectedDataSource(dataSources[3])}
              className={`w-72 bg-surface-container-low border rounded-lg p-3 transition-all cursor-pointer shadow-lg ${
                activeDs?.id === dataSources[3]?.id 
                  ? 'border-primary ring-1 ring-primary shadow-teal-glow' 
                  : 'border-outline-variant hover:border-outline'
              }`}
            >
              <div className="flex items-center justify-between border-b border-outline-variant/60 pb-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-outline text-[18px]">domain</span>
                  <span className="text-xs font-bold text-on-surface">SAP Controladoria</span>
                </div>
                <span className="px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant text-[10px] font-code-compact">
                  ERP
                </span>
              </div>
              <div className="space-y-1 text-xs font-code-compact text-on-surface-variant">
                <div className="flex justify-between">
                  <span>ID_CONTRATO</span>
                  <span>89.000 reg</span>
                </div>
                <div className="flex justify-between">
                  <span>DEPARTAMENTO</span>
                  <span>setores</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Inspector Drawer (Right Panel) */}
      {inspectorOpen && activeDs && (
        <aside className="w-96 bg-surface-container-low border-l border-outline-variant flex flex-col justify-between overflow-y-auto">
          <div className="p-space-md space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">troubleshoot</span>
                <div>
                  <h3 className="text-xs font-bold text-on-surface">{activeDs.name}</h3>
                  <span className="text-[10px] font-code-compact text-on-surface-variant">
                    {activeDs.sourceType.toUpperCase()} • {activeDs.rowCount.toLocaleString()} linhas
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setInspectorOpen(false)}
                className="text-on-surface-variant hover:text-on-surface p-1"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>

            <p className="text-xs text-on-surface-variant">
              {activeDs.description}
            </p>

            {/* Columns Schema Breakdown */}
            <div>
              <span className="text-[10px] font-code-compact text-on-surface-variant uppercase tracking-wider block mb-2">
                Esquema de Colunas Detectado ({activeDs.columns.length})
              </span>
              <div className="space-y-2">
                {activeDs.columns.map(col => (
                  <div key={col.name} className="p-2 rounded bg-surface-container border border-outline-variant/60 text-xs font-code-compact">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-on-surface">{col.name}</span>
                      <span className="px-1.5 py-0.2 rounded bg-surface-container-high text-primary text-[10px]">
                        {col.type}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-on-surface-variant mt-1">
                      <span>Unicidade: {(col.uniquenessRatio * 100).toFixed(0)}%</span>
                      <span>Nulos: {(col.nullRatio * 100).toFixed(1)}%</span>
                    </div>
                    <div className="text-[10px] text-outline mt-1 truncate">
                      Amostras: {col.sampleValues.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Relacionamentos Conhecidos */}
            <div>
              <span className="text-[10px] font-code-compact text-on-surface-variant uppercase tracking-wider block mb-2">
                Relações Descobertas Nesta Entidade
              </span>
              <div className="p-2.5 rounded bg-surface-container border border-primary/30 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-primary font-code-compact">MATVINC ↔ matricula_funcional</span>
                  <span className="text-[10px] font-bold text-primary">94%</span>
                </div>
                <p className="text-[11px] text-on-surface-variant">
                  Chave candidata 1:1 verificada contra a base de pagamentos.
                </p>
              </div>
            </div>
          </div>

          {/* Drawer Actions */}
          <div className="p-space-md border-t border-outline-variant space-y-2 bg-surface-container">
            <button 
              onClick={() => navigate('/discovery')}
              className="w-full py-1.5 px-3 rounded bg-primary text-on-primary text-xs font-semibold hover:shadow-teal-glow transition-all flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
              <span>Analisar Descobertas com esta Fonte</span>
            </button>
            <button 
              onClick={() => navigate('/pipelines')}
              className="w-full py-1.5 px-3 rounded bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant text-xs text-on-surface font-medium transition-colors flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">account_tree</span>
              <span>Construir Pipeline com esta Entidade</span>
            </button>
          </div>
        </aside>
      )}
    </div>
  );
};
