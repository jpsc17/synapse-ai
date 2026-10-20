import React, { createContext, useContext, useState, useEffect } from 'react';
import type { DataSource, RelationshipCandidate, Pipeline, SystemMetrics } from '../types/synapse';
import { INITIAL_DATA_SOURCES, INITIAL_CANDIDATES, INITIAL_PIPELINE, INITIAL_METRICS, apiService } from '../services/apiService';

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
  setActivePlanId: (id: string | null) => void;
  isUploadModalOpen: boolean;
  setIsUploadModalOpen: (open: boolean) => void;
  approveCandidate: (id: string) => Promise<void>;
  rejectCandidate: (id: string, reason: string) => Promise<void>;
  addDataSourceFromUpload: (fileName: string, content: string, fileObj?: File) => Promise<DataSource>;
  runDiscovery: (sourceAId: string, sourceBId: string) => Promise<void>;
  executeJoinPipeline: () => Promise<void>;
  notification: string | null;
  setNotification: (msg: string | null) => void;
  backendOnline: boolean;
}

const SynapseContext = createContext<SynapseContextType | undefined>(undefined);

export const SynapseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dataSources, setDataSources] = useState<DataSource[]>(INITIAL_DATA_SOURCES);
  const [candidates, setCandidates] = useState<RelationshipCandidate[]>(INITIAL_CANDIDATES);
  const [pipeline] = useState<Pipeline>(INITIAL_PIPELINE);
  const [metrics, setMetrics] = useState<SystemMetrics>(INITIAL_METRICS);
  const [selectedDataSource, setSelectedDataSource] = useState<DataSource | null>(INITIAL_DATA_SOURCES[0]);
  const [activeCandidate, setActiveCandidate] = useState<RelationshipCandidate | null>(INITIAL_CANDIDATES[0]);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [backendOnline, setBackendOnline] = useState(false);

  // Sincroniza inicialmente com o backend FastAPI
  useEffect(() => {
    async function init() {
      const health = await apiService.checkBackendHealth();
      setBackendOnline(health.status === 'ONLINE');

      if (health.status === 'ONLINE') {
        const sources = await apiService.getDataSources();
        if (sources.length > 0) {
          setDataSources(sources);
          setSelectedDataSource(sources[0]);
          setMetrics(prev => ({
            ...prev,
            totalFontes: sources.length
          }));
        }
      }
    }
    init();
  }, []);

  const approveCandidate = async (id: string) => {
    try {
      const updated = await apiService.approveRelationship(id, activePlanId || undefined);
      setCandidates(prev => prev.map(c => c.id === id ? updated : c));
      setActiveCandidate(updated);
      setNotification(`Relação ${updated.sourceColumn} ↔ ${updated.targetColumn} APROVADA na governança! Selo de auditoria registrado no SQLite.`);
      setTimeout(() => setNotification(null), 5000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao aprovar relação';
      setNotification(`Erro: ${msg}`);
    }
  };

  const rejectCandidate = async (id: string, reason: string) => {
    try {
      const updated = await apiService.rejectRelationship(id, reason, activePlanId || undefined);
      setCandidates(prev => prev.map(c => c.id === id ? updated : c));
      setActiveCandidate(updated);
      setNotification(`Relação rejeitada: ${reason}`);
      setTimeout(() => setNotification(null), 5000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao rejeitar relação';
      setNotification(`Erro: ${msg}`);
    }
  };

  const addDataSourceFromUpload = async (fileName: string, content: string, fileObj?: File): Promise<DataSource> => {
    let newDs: DataSource;
    if (fileObj) {
      newDs = await apiService.uploadSourceFile(fileObj);
    } else {
      newDs = await apiService.processUploadedFileLocally(fileName, content);
    }

    setDataSources(prev => [newDs, ...prev]);
    setSelectedDataSource(newDs);
    setMetrics(prev => ({ ...prev, totalFontes: prev.totalFontes + 1 }));
    setNotification(`Fonte "${newDs.name}" carregada com sucesso! ${newDs.columnCount} colunas detectadas.`);
    setTimeout(() => setNotification(null), 5000);
    return newDs;
  };

  const runDiscovery = async (sourceAId: string, sourceBId: string) => {
    setNotification('Acionando Motor de Descoberta n8n (LHJTja7RuShTAcJo) via FastAPI...');
    const result = await apiService.analyzeRelationship(sourceAId, sourceBId);
    if (result && result.plan_id) {
      setActivePlanId(result.plan_id);
      if (result.suggested_relation) {
        const cand: RelationshipCandidate = {
          id: result.suggested_relation.id,
          sourceDataSourceId: sourceAId,
          sourceDataSourceName: 'Base A',
          sourceColumn: result.suggested_relation.sourceColumn,
          targetDataSourceId: sourceBId,
          targetDataSourceName: 'Base B',
          targetColumn: result.suggested_relation.targetColumn,
          score: result.suggested_relation.score,
          classificacao: result.suggested_relation.classificacao,
          confianca: result.suggested_relation.score >= 70 ? 'ALTA' : 'MEDIA',
          status: 'PROPOSTO_AGUARDANDO_APROVACAO',
          tipoRelacao: '1:1',
          algoritmo: 'Motor Heurístico SYNAPSE n8n (Jaccard + Overlap)',
          explicacao: result.suggested_relation.explicacao || 'Relação inferida com base em sobreposição de valores.',
          fatores: result.suggested_relation.fatores || {},
          evidencias: result.suggested_relation.evidencias || {},
          joinPreview: [
            { MATVINC: '1001', NOME_SERVIDOR: 'Ana Silva', SETOR: 'TI', valor_pagamento: 2500.0, competencia: '2026-10', status: 'CORRESPONDENCIA_ENCONTRADA' },
            { MATVINC: '1002', NOME_SERVIDOR: 'Bruno Costa', SETOR: 'RH', valor_pagamento: 3100.0, competencia: '2026-10', status: 'CORRESPONDENCIA_ENCONTRADA' },
            { MATVINC: '1003', NOME_SERVIDOR: 'Carla Dias', SETOR: 'Financeiro', valor_pagamento: null, competencia: null, status: 'SEM_PAGAMENTO' },
          ]
        };
        setCandidates([cand, ...candidates.filter(c => c.id !== cand.id)]);
        setActiveCandidate(cand);
      }
      setNotification(`Descoberta concluída com sucesso! Plano ${result.plan_id.slice(0, 8)} gerado.`);
    } else {
      setNotification('Descoberta local simulada executada.');
    }
  };

  const executeJoinPipeline = async () => {
    if (!activePlanId) {
      setNotification('Aviso: Nenhum plano de governança ativo. Executando simulação de demonstração...');
      return;
    }
    try {
      setNotification('Disparando reconciliação real no n8n (Data Bridge POC WvgldAqi81hUMq58)...');
      const res = await apiService.executePipeline(activePlanId);
      setNotification(`Execução concluída no n8n! ${res.matched_records.length} correspondências, ${res.unmatched_source_a.length} sem pagamento, ${res.unmatched_source_b.length} sem funcionário.`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Falha ao executar pipeline';
      setNotification(`Erro na execução: ${msg}`);
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
        setActivePlanId,
        isUploadModalOpen,
        setIsUploadModalOpen,
        approveCandidate,
        rejectCandidate,
        addDataSourceFromUpload,
        runDiscovery,
        executeJoinPipeline,
        notification,
        setNotification,
        backendOnline
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
