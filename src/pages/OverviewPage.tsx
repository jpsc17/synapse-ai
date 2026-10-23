import { Icon } from '../components/common/Icon';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSynapse } from '../context/SynapseContext';

export const OverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { metrics, dataSources, candidates, setIsUploadModalOpen } = useSynapse();
  const totalRecords = dataSources.reduce((total, source) => total + source.rowCount, 0);
  const totalColumns = dataSources.reduce((total, source) => total + source.columnCount, 0);

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
            <Icon name="add_link" className="text-[15px] text-secondary" />
            <span>Conectar Fonte de Dados</span>
          </button>
          <button 
            onClick={() => navigate('/pipelines')}
            className="h-8 px-space-md rounded bg-surface-container border border-outline-variant text-on-surface hover:border-primary text-xs flex items-center gap-1.5 transition-colors"
          >
            <Icon name="account_tree" className="text-[15px] text-primary" />
            <span>Abrir Pipelines</span>
          </button>
          <button 
            onClick={() => navigate('/workspace')}
            className="h-8 px-space-md rounded bg-primary text-on-primary text-xs font-semibold flex items-center gap-1.5 hover:shadow-teal-glow transition-all"
          >
            <Icon name="hub" className="text-[15px]" />
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
              <Icon name="database" className="text-[15px] text-primary" />
              Fontes Conectadas
            </span>
            <span className="px-1.5 py-0.5 rounded bg-primary-container/10 border border-primary/30 text-primary text-[10px] font-semibold">
              {dataSources.length} listada(s)
            </span>
          </div>
          <div className="my-space-sm flex items-baseline justify-between">
            <span className="text-3xl font-bold text-on-surface tracking-tight font-code-compact">
              {metrics.totalFontes}
            </span>
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
              <Icon name="schema" className="text-[15px] text-secondary" />
              Relações Identificadas
            </span>
            <span className="px-1.5 py-0.5 rounded bg-secondary-container/20 border border-secondary/40 text-secondary text-[10px] font-semibold">
              {metrics.planosPendentes} pendente(s)
            </span>
          </div>
          <div className="my-space-sm flex items-baseline justify-between">
            <span className="text-3xl font-bold text-on-surface tracking-tight font-code-compact">
              {metrics.relacionamentosIdentificados}
            </span>
          </div>
          <div className="pt-space-xs border-t border-outline-variant/60 flex items-center justify-between text-[11px] font-code-compact">
            <span className="text-on-surface-variant">Planos: <strong className="text-primary">{metrics.relacionamentosIdentificados}</strong></span>
            <span className="text-on-surface-variant">Aprovados: <strong className="text-secondary">{metrics.planosAprovados}</strong></span>
          </div>
        </div>

        {/* Card 3: Pipelines Ativos */}
        <div className="bg-surface-container-low border border-outline-variant rounded p-space-md flex flex-col justify-between hover:border-primary/40 transition-colors">
          <div className="flex items-center justify-between text-code-compact text-xs">
            <span className="text-on-surface-variant flex items-center gap-1.5">
              <Icon name="account_tree" className="text-[15px] text-primary" />
              Pipelines Executados
            </span>
            <span className="px-1.5 py-0.5 rounded bg-primary-container/10 border border-primary/30 text-primary text-[10px] font-semibold">
              {metrics.execucoesConcluidas} execução(ões)
            </span>
          </div>
          <div className="my-space-sm flex items-baseline justify-between">
            <span className="text-3xl font-bold text-on-surface tracking-tight font-code-compact">
              {metrics.pipelinesExecutados}
            </span>
          </div>
          <div className="pt-space-xs border-t border-outline-variant/60 flex items-center justify-between text-[11px] font-code-compact">
            <span className="text-on-surface-variant">Registros catalogados: <strong className="text-on-surface">{totalRecords.toLocaleString('pt-BR')}</strong></span>
            <span className="text-primary">Match médio: {metrics.taxaAutoMatch}%</span>
          </div>
        </div>

        {/* Card 4: Qualidade de Dados */}
        <div className="bg-surface-container-low border border-outline-variant rounded p-space-md flex flex-col justify-between hover:border-primary/40 transition-colors">
          <div className="flex items-center justify-between text-code-compact text-xs">
            <span className="text-on-surface-variant flex items-center gap-1.5">
              <Icon name="verified" className="text-[15px] text-emerald-400" />
              Qualidade dos Dados
            </span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-semibold">
              {totalColumns} coluna(s)
            </span>
          </div>
          <div className="my-space-sm flex items-baseline justify-between">
            <span className="text-3xl font-bold text-on-surface tracking-tight font-code-compact">
              {metrics.qualidadeMedia}%
            </span>
          </div>
          <div className="pt-space-xs border-t border-outline-variant/60 flex items-center justify-between text-[11px] font-code-compact">
            <span className="text-on-surface-variant">Completude calculada sobre os metadados reais</span>
          </div>
        </div>
      </section>

      {/* 3. Seção Intermediária: Topologia Ativa e Descoberta Inteligente */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md">
        {/* Painel Esquerdo: Relação Destaque Descoberta Heurística */}
        <div className="lg:col-span-7 self-start bg-surface-container-low border border-outline-variant rounded-lg p-space-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-outline-variant/60 pb-space-sm mb-space-md">
              <div className="flex items-center gap-2">
                <Icon name="auto_awesome" className="text-primary text-[20px]" />
                <span className="text-sm font-semibold text-on-surface">
                  Descoberta Heurística em Destaque
                </span>
                <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/25 text-[10px] font-code-compact">
                  Heurística Ativa
                </span>
              </div>
              <button 
                onClick={() => navigate('/discovery')}
                className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
              >
                <span>{candidates.length > 0 ? `Ver ${candidates.length} sugestão(ões)` : 'Abrir descoberta'}</span>
                <Icon name="arrow_forward" className="text-[14px]" />
              </button>
            </div>

            {candidates[0] && (
              <div className="bg-surface-container p-space-md rounded border border-outline-variant space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-code-compact">
                    <span className="text-secondary font-semibold">{candidates[0].sourceDataSourceName.split(' ')[0]}</span>
                    <span className="text-primary font-bold">.{candidates[0].sourceColumn}</span>
                    <Icon name="swap_horiz" className="text-[14px] text-outline" />
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
                    <span className="text-secondary font-semibold">
                      {candidates[0].fatores.similaridadeSemanticaNome == null
                        ? 'Não informado'
                        : `${(candidates[0].fatores.similaridadeSemanticaNome * 100).toFixed(0)}%`}
                    </span>
                  </div>
                  <div className="bg-surface-container-lowest p-2 rounded">
                    <span className="text-on-surface-variant block text-[10px]">Status:</span>
                    <span className="text-amber-400 font-semibold">{candidates[0].status}</span>
                  </div>
                </div>
              </div>
            )}
            {!candidates[0] && (
              <div className="rounded border border-dashed border-outline-variant bg-surface-container-lowest p-6 text-center">
                <Icon name="manage_search" className="mx-auto h-7 w-7 text-outline" />
                <p className="mt-2 text-sm font-semibold text-on-surface">Nenhuma descoberta ativa nesta sessão</p>
                <p className="mt-1 text-xs text-on-surface-variant">Selecione duas fontes e execute a descoberta para preencher este painel com evidências reais.</p>
                <button onClick={() => navigate('/discovery')} className="mt-4 rounded bg-primary px-3 py-1.5 text-xs font-semibold text-on-primary">
                  Iniciar descoberta
                </button>
              </div>
            )}
          </div>

          <div className="pt-space-md flex items-center justify-end gap-2">
            <button 
              onClick={() => navigate('/discovery')}
              className="px-3 py-1.5 rounded bg-primary text-on-primary text-xs font-semibold hover:shadow-teal-glow transition-all flex items-center gap-1.5"
            >
              <Icon name="visibility" className="text-[16px]" />
              <span>{candidates[0] ? 'Inspecionar evidências' : 'Abrir descoberta'}</span>
            </button>
          </div>
        </div>

        {/* Painel Direito: Fontes Monitoradas & Status de Sincronia */}
        <div className="lg:col-span-5 bg-surface-container-low border border-outline-variant rounded-lg p-space-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-outline-variant/60 pb-space-sm mb-space-md">
              <div className="flex items-center gap-2">
                <Icon name="dns" className="text-secondary text-[20px]" />
                <span className="text-sm font-semibold text-on-surface">Topologia de Fontes</span>
              </div>
              <button 
                onClick={() => navigate('/datasources')}
                className="text-xs text-secondary hover:underline flex items-center gap-1 font-medium"
              >
                <span>Gerenciar</span>
                <Icon name="arrow_forward" className="text-[14px]" />
              </button>
            </div>

            <div className="space-y-2">
              {dataSources.slice(0, 8).map(ds => (
                <div key={ds.id} className="p-2 rounded bg-surface-container border border-outline-variant flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Icon name={ds.sourceType === 'postgresql' ? 'database' : ds.sourceType === 'excel' ? 'table_chart' : 'cloud'} className="w-4 h-4 text-primary" />
                    <div>
                      <div className="text-on-surface font-medium">{ds.name}</div>
                      <div className="text-[10px] text-on-surface-variant font-code-compact">
                        {ds.rowCount.toLocaleString()} linhas • {ds.columnCount} colunas
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-code-compact text-primary">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                    <span>Atualizada {new Date(ds.updatedAt).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
              ))}
              {dataSources.length > 8 && (
                <button onClick={() => navigate('/datasources')} className="w-full rounded border border-outline-variant px-3 py-2 text-xs text-primary hover:border-primary">
                  Ver mais {dataSources.length - 8} fonte(s)
                </button>
              )}
            </div>
          </div>

          <div className="pt-space-md border-t border-outline-variant/60 mt-space-md flex items-center justify-between text-xs">
            <span className="text-on-surface-variant">Catálogo retornado pela API:</span>
            <span className="text-primary font-code-compact font-semibold">{dataSources.length} fonte(s)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
