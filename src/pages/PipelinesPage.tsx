import { Icon } from '../components/common/Icon';
import React, { useEffect, useState } from 'react';
import { useSynapse } from '../context/SynapseContext';
import type { DagNode, PipelineExecution, PipelineExecutionSummary } from '../types/synapse';
import { apiService, N8N_WORKFLOW_REFS } from '../services/apiService';

const RecordsTable: React.FC<{ records: Array<Record<string, unknown>>; emptyLabel: string }> = ({ records, emptyLabel }) => {
  if (records.length === 0) {
    return <p className="p-3 text-xs text-on-surface-variant">{emptyLabel}</p>;
  }
  const columns = Array.from(new Set(records.flatMap(record => Object.keys(record))));
  return (
    <div className="overflow-auto max-h-44">
      <table className="w-full text-left text-[11px] font-code-compact">
        <thead className="sticky top-0 bg-surface-container-high text-on-surface-variant">
          <tr>{columns.map(column => <th key={column} className="px-2 py-1.5 whitespace-nowrap">{column}</th>)}</tr>
        </thead>
        <tbody>
          {records.map((record, index) => (
            <tr key={index} className="border-t border-outline-variant/40">
              {columns.map(column => (
                <td key={column} className="px-2 py-1.5 text-on-surface whitespace-nowrap">
                  {record[column] == null ? '—' : typeof record[column] === 'object' ? JSON.stringify(record[column]) : String(record[column])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const PipelinesPage: React.FC = () => {
  const {
    pipeline,
    executeJoinPipeline,
    executionResult,
    isExecuting,
    activePlanId,
    activePlanStatus,
    candidates,
    dataSources,
  } = useSynapse();
  const [selectedNode, setSelectedNode] = useState<DagNode | null>(pipeline.nodes[4]);
  const [zoom, setZoom] = useState(100);
  const [history, setHistory] = useState<PipelineExecutionSummary[]>([]);
  const [viewedExecution, setViewedExecution] = useState<PipelineExecution | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const displayedResult = executionResult ?? viewedExecution;

  const governedCandidate = candidates[0] ?? null;
  const sourceA = dataSources.find(source => source.id === governedCandidate?.sourceDataSourceId);
  const sourceB = dataSources.find(source => source.id === governedCandidate?.targetDataSourceId);

  const handleExecutePipeline = async () => {
    await executeJoinPipeline();
  };

  useEffect(() => {
    apiService.listPipelineExecutions().then(setHistory).catch(error => setHistoryError(error instanceof Error ? error.message : 'Falha ao carregar histórico.'));
  }, [executionResult]);

  const openExecution = async (executionId: string) => {
    setHistoryError(null);
    try { setViewedExecution(await apiService.getPipelineExecution(executionId)); }
    catch (error) { setHistoryError(error instanceof Error ? error.message : 'Falha ao carregar execução.'); }
  };

  const exportResult = (format: 'json' | 'csv') => {
    if (!displayedResult) return;
    const groups: Array<Record<string, unknown>> = [
      ...displayedResult.matched_records.map(record => ({ categoria_resultado: 'correspondente', ...record })),
      ...displayedResult.unmatched_source_a.map(record => ({ categoria_resultado: 'somente_origem', ...record })),
      ...displayedResult.unmatched_source_b.map(record => ({ categoria_resultado: 'somente_destino', ...record })),
    ];
    let content: string;
    let mime: string;
    if (format === 'json') {
      content = JSON.stringify(displayedResult, null, 2);
      mime = 'application/json';
    } else {
      const columns = [...new Set(groups.flatMap(record => Object.keys(record)))];
      const escape = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
      content = [columns.map(escape).join(','), ...groups.map(record => columns.map(column => escape(record[column])).join(','))].join('\n');
      mime = 'text/csv;charset=utf-8';
    }
    const url = URL.createObjectURL(new Blob([content], { type: mime }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `synapse-${displayedResult.execution_id}.${format}`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex min-h-[calc(100vh-7.5rem)] flex-col overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest md:h-[calc(100vh-8.5rem)]">
      {/* 1. Header do Pipeline */}
      <header className="flex min-h-12 shrink-0 flex-col gap-2 border-b border-outline-variant bg-surface-container-low px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <span className="text-xs font-code-compact text-outline-variant">DAG /</span>
          <h1 className="flex min-w-0 items-center gap-2 text-xs font-medium text-on-surface">
            <span className="shrink-0">Pipeline:</span> <span className="truncate text-primary font-code-base font-semibold">{pipeline.name}</span>
          </h1>
          <div className="h-4 w-px bg-outline-variant hidden sm:block"></div>
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 bg-surface-container rounded border border-outline-variant text-[11px] font-code-compact">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="text-on-surface">{activePlanStatus === 'APPROVED' ? 'Pronto para Execução' : activePlanStatus === 'EXECUTED' ? 'Executado' : 'Aguardando plano aprovado'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-code-compact text-outline hidden md:inline">
            Workflow n8n: <code className="text-primary">{N8N_WORKFLOW_REFS.DATA_BRIDGE_POC}</code>
          </span>
          <button 
            onClick={handleExecutePipeline}
            disabled={isExecuting || !activePlanId || activePlanStatus !== 'APPROVED'}
            className="px-3.5 py-1 bg-primary text-on-primary text-xs font-semibold rounded hover:shadow-teal-glow transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            {isExecuting ? (
              <>
                <span className="w-3 h-3 rounded-full border-2 border-on-primary border-t-transparent animate-spin"></span>
                <span>Executando DAG...</span>
              </>
            ) : (
              <>
                <Icon name="play_arrow" className="text-[16px]" />
                <span>Executar Pipeline</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* 2. Toolbar Superior do Canvas */}
      <div className="h-10 bg-surface-container-low/90 border-b border-outline-variant px-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 text-xs">
          <span className="text-[10px] font-code-compact text-outline mr-1 uppercase tracking-wider">Topologia visual de referência:</span>
          <span className="rounded border border-outline-variant bg-surface-container px-2 py-0.5 text-[11px] text-on-surface-variant">Origem → preparação → JOIN → governança → resultado</span>
        </div>

        <div className="flex items-center gap-1 bg-surface-container-lowest/80 border border-outline-variant rounded px-1.5 py-0.5">
          <button onClick={() => setZoom(prev => Math.max(prev - 10, 50))} className="p-0.5 text-on-surface-variant hover:text-on-surface">
            <Icon name="zoom_out" className="text-[14px]" />
          </button>
          <span className="text-[10px] font-code-compact text-outline px-1">{zoom}%</span>
          <button onClick={() => setZoom(prev => Math.min(prev + 10, 150))} className="p-0.5 text-on-surface-variant hover:text-on-surface">
            <Icon name="zoom_in" className="text-[14px]" />
          </button>
          <div className="h-3 w-px bg-outline-variant"></div>
          <button onClick={() => setZoom(100)} className="p-0.5 text-on-surface-variant hover:text-on-surface">
            <Icon name="fit_screen" className="text-[14px]" />
          </button>
        </div>
      </div>

      {displayedResult && (
        <section className="shrink-0 max-h-[22rem] overflow-y-auto bg-surface-container-low border-b border-outline-variant p-3 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-on-surface">Resultado real do Data Bridge</h2>
              <p className="text-[11px] font-code-compact text-on-surface-variant">
                Execução {displayedResult.execution_id} · workflow {displayedResult.workflow_id} · {displayedResult.duration_ms} ms
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-[11px] font-code-compact">
              <span className="px-2 py-1 rounded bg-primary/10 text-primary border border-primary/30">{displayedResult.matched_records.length} correspondentes</span>
              <span className="px-2 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">{displayedResult.unmatched_source_a.length} somente na origem</span>
              <span className="px-2 py-1 rounded bg-purple-500/10 text-purple-300 border border-purple-500/30">{displayedResult.unmatched_source_b.length} somente no destino</span>
              <button onClick={() => exportResult('csv')} className="rounded border border-outline-variant px-2 py-1 text-on-surface">Exportar CSV</button>
              <button onClick={() => exportResult('json')} className="rounded border border-outline-variant px-2 py-1 text-on-surface">Exportar JSON</button>
            </div>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
            <div className="rounded border border-primary/30 bg-surface-container-lowest overflow-hidden">
              <h3 className="px-3 py-2 text-xs font-semibold text-primary">Registros correspondentes</h3>
              <RecordsTable records={displayedResult.matched_records} emptyLabel="Nenhum registro correspondente retornado." />
            </div>
            <div className="rounded border border-amber-500/30 bg-surface-container-lowest overflow-hidden">
              <h3 className="px-3 py-2 text-xs font-semibold text-amber-400">Divergências da origem</h3>
              <RecordsTable records={displayedResult.unmatched_source_a} emptyLabel="Nenhuma divergência na origem." />
            </div>
            <div className="rounded border border-purple-500/30 bg-surface-container-lowest overflow-hidden">
              <h3 className="px-3 py-2 text-xs font-semibold text-purple-300">Divergências do destino</h3>
              <RecordsTable records={displayedResult.unmatched_source_b} emptyLabel="Nenhuma divergência no destino." />
            </div>
          </div>
        </section>
      )}

      <details className="shrink-0 border-b border-outline-variant bg-surface-container-low px-3 py-2 text-xs">
        <summary className="cursor-pointer font-semibold text-on-surface">Histórico real de execuções ({history.length})</summary>
        {historyError && <p className="mt-2 text-error">{historyError}</p>}
        <div className="mt-2 flex max-h-32 flex-col gap-1 overflow-auto">
          {history.map(item => (
            <button key={item.execution_id} onClick={() => void openExecution(item.execution_id)} className="grid grid-cols-1 gap-1 rounded border border-outline-variant bg-surface-container px-2 py-2 text-left hover:border-primary sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
              <span className="truncate text-on-surface"><strong>{item.source_a_name}</strong> ↔ <strong>{item.source_b_name}</strong><span className="ml-2 font-code-compact text-[10px] text-secondary">{item.execution_id.slice(0, 8)}</span></span>
              <span className="font-code-compact text-[10px] text-on-surface-variant">{item.matched_records_count} match · {item.unmatched_a_count + item.unmatched_b_count} divergência(s)</span>
              <span className="font-code-compact text-[10px] text-primary">{new Date(item.executed_at).toLocaleString('pt-BR')}</span>
            </button>
          ))}
          {!history.length && !historyError && <p className="text-on-surface-variant">Nenhuma execução registrada.</p>}
        </div>
      </details>

      {/* 3. Área Central: Canvas DAG + Inspector */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Canvas DAG Engine Viewport */}
        <div 
          className="relative flex flex-1 items-center justify-start overflow-auto bg-background bg-grid-dense p-8 md:p-12"
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
          <div className="relative z-10 flex min-w-max items-center gap-16">
            {/* Coluna 1: Fontes */}
            <div className="flex flex-col gap-16">
              {/* Node 1: Source A */}
              <div
                onClick={() => setSelectedNode(pipeline.nodes[0])}
                className={`w-60 p-3 rounded-lg border bg-surface-container-low cursor-pointer transition-all ${
                  selectedNode?.id === pipeline.nodes[0].id ? 'border-primary ring-1 ring-primary shadow-teal-glow' : 'border-outline-variant hover:border-outline'
                }`}
              >
                <div className="flex items-center justify-between border-b border-outline-variant/60 pb-1.5 mb-2">
                  <span className="text-[11px] font-bold text-on-surface flex items-center gap-1.5">
                    <Icon name="database" className="text-[15px] text-secondary" />
                    {sourceA?.name || 'Fonte de origem não selecionada'}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                </div>
                <div className="text-[10px] font-code-compact text-on-surface-variant space-y-1">
                  <div>Tipo: {sourceA?.sourceType || '—'}</div>
                  <div className="text-primary font-bold">{sourceA ? `${sourceA.rowCount.toLocaleString()} registros` : 'Sem plano ativo'}</div>
                </div>
              </div>

              {/* Node 3: Source B */}
              <div
                onClick={() => setSelectedNode(pipeline.nodes[1])}
                className={`w-60 p-3 rounded-lg border bg-surface-container-low cursor-pointer transition-all ${
                  selectedNode?.id === pipeline.nodes[1].id ? 'border-primary ring-1 ring-primary shadow-teal-glow' : 'border-outline-variant hover:border-outline'
                }`}
              >
                <div className="flex items-center justify-between border-b border-outline-variant/60 pb-1.5 mb-2">
                  <span className="text-[11px] font-bold text-on-surface flex items-center gap-1.5">
                    <Icon name="table_chart" className="text-[15px] text-primary" />
                    {sourceB?.name || 'Fonte de destino não selecionada'}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                </div>
                <div className="text-[10px] font-code-compact text-on-surface-variant space-y-1">
                  <div>Tipo: {sourceB?.sourceType || '—'}</div>
                  <div className="text-secondary font-bold">{sourceB ? `${sourceB.rowCount.toLocaleString()} registros` : 'Sem plano ativo'}</div>
                </div>
              </div>
            </div>

            {/* Coluna 2: Transformação */}
            <div className="flex flex-col justify-center">
              {/* Node 2: Transform */}
              <div
                onClick={() => setSelectedNode(pipeline.nodes[2])}
                className={`w-60 p-3 rounded-lg border bg-surface-container-low cursor-pointer transition-all ${
                  selectedNode?.id === pipeline.nodes[2].id ? 'border-primary ring-1 ring-primary shadow-teal-glow' : 'border-outline-variant hover:border-outline'
                }`}
              >
                <div className="flex items-center justify-between border-b border-outline-variant/60 pb-1.5 mb-2">
                  <span className="text-[11px] font-bold text-on-surface flex items-center gap-1.5">
                    <Icon name="build" className="text-[15px] text-primary" />
                    {pipeline.nodes[2].label}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                </div>
                <div className="text-[10px] font-code-compact text-on-surface-variant space-y-1">
                  <div>Etapa visual da topologia</div>
                  <div className="text-on-surface-variant">Sem telemetria fornecida pela API</div>
                </div>
              </div>
            </div>

            {/* Coluna 3: JOIN & Reconciliação */}
            <div className="flex flex-col justify-center">
              {/* Node 4: Intelligent JOIN */}
              <div
                onClick={() => setSelectedNode(pipeline.nodes[4])}
                className={`w-64 p-3.5 rounded-lg border bg-surface-container-high cursor-pointer transition-all ${
                  selectedNode?.id === pipeline.nodes[4].id ? 'border-primary ring-2 ring-primary shadow-teal-glow' : 'border-primary/50'
                }`}
              >
                <div className="flex items-center justify-between border-b border-outline-variant/60 pb-1.5 mb-2">
                  <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                    <Icon name="join_inner" className="text-[16px]" />
                    {pipeline.nodes[4].label}
                  </span>
                  <span className="px-1 py-0.2 rounded bg-primary/20 text-primary text-[9px] font-code-compact font-bold">
                    CORE
                  </span>
                </div>
                <div className="text-[10px] font-code-compact text-on-surface-variant space-y-1">
                  <div className="text-on-surface font-semibold">{governedCandidate ? `${governedCandidate.sourceColumn} ↔ ${governedCandidate.targetColumn}` : 'Chaves aguardando descoberta'}</div>
                  <div className="text-primary font-bold">{displayedResult ? `${displayedResult.matched_records.length} correspondências` : 'Aguardando execução real'}</div>
                  {displayedResult && <div className="text-amber-400 font-semibold">{displayedResult.unmatched_source_a.length + displayedResult.unmatched_source_b.length} divergências</div>}
                  <div>Latência: {displayedResult ? `${displayedResult.duration_ms} ms` : '—'}</div>
                </div>
              </div>
            </div>

            {/* Coluna 4: Validação & Auditoria */}
            <div className="flex flex-col justify-center">
              {/* Node 5: Validation */}
              <div
                className="w-60 p-3 rounded-lg border bg-surface-container-low border-outline-variant"
              >
                <div className="flex items-center justify-between border-b border-outline-variant/60 pb-1.5 mb-2">
                  <span className="text-[11px] font-bold text-on-surface flex items-center gap-1.5">
                    <Icon name="verified" className="text-[15px] text-emerald-400" />
                    Governança & Auditoria
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                </div>
                <div className="text-[10px] font-code-compact text-on-surface-variant space-y-1">
                  <div>Governança do plano</div>
                  <div className="text-emerald-400 font-bold">{activePlanStatus || 'SEM PLANO'}</div>
                </div>
              </div>
            </div>

            {/* Coluna 5: Destino / Export */}
            <div className="flex flex-col justify-center">
              {/* Node 6: Export */}
              <div
                onClick={() => setSelectedNode(pipeline.nodes[5])}
                className={`w-60 p-3 rounded-lg border bg-surface-container-low cursor-pointer transition-all ${
                  selectedNode?.id === pipeline.nodes[5].id ? 'border-primary ring-1 ring-primary shadow-teal-glow' : 'border-outline-variant hover:border-outline'
                }`}
              >
                <div className="flex items-center justify-between border-b border-outline-variant/60 pb-1.5 mb-2">
                  <span className="text-[11px] font-bold text-on-surface flex items-center gap-1.5">
                    <Icon name="output" className="text-[15px] text-outline" />
                    {pipeline.nodes[5].label}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-outline"></span>
                </div>
                <div className="text-[10px] font-code-compact text-on-surface-variant space-y-1">
                  <div>Endpoint API REST</div>
                  <div>Status: {displayedResult?.status || 'Aguardando execução'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Node Inspector Drawer */}
        {selectedNode && (
          <aside className="absolute inset-y-0 right-0 z-30 flex w-[min(90vw,20rem)] shrink-0 flex-col justify-between overflow-y-auto border-l border-outline-variant bg-surface-container-low p-4 text-xs lg:relative lg:z-auto lg:w-80">
            <div className="space-y-4">
              <div className="border-b border-outline-variant pb-2">
                <div className="flex items-center justify-between"><span className="block text-[10px] font-code-compact uppercase tracking-wider text-primary">{selectedNode.category}</span><button onClick={() => setSelectedNode(null)} aria-label="Fechar inspetor"><Icon name="close" className="h-4 w-4 text-on-surface-variant" /></button></div>
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
                  <div className="flex justify-between gap-3">
                    <span className="text-on-surface-variant">Status do nó:</span>
                    <span className="text-on-surface font-bold">Não disponível pela API</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Status do pipeline:</span>
                    <span className="text-emerald-400 font-bold">{displayedResult?.status || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Itens Processados:</span>
                    <span className="text-on-surface font-bold">{displayedResult ? displayedResult.matched_records.length + displayedResult.unmatched_source_a.length + displayedResult.unmatched_source_b.length : '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Duração da execução:</span>
                    <span className="text-primary font-bold">{displayedResult ? `${displayedResult.duration_ms} ms` : '—'}</span>
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

          </aside>
        )}
      </div>
    </div>
  );
};
