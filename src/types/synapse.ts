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
  status: 'ACTIVE' | 'ARCHIVED' | 'SYNCING' | 'ERROR' | 'IDLE';
  updatedAt: string;
  isCustomUpload?: boolean;
}

export interface DataSourcePreview {
  source: DataSource;
  records: Array<Record<string, unknown>>;
  limit: number;
}

export interface DataSourceDependencies {
  source_id: string;
  analysis_plan_count: number;
  decision_count: number;
  execution_count: number;
  can_delete: boolean;
  can_resolve_and_delete: boolean;
  recommended_action: 'DELETE' | 'RESOLVE_PLANS' | 'ARCHIVE' | 'BLOCKED';
  plans: Array<{
    plan_id: string;
    status: string;
    decision_count: number;
    execution_count: number;
    eligible_for_deletion: boolean;
    protected_reason: string | null;
  }>;
}

export interface DataSourceBulkImpact {
  total: number;
  deletable: number;
  resolvable: number;
  archivable: number;
  blocked: number;
  items: DataSourceDependencies[];
}

export interface ComparisonFactors {
  similaridadeSemanticaNome: number | null;
  compatibilidadeTipo: number | null;
  sobreposicaoValoresMin: number | null;
  jaccardValores: number | null;
  consistenciaUnicidade: number | null;
  qualidadeCardinalidade: number | null;
  sinalNomeIdentificador: boolean | null;
}

export interface Evidences {
  tipoA: string;
  tipoB: string;
  valoresEmComum: string[];
  qtdValoresEmComum: number;
  totalValoresDistintosA: number | null;
  totalValoresDistintosB: number | null;
  unicidadeA: number | null;
  unicidadeB: number | null;
  riscoMuitosParaMuitos: boolean | null;
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
  status: 'PROPOSTO_AGUARDANDO_APROVACAO' | 'PLANO_APROVADO' | 'PLANO_APROVADO_EXECUTADO' | 'REJEITADO_PELO_USUARIO';
  explicacao: string;
  fatores: ComparisonFactors;
  evidencias: Evidences;
  tipoRelacao: '1:1' | '1:N' | 'N:M' | 'NÃO INFORMADA';
  algoritmo: string;
  motivoMotor?: string | null;
  rejeicaoMotivo?: string;
  joinPreview?: Array<Record<string, unknown>>;
}

export type AnalysisPlanStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'EXECUTED';

export interface AnalysisPlan {
  plan_id: string;
  source_a_id: string;
  source_b_id: string;
  source_a_name?: string | null;
  source_b_name?: string | null;
  status: AnalysisPlanStatus;
  suggested_relation: ApiRelationshipCandidate | null;
  all_candidates: ApiRelationshipCandidate[];
  total_comparisons: number;
  created_at: string;
  updated_at: string;
}

export interface ApiRelationshipCandidate {
  id: string;
  sourceColumn: string;
  targetColumn: string;
  score: number;
  classificacao: 'CANDIDATO_RECOMENDADO' | 'CANDIDATO_AMBIGUO' | 'REJEITADO';
  motivoRejeicao?: string | null;
  explicacao?: string | null;
  fatores: Partial<ComparisonFactors>;
  evidencias: Partial<Evidences>;
}

export interface GovernanceDecision {
  decision_id: string;
  plan_id: string;
  approved: boolean;
  status: 'APPROVED' | 'REJECTED';
  reason?: string | null;
  approver: string;
  decided_at: string;
}

export interface PipelineExecution {
  execution_id: string;
  plan_id: string;
  status: string;
  workflow_id: string;
  summary: Record<string, unknown>;
  matched_records: Array<Record<string, unknown>>;
  unmatched_source_a: Array<Record<string, unknown>>;
  unmatched_source_b: Array<Record<string, unknown>>;
  duration_ms: number;
  executed_at: string;
}

export interface PipelineExecutionSummary {
  execution_id: string;
  plan_id: string;
  source_a_id: string;
  source_b_id: string;
  source_a_name: string;
  source_b_name: string;
  status: string;
  workflow_id: string;
  matched_records_count: number;
  unmatched_a_count: number;
  unmatched_b_count: number;
  duration_ms: number;
  executed_at: string;
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
  planosAprovados: number;
  planosPendentes: number;
  pipelinesExecutados: number;
  execucoesConcluidas: number;
  qualidadeMedia: number;
  taxaAutoMatch: number;
  tempoMedioDescoberta: string | null;
}
