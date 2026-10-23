import React, { useEffect, useMemo, useState } from 'react';
import { Icon } from '../components/common/Icon';
import { useSynapse } from '../context/SynapseContext';
import { apiService } from '../services/apiService';
import type { DataSource, DataSourceBulkImpact, DataSourcePreview } from '../types/synapse';

const sourceIcon = (source: DataSource) => source.sourceType === 'postgresql'
  ? 'database'
  : source.sourceType === 'excel' ? 'table_chart' : source.sourceType === 'snowflake' ? 'cloud' : 'folder';

export const DataSourcesPage: React.FC = () => {
  const { dataSources, setIsUploadModalOpen, setSelectedDataSource, renameDataSource, refreshDataSources } = useSynapse();
  const [sources, setSources] = useState<DataSource[]>([]);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [duplicateOnly, setDuplicateOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'ARCHIVED' | 'ALL'>('ACTIVE');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [preview, setPreview] = useState<DataSourcePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [pendingDeletion, setPendingDeletion] = useState<{ ids: string[]; impact: DataSourceBulkImpact } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reloadSources = async () => {
    const allSources = await apiService.getDataSources(true);
    setSources(allSources);
    await refreshDataSources();
  };

  useEffect(() => {
    apiService.getDataSources(true).then(setSources).catch(loadError => {
      setError(loadError instanceof Error ? loadError.message : 'Falha ao carregar fontes.');
    });
  }, [dataSources.length]);

  const duplicateCounts = useMemo(() => sources.reduce<Record<string, number>>((counts, source) => {
    const key = source.name.trim().toLocaleLowerCase('pt-BR');
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {}), [sources]);

  const sourceTypes = useMemo(() => [...new Set(sources.map(source => source.sourceType))].sort(), [sources]);
  const filteredSources = useMemo(() => sources.filter(source => {
    const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR');
    const matchesQuery = !normalizedQuery
      || source.name.toLocaleLowerCase('pt-BR').includes(normalizedQuery)
      || source.id.toLocaleLowerCase('pt-BR').includes(normalizedQuery)
      || source.columns.some(column => column.name.toLocaleLowerCase('pt-BR').includes(normalizedQuery));
    const matchesType = typeFilter === 'ALL' || source.sourceType === typeFilter;
    const matchesStatus = statusFilter === 'ALL' || source.status === statusFilter;
    const isDuplicate = duplicateCounts[source.name.trim().toLocaleLowerCase('pt-BR')] > 1;
    return matchesQuery && matchesType && matchesStatus && (!duplicateOnly || isDuplicate);
  }), [sources, duplicateCounts, duplicateOnly, query, statusFilter, typeFilter]);

  const toggleSelected = (id: string) => setSelectedIds(previous => {
    const next = new Set(previous);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const openPreview = async (source: DataSource) => {
    setError(null);
    setPreviewLoading(true);
    setSelectedDataSource(source);
    try {
      setPreview(await apiService.getDataSourcePreview(source.id));
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : 'Falha ao visualizar a fonte.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const saveName = async (source: DataSource) => {
    const name = editingName.trim();
    if (!name || name === source.name) { setEditingId(null); return; }
    setBusy(true);
    setError(null);
    try {
      await renameDataSource(source.id, name);
      setSources(previous => previous.map(item => item.id === source.id ? { ...item, name } : item));
      setEditingId(null);
    } catch (renameError) {
      setError(renameError instanceof Error ? renameError.message : 'Falha ao renomear a fonte.');
    } finally { setBusy(false); }
  };

  const prepareDeletion = async (ids: string[]) => {
    setBusy(true);
    setError(null);
    try {
      const impact = await apiService.getDataSourcesBulkImpact(ids);
      setPendingDeletion({ ids, impact });
    } catch (dependencyError) {
      setError(dependencyError instanceof Error ? dependencyError.message : 'Falha ao validar dependências.');
    } finally { setBusy(false); }
  };

  const confirmDeletion = async () => {
    if (!pendingDeletion || pendingDeletion.impact.items.some(item => !item.can_delete)) return;
    setBusy(true);
    setError(null);
    try {
      if (pendingDeletion.ids.length === 1) await apiService.deleteDataSource(pendingDeletion.ids[0]);
      else await apiService.deleteDataSources(pendingDeletion.ids);
      await reloadSources();
      setSelectedIds(previous => new Set([...previous].filter(id => !pendingDeletion.ids.includes(id))));
      setPendingDeletion(null);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Falha ao excluir fontes.');
      setPendingDeletion(null);
    } finally { setBusy(false); }
  };

  const confirmResolvedDeletion = async () => {
    if (!pendingDeletion || pendingDeletion.ids.length !== 1 || !pendingDeletion.impact.items[0]?.can_resolve_and_delete) return;
    setBusy(true);
    setError(null);
    try {
      await apiService.deleteDataSource(pendingDeletion.ids[0], true);
      setSelectedIds(previous => new Set([...previous].filter(id => id !== pendingDeletion.ids[0])));
      setPendingDeletion(null);
      await reloadSources();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Falha ao excluir fonte e planos elegíveis.');
    } finally { setBusy(false); }
  };

  const changeArchiveState = async (source: DataSource) => {
    setBusy(true);
    setError(null);
    try {
      if (source.status === 'ARCHIVED') await apiService.restoreDataSource(source.id);
      else await apiService.archiveDataSource(source.id);
      await reloadSources();
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : 'Falha ao alterar o arquivamento.');
    } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-space-md pb-12">
      <div className="flex flex-col gap-4 border-b border-outline-variant pb-space-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-on-surface">Fontes de Dados Conectadas</h1>
          <p className="mt-0.5 text-xs text-on-surface-variant">Pesquise, inspecione e administre arquivos tabulares registrados no SQLite.</p>
        </div>
        <button onClick={() => setIsUploadModalOpen(true)} className="flex h-8 items-center gap-1.5 self-start rounded bg-primary px-space-md text-xs font-semibold text-on-primary transition-all hover:shadow-teal-glow sm:self-auto">
          <Icon name="upload_file" className="h-4 w-4" /> Importar CSV / XLSX
        </button>
      </div>

      <section className="grid gap-2 rounded-lg border border-outline-variant bg-surface-container-low p-3 md:grid-cols-[minmax(0,1fr)_10rem_10rem_auto_auto]">
        <label className="relative">
          <Icon name="search" className="absolute left-2.5 top-2 h-4 w-4 text-outline" />
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar por nome, ID ou coluna" className="h-8 w-full rounded border border-outline-variant bg-surface-container-lowest pl-8 pr-3 text-xs text-on-surface focus:border-primary focus:outline-none" />
        </label>
        <select value={typeFilter} onChange={event => setTypeFilter(event.target.value)} className="h-8 rounded border border-outline-variant bg-surface-container-lowest px-2 text-xs text-on-surface">
          <option value="ALL">Todos os tipos</option>
          {sourceTypes.map(type => <option key={type} value={type}>{type.toUpperCase()}</option>)}
        </select>
        <select aria-label="Filtrar por status" value={statusFilter} onChange={event => setStatusFilter(event.target.value as 'ACTIVE' | 'ARCHIVED' | 'ALL')} className="h-8 rounded border border-outline-variant bg-surface-container-lowest px-2 text-xs text-on-surface">
          <option value="ACTIVE">Ativas</option><option value="ARCHIVED">Arquivadas</option><option value="ALL">Todos os status</option>
        </select>
        <label className="flex h-8 items-center gap-2 rounded border border-outline-variant px-3 text-xs text-on-surface-variant">
          <input type="checkbox" checked={duplicateOnly} onChange={event => setDuplicateOnly(event.target.checked)} /> Somente duplicatas
        </label>
        <button disabled={!selectedIds.size || busy} onClick={() => void prepareDeletion([...selectedIds])} className="flex h-8 items-center justify-center gap-1.5 rounded border border-error/50 px-3 text-xs font-semibold text-error disabled:opacity-40">
          <Icon name="close" className="h-4 w-4" /> Excluir ({selectedIds.size})
        </button>
      </section>

      {error && <div role="alert" className="rounded border border-error/50 bg-error/10 px-3 py-2 text-xs text-on-surface">{error}</div>}
      <div className="flex items-center justify-between text-[11px] font-code-compact text-on-surface-variant"><span>{filteredSources.length} de {sources.length} fonte(s) · {sources.filter(source => source.status === 'ARCHIVED').length} arquivada(s)</span>{previewLoading && <span className="text-primary">Carregando amostra real...</span>}</div>

      {!filteredSources.length && <section className="rounded-lg border border-outline-variant bg-surface-container-low p-8 text-center"><Icon name="database_off" className="mx-auto h-8 w-8 text-outline" /><h2 className="mt-2 text-sm font-semibold text-on-surface">Nenhuma fonte encontrada</h2><p className="mt-1 text-xs text-on-surface-variant">Ajuste os filtros ou importe um arquivo CSV/XLSX.</p></section>}

      <div className="grid grid-cols-1 gap-space-md lg:grid-cols-2">
        {filteredSources.map(source => {
          const duplicateCount = duplicateCounts[source.name.trim().toLocaleLowerCase('pt-BR')];
          return (
            <article key={source.id} className="rounded-lg border border-outline-variant bg-surface-container-low p-space-md transition-all hover:border-primary/50">
              <div className="flex items-start gap-3">
                <input aria-label={`Selecionar ${source.name} ${source.id}`} type="checkbox" checked={selectedIds.has(source.id)} onChange={() => toggleSelected(source.id)} className="mt-1" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <Icon name={sourceIcon(source)} className="h-5 w-5 shrink-0 text-primary" />
                      {editingId === source.id ? <input autoFocus value={editingName} onChange={event => setEditingName(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') void saveName(source); if (event.key === 'Escape') setEditingId(null); }} className="h-7 min-w-0 rounded border border-primary bg-surface-container-lowest px-2 text-sm text-on-surface" /> : <h2 className="truncate text-sm font-bold text-on-surface">{source.name}</h2>}
                    </div>
                    <div className="flex items-center gap-1.5">{duplicateCount > 1 && <span className="rounded border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-400">Duplicata {duplicateCount}×</span>}<span className="rounded border border-outline-variant bg-surface-container px-2 py-0.5 text-xs font-medium text-primary">{source.sourceType.toUpperCase()}</span></div>
                  </div>
                  <p className="mt-1 break-all font-code-compact text-[10px] text-secondary">ID: {source.id}</p>
                  <p className="mt-2 text-xs text-on-surface-variant">{source.description}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-xs font-code-compact"><div className="rounded bg-surface-container p-2"><span className="block text-[10px] text-on-surface-variant">Registros</span><strong>{source.rowCount.toLocaleString('pt-BR')}</strong></div><div className="rounded bg-surface-container p-2"><span className="block text-[10px] text-on-surface-variant">Colunas</span><strong className="text-secondary">{source.columnCount}</strong></div><div className="rounded bg-surface-container p-2"><span className="block text-[10px] text-on-surface-variant">Status</span><strong className="text-primary">{source.status}</strong></div></div>
              <div className="mt-3 flex flex-wrap gap-1.5">{source.columns.slice(0, 6).map(column => <span key={column.name} className="rounded border border-outline-variant/60 bg-surface-container-lowest px-2 py-0.5 text-[11px] font-code-compact text-on-surface">{column.name} <span className="text-outline">({column.type})</span></span>)}</div>
              <footer className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-outline-variant/50 pt-3">
                <span className="text-[10px] text-on-surface-variant">{source.isCustomUpload ? 'Upload do usuário' : 'Fonte cadastrada'}</span>
                <div className="flex flex-wrap gap-2">
                  {editingId === source.id ? <><button disabled={busy} onClick={() => void saveName(source)} className="text-xs font-semibold text-primary">Salvar</button><button onClick={() => setEditingId(null)} className="text-xs text-on-surface-variant">Cancelar</button></> : <button onClick={() => { setEditingId(source.id); setEditingName(source.name); }} className="text-xs text-secondary">Renomear</button>}
                  <button onClick={() => void openPreview(source)} className="flex items-center gap-1 text-xs text-primary"><Icon name="visibility" className="h-3.5 w-3.5" /> Dados e esquema</button>
                  <button disabled={busy} onClick={() => void prepareDeletion([source.id])} className="text-xs text-on-surface-variant">Dependências</button>
                  <button disabled={busy} onClick={() => void changeArchiveState(source)} className="text-xs text-amber-400">{source.status === 'ARCHIVED' ? 'Restaurar' : 'Arquivar'}</button>
                  <button disabled={busy} onClick={() => void prepareDeletion([source.id])} className="text-xs text-error">Excluir</button>
                </div>
              </footer>
            </article>
          );
        })}
      </div>

      {preview && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Visualização da fonte"><div className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-outline-variant bg-surface-container-low shadow-2xl"><header className="flex items-start justify-between border-b border-outline-variant p-4"><div><h2 className="text-sm font-bold text-on-surface">{preview.source.name}</h2><p className="font-code-compact text-[10px] text-secondary">{preview.source.id}</p></div><button onClick={() => setPreview(null)} aria-label="Fechar visualização"><Icon name="close" className="h-5 w-5 text-on-surface-variant" /></button></header><div className="grid min-h-0 flex-1 gap-4 overflow-auto p-4 lg:grid-cols-[18rem_minmax(0,1fr)]"><aside className="space-y-2"><h3 className="text-xs font-semibold uppercase text-on-surface-variant">Esquema real</h3>{preview.source.columns.map(column => <div key={column.name} className="rounded border border-outline-variant bg-surface-container p-2 text-[11px]"><div className="flex justify-between gap-2"><strong>{column.name}</strong><span className="text-primary">{column.type}</span></div><div className="mt-1 text-on-surface-variant">Nulos {(column.nullRatio * 100).toFixed(1)}% · Unicidade {(column.uniquenessRatio * 100).toFixed(1)}%</div></div>)}</aside><div className="overflow-auto"><h3 className="mb-2 text-xs font-semibold uppercase text-on-surface-variant">Primeiros {preview.records.length} registros</h3>{preview.records.length ? <table className="min-w-full text-left text-[11px] font-code-compact"><thead><tr>{Object.keys(preview.records[0]).map(column => <th key={column} className="sticky top-0 bg-surface-container-high px-2 py-2 text-primary">{column}</th>)}</tr></thead><tbody>{preview.records.map((record, index) => <tr key={index} className="border-t border-outline-variant/50">{Object.keys(preview.records[0]).map(column => <td key={column} className="whitespace-nowrap px-2 py-2 text-on-surface">{record[column] == null ? '—' : String(record[column])}</td>)}</tr>)}</tbody></table> : <p className="text-xs text-on-surface-variant">Nenhum registro disponível.</p>}</div></div></div></div>}

      {pendingDeletion && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Impacto da operação"><div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-lg border border-outline-variant bg-surface-container-low p-5 shadow-2xl"><div className="flex items-start gap-3"><Icon name="warning" className="h-6 w-6 text-amber-400" /><div><h2 className="text-sm font-bold text-on-surface">Impacto para {pendingDeletion.impact.total} fonte(s)</h2><p className="mt-1 text-xs text-on-surface-variant">Excluíveis: {pendingDeletion.impact.deletable} · Com planos elegíveis: {pendingDeletion.impact.resolvable} · Arquiváveis: {pendingDeletion.impact.archivable} · Bloqueadas: {pendingDeletion.impact.blocked}. A exclusão em lote só ocorre quando todas são excluíveis.</p></div></div><div className="mt-4 space-y-2">{pendingDeletion.impact.items.map(item => <div key={item.source_id} className="rounded border border-outline-variant bg-surface-container p-3 text-xs"><div><code className="break-all text-secondary">{item.source_id}</code><span className={`ml-2 ${item.can_delete ? 'text-primary' : 'text-amber-400'}`}>{item.recommended_action}</span></div><p className="mt-1 text-on-surface-variant">{item.analysis_plan_count} plano(s), {item.decision_count} decisão(ões), {item.execution_count} execução(ões)</p>{item.plans.map(plan => <p key={plan.plan_id} className="mt-1 break-all font-code-compact text-[10px] text-on-surface-variant">Plano {plan.plan_id}: {plan.eligible_for_deletion ? 'elegível para exclusão' : plan.protected_reason}</p>)}</div>)}</div>{pendingDeletion.impact.items.some(item => item.recommended_action === 'ARCHIVE') && <p className="mt-3 text-xs font-semibold text-amber-400">Há histórico protegido. Use Arquivar no cartão da fonte; decisões e execuções não serão removidas.</p>}<div className="mt-5 flex flex-wrap justify-end gap-2"><button onClick={() => setPendingDeletion(null)} className="rounded border border-outline-variant px-3 py-1.5 text-xs">Cancelar</button>{pendingDeletion.ids.length === 1 && pendingDeletion.impact.items[0]?.can_resolve_and_delete && <button disabled={busy} onClick={() => void confirmResolvedDeletion()} className="rounded border border-error px-3 py-1.5 text-xs font-semibold text-error">Excluir planos elegíveis e fonte</button>}<button disabled={busy || pendingDeletion.impact.items.some(item => !item.can_delete)} onClick={() => void confirmDeletion()} className="rounded bg-error px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40">Confirmar exclusão definitiva</button></div></div></div>}
    </div>
  );
};
