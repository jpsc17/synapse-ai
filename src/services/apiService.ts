import type {
  AnalysisPlan,
  DataSource,
  DataSourceDependencies,
  DataSourceBulkImpact,
  DataSourcePreview,
  GovernanceDecision,
  Pipeline,
  PipelineExecution,
  PipelineExecutionSummary,
  SystemMetrics,
} from '../types/synapse';

/**
 * Camada de Serviços da API do SYNAPSE AI integrada ao Backend FastAPI + n8n.
 * 
 * ARQUITETURA DE INTEGRAÇÃO REAL:
 * O frontend se comunica com a API REST do Backend FastAPI (http://localhost:8000/api/v1).
 * O Backend é o responsável por orquestrar e acionar os webhooks de produção do n8n:
 * - Data Bridge POC: WvgldAqi81hUMq58 (http://localhost:5678/webhook/synapse-data-bridge)
 * - Intelligent Discovery POC: LHJTja7RuShTAcJo (http://localhost:5678/webhook/synapse-intelligent-discovery)
 * 
 * NOTA DE SEGURANÇA:
 * O n8n NUNCA é chamado diretamente pelo navegador do usuário.
 * Caso o backend esteja temporariamente indisponível, fallbacks inteligentes
 * garantem o funcionamento ininterrupto da interface.
 */

export const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';
const AUTH_TOKEN_KEY = 'synapse_operator_token';

export interface AuthUser {
  email: string | null;
  role: string;
}

export interface AuthSession {
  authenticated: boolean;
  user: AuthUser;
  expires_at: string | null;
}

export interface LoginResponse extends AuthSession {
  access_token: string;
  token_type: 'bearer';
}

export const getStoredAuthToken = (): string => {
  if (typeof window === 'undefined') return '';
  return window.sessionStorage.getItem(AUTH_TOKEN_KEY) ?? '';
};

export const setStoredAuthToken = (token: string): void => {
  if (typeof window === 'undefined') return;
  if (token) window.sessionStorage.setItem(AUTH_TOKEN_KEY, token);
  else window.sessionStorage.removeItem(AUTH_TOKEN_KEY);
  window.dispatchEvent(new Event('synapse-auth-change'));
};

const readApiError = async (response: Response, fallback: string): Promise<string> => {
  try {
    const body = await response.json() as { detail?: string };
    return body.detail || fallback;
  } catch {
    return fallback;
  }
};

const request = async (path: string, init: RequestInit, timeoutMs: number): Promise<Response> => {
  try {
    const headers = new Headers(init.headers);
    const token = getStoredAuthToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(`${BACKEND_URL}${path}`, {
      ...init,
      headers,
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (response.status === 401 && !path.startsWith('/auth/login')) {
      setStoredAuthToken('');
      window.dispatchEvent(new Event('synapse-session-expired'));
    }
    return response;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      throw new Error(`FastAPI não respondeu dentro de ${Math.round(timeoutMs / 1000)}s.`);
    }
    throw new Error('FastAPI indisponível. Verifique se o backend configurado está online.');
  }
};

export const N8N_WORKFLOW_REFS = {
  DATA_BRIDGE_POC: 'WvgldAqi81hUMq58',
  INTELLIGENT_DISCOVERY_POC: 'LHJTja7RuShTAcJo',
  INTEGRATION_STATUS: 'FASTAPI_GATEWAY_ACTIVE'
} as const;

export const INITIAL_PIPELINE: Pipeline = {
  id: 'data-bridge-unconfigured',
  name: 'Data Bridge — aguardando plano aprovado',
  cluster: 'n8n local',
  version: N8N_WORKFLOW_REFS.DATA_BRIDGE_POC,
  status: 'PRONTO',
  nodes: [
    {
      id: 'node-ingest-rh',
      label: 'Fonte de origem',
      nodeType: 'SOURCE',
      category: 'Extrator',
      status: 'IDLE',
      description: 'Fonte definida pelo plano ativo',
      x: 100,
      y: 120,
      inputs: [],
      outputs: ['node-norm-01']
    },
    {
      id: 'node-ingest-fin',
      label: 'Fonte de destino',
      nodeType: 'SOURCE',
      category: 'Extrator',
      status: 'IDLE',
      description: 'Fonte definida pelo plano ativo',
      x: 100,
      y: 320,
      inputs: [],
      outputs: ['node-norm-02']
    },
    {
      id: 'node-norm-01',
      label: 'Preparação da origem',
      nodeType: 'TRANSFORM',
      category: 'Transformador',
      status: 'IDLE',
      description: 'Etapa visual; telemetria não fornecida pela API',
      x: 360,
      y: 120,
      inputs: ['node-ingest-rh'],
      outputs: ['node-join-core']
    },
    {
      id: 'node-norm-02',
      label: 'Preparação do destino',
      nodeType: 'TRANSFORM',
      category: 'Transformador',
      status: 'IDLE',
      description: 'Etapa visual; telemetria não fornecida pela API',
      x: 360,
      y: 320,
      inputs: ['node-ingest-fin'],
      outputs: ['node-join-core']
    },
    {
      id: 'node-join-core',
      label: 'Data Bridge Reconciliação (n8n)',
      nodeType: 'JOIN',
      category: 'Reconciliador',
      status: 'IDLE',
      description: 'Execução do workflow n8n WvgldAqi81hUMq58 para reconciliação',
      x: 640,
      y: 220,
      inputs: ['node-norm-01', 'node-norm-02'],
      outputs: ['node-sink-analytics']
    },
    {
      id: 'node-sink-analytics',
      label: 'Resultado da API',
      nodeType: 'EXPORT',
      category: 'Destino',
      status: 'IDLE',
      description: 'Resultado auditável retornado pelo FastAPI',
      x: 920,
      y: 220,
      inputs: ['node-join-core'],
      outputs: []
    }
  ],
  edges: [
    { id: 'edge-1', fromNodeId: 'node-ingest-rh', toNodeId: 'node-norm-01', status: 'ACTIVE' },
    { id: 'edge-2', fromNodeId: 'node-ingest-fin', toNodeId: 'node-norm-02', status: 'ACTIVE' },
    { id: 'edge-3', fromNodeId: 'node-norm-01', toNodeId: 'node-join-core', status: 'ACTIVE' },
    { id: 'edge-4', fromNodeId: 'node-norm-02', toNodeId: 'node-join-core', status: 'ACTIVE' },
    { id: 'edge-5', fromNodeId: 'node-join-core', toNodeId: 'node-sink-analytics', status: 'IDLE' }
  ]
};

export const apiService = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const resp = await request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }, 10000);
    if (!resp.ok) throw new Error(await readApiError(resp, 'Não foi possível entrar.'));
    return await resp.json() as LoginResponse;
  },

  getCurrentSession: async (): Promise<AuthSession> => {
    const resp = await request('/auth/session', {}, 8000);
    if (!resp.ok) throw new Error(await readApiError(resp, 'Sessão inválida ou expirada.'));
    return await resp.json() as AuthSession;
  },

  logout: async (): Promise<void> => {
    const resp = await request('/auth/logout', { method: 'POST' }, 8000);
    if (!resp.ok && resp.status !== 401) {
      throw new Error(await readApiError(resp, 'Não foi possível encerrar a sessão.'));
    }
  },

  verifyAccessToken: async (token: string): Promise<{ authenticated: boolean; role: string }> => {
    const resp = await fetch(`${BACKEND_URL}/auth/verify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) throw new Error(await readApiError(resp, 'Credencial inválida.'));
    return await resp.json() as { authenticated: boolean; role: string };
  },

  /**
   * Health check com o backend FastAPI.
   */
  checkBackendHealth: async (): Promise<{ status: string; n8n_reachable: boolean }> => {
    try {
      const resp = await fetch(`${BACKEND_URL}/health`, { signal: AbortSignal.timeout(8000) });
      if (resp.ok) {
        const data = await resp.json();
        return { status: data.status, n8n_reachable: data.n8n_integration?.reachable ?? false };
      }
    } catch {
      // offline fallback
    }
    return { status: 'OFFLINE_MODE', n8n_reachable: false };
  },

  getSystemMetrics: async (): Promise<SystemMetrics> => {
    const resp = await request('/metrics', {}, 4000);
    if (!resp.ok) {
      throw new Error(await readApiError(resp, 'Não foi possível carregar as métricas reais.'));
    }
    return await resp.json() as SystemMetrics;
  },

  /**
   * Obtém fontes de dados cadastradas no backend real SQLite, com fallback local.
   */
  getDataSources: async (includeArchived = false): Promise<DataSource[]> => {
    const resp = await request(`/sources${includeArchived ? '?include_archived=true' : ''}`, {}, 4000);
    if (!resp.ok) {
      throw new Error(await readApiError(resp, 'Não foi possível carregar as fontes de dados.'));
    }
    return await resp.json() as DataSource[];
  },

  getDataSourcePreview: async (sourceId: string, limit = 20): Promise<DataSourcePreview> => {
    const resp = await request(`/sources/${encodeURIComponent(sourceId)}/preview?limit=${limit}`, {}, 10000);
    if (!resp.ok) throw new Error(await readApiError(resp, 'Não foi possível visualizar a fonte.'));
    return await resp.json() as DataSourcePreview;
  },

  renameDataSource: async (sourceId: string, name: string): Promise<DataSource> => {
    const resp = await request(`/sources/${encodeURIComponent(sourceId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }, 10000);
    if (!resp.ok) throw new Error(await readApiError(resp, 'Não foi possível renomear a fonte.'));
    return await resp.json() as DataSource;
  },

  getDataSourceDependencies: async (sourceId: string): Promise<DataSourceDependencies> => {
    const resp = await request(`/sources/${encodeURIComponent(sourceId)}/dependencies`, {}, 10000);
    if (!resp.ok) throw new Error(await readApiError(resp, 'Não foi possível validar as dependências da fonte.'));
    return await resp.json() as DataSourceDependencies;
  },

  getDataSourcesBulkImpact: async (sourceIds: string[]): Promise<DataSourceBulkImpact> => {
    const resp = await request('/sources/bulk-impact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source_ids: sourceIds }),
    }, 10000);
    if (!resp.ok) throw new Error(await readApiError(resp, 'Não foi possível calcular o impacto da operação.'));
    return await resp.json() as DataSourceBulkImpact;
  },

  archiveDataSource: async (sourceId: string): Promise<DataSource> => {
    const resp = await request(`/sources/${encodeURIComponent(sourceId)}/archive`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: true }),
    }, 10000);
    if (!resp.ok) throw new Error(await readApiError(resp, 'Não foi possível arquivar a fonte.'));
    return await resp.json() as DataSource;
  },

  restoreDataSource: async (sourceId: string): Promise<DataSource> => {
    const resp = await request(`/sources/${encodeURIComponent(sourceId)}/restore`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: true }),
    }, 10000);
    if (!resp.ok) throw new Error(await readApiError(resp, 'Não foi possível restaurar a fonte.'));
    return await resp.json() as DataSource;
  },

  deleteDataSource: async (sourceId: string, deleteEligiblePlans = false): Promise<void> => {
    const resp = await request(`/sources/${encodeURIComponent(sourceId)}/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: true, delete_eligible_plans: deleteEligiblePlans }),
    }, 10000);
    if (!resp.ok) throw new Error(await readApiError(resp, 'Não foi possível excluir a fonte.'));
  },

  deleteDataSources: async (sourceIds: string[]): Promise<void> => {
    const resp = await request('/sources/delete-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source_ids: sourceIds, confirm: true }),
    }, 15000);
    if (!resp.ok) throw new Error(await readApiError(resp, 'Não foi possível excluir as fontes selecionadas.'));
  },

  /**
   * Realiza upload de arquivo (CSV/XLSX) enviando multipart/form-data para o backend real.
   */
  uploadSourceFile: async (file: File, customName?: string): Promise<DataSource> => {
    const formData = new FormData();
    formData.append('file', file);
    if (customName) formData.append('custom_name', customName);

    const resp = await request('/sources/upload', {
      method: 'POST',
      body: formData,
    }, 15000);

    if (!resp.ok) {
      throw new Error(await readApiError(resp, 'Falha no upload do arquivo.'));
    }

    return await resp.json() as DataSource;
  },

  /**
   * Dispara a descoberta heurística chamando o workflow n8n (LHJTja7RuShTAcJo)
   * através da API do Backend FastAPI.
   */
  analyzeRelationship: async (sourceAId: string, sourceBId: string): Promise<AnalysisPlan> => {
    const resp = await request('/discovery/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source_a_id: sourceAId, source_b_id: sourceBId }),
    }, 25000);

    if (!resp.ok) {
      throw new Error(await readApiError(
        resp,
        resp.status === 502
          ? 'O workflow Intelligent Discovery no n8n está indisponível.'
          : 'Falha ao analisar o relacionamento.',
      ));
    }
    return await resp.json() as AnalysisPlan;
  },

  /**
   * Aprovação de relação no Comitê de Governança.
   */
  decideGovernance: async (
    planId: string,
    approved: boolean,
    reason: string,
  ): Promise<GovernanceDecision> => {
    const resp = await request('/governance/decide', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan_id: planId,
        approved,
        reason,
        approver: 'Operador SYNAPSE AI',
      }),
    }, 10000);

    if (!resp.ok) {
      throw new Error(await readApiError(resp, 'A decisão de governança não pôde ser registrada.'));
    }
    return await resp.json() as GovernanceDecision;
  },

  /**
   * Executa o JOIN real no n8n (Data Bridge POC WvgldAqi81hUMq58) via backend FastAPI.
   */
  executePipeline: async (planId: string): Promise<PipelineExecution> => {
    const resp = await request('/pipelines/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan_id: planId }),
    }, 30000);

    if (!resp.ok) {
      throw new Error(await readApiError(
        resp,
        resp.status === 502
          ? 'O workflow Data Bridge no n8n está indisponível.'
          : 'Falha na execução do pipeline.',
      ));
    }

    return await resp.json() as PipelineExecution;
  },

  listPipelineExecutions: async (): Promise<PipelineExecutionSummary[]> => {
    const resp = await request('/pipelines/executions?limit=50', {}, 10000);
    if (!resp.ok) throw new Error(await readApiError(resp, 'Não foi possível carregar o histórico de execuções.'));
    return await resp.json() as PipelineExecutionSummary[];
  },

  getPipelineExecution: async (executionId: string): Promise<PipelineExecution> => {
    const resp = await request(`/pipelines/executions/${encodeURIComponent(executionId)}`, {}, 10000);
    if (!resp.ok) throw new Error(await readApiError(resp, 'Não foi possível carregar a execução.'));
    return await resp.json() as PipelineExecution;
  },

};
