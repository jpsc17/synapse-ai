import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import type {
  ApiRelationshipCandidate,
  AnalysisPlanStatus,
  DataSource,
  Pipeline,
  PipelineExecution,
  RelationshipCandidate,
  SystemMetrics,
} from '../types/synapse';
import { INITIAL_PIPELINE, apiService } from '../services/apiService';

interface SynapseContextType {
  dataSources: DataSource[];
  candidates: RelationshipCandidate[];
  pipeline: Pipeline;
  metrics: SystemMetrics;
  selectedDataSource: DataSource | null;
  setSelectedDataSource: (ds: DataSource | null) => void;
  activeCandidate: RelationshipCandidate | null;
  setActiveCandidate: (cand: RelationshipCandidate | null) => void;
  activePlanId: string | null;
  activePlanStatus: AnalysisPlanStatus | null;
  setActivePlanId: (id: string | null) => void;
  isUploadModalOpen: boolean;
  setIsUploadModalOpen: (open: boolean) => void;
  refreshDataSources: () => Promise<void>;
  renameDataSource: (id: string, name: string) => Promise<void>;
  deleteDataSources: (ids: string[]) => Promise<void>;
  approveCandidate: (id: string) => Promise<void>;
  rejectCandidate: (id: string, reason: string) => Promise<void>;
  addDataSourceFromUpload: (fileName: string, content: string, fileObj?: File) => Promise<DataSource>;
  runDiscovery: (sourceAId: string, sourceBId: string) => Promise<void>;
  executeJoinPipeline: () => Promise<void>;
  executionResult: PipelineExecution | null;
  isDiscovering: boolean;
  isGovernanceBusy: boolean;
  isExecuting: boolean;
  notification: string | null;
  setNotification: (msg: string | null) => void;
  backendOnline: boolean;
  n8nReachable: boolean;
}

const SynapseContext = createContext<SynapseContextType | undefined>(undefined);

const EMPTY_METRICS: SystemMetrics = {
  totalFontes: 0,
  relacionamentosIdentificados: 0,
  planosAprovados: 0,
  planosPendentes: 0,
  pipelinesExecutados: 0,
  execucoesConcluidas: 0,
  qualidadeMedia: 0,
  taxaAutoMatch: 0,
  tempoMedioDescoberta: null,
};

const toCandidate = (
  candidate: ApiRelationshipCandidate,
  sourceA: DataSource,
  sourceB: DataSource,
): RelationshipCandidate => ({
  id: candidate.id,
  sourceDataSourceId: sourceA.id,
  sourceDataSourceName: sourceA.name,
  sourceColumn: candidate.sourceColumn,
  targetDataSourceId: sourceB.id,
  targetDataSourceName: sourceB.name,
  targetColumn: candidate.targetColumn,
  score: candidate.score,
  classificacao: candidate.classificacao,
  confianca: candidate.score >= 80 ? 'ALTA' : candidate.score >= 60 ? 'MEDIA' : 'BAIXA',
  status: 'PROPOSTO_AGUARDANDO_APROVACAO',
  tipoRelacao: 'NÃO INFORMADA',
  algoritmo: 'Motor Heurístico SYNAPSE via n8n',
  explicacao: candidate.explicacao || `Comparação heurística entre ${candidate.sourceColumn} e ${candidate.targetColumn}.`,
  fatores: {
    similaridadeSemanticaNome: candidate.fatores.similaridadeSemanticaNome ?? null,
    compatibilidadeTipo: candidate.fatores.compatibilidadeTipo ?? null,
    sobreposicaoValoresMin: candidate.fatores.sobreposicaoValoresMin ?? null,
    jaccardValores: candidate.fatores.jaccardValores ?? null,
    consistenciaUnicidade: candidate.fatores.consistenciaUnicidade ?? null,
    qualidadeCardinalidade: candidate.fatores.qualidadeCardinalidade ?? null,
    sinalNomeIdentificador: candidate.fatores.sinalNomeIdentificador ?? null,
  },
  evidencias: {
    tipoA: candidate.evidencias.tipoA ?? 'não informado',
    tipoB: candidate.evidencias.tipoB ?? 'não informado',
    valoresEmComum: candidate.evidencias.valoresEmComum ?? [],
    qtdValoresEmComum: candidate.evidencias.qtdValoresEmComum ?? 0,
    totalValoresDistintosA: candidate.evidencias.totalValoresDistintosA ?? null,
    totalValoresDistintosB: candidate.evidencias.totalValoresDistintosB ?? null,
    unicidadeA: candidate.evidencias.unicidadeA ?? null,
    unicidadeB: candidate.evidencias.unicidadeB ?? null,
    riscoMuitosParaMuitos: candidate.evidencias.riscoMuitosParaMuitos ?? null,
    amostraValoresApenasEmA: candidate.evidencias.amostraValoresApenasEmA ?? [],
    amostraValoresApenasEmB: candidate.evidencias.amostraValoresApenasEmB ?? [],
  },
  motivoMotor: candidate.motivoRejeicao ?? null,
});

export const SynapseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [candidates, setCandidates] = useState<RelationshipCandidate[]>([]);
  const [metrics, setMetrics] = useState<SystemMetrics>(EMPTY_METRICS);
  const [selectedDataSource, setSelectedDataSource] = useState<DataSource | null>(null);
  const [activeCandidate, setActiveCandidate] = useState<RelationshipCandidate | null>(null);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [activePlanStatus, setActivePlanStatus] = useState<AnalysisPlanStatus | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [backendOnline, setBackendOnline] = useState(false);
  const [n8nReachable, setN8nReachable] = useState(false);
  const [executionResult, setExecutionResult] = useState<PipelineExecution | null>(null);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isGovernanceBusy, setIsGovernanceBusy] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  const governedCandidate = candidates[0] ?? null;
  const pipeline = useMemo<Pipeline>(() => {
    const sourceA = dataSources.find(source => source.id === governedCandidate?.sourceDataSourceId);
    const sourceB = dataSources.find(source => source.id === governedCandidate?.targetDataSourceId);
    return {
      ...INITIAL_PIPELINE,
      id: activePlanId ?? 'data-bridge-unconfigured',
      name: sourceA && sourceB
        ? `${sourceA.name} ↔ ${sourceB.name} — Data Bridge n8n`
        : 'Data Bridge — aguardando plano aprovado',
      status: executionResult?.status === 'SUCCESS' ? 'SUCESSO' : activePlanStatus === 'APPROVED' ? 'PRONTO' : 'PRONTO',
    };
  }, [activePlanId, activePlanStatus, dataSources, executionResult?.status, governedCandidate]);

  const refreshDataSources = async () => {
    const [sources, realMetrics] = await Promise.all([
      apiService.getDataSources(),
      apiService.getSystemMetrics(),
    ]);
    setDataSources(sources);
    setMetrics(realMetrics);
    setSelectedDataSource(current => current ? sources.find(source => source.id === current.id) ?? null : sources[0] ?? null);
  };

  // Sincroniza inicialmente com o backend FastAPI
  useEffect(() => {
    async function init() {
      const health = await apiService.checkBackendHealth();
      setBackendOnline(health.status === 'ONLINE');
      setN8nReachable(health.n8n_reachable);

      if (health.status === 'ONLINE') {
        try {
          await refreshDataSources();
          if (!health.n8n_reachable) {
            setNotification('FastAPI e SQLite estão online, mas o n8n está indisponível.');
          }
        } catch (error) {
          setNotification(error instanceof Error ? error.message : 'Falha ao carregar dados do backend.');
        }
      } else {
        setNotification('FastAPI indisponível. As ações reais estão desabilitadas.');
      }
    }
    init();
  }, []);

  const approveCandidate = async (id: string) => {
    if (!activePlanId) {
      setNotification('Execute uma descoberta real antes de aprovar a relação.');
      return;
    }
    if (id !== candidates[0]?.id) {
      setNotification('A governança deste plano só permite decidir sobre a relação principal sugerida pelo backend.');
      return;
    }
    setIsGovernanceBusy(true);
    try {
      await apiService.decideGovernance(
        activePlanId,
        true,
        'Relação aprovada após revisão das chaves, score heurístico e evidências apresentadas.',
      );
      setActivePlanStatus('APPROVED');
      const candidate = candidates.find(item => item.id === id);
      if (!candidate) throw new Error('Candidato ativo não encontrado.');
      const updated: RelationshipCandidate = { ...candidate, status: 'PLANO_APROVADO' };
      setCandidates(prev => prev.map(c => c.id === id ? updated : c));
      setActiveCandidate(updated);
      setNotification(`Relação ${updated.sourceColumn} ↔ ${updated.targetColumn} APROVADA na governança! Selo de auditoria registrado no SQLite.`);
      setTimeout(() => setNotification(null), 5000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao aprovar relação';
      setNotification(`Erro: ${msg}`);
    } finally {
      setIsGovernanceBusy(false);
    }
  };

  const rejectCandidate = async (id: string, reason: string) => {
    if (!activePlanId) {
      setNotification('Execute uma descoberta real antes de rejeitar a relação.');
      return;
    }
    if (id !== candidates[0]?.id) {
      setNotification('A governança deste plano só permite decidir sobre a relação principal sugerida pelo backend.');
      return;
    }
    setIsGovernanceBusy(true);
    try {
      await apiService.decideGovernance(activePlanId, false, reason);
      setActivePlanStatus('REJECTED');
      const candidate = candidates.find(item => item.id === id);
      if (!candidate) throw new Error('Candidato ativo não encontrado.');
      const updated: RelationshipCandidate = {
        ...candidate,
        status: 'REJEITADO_PELO_USUARIO',
        rejeicaoMotivo: reason,
      };
      setCandidates(prev => prev.map(c => c.id === id ? updated : c));
      setActiveCandidate(updated);
      setNotification(`Relação rejeitada: ${reason}`);
      setTimeout(() => setNotification(null), 5000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao rejeitar relação';
      setNotification(`Erro: ${msg}`);
    } finally {
      setIsGovernanceBusy(false);
    }
  };

  const addDataSourceFromUpload = async (fileName: string, content: string, fileObj?: File): Promise<DataSource> => {
    let newDs: DataSource;
    const uploadFile = fileObj ?? new File([content], fileName, { type: 'text/csv' });
    newDs = await apiService.uploadSourceFile(uploadFile);

    await refreshDataSources();
    setSelectedDataSource(newDs);
    setNotification(`Fonte "${newDs.name}" carregada com sucesso! ${newDs.columnCount} colunas detectadas.`);
    setTimeout(() => setNotification(null), 5000);
    return newDs;
  };

  const renameDataSource = async (id: string, name: string) => {
    const updated = await apiService.renameDataSource(id, name);
    setDataSources(previous => previous.map(source => source.id === id ? updated : source));
    setSelectedDataSource(previous => previous?.id === id ? updated : previous);
    setCandidates(previous => previous.map(candidate => ({
      ...candidate,
      sourceDataSourceName: candidate.sourceDataSourceId === id ? updated.name : candidate.sourceDataSourceName,
      targetDataSourceName: candidate.targetDataSourceId === id ? updated.name : candidate.targetDataSourceName,
    })));
    setNotification(`Fonte renomeada para “${updated.name}”.`);
  };

  const deleteDataSources = async (ids: string[]) => {
    if (ids.length === 1) await apiService.deleteDataSource(ids[0]);
    else await apiService.deleteDataSources(ids);
    await refreshDataSources();
    setNotification(`${ids.length} fonte(s) excluída(s) após validação de dependências.`);
  };

  const runDiscovery = async (sourceAId: string, sourceBId: string) => {
    if (sourceAId === sourceBId) {
      setNotification('Selecione duas fontes distintas para executar a descoberta.');
      return;
    }
    setIsDiscovering(true);
    setExecutionResult(null);
    setNotification('Acionando Motor de Descoberta n8n (LHJTja7RuShTAcJo) via FastAPI...');
    try {
      const result = await apiService.analyzeRelationship(sourceAId, sourceBId);
      setActivePlanId(result.plan_id);
      setActivePlanStatus(result.status);
      const sourceA = dataSources.find(source => source.id === sourceAId);
      const sourceB = dataSources.find(source => source.id === sourceBId);
      if (!sourceA || !sourceB) throw new Error('As fontes selecionadas não estão mais disponíveis.');
      const realCandidates = result.all_candidates.map(candidate => toCandidate(candidate, sourceA, sourceB));
      setCandidates(realCandidates);
      setActiveCandidate(realCandidates[0] ?? null);
      setNotification(`Descoberta concluída com sucesso! Plano ${result.plan_id.slice(0, 8)} gerado.`);
    } catch (error) {
      setCandidates([]);
      setActiveCandidate(null);
      setActivePlanId(null);
      setActivePlanStatus(null);
      setNotification(`Erro na descoberta: ${error instanceof Error ? error.message : 'falha desconhecida'}`);
    } finally {
      setIsDiscovering(false);
    }
  };

  const executeJoinPipeline = async () => {
    if (!activePlanId) {
      setNotification('Nenhum plano real está ativo. Execute a descoberta e aprove a proposta antes do pipeline.');
      return;
    }
    if (activePlanStatus !== 'APPROVED' && activePlanStatus !== 'EXECUTED') {
      setNotification('Execução bloqueada: o plano precisa ser aprovado pela governança.');
      return;
    }
    setIsExecuting(true);
    try {
      setNotification('Disparando reconciliação real no n8n (Data Bridge POC WvgldAqi81hUMq58)...');
      const res = await apiService.executePipeline(activePlanId);
      setExecutionResult(res);
      const governedCandidateId = candidates[0]?.id;
      setActivePlanStatus('EXECUTED');
      setCandidates(prev => prev.map(candidate => candidate.id === governedCandidateId
        ? { ...candidate, status: 'PLANO_APROVADO_EXECUTADO' }
        : candidate));
      setActiveCandidate(prev => prev?.id === governedCandidateId ? { ...prev, status: 'PLANO_APROVADO_EXECUTADO' } : prev);
      setNotification(`Execução concluída no n8n: ${res.matched_records.length} correspondentes, ${res.unmatched_source_a.length} somente na origem e ${res.unmatched_source_b.length} somente no destino.`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Falha ao executar pipeline';
      setNotification(`Erro na execução: ${msg}`);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <SynapseContext.Provider
      value={{
        dataSources,
        candidates,
        pipeline,
        metrics,
        selectedDataSource,
        setSelectedDataSource,
        activeCandidate,
        setActiveCandidate,
        activePlanId,
        activePlanStatus,
        setActivePlanId,
        isUploadModalOpen,
        setIsUploadModalOpen,
        refreshDataSources,
        renameDataSource,
        deleteDataSources,
        approveCandidate,
        rejectCandidate,
        addDataSourceFromUpload,
        runDiscovery,
        executeJoinPipeline,
        executionResult,
        isDiscovering,
        isGovernanceBusy,
        isExecuting,
        notification,
        setNotification,
        backendOnline,
        n8nReachable,
      }}
    >
      {children}
    </SynapseContext.Provider>
  );
};

export const useSynapse = (): SynapseContextType => {
  const context = useContext(SynapseContext);
  if (!context) {
    throw new Error('useSynapse must be used within a SynapseProvider');
  }
  return context;
};
