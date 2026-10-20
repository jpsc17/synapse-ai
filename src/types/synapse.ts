export interface ColumnDefinition {
  name: string;
  type: 'integer' | 'float' | 'string' | 'date' | 'empty';
  nullRatio: number;
  uniquenessRatio: number;
  sampleValues: (string | number)[];
}

export interface DataSource {
  id: string;
  name: string;
  sourceType: 'postgresql' | 'snowflake' | 'excel' | 'csv' | 'sap' | 'oracle';
  description: string;
  rowCount: number;
  columnCount: number;
  columns: ColumnDefinition[];
  status: 'ACTIVE' | 'SYNCING' | 'ERROR' | 'IDLE';
  lastSync: string;
  isCustomUpload?: boolean;
}

export interface ComparisonFactors {
  similaridadeSemanticaNome: number;
  compatibilidadeTipo: number;
  sobreposicaoValoresMin: number;
  jaccardValores: number;
  consistenciaUnicidade: number;
}

export interface Evidences {
  tipoA: string;
  tipoB: string;
  valoresEmComum: string[];
  qtdValoresEmComum: number;
  amostraValoresApenasEmA: string[];
  amostraValoresApenasEmB: string[];
}

export interface RelationshipCandidate {
  id: string;
  sourceDataSourceId: string;
  sourceDataSourceName: string;
  sourceColumn: string;
  targetDataSourceId: string;
  targetDataSourceName: string;
  targetColumn: string;
  score: number; // 0 - 100
  classificacao: 'CANDIDATO_RECOMENDADO' | 'CANDIDATO_AMBIGUO' | 'REJEITADO';
  confianca: 'ALTA' | 'MEDIA' | 'BAIXA';
  status: 'PROPOSTO_AGUARDANDO_APROVACAO' | 'PLANO_APROVADO_EXECUTADO' | 'REJEITADO_PELO_USUARIO';
  explicacao: string;
  fatores: ComparisonFactors;
  evidencias: Evidences;
  tipoRelacao: '1:1' | '1:N' | 'N:M';
  algoritmo: string;
  rejeicaoMotivo?: string;
  joinPreview?: Array<Record<string, unknown>>;
}

export interface DagNode {
  id: string;
  label: string;
  nodeType: 'SOURCE' | 'TRANSFORM' | 'JOIN' | 'VALIDATION' | 'EXPORT' | 'AI_AGENT';
  status: 'IDLE' | 'RUNNING' | 'SUCCESS' | 'ERROR';
  category: string;
  latency?: string;
  itemsProcessed?: number;
  x: number;
  y: number;
  inputs?: string[];
  outputs?: string[];
  description: string;
}

export interface DagEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  animated?: boolean;
  status?: 'ACTIVE' | 'IDLE' | 'ERROR';
}

export interface Pipeline {
  id: string;
  name: string;
  cluster: string;
  version: string;
  status: 'PRONTO' | 'EXECUTANDO' | 'FALHA' | 'SUCESSO';
  lastRun?: string;
  nodes: DagNode[];
  edges: DagEdge[];
}

export interface SystemMetrics {
  totalFontes: number;
  relacionamentosIdentificados: number;
  pipelinesAtivos: number;
  qualidadeMedia: number;
  taxaAutoMatch: number;
  tempoMedioDescoberta: string;
  clustersOnline: number;
}
