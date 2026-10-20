import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSynapse } from '../context/SynapseContext';

export const OverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { metrics, dataSources, candidates, setIsUploadModalOpen } = useSynapse();

  return (
    <div className="space-y-space-lg bg-grid-dots pb-12">
      {/* 1. Header de Boas-Vindas Executivo */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md pb-space-sm border-b border-outline-variant">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-on-surface">Visão Geral</h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Entenda a estrutura, a integridade e as conexões dos seus sistemas em tempo real.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-space-sm">
          <button 
            onClick={() => setIsUploadModalOpen(true)}
            className="h-8 px-space-md rounded bg-surface-container border border-outline-variant text-on-surface hover:border-secondary text-xs flex items-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-[15px] text-secondary">add_link</span>
            <span>Conectar Fonte de Dados</span>
          </button>
          <button 
            onClick={() => navigate('/pipelines')}
            className="h-8 px-space-md rounded bg-surface-container border border-outline-variant text-on-surface hover:border-primary text-xs flex items-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-[15px] text-primary">account_tree</span>
            <span>Novo Pipeline</span>
          </button>
          <button 
            onClick={() => navigate('/workspace')}
            className="h-8 px-space-md rounded bg-primary text-on-primary text-xs font-semibold flex items-center gap-1.5 hover:shadow-teal-glow transition-all"
          >
            <span className="material-symbols-outlined text-[15px]">hub</span>
            <span>Explorar Workspace</span>
          </button>
        </div>
      </div>

      {/* 2. Quatro Cards Principais de KPIs com Sparklines e Badges Técnicos */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md">
        {/* Card 1: Fontes Conectadas */}
        <div className="bg-surface-container-low border border-outline-variant rounded p-space-md flex flex-col justify-between hover:border-primary/40 transition-colors">
          <div className="flex items-center justify-between text-code-compact text-xs">
            <span className="text-on-surface-variant flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px] text-primary">database</span>
              Fontes Conectadas
            </span>
            <span className="px-1.5 py-0.5 rounded bg-primary-container/10 border border-primary/30 text-primary text-[10px] font-semibold">
              +{dataSources.length} ativas
            </span>
          </div>
          <div className="my-space-sm flex items-baseline justify-between">
            <span className="text-3xl font-bold text-on-surface tracking-tight font-code-compact">
              0{dataSources.length}
            </span>
            <svg className="w-24 h-7 text-primary" fill="none" viewBox="0 0 100 30">
              <path d="M0 24 L18 20 L36 22 L54 14 L72 16 L90 8 L100 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
              <path d="M0 24 L18 20 L36 22 L54 14 L72 16 L90 8 L100 6 L100 30 L0 30 Z" fill="currentColor" fillOpacity="0.08"></path>
            </svg>
          </div>
          <div className="pt-space-xs border-t border-outline-variant/60 flex flex-wrap gap-1">
            {dataSources.slice(0, 4).map(ds => (
              <span key={ds.id} className="px-1.5 py-0.5 rounded bg-surface-container text-[10px] font-code-compact text-on-surface-variant">
                {ds.name.split(' ')[0]}
              </span>
            ))}
          </div>
        </div>

        {/* Card 2: Relacionamentos Identificados */}
        <div className="bg-surface-container-low border border-outline-variant rounded p-space-md flex flex-col justify-between hover:border-secondary/40 transition-colors">
          <div className="flex items-center justify-between text-code-compact text-xs">
            <span className="text-on-surface-variant flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px] text-secondary">schema</span>
              Relações Identificadas
            </span>
            <span className="px-1.5 py-0.5 rounded bg-secondary-container/20 border border-secondary/40 text-secondary text-[10px] font-semibold">
              94% confiança média
            </span>
          </div>
          <div className="my-space-sm flex items-baseline justify-between">
            <span className="text-3xl font-bold text-on-surface tracking-tight font-code-compact">
              {metrics.relacionamentosIdentificados}
            </span>
            <svg className="w-24 h-7 text-secondary" fill="none" viewBox="0 0 100 30">
              <path d="M0 26 L20 22 L40 18 L60 12 L80 14 L100 4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
              <path d="M0 26 L20 22 L40 18 L60 12 L80 14 L100 4 L100 30 L0 30 Z" fill="currentColor" fillOpacity="0.08"></path>
            </svg>
          </div>
          <div className="pt-space-xs border-t border-outline-variant/60 flex items-center justify-between text-[11px] font-code-compact">
            <span className="text-on-surface-variant">Preditivas: <strong className="text-primary">12</strong></span>
            <span className="text-on-surface-variant">Aprovadas: <strong className="text-secondary">2</strong></span>
          </div>
        </div>

        {/* Card 3: Pipelines Ativos */}
        <div className="bg-surface-container-low border border-outline-variant rounded p-space-md flex flex-col justify-between hover:border-primary/40 transition-colors">
          <div className="flex items-center justify-between text-code-compact text-xs">
            <span className="text-on-surface-variant flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px] text-primary">account_tree</span>
              Pipelines Ativos
            </span>
            <span className="px-1.5 py-0.5 rounded bg-primary-container/10 border border-primary/30 text-primary text-[10px] font-semibold">
              100% Saudáveis
            </span>
          </div>
          <div className="my-space-sm flex items-baseline justify-between">
            <span className="text-3xl font-bold text-on-surface tracking-tight font-code-compact">
              0{metrics.pipelinesAtivos}
            </span>
            <svg className="w-24 h-7 text-primary" fill="none" viewBox="0 0 100 30">
              <path d="M0 15 L25 15 L50 15 L75 10 L100 8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
              <path d="M0 15 L25 15 L50 15 L75 10 L100 8 L100 30 L0 30 Z" fill="currentColor" fillOpacity="0.08"></path>
            </svg>
          </div>
          <div className="pt-space-xs border-t border-outline-variant/60 flex items-center justify-between text-[11px] font-code-compact">
            <span className="text-on-surface-variant">Vazão: <strong className="text-on-surface">1.2M reg/dia</strong></span>
            <span className="text-primary">Latência: 45ms</span>
          </div>
        </div>

        {/* Card 4: Qualidade de Dados */}
        <div className="bg-surface-container-low border border-outline-variant rounded p-space-md flex flex-col justify-between hover:border-primary/40 transition-colors">
          <div className="flex items-center justify-between text-code-compact text-xs">
            <span className="text-on-surface-variant flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px] text-emerald-400">verified</span>
              Qualidade dos Dados
            </span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-semibold">
              SLA Conforme
            </span>
          </div>
          <div className="my-space-sm flex items-baseline justify-between">
            <span className="text-3xl font-bold text-on-surface tracking-tight font-code-compact">
              {metrics.qualidadeMedia}%
            </span>
            <svg className="w-24 h-7 text-emerald-400" fill="none" viewBox="0 0 100 30">
              <path d="M0 20 L20 18 L40 10 L60 8 L80 6 L100 4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
              <path d="M0 20 L20 18 L40 10 L60 8 L80 6 L100 4 L100 30 L0 30 Z" fill="currentColor" fillOpacity="0.08"></path>
            </svg>
          </div>
          <div className="pt-space-xs border-t border-outline-variant/60 flex items-center justify-between text-[11px] font-code-compact">
            <span className="text-on-surface-variant">Nulos tratados: <strong className="text-emerald-400">99.8%</strong></span>
            <span className="text-on-surface-variant">Inconsistências: <strong className="text-on-surface">0</strong></span>
          </div>
        </div>
      </section>

      {/* 3. Seção Intermediária: Topologia Ativa e Descoberta Inteligente */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md">
        {/* Painel Esquerdo: Relação Destaque Descoberta Heurística */}
        <div className="lg:col-span-7 bg-surface-container-low border border-outline-variant rounded-lg p-space-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-outline-variant/60 pb-space-sm mb-space-md">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">auto_awesome</span>
                <span className="text-sm font-semibold text-on-surface">
                  Descoberta Preditiva em Destaque
                </span>
                <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/25 text-[10px] font-code-compact">
                  Heurística Ativa
                </span>
              </div>
              <button 
                onClick={() => navigate('/discovery')}
                className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
              >
                <span>Ver todas as 3 sugestões</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            </div>

            {candidates[0] && (
              <div className="bg-surface-container p-space-md rounded border border-outline-variant space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-code-compact">
                    <span className="text-secondary font-semibold">{candidates[0].sourceDataSourceName.split(' ')[0]}</span>
                    <span className="text-primary font-bold">.{candidates[0].sourceColumn}</span>
                    <span className="material-symbols-outlined text-[14px] text-outline">swap_horiz</span>
                    <span className="text-secondary font-semibold">{candidates[0].targetDataSourceName.split(' ')[0]}</span>
                    <span className="text-primary font-bold">.{candidates[0].targetColumn}</span>
                  </div>
                  <div className="px-2 py-0.5 rounded bg-primary/10 border border-primary text-primary text-xs font-bold font-code-compact">
                    Score: {candidates[0].score}%
                  </div>
                </div>

                <p className="text-xs text-on-surface-variant leading-relaxed">
                  {candidates[0].explicacao}
                </p>

                <div className="grid grid-cols-3 gap-2 pt-2 text-[11px] font-code-compact border-t border-outline-variant/60">
                  <div className="bg-surface-container-lowest p-2 rounded">
                    <span className="text-on-surface-variant block text-[10px]">Valores Comuns:</span>
                    <span className="text-primary font-semibold">{candidates[0].evidencias.qtdValoresEmComum} registros</span>
                  </div>
                  <div className="bg-surface-container-lowest p-2 rounded">
                    <span className="text-on-surface-variant block text-[10px]">Afinidade Semântica:</span>
                    <span className="text-secondary font-semibold">{(candidates[0].fatores.similaridadeSemanticaNome * 100).toFixed(0)}%</span>
                  </div>
                  <div className="bg-surface-container-lowest p-2 rounded">
                    <span className="text-on-surface-variant block text-[10px]">Status:</span>
                    <span className="text-amber-400 font-semibold">Aguardando Aprovação</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="pt-space-md flex items-center justify-end gap-2">
            <button 
              onClick={() => navigate('/discovery')}
              className="px-3 py-1.5 rounded bg-primary text-on-primary text-xs font-semibold hover:shadow-teal-glow transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">visibility</span>
              <span>Inspecionar Evidências e Aprovar</span>
            </button>
          </div>
        </div>

        {/* Painel Direito: Fontes Monitoradas & Status de Sincronia */}
        <div className="lg:col-span-5 bg-surface-container-low border border-outline-variant rounded-lg p-space-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-outline-variant/60 pb-space-sm mb-space-md">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[20px]">dns</span>
                <span className="text-sm font-semibold text-on-surface">Topologia de Fontes</span>
              </div>
              <button 
                onClick={() => navigate('/datasources')}
                className="text-xs text-secondary hover:underline flex items-center gap-1 font-medium"
              >
                <span>Gerenciar</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            </div>

            <div className="space-y-2">
              {dataSources.map(ds => (
                <div key={ds.id} className="p-2 rounded bg-surface-container border border-outline-variant flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[16px]">
                      {ds.sourceType === 'postgresql' ? 'database' : ds.sourceType === 'excel' ? 'table_chart' : 'cloud'}
                    </span>
                    <div>
                      <div className="text-on-surface font-medium">{ds.name}</div>
                      <div className="text-[10px] text-on-surface-variant font-code-compact">
                        {ds.rowCount.toLocaleString()} linhas • {ds.columnCount} colunas
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-code-compact text-primary">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                    <span>{ds.lastSync}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-space-md border-t border-outline-variant/60 mt-space-md flex items-center justify-between text-xs">
            <span className="text-on-surface-variant">Sincronizador Automático:</span>
            <span className="text-primary font-code-compact font-semibold">ATIVO (Ciclos a cada 60s)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
