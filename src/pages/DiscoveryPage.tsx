import React, { useState } from 'react';
import { useSynapse } from '../context/SynapseContext';

export const DiscoveryPage: React.FC = () => {
  const { candidates, activeCandidate, setActiveCandidate, approveCandidate, rejectCandidate, dataSources, setIsUploadModalOpen } = useSynapse();
  const [minConfidence, setMinConfidence] = useState(70);
  const [onlyKeys, setOnlyKeys] = useState(true);
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const currentCandidate = activeCandidate || candidates[0];

  const filteredCandidates = candidates.filter(c => {
    if (c.score < minConfidence) return false;
    if (onlyKeys && c.classificacao === 'REJEITADO') return false;
    return true;
  });

  const handleApprove = () => {
    if (currentCandidate) {
      approveCandidate(currentCandidate.id);
    }
  };

  const handleConfirmReject = () => {
    if (currentCandidate && rejectionReason.trim()) {
      rejectCandidate(currentCandidate.id, rejectionReason);
      setRejectionModalOpen(false);
      setRejectionReason('');
    }
  };

  const handleExportJson = () => {
    if (!currentCandidate) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentCandidate, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `synapse_relacao_${currentCandidate.sourceColumn}_${currentCandidate.targetColumn}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-space-lg max-w-7xl w-full mx-auto pb-12">
      {/* 1. Header da Tela & Status da Varredura */}
      <section className="bg-surface-container-low border border-outline-variant p-space-md rounded-lg relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-on-surface tracking-tight">Descoberta Inteligente</h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-code-compact bg-primary/10 text-primary border border-primary/25 font-semibold">
                Motor Heurístico Ativo
              </span>
            </div>
            <p className="text-xs text-on-surface-variant max-w-2xl">
              Encontre relações ocultas entre fontes de dados desconexas com explicabilidade algorítmica e validação humana em tempo real.
            </p>
          </div>

          {/* Quick Metrics Cluster */}
          <div className="flex items-center gap-4 bg-surface-container-lowest/80 border border-outline-variant/60 px-space-md py-space-sm rounded">
            <div className="text-right">
              <div className="text-[10px] font-code-compact text-on-surface-variant">Taxa de Auto-Match</div>
              <div className="text-lg font-bold text-primary font-code-compact">96.8%</div>
            </div>
            <div className="h-6 w-px bg-outline-variant"></div>
            <div>
              <div className="text-[10px] font-code-compact text-on-surface-variant">Algoritmos de Inferência</div>
              <div className="text-xs font-code-compact text-secondary font-medium">Jaccard Token + Overlap Mínimo</div>
            </div>
          </div>
        </div>

        {/* Continuous Scan Status Bar */}
        <div className="mt-space-md pt-space-sm border-t border-outline-variant/50 flex flex-wrap items-center justify-between gap-2 text-xs font-code-compact">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span className="text-on-surface font-medium">Varredura Contínua:</span>
            <span className="text-on-surface-variant">
              {dataSources.length} fontes analisadas, 12 esquemas, 38 campos correlacionados em 4.2s
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-surface-container-high text-primary border border-outline-variant text-[11px]">
              Status: Pronto para Decisão
            </span>
            <span className="text-outline-variant">|</span>
            <span className="text-on-surface-variant">n8n Workflow ID: LHJTja7RuShTAcJo</span>
          </div>
        </div>
      </section>

      {/* 2. Seleção de Fontes e Filtros de Confiança */}
      <section className="bg-surface-container border border-outline-variant p-space-md rounded-lg flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-space-md">
          {/* Fonte Origem */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-code-compact text-on-surface-variant uppercase tracking-wider">Fonte Origem</label>
            <div className="flex items-center gap-2 px-space-sm py-1 bg-surface-container-lowest border border-outline-variant rounded h-8 text-xs font-code-compact">
              <span className="material-symbols-outlined text-[15px] text-secondary">database</span>
              <span className="text-on-surface font-medium">{currentCandidate?.sourceDataSourceName || 'PostgreSQL'}</span>
            </div>
          </div>

          <span className="material-symbols-outlined text-outline-variant self-end pb-1.5 hidden md:block">swap_horiz</span>

          {/* Fonte Destino */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-code-compact text-on-surface-variant uppercase tracking-wider">Fonte Destino</label>
            <div className="flex items-center gap-2 px-space-sm py-1 bg-surface-container-lowest border border-outline-variant rounded h-8 text-xs font-code-compact">
              <span className="material-symbols-outlined text-[15px] text-primary">table_chart</span>
              <span className="text-on-surface font-medium">{currentCandidate?.targetDataSourceName || 'Excel'}</span>
            </div>
          </div>

          <div className="h-8 w-px bg-outline-variant hidden lg:block self-end pb-2"></div>

          {/* Filtro de Confiança */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-code-compact text-on-surface-variant uppercase tracking-wider">Confiança Mínima</label>
            <select
              value={minConfidence}
              onChange={(e) => setMinConfidence(Number(e.target.value))}
              className="h-8 px-space-sm bg-surface-container-lowest border border-outline-variant rounded text-xs font-code-compact text-primary focus:outline-none focus:border-primary"
            >
              <option value={85}>&gt; 85% Alta Confiança</option>
              <option value={70}>&gt; 70% Recomendado</option>
              <option value={40}>&gt; 40% Todos os Candidatos</option>
            </select>
          </div>
        </div>

        {/* Controls: Toggles & Upload button */}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-code-compact">
            <input 
              type="checkbox" 
              checked={onlyKeys} 
              onChange={(e) => setOnlyKeys(e.target.checked)}
              className="rounded bg-surface-container border-outline-variant text-primary focus:ring-primary"
            />
            <span className="text-on-surface">Apenas Chaves Candidatas</span>
          </label>
          <div className="h-6 w-px bg-outline-variant"></div>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1 bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant text-primary text-xs rounded transition-colors"
          >
            <span className="material-symbols-outlined text-[15px]">upload_file</span>
            <span>Testar Novo Arquivo</span>
          </button>
        </div>
      </section>

      {/* 3. Card Principal de Relação Descoberta com Explicabilidade Profunda */}
      {currentCandidate && (
        <article className="bg-surface-container-low border border-outline-variant rounded-lg overflow-hidden shadow-card-subtle transition-all">
          {/* Header do Card */}
          <div className="px-space-lg py-space-md bg-surface-container border-b border-outline-variant flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-space-sm">
              <span className="material-symbols-outlined text-primary text-[22px]">join_inner</span>
              <div>
                <div className="text-sm font-semibold text-on-surface flex items-center gap-2">
                  <span>Relação Sugerida:</span>
                  <span className="font-code-base text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/25">
                    {currentCandidate.sourceColumn} ↔ {currentCandidate.targetColumn}
                  </span>
                  <span className="text-[10px] font-code-compact px-1.5 py-0.5 rounded bg-surface-container-highest text-secondary border border-outline-variant">
                    {currentCandidate.tipoRelacao}
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant font-code-compact mt-0.5">
                  Identificado por: {currentCandidate.algoritmo}
                </p>
              </div>
            </div>

            {/* Badge Confiança */}
            <div className="flex items-center gap-3 px-space-md py-1 bg-surface-container-lowest border border-primary/40 rounded">
              <div className="text-right">
                <div className="text-[9px] font-code-compact text-on-surface-variant tracking-wider uppercase">PONTUAÇÃO HEURÍSTICA</div>
                <div className="text-base font-bold text-primary font-code-compact leading-none">
                  {currentCandidate.score.toFixed(1)}%
                </div>
              </div>
              <div className="w-7 h-7 rounded-full border-2 border-primary border-t-transparent animate-spin flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-[14px]">bolt</span>
              </div>
            </div>
          </div>

          <div className="p-space-lg space-y-space-lg">
            {/* Comparativo Lado a Lado de Esquemas */}
            <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-center">
              {/* Coluna Esquerda: Fonte Origem */}
              <div className="md:col-span-5 bg-surface-container border border-outline-variant rounded p-space-md space-y-3">
                <div className="flex items-center justify-between border-b border-outline-variant/60 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary text-[16px]">database</span>
                    <span className="text-xs font-code-compact font-semibold text-secondary">
                      [{currentCandidate.sourceDataSourceName.split(' ')[0]}]
                    </span>
                    <span className="text-xs font-bold text-on-surface">{currentCandidate.sourceColumn}</span>
                  </div>
                  <span className="px-1.5 py-0.5 text-[10px] font-code-compact rounded bg-surface-container-high text-on-surface-variant border border-outline-variant">
                    {currentCandidate.evidencias.tipoA.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-code-compact">
                  <div className="bg-surface-container-lowest p-2 rounded border border-outline-variant/40">
                    <span className="text-on-surface-variant block text-[10px]">Não-nulos:</span>
                    <span className="text-on-surface font-semibold">100.0%</span>
                  </div>
                  <div className="bg-surface-container-lowest p-2 rounded border border-outline-variant/40">
                    <span className="text-on-surface-variant block text-[10px]">Unicidade:</span>
                    <span className="text-primary font-semibold">100.0% (Chave)</span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-code-compact text-on-surface-variant block mb-1 uppercase tracking-wider">
                    Amostra no Domínio:
                  </span>
                  <div className="bg-surface-container-lowest p-2 rounded border border-outline-variant space-y-1 font-code-compact text-xs">
                    <div className="flex justify-between text-on-surface">
                      <span>"1001"</span>
                      <span className="text-primary text-[10px]">match ✓</span>
                    </div>
                    <div className="flex justify-between text-on-surface">
                      <span>"1002"</span>
                      <span className="text-primary text-[10px]">match ✓</span>
                    </div>
                    <div className="flex justify-between text-amber-400">
                      <span>"1003" (Carla)</span>
                      <span className="text-outline text-[10px]">apenas em A</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Indicador Central com Regra de Normalização */}
              <div className="md:col-span-1 flex flex-col items-center justify-center gap-2">
                <div className="p-2 rounded-full bg-surface-container-high border border-primary text-primary flex items-center justify-center shadow-teal-glow">
                  <span className="material-symbols-outlined text-[18px]">sync_alt</span>
                </div>
                <span className="text-[9px] font-code-compact text-center text-on-surface-variant">
                  Match 1:1
                </span>
              </div>

              {/* Coluna Direita: Fonte Destino */}
              <div className="md:col-span-5 bg-surface-container border border-outline-variant rounded p-space-md space-y-3">
                <div className="flex items-center justify-between border-b border-outline-variant/60 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[16px]">table_chart</span>
                    <span className="text-xs font-code-compact font-semibold text-primary">
                      [{currentCandidate.targetDataSourceName.split(' ')[0]}]
                    </span>
                    <span className="text-xs font-bold text-on-surface">{currentCandidate.targetColumn}</span>
                  </div>
                  <span className="px-1.5 py-0.5 text-[10px] font-code-compact rounded bg-surface-container-high text-on-surface-variant border border-outline-variant">
                    {currentCandidate.evidencias.tipoB.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-code-compact">
                  <div className="bg-surface-container-lowest p-2 rounded border border-outline-variant/40">
                    <span className="text-on-surface-variant block text-[10px]">Não-nulos:</span>
                    <span className="text-on-surface font-semibold">100.0%</span>
                  </div>
                  <div className="bg-surface-container-lowest p-2 rounded border border-outline-variant/40">
                    <span className="text-on-surface-variant block text-[10px]">Unicidade:</span>
                    <span className="text-secondary font-semibold">99.8% (Quase Chave)</span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-code-compact text-on-surface-variant block mb-1 uppercase tracking-wider">
                    Amostra no Domínio:
                  </span>
                  <div className="bg-surface-container-lowest p-2 rounded border border-outline-variant space-y-1 font-code-compact text-xs">
                    <div className="flex justify-between text-on-surface">
                      <span>"1001"</span>
                      <span className="text-primary text-[10px]">match ✓</span>
                    </div>
                    <div className="flex justify-between text-on-surface">
                      <span>"1002"</span>
                      <span className="text-primary text-[10px]">match ✓</span>
                    </div>
                    <div className="flex justify-between text-purple-400">
                      <span>"1004" (Pagamento Avulso)</span>
                      <span className="text-outline text-[10px]">apenas em B</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Painel de Explicabilidade Heurística (5 Fatores) */}
            <div className="bg-surface-container p-space-md rounded border border-outline-variant space-y-2">
              <span className="text-xs font-semibold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[16px]">analytics</span>
                <span>Fatores Explicáveis da Decisão Algorítmica</span>
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 text-xs font-code-compact">
                <div className="bg-surface-container-lowest p-2.5 rounded border border-outline-variant/50">
                  <span className="text-on-surface-variant block text-[10px]">Semântica de Nomes:</span>
                  <span className="text-secondary font-bold text-sm">{(currentCandidate.fatores.similaridadeSemanticaNome * 100).toFixed(0)}%</span>
                  <span className="text-[10px] text-outline block mt-0.5">Raiz "mat/func"</span>
                </div>
                <div className="bg-surface-container-lowest p-2.5 rounded border border-outline-variant/50">
                  <span className="text-on-surface-variant block text-[10px]">Tipagem & Formato:</span>
                  <span className="text-primary font-bold text-sm">{(currentCandidate.fatores.compatibilidadeTipo * 100).toFixed(0)}%</span>
                  <span className="text-[10px] text-outline block mt-0.5">Ambos Integer</span>
                </div>
                <div className="bg-surface-container-lowest p-2.5 rounded border border-outline-variant/50">
                  <span className="text-on-surface-variant block text-[10px]">Sobreposição Mínima:</span>
                  <span className="text-primary font-bold text-sm">{(currentCandidate.fatores.sobreposicaoValoresMin * 100).toFixed(0)}%</span>
                  <span className="text-[10px] text-outline block mt-0.5">Intersecção de Valores</span>
                </div>
                <div className="bg-surface-container-lowest p-2.5 rounded border border-outline-variant/50">
                  <span className="text-on-surface-variant block text-[10px]">Jaccard de Valores:</span>
                  <span className="text-on-surface font-bold text-sm">{(currentCandidate.fatores.jaccardValores * 100).toFixed(0)}%</span>
                  <span className="text-[10px] text-outline block mt-0.5">Similaridade Global</span>
                </div>
                <div className="bg-surface-container-lowest p-2.5 rounded border border-outline-variant/50">
                  <span className="text-on-surface-variant block text-[10px]">Consistência 1:1:</span>
                  <span className="text-emerald-400 font-bold text-sm">{(currentCandidate.fatores.consistenciaUnicidade * 100).toFixed(0)}%</span>
                  <span className="text-[10px] text-outline block mt-0.5">Sem duplicatas</span>
                </div>
              </div>
            </div>

            {/* Preview do JOIN quando aprovado */}
            {currentCandidate.status === 'PLANO_APROVADO_EXECUTADO' && currentCandidate.joinPreview && (
              <div className="bg-surface-container p-space-md rounded border border-primary/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">task_alt</span>
                    <span>Resultado do JOIN Executado (Preview Determinístico)</span>
                  </span>
                  <span className="text-[10px] font-code-compact px-2 py-0.5 rounded bg-primary/20 text-primary font-bold">
                    PLANO_APROVADO_EXECUTADO
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-code-compact border-collapse">
                    <thead>
                      <tr className="border-b border-outline-variant text-on-surface-variant text-[11px]">
                        <th className="p-2">MATVINC (Base A)</th>
                        <th className="p-2">NOME_SERVIDOR</th>
                        <th className="p-2">SETOR</th>
                        <th className="p-2">VALOR_PAGAMENTO (Base B)</th>
                        <th className="p-2">COMPETÊNCIA</th>
                        <th className="p-2">STATUS RELAÇÃO</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentCandidate.joinPreview.map((row, idx) => (
                        <tr key={idx} className="border-b border-outline-variant/30 hover:bg-surface-container-high/40">
                          <td className="p-2 font-bold text-primary">{String(row.MATVINC)}</td>
                          <td className="p-2 text-on-surface">{String(row.NOME_SERVIDOR)}</td>
                          <td className="p-2 text-on-surface-variant">{String(row.SETOR)}</td>
                          <td className="p-2 text-on-surface">
                            {row.valor_pagamento ? `R$ ${Number(row.valor_pagamento).toFixed(2)}` : <span className="text-amber-400 font-bold">SEM PAGAMENTO</span>}
                          </td>
                          <td className="p-2 text-on-surface-variant">{String(row.competencia || '-')}</td>
                          <td className="p-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              row.status === 'CORRESPONDENCIA_ENCONTRADA'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            }`}>
                              {String(row.status)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Action Bar / Decisão Humana */}
            <div className="pt-2 border-t border-outline-variant flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-on-surface-variant font-code-compact">Decisão Humana Obrigatória:</span>
                <span className={`px-2 py-0.5 rounded text-[11px] font-code-compact font-semibold ${
                  currentCandidate.status === 'PLANO_APROVADO_EXECUTADO'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : currentCandidate.status === 'REJEITADO_PELO_USUARIO'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                }`}>
                  {currentCandidate.status}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportJson}
                  className="px-3 py-1.5 rounded bg-surface-container hover:bg-surface-container-high border border-outline-variant text-xs text-on-surface transition-colors flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[15px]">download</span>
                  <span>Exportar (.json)</span>
                </button>

                {currentCandidate.status !== 'REJEITADO_PELO_USUARIO' && (
                  <button
                    onClick={() => setRejectionModalOpen(true)}
                    className="px-3 py-1.5 rounded bg-surface-container hover:bg-red-500/20 border border-outline-variant hover:border-red-500/50 text-xs text-red-400 transition-colors flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[15px]">close</span>
                    <span>Rejeitar Relação</span>
                  </button>
                )}

                {currentCandidate.status !== 'PLANO_APROVADO_EXECUTADO' && (
                  <button
                    onClick={handleApprove}
                    className="px-4 py-1.5 rounded bg-primary text-on-primary text-xs font-semibold hover:shadow-teal-glow transition-all flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    <span>Aprovar Relação & Executar JOIN</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </article>
      )}

      {/* 4. Lista Secundária de Candidatos a Relacionamento */}
      <section className="space-y-space-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold font-code-compact text-on-surface uppercase tracking-wider">
            Demais Candidatos Identificados ({filteredCandidates.length})
          </h2>
          <span className="text-[11px] font-code-compact text-on-surface-variant">
            Clique em um candidato para carregar a matriz explicativa completa
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
          {filteredCandidates.map(cand => (
            <div
              key={cand.id}
              onClick={() => setActiveCandidate(cand)}
              className={`p-space-md rounded-lg border transition-all cursor-pointer ${
                cand.id === currentCandidate?.id
                  ? 'bg-surface-container-high border-primary shadow-teal-glow'
                  : 'bg-surface-container-low border-outline-variant hover:border-outline hover:bg-surface-container'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs font-code-compact">
                  <span className="text-primary font-bold">{cand.sourceColumn}</span>
                  <span className="text-outline">↔</span>
                  <span className="text-secondary font-bold">{cand.targetColumn}</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-code-compact ${
                  cand.score >= 80 ? 'bg-primary/20 text-primary' : 'bg-secondary/20 text-secondary'
                }`}>
                  Score {cand.score.toFixed(0)}%
                </span>
              </div>

              <p className="text-xs text-on-surface-variant line-clamp-2 mb-3">
                {cand.explicacao}
              </p>

              <div className="flex items-center justify-between text-[11px] font-code-compact text-on-surface-variant border-t border-outline-variant/50 pt-2">
                <span>{cand.sourceDataSourceName.split(' ')[0]} ↔ {cand.targetDataSourceName.split(' ')[0]}</span>
                <span className={`font-semibold ${
                  cand.status === 'PLANO_APROVADO_EXECUTADO' ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {cand.status === 'PLANO_APROVADO_EXECUTADO' ? 'Aprovado ✓' : 'Aguardando Aprovação'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Modal de Rejeição */}
      {rejectionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-surface-container-low border border-outline-variant rounded-lg max-w-md w-full p-space-md space-y-4">
            <div className="flex items-center gap-2 text-red-400">
              <span className="material-symbols-outlined">warning</span>
              <h3 className="text-sm font-semibold text-on-surface">Rejeitar Relação Candidata</h3>
            </div>
            <p className="text-xs text-on-surface-variant">
              Informe o motivo técnico da rejeição para registrar no log de auditoria do SYNAPSE:
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Ex: Domínios de identificação incompatíveis, regras de negócio distintas..."
              rows={3}
              className="w-full text-xs font-code-compact p-2 rounded bg-surface-container-lowest border border-outline-variant text-on-surface focus:outline-none focus:border-red-400"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRejectionModalOpen(false)}
                className="px-3 py-1.5 rounded bg-surface-container text-xs text-on-surface"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={!rejectionReason.trim()}
                className="px-3 py-1.5 rounded bg-red-600 hover:bg-red-500 text-white text-xs font-semibold disabled:opacity-50"
              >
                Confirmar Rejeição
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
