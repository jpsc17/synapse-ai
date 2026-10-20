import React, { createContext, useContext, useState } from 'react';
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
  isUploadModalOpen: boolean;
  setIsUploadModalOpen: (open: boolean) => void;
  approveCandidate: (id: string) => Promise<void>;
  rejectCandidate: (id: string, reason: string) => Promise<void>;
  addDataSourceFromUpload: (fileName: string, content: string) => Promise<DataSource>;
  notification: string | null;
  setNotification: (msg: string | null) => void;
}

const SynapseContext = createContext<SynapseContextType | undefined>(undefined);

export const SynapseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dataSources, setDataSources] = useState<DataSource[]>(INITIAL_DATA_SOURCES);
  const [candidates, setCandidates] = useState<RelationshipCandidate[]>(INITIAL_CANDIDATES);
  const [pipeline] = useState<Pipeline>(INITIAL_PIPELINE);
  const [metrics] = useState<SystemMetrics>(INITIAL_METRICS);
  const [selectedDataSource, setSelectedDataSource] = useState<DataSource | null>(INITIAL_DATA_SOURCES[0]);
  const [activeCandidate, setActiveCandidate] = useState<RelationshipCandidate | null>(INITIAL_CANDIDATES[0]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const approveCandidate = async (id: string) => {
    try {
      const updated = await apiService.approveRelationship(id);
      setCandidates(prev => prev.map(c => c.id === id ? updated : c));
      setActiveCandidate(updated);
      setNotification(`Relação ${updated.sourceColumn} ↔ ${updated.targetColumn} aprovada com sucesso! Pipeline pronto para execução.`);
      setTimeout(() => setNotification(null), 5000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao aprovar relação';
      setNotification(`Erro: ${msg}`);
    }
  };

  const rejectCandidate = async (id: string, reason: string) => {
    try {
      const updated = await apiService.rejectRelationship(id, reason);
      setCandidates(prev => prev.map(c => c.id === id ? updated : c));
      setActiveCandidate(updated);
      setNotification(`Relação rejeitada: ${reason}`);
      setTimeout(() => setNotification(null), 5000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao rejeitar relação';
      setNotification(`Erro: ${msg}`);
    }
  };

  const addDataSourceFromUpload = async (fileName: string, content: string): Promise<DataSource> => {
    const newDs = await apiService.processUploadedFile(fileName, content);
    setDataSources(prev => [newDs, ...prev]);
    setSelectedDataSource(newDs);
    setNotification(`Fonte "${newDs.name}" carregada com sucesso! ${newDs.columnCount} colunas detectadas.`);
    setTimeout(() => setNotification(null), 5000);
    return newDs;
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
        isUploadModalOpen,
        setIsUploadModalOpen,
        approveCandidate,
        rejectCandidate,
        addDataSourceFromUpload,
        notification,
        setNotification,
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
