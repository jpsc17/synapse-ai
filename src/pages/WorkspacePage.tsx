import { Icon } from '../components/common/Icon';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSynapse } from '../context/SynapseContext';

const NODE_WIDTH = 288;
const NODE_HEIGHT = 172;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 1.5;
const clampZoom = (value: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));

export const WorkspacePage: React.FC = () => {
  const navigate = useNavigate();
  const { dataSources, candidates, selectedDataSource, setSelectedDataSource, setIsUploadModalOpen } = useSynapse();
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number } | null>(null);
  const [transform, setTransform] = useState({ x: 80, y: 80, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(() => window.matchMedia('(min-width: 768px)').matches);

  useEffect(() => {
    const desktopQuery = window.matchMedia('(min-width: 768px)');
    const adaptInspector = (event: MediaQueryListEvent | MediaQueryList) => setInspectorOpen(event.matches);
    adaptInspector(desktopQuery);
    desktopQuery.addEventListener('change', adaptInspector);
    return () => desktopQuery.removeEventListener('change', adaptInspector);
  }, []);

  const nodes = useMemo(() => dataSources.map((source, index) => ({
    source,
    x: (index % 3) * 380,
    y: Math.floor(index / 3) * 250,
  })), [dataSources]);

  const activeDs = selectedDataSource || dataSources[0];
  const principalRelationship = candidates[0] ?? null;
  const sourceNode = nodes.find(node => node.source.id === principalRelationship?.sourceDataSourceId);
  const targetNode = nodes.find(node => node.source.id === principalRelationship?.targetDataSourceId);

  const fitCanvas = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport || nodes.length === 0) return;
    const minX = Math.min(...nodes.map(node => node.x));
    const minY = Math.min(...nodes.map(node => node.y));
    const maxX = Math.max(...nodes.map(node => node.x + NODE_WIDTH));
    const maxY = Math.max(...nodes.map(node => node.y + NODE_HEIGHT));
    const boundsWidth = maxX - minX;
    const boundsHeight = maxY - minY;
    const padding = 72;
    const scale = clampZoom(Math.min(
      (viewport.clientWidth - padding * 2) / boundsWidth,
      (viewport.clientHeight - padding * 2) / boundsHeight,
    ));
    setTransform({
      scale,
      x: (viewport.clientWidth - boundsWidth * scale) / 2 - minX * scale,
      y: (viewport.clientHeight - boundsHeight * scale) / 2 - minY * scale,
    });
  }, [nodes]);

  useEffect(() => {
    if (nodes.length > 0) requestAnimationFrame(fitCanvas);
  }, [fitCanvas, nodes.length]);

  const zoomAt = useCallback((nextScale: number, clientX?: number, clientY?: number) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const rect = viewport.getBoundingClientRect();
    const focusX = (clientX ?? rect.left + rect.width / 2) - rect.left;
    const focusY = (clientY ?? rect.top + rect.height / 2) - rect.top;
    setTransform(current => {
      const scale = clampZoom(nextScale);
      const worldX = (focusX - current.x) / current.scale;
      const worldY = (focusY - current.y) / current.scale;
      return { scale, x: focusX - worldX * scale, y: focusY - worldY * scale };
    });
  }, []);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest('[data-dag-node], button')) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: transform.x,
      originY: transform.y,
    };
    setIsPanning(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setTransform(current => ({
      ...current,
      x: drag.originX + event.clientX - drag.startX,
      y: drag.originY + event.clientY - drag.startY,
    }));
  };

  const stopPanning = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
      setIsPanning(false);
    }
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    zoomAt(transform.scale + (event.deltaY > 0 ? -0.1 : 0.1), event.clientX, event.clientY);
  };

  const relatedCandidates = activeDs
    ? candidates.filter(candidate => candidate.sourceDataSourceId === activeDs.id || candidate.targetDataSourceId === activeDs.id)
    : [];

  return (
    <div className="relative flex h-[calc(100vh-7.5rem)] min-h-[32rem] overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest md:h-[calc(100vh-8.5rem)]">
      <div className="flex-1 min-w-0 flex flex-col relative overflow-hidden bg-background bg-grid-dense">
        <div className="h-10 shrink-0 bg-surface-container-low/90 backdrop-blur-md border-b border-outline-variant px-3 sm:px-4 flex items-center justify-between z-20">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] font-code-compact text-on-surface-variant uppercase tracking-wider hidden sm:inline">Topologia:</span>
            <span className="px-2 py-0.5 rounded bg-surface-container text-xs font-code-compact text-primary font-semibold truncate">
              {dataSources.length} fonte(s) reais · visualização de referência
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => setIsUploadModalOpen(true)} className="flex items-center gap-1 px-2.5 py-1 rounded bg-surface-container hover:bg-surface-container-high border border-outline-variant text-xs text-primary transition-colors">
              <Icon name="add" className="text-[15px]" />
              <span className="hidden md:inline">Fonte de Dados</span>
            </button>
            <div className="flex items-center gap-1 bg-surface-container-lowest/80 border border-outline-variant rounded px-1.5 py-0.5">
              <button onClick={() => zoomAt(transform.scale - 0.1)} className="p-1 text-on-surface-variant hover:text-on-surface" title="Diminuir zoom">
                <Icon name="zoom_out" className="text-[15px]" />
              </button>
              <span className="text-[11px] font-code-compact text-outline px-1 min-w-10 text-center">{Math.round(transform.scale * 100)}%</span>
              <button onClick={() => zoomAt(transform.scale + 0.1)} className="p-1 text-on-surface-variant hover:text-on-surface" title="Aumentar zoom">
                <Icon name="zoom_in" className="text-[15px]" />
              </button>
              <div className="h-3 w-px bg-outline-variant" />
              <button onClick={fitCanvas} className="p-1 text-on-surface-variant hover:text-on-surface" title="Ajustar todos os nós à tela">
                <Icon name="fit_screen" className="text-[15px]" />
              </button>
            </div>
            <button onClick={() => setInspectorOpen(value => !value)} className="p-1 text-on-surface-variant hover:text-on-surface rounded bg-surface-container border border-outline-variant" title="Alternar painel de inspeção">
              <Icon name="dock_to_right" className="text-[16px]" />
            </button>
          </div>
        </div>

        <div
          ref={viewportRef}
          className={`flex-1 relative overflow-hidden touch-none select-none ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={stopPanning}
          onPointerCancel={stopPanning}
          onWheel={handleWheel}
          aria-label="Canvas de topologia: arraste o fundo para navegar e use a roda para zoom"
        >
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-center p-8">
              <div>
                <Icon name="account_tree" className="text-4xl text-outline" />
                <p className="mt-2 text-sm text-on-surface">Nenhuma fonte cadastrada</p>
                <p className="text-xs text-on-surface-variant">Adicione uma fonte para iniciar a topologia.</p>
              </div>
            </div>
          )}

          <div className="absolute left-0 top-0 will-change-transform" style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`, transformOrigin: '0 0' }}>
            {sourceNode && targetNode && (
              <svg className="absolute left-0 top-0 overflow-visible pointer-events-none" width="1" height="1" aria-hidden="true">
                <defs>
                  <linearGradient id="workspaceRelationship" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#27E0C3" />
                    <stop offset="100%" stopColor="#718BFF" />
                  </linearGradient>
                </defs>
                <path
                  d={`M ${sourceNode.x + NODE_WIDTH} ${sourceNode.y + NODE_HEIGHT / 2} C ${sourceNode.x + NODE_WIDTH + 80} ${sourceNode.y + NODE_HEIGHT / 2}, ${targetNode.x - 80} ${targetNode.y + NODE_HEIGHT / 2}, ${targetNode.x} ${targetNode.y + NODE_HEIGHT / 2}`}
                  fill="none"
                  stroke="url(#workspaceRelationship)"
                  strokeWidth="3"
                  strokeDasharray="7 5"
                />
              </svg>
            )}

            {nodes.map(({ source, x, y }) => (
              <button
                key={source.id}
                type="button"
                data-dag-node
                onClick={() => setSelectedDataSource(source)}
                className={`absolute text-left bg-surface-container-low border rounded-lg p-3 transition-[border-color,box-shadow] shadow-lg cursor-pointer ${activeDs?.id === source.id ? 'border-primary ring-1 ring-primary shadow-teal-glow' : 'border-outline-variant hover:border-outline'}`}
                style={{ left: x, top: y, width: NODE_WIDTH, minHeight: NODE_HEIGHT }}
              >
                <div className="flex items-center justify-between gap-2 border-b border-outline-variant/60 pb-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon name="database" className="text-primary text-[18px]" />
                    <span className="text-xs font-bold text-on-surface truncate">{source.name}</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded bg-primary/15 text-primary text-[10px] font-code-compact uppercase shrink-0">{source.sourceType}</span>
                </div>
                <div className="space-y-1.5 text-xs font-code-compact">
                  {source.columns.slice(0, 3).map(column => (
                    <div key={column.name} className="flex justify-between gap-3 text-on-surface-variant">
                      <span className="truncate">{column.name}</span>
                      <span className="text-outline shrink-0">{column.type}</span>
                    </div>
                  ))}
                  {source.columns.length === 0 && <span className="text-on-surface-variant">Esquema não disponível</span>}
                </div>
                <div className="mt-3 pt-2 border-t border-outline-variant/50 flex items-center justify-between gap-2 text-[10px] font-code-compact text-on-surface-variant">
                  <span>{source.rowCount.toLocaleString()} linhas</span>
                  <span className="truncate">ID {source.id.slice(0, 8)}</span>
                </div>
              </button>
            ))}
          </div>

          <div className="absolute left-3 bottom-3 px-2 py-1 rounded bg-surface-container-low/90 border border-outline-variant text-[10px] text-on-surface-variant font-code-compact pointer-events-none">
            Arraste o fundo para mover · roda para zoom · 10%–150%
          </div>
        </div>
      </div>

      {inspectorOpen && activeDs && (
        <aside className="absolute inset-y-0 right-0 z-30 flex w-[min(90vw,24rem)] shrink-0 flex-col justify-between overflow-y-auto border-l border-outline-variant bg-surface-container-low md:relative md:z-auto md:w-80 lg:w-96">
          <div className="p-space-md space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <div className="flex items-center gap-2 min-w-0">
                <Icon name="troubleshoot" className="text-primary text-[20px]" />
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-on-surface truncate">{activeDs.name}</h3>
                  <span className="text-[10px] font-code-compact text-on-surface-variant">{activeDs.sourceType.toUpperCase()} · {activeDs.rowCount.toLocaleString()} linhas · ID {activeDs.id.slice(0, 8)}</span>
                </div>
              </div>
              <button onClick={() => setInspectorOpen(false)} className="text-on-surface-variant hover:text-on-surface p-1" title="Fechar inspeção">
                <Icon name="close" className="text-[16px]" />
              </button>
            </div>

            <p className="text-xs text-on-surface-variant">{activeDs.description || 'Descrição não informada pela API.'}</p>

            <div>
              <span className="text-[10px] font-code-compact text-on-surface-variant uppercase tracking-wider block mb-2">Esquema detectado ({activeDs.columns.length})</span>
              <div className="space-y-2">
                {activeDs.columns.map(column => (
                  <div key={column.name} className="p-2 rounded bg-surface-container border border-outline-variant/60 text-xs font-code-compact">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-on-surface truncate">{column.name}</span>
                      <span className="px-1.5 py-0.5 rounded bg-surface-container-high text-primary text-[10px]">{column.type}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-on-surface-variant mt-1">
                      <span>Unicidade: {(column.uniquenessRatio * 100).toFixed(0)}%</span>
                      <span>Nulos: {(column.nullRatio * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-code-compact text-on-surface-variant uppercase tracking-wider block mb-2">Relações do plano ativo</span>
              {relatedCandidates.length === 0 ? (
                <div className="p-2.5 rounded bg-surface-container border border-outline-variant text-xs text-on-surface-variant">Nenhuma descoberta ativa envolve esta fonte.</div>
              ) : relatedCandidates.slice(0, 5).map(candidate => (
                <div key={candidate.id} className="mb-2 p-2.5 rounded bg-surface-container border border-primary/30 text-xs">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-bold text-primary font-code-compact truncate">{candidate.sourceColumn} ↔ {candidate.targetColumn}</span>
                    <span className="text-[10px] font-bold text-primary shrink-0">{candidate.score.toFixed(1)}</span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant">Pontuação heurística · {candidate.classificacao}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-space-md border-t border-outline-variant space-y-2 bg-surface-container">
            <button onClick={() => navigate('/discovery')} className="w-full py-1.5 px-3 rounded bg-primary text-on-primary text-xs font-semibold hover:shadow-teal-glow transition-all flex items-center justify-center gap-1.5">
              <Icon name="auto_awesome" className="text-[16px]" /><span>Analisar descobertas</span>
            </button>
            <button onClick={() => navigate('/pipelines')} className="w-full py-1.5 px-3 rounded bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant text-xs text-on-surface font-medium transition-colors flex items-center justify-center gap-1.5">
              <Icon name="account_tree" className="text-[16px]" /><span>Abrir pipeline</span>
            </button>
          </div>
        </aside>
      )}
    </div>
  );
};
