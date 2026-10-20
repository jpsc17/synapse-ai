import React, { useState } from 'react';
import { useSynapse } from '../context/SynapseContext';
import type { DagNode } from '../types/synapse';
import { N8N_WORKFLOW_REFS } from '../services/apiService';

export const PipelinesPage: React.FC = () => {
  const { pipeline, setNotification } = useSynapse();
  const [selectedNode, setSelectedNode] = useState<DagNode | null>(pipeline.nodes[3]); // Default to Join node
  const [isExecuting, setIsExecuting] = useState(false);
  const [zoom, setZoom] = useState(100);

  const handleExecutePipeline = () => {
    setIsExecuting(true);
    setNotification('Iniciando orquestração do pipeline DAG...');
    setTimeout(() => {
      setIsExecuting(false);
      setNotification('Execução simulada do pipeline concluída com sucesso! 14.820 registros processados.');
    }, 2500);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8.5rem)] rounded-lg border border-outline-variant bg-surface-container-lowest overflow-hidden">
      {/* 1. Header do Pipeline */}
      <header className="h-12 bg-surface-container-low border-b border-outline-variant px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xs font-code-compact text-outline-variant">DAG /</span>
          <h1 className="text-xs font-medium text-on-surface flex items-center gap-2">
            Pipeline: <span className="text-primary font-code-base font-semibold">{pipeline.name}</span>
          </h1>
          <div className="h-4 w-px bg-outline-variant hidden sm:block"></div>
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 bg-surface-container rounded border border-outline-variant text-[11px] font-code-compact">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="text-on-surface">Pronto para Execução</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-code-compact text-outline hidden md:inline">
            Workflow n8n: <code className="text-primary">{N8N_WORKFLOW_REFS.DATA_BRIDGE_POC}</code>
          </span>
          <button 
            onClick={() => setNotification('Rascunho da topologia salvo com sucesso.')}
            className="px-3 py-1 bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface text-xs rounded transition-colors"
          >
            Salvar Rascunho
          </button>
          <button 
            onClick={handleExecutePipeline}
            disabled={isExecuting}
            className="px-3.5 py-1 bg-primary text-on-primary text-xs font-semibold rounded hover:shadow-teal-glow transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            {isExecuting ? (
              <>
                <span className="w-3 h-3 rounded-full border-2 border-on-primary border-t-transparent animate-spin"></span>
                <span>Executando DAG...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                <span>Executar Pipeline</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* 2. Toolbar Superior do Canvas */}
      <div className="h-10 bg-surface-container-low/90 border-b border-outline-variant px-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 text-xs">
          <span className="text-[10px] font-code-compact text-outline mr-1 uppercase tracking-wider">Adicionar Nó:</span>
          {['+ Fonte', '+ Selecionar', '+ Normalizar', '+ Relacionar / JOIN', '+ Validar', '+ Exportar'].map(btn => (
            <button 
              key={btn}
              onClick={() => setNotification(`Nó "${btn.replace('+', '').trim()}" adicionado à paleta.`)}
              className="px-2 py-0.5 rounded bg-surface-container hover:bg-surface-container-high border border-outline-variant text-[11px] text-on-surface transition-colors"
            >
              {btn}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 bg-surface-container-lowest/80 border border-outline-variant rounded px-1.5 py-0.5">
          <button onClick={() => setZoom(prev => Math.max(prev - 10, 50))} className="p-0.5 text-on-surface-variant hover:text-on-surface">
            <span className="material-symbols-outlined text-[14px]">zoom_out</span>
          </button>
          <span className="text-[10px] font-code-compact text-outline px-1">{zoom}%</span>
          <button onClick={() => setZoom(prev => Math.min(prev + 10, 150))} className="p-0.5 text-on-surface-variant hover:text-on-surface">
            <span className="material-symbols-outlined text-[14px]">zoom_in</span>
          </button>
          <div className="h-3 w-px bg-outline-variant"></div>
          <button onClick={() => setZoom(100)} className="p-0.5 text-on-surface-variant hover:text-on-surface">
            <span className="material-symbols-outlined text-[14px]">fit_screen</span>
          </button>
        </div>
      </div>

      {/* 3. Área Central: Canvas DAG + Inspector */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Canvas DAG Engine Viewport */}
        <div 
          className="flex-1 relative overflow-auto p-12 bg-background bg-grid-dense flex items-center justify-center"
          style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center center' }}
        >
          {/* Conexões SVG do Grafo DAG */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="dagTeal" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#27E0C3" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#718BFF" stopOpacity="0.9" />
              </linearGradient>
            </defs>
            {/* Node 1 to Node 2 */}
            <path d="M 280 180 L 380 180" stroke="#27E0C3" strokeWidth="2" strokeDasharray="4,2" />
            {/* Node 2 to Node 4 */}
            <path d="M 580 180 C 630 180, 630 260, 680 260" stroke="#27E0C3" strokeWidth="2.5" />
            {/* Node 3 to Node 4 */}
            <path d="M 280 340 C 480 340, 580 280, 680 280" stroke="#718BFF" strokeWidth="2.5" />
            {/* Node 4 to Node 5 */}
            <path d="M 880 270 L 980 270" stroke="url(#dagTeal)" strokeWidth="2.5" className={isExecuting ? "animate-pulse" : ""} />
            {/* Node 5 to Node 6 */}
            <path d="M 1180 270 L 1280 270" stroke="#253247" strokeWidth="2" strokeDasharray="4,4" />
          </svg>

          {/* Nós da DAG em posicionamento estruturado */}
          <div className="flex items-center gap-16 z-10 relative">
            {/* Coluna 1: Fontes */}
            <div className="flex flex-col gap-16">
              {/* Node 1: Source A */}
              <div
                onClick={() => setSelectedNode(pipeline.nodes[0])}
                className={`w-60 p-3 rounded-lg border bg-surface-container-low cursor-pointer transition-all ${
                  selectedNode?.id === 'node-1' ? 'border-primary ring-1 ring-primary shadow-teal-glow' : 'border-outline-variant hover:border-outline'
                }`}
              >
                <div className="flex items-center justify-between border-b border-outline-variant/60 pb-1.5 mb-2">
                  <span className="text-[11px] font-bold text-on-surface flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px] text-secondary">database</span>
                    {pipeline.nodes[0].label}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                </div>
                <div className="text-[10px] font-code-compact text-on-surface-variant space-y-1">
                  <div>Tipo: Ingestão Contínua</div>
                  <div className="text-primary font-bold">{pipeline.nodes[0].itemsProcessed?.toLocaleString()} registros</div>
                  <div>Latência: {pipeline.nodes[0].latency}</div>
                </div>
              </div>

              {/* Node 3: Source B */}
              <div
                onClick={() => setSelectedNode(pipeline.nodes[2])}
                className={`w-60 p-3 rounded-lg border bg-surface-container-low cursor-pointer transition-all ${
                  selectedNode?.id === 'node-3' ? 'border-primary ring-1 ring-primary shadow-teal-glow' : 'border-outline-variant hover:border-outline'
                }`}
              >
                <div className="flex items-center justify-between border-b border-outline-variant/60 pb-1.5 mb-2">
                  <span className="text-[11px] font-bold text-on-surface flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px] text-primary">table_chart</span>
                    {pipeline.nodes[2].label}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                </div>
                <div className="text-[10px] font-code-compact text-on-surface-variant space-y-1">
                  <div>Tipo: Planilha Financeira</div>
                  <div className="text-secondary font-bold">{pipeline.nodes[2].itemsProcessed?.toLocaleString()} registros</div>
                  <div>Latência: {pipeline.nodes[2].latency}</div>
                </div>
              </div>
            </div>

            {/* Coluna 2: Transformação */}
            <div className="flex flex-col justify-center">
              {/* Node 2: Transform */}
              <div
                onClick={() => setSelectedNode(pipeline.nodes[1])}
                className={`w-60 p-3 rounded-lg border bg-surface-container-low cursor-pointer transition-all ${
                  selectedNode?.id === 'node-2' ? 'border-primary ring-1 ring-primary shadow-teal-glow' : 'border-outline-variant hover:border-outline'
                }`}
              >
                <div className="flex items-center justify-between border-b border-outline-variant/60 pb-1.5 mb-2">
                  <span className="text-[11px] font-bold text-on-surface flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px] text-primary">build</span>
                    {pipeline.nodes[1].label}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                </div>
                <div className="text-[10px] font-code-compact text-on-surface-variant space-y-1">
                  <div>Trim & Sanitização</div>
                  <div className="text-primary font-bold">Zeros à Esquerda Removidos</div>
                  <div>Latência: {pipeline.nodes[1].latency}</div>
                </div>
              </div>
            </div>

            {/* Coluna 3: JOIN & Reconciliação */}
            <div className="flex flex-col justify-center">
              {/* Node 4: Intelligent JOIN */}
              <div
                onClick={() => setSelectedNode(pipeline.nodes[3])}
                className={`w-64 p-3.5 rounded-lg border bg-surface-container-high cursor-pointer transition-all ${
                  selectedNode?.id === 'node-4' ? 'border-primary ring-2 ring-primary shadow-teal-glow' : 'border-primary/50'
                }`}
              >
                <div className="flex items-center justify-between border-b border-outline-variant/60 pb-1.5 mb-2">
                  <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">join_inner</span>
                    {pipeline.nodes[3].label}
                  </span>
                  <span className="px-1 py-0.2 rounded bg-primary/20 text-primary text-[9px] font-code-compact font-bold">
                    CORE
                  </span>
                </div>
                <div className="text-[10px] font-code-compact text-on-surface-variant space-y-1">
                  <div className="text-on-surface font-semibold">MATVINC ↔ matricula</div>
                  <div className="text-primary font-bold">14.320 correspondências</div>
                  <div className="text-amber-400 font-semibold">1 funcionário s/ pagamento</div>
                  <div>Latência: {pipeline.nodes[3].latency}</div>
                </div>
              </div>
            </div>

            {/* Coluna 4: Validação & Auditoria */}
            <div className="flex flex-col justify-center">
              {/* Node 5: Validation */}
              <div
                onClick={() => setSelectedNode(pipeline.nodes[4])}
                className={`w-60 p-3 rounded-lg border bg-surface-container-low cursor-pointer transition-all ${
                  selectedNode?.id === 'node-5' ? 'border-primary ring-1 ring-primary shadow-teal-glow' : 'border-outline-variant hover:border-outline'
                }`}
              >
                <div className="flex items-center justify-between border-b border-outline-variant/60 pb-1.5 mb-2">
                  <span className="text-[11px] font-bold text-on-surface flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px] text-emerald-400">verified</span>
                    {pipeline.nodes[4].label}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                </div>
                <div className="text-[10px] font-code-compact text-on-surface-variant space-y-1">
                  <div>Auditoria de Integridade</div>
                  <div className="text-emerald-400 font-bold">0 violações críticas</div>
                  <div>Latência: {pipeline.nodes[4].latency}</div>
                </div>
              </div>
            </div>

            {/* Coluna 5: Destino / Export */}
            <div className="flex flex-col justify-center">
              {/* Node 6: Export */}
              <div
                onClick={() => setSelectedNode(pipeline.nodes[5])}
                className={`w-60 p-3 rounded-lg border bg-surface-container-low cursor-pointer transition-all ${
                  selectedNode?.id === 'node-6' ? 'border-primary ring-1 ring-primary shadow-teal-glow' : 'border-outline-variant hover:border-outline'
                }`}
              >
                <div className="flex items-center justify-between border-b border-outline-variant/60 pb-1.5 mb-2">
                  <span className="text-[11px] font-bold text-on-surface flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px] text-outline">output</span>
                    {pipeline.nodes[5].label}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-outline"></span>
                </div>
                <div className="text-[10px] font-code-compact text-on-surface-variant space-y-1">
                  <div>Endpoint API REST</div>
                  <div>Status: Aguardando Trigger</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Node Inspector Drawer */}
        {selectedNode && (
          <aside className="w-80 bg-surface-container-low border-l border-outline-variant p-4 flex flex-col justify-between overflow-y-auto shrink-0 text-xs">
            <div className="space-y-4">
              <div className="border-b border-outline-variant pb-2">
                <span className="text-[10px] font-code-compact text-primary uppercase tracking-wider block">
                  {selectedNode.category}
                </span>
                <h3 className="text-sm font-bold text-on-surface mt-0.5">{selectedNode.label}</h3>
              </div>

              <div>
                <span className="text-[10px] font-code-compact text-on-surface-variant uppercase block mb-1">
                  Descrição Operacional
                </span>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  {selectedNode.description}
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-outline-variant">
                <span className="text-[10px] font-code-compact text-on-surface-variant uppercase block">
                  Telemetria do Nó
                </span>
                <div className="bg-surface-container p-2.5 rounded border border-outline-variant/60 space-y-1.5 font-code-compact text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Status:</span>
                    <span className="text-emerald-400 font-bold">{selectedNode.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Itens Processados:</span>
                    <span className="text-on-surface font-bold">{selectedNode.itemsProcessed?.toLocaleString() || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Latência Média:</span>
                    <span className="text-primary font-bold">{selectedNode.latency || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Tipo do Nó:</span>
                    <span className="text-secondary">{selectedNode.nodeType}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-outline-variant">
                <span className="text-[10px] font-code-compact text-on-surface-variant uppercase block mb-1">
                  Mapeamento n8n Workflow
                </span>
                <div className="p-2 rounded bg-surface-container border border-outline-variant text-[11px] font-code-compact text-on-surface-variant">
                  <div>Nó correspondente: <strong className="text-primary">Data Bridge Logic</strong></div>
                  <div>Workflow ID: <code className="text-secondary">{N8N_WORKFLOW_REFS.DATA_BRIDGE_POC}</code></div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-outline-variant">
              <button 
                onClick={() => setNotification(`Configurações do nó "${selectedNode.label}" validadas.`)}
                className="w-full py-1.5 rounded bg-surface-container hover:bg-surface-container-high border border-outline-variant text-xs text-on-surface font-medium transition-colors"
              >
                Auditar Parâmetros do Nó
              </button>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};
