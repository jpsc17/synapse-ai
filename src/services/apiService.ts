import type { DataSource, RelationshipCandidate, Pipeline, SystemMetrics } from '../types/synapse';

/**
 * Camada de Serviços da API do SYNAPSE AI.
 * 
 * ARQUITETURA DE INTEGRAÇÃO FUTURA:
 * O frontend se comunica com a API REST/GraphQL do Backend do SYNAPSE.
 * O Backend é o responsável por orquestrar e acionar os workflows do n8n:
 * - Data Bridge POC: WvgldAqi81hUMq58
 * - Intelligent Discovery POC: LHJTja7RuShTAcJo
 * 
 * NOTA DE SEGURANÇA:
 * O n8n NUNCA é chamado diretamente pelo navegador do usuário.
 * Esta camada encapsula os contratos de dados e fornece respostas
 * demonstrativas identificadas explicitamente enquanto o backend estiver em desenvolvimento.
 */

export const N8N_WORKFLOW_REFS = {
  DATA_BRIDGE_POC: 'WvgldAqi81hUMq58',
  INTELLIGENT_DISCOVERY_POC: 'LHJTja7RuShTAcJo',
  INTEGRATION_STATUS: 'BACKEND_GATEWAY_CONFIGURED'
} as const;

// Dados de demonstração padrão do sistema
export const INITIAL_METRICS: SystemMetrics = {
  totalFontes: 8,
  relacionamentosIdentificados: 14,
  pipelinesAtivos: 6,
  qualidadeMedia: 99.4,
  taxaAutoMatch: 96.8,
  tempoMedioDescoberta: '4.2s',
  clustersOnline: 4,
};

export const INITIAL_DATA_SOURCES: DataSource[] = [
  {
    id: 'ds-postgres-comercial',
    name: 'PostgreSQL (Comercial / RH)',
    sourceType: 'postgresql',
    description: 'Tabelas centrais de funcionários, lotação e folha funcional.',
    rowCount: 14820,
    columnCount: 16,
    status: 'ACTIVE',
    lastSync: 'há 12 min',
    columns: [
      { name: 'MATVINC', type: 'integer', nullRatio: 0.0, uniquenessRatio: 1.0, sampleValues: [1001, 1002, 1003, 1004, 1005] },
      { name: 'NOME_SERVIDOR', type: 'string', nullRatio: 0.0, uniquenessRatio: 0.98, sampleValues: ['Ana Silva', 'Bruno Costa', 'Carla Dias', 'Daniel Lima'] },
      { name: 'SETOR', type: 'string', nullRatio: 0.02, uniquenessRatio: 0.05, sampleValues: ['TI', 'RH', 'Financeiro', 'Operações'] },
      { name: 'CARGO', type: 'string', nullRatio: 0.0, uniquenessRatio: 0.12, sampleValues: ['Analista', 'Engenheiro', 'Coordenador'] }
    ]
  },
  {
    id: 'ds-excel-pagamentos',
    name: 'Excel (Remuneração & Benefícios)',
    sourceType: 'excel',
    description: 'Planilha contábil de depósitos e competências mensais.',
    rowCount: 14790,
    columnCount: 12,
    status: 'ACTIVE',
    lastSync: 'há 32 seg',
    columns: [
      { name: 'matricula_funcional', type: 'integer', nullRatio: 0.0, uniquenessRatio: 1.0, sampleValues: [1001, 1002, 1004, 1005, 1006] },
      { name: 'valor_pagamento', type: 'float', nullRatio: 0.0, uniquenessRatio: 0.85, sampleValues: [2500.0, 3100.0, 2800.0, 4200.0] },
      { name: 'competencia', type: 'string', nullRatio: 0.0, uniquenessRatio: 0.01, sampleValues: ['2026-10', '2026-10', '2026-10'] },
      { name: 'cod_banco', type: 'integer', nullRatio: 0.01, uniquenessRatio: 0.03, sampleValues: [1, 104, 341, 237] }
    ]
  },
  {
    id: 'ds-snowflake-analytics',
    name: 'Snowflake (Data Lake DW)',
    sourceType: 'snowflake',
    description: 'Repositório histórico analítico de transações e conciliações.',
    rowCount: 2450000,
    columnCount: 48,
    status: 'ACTIVE',
    lastSync: 'há 2 horas',
    columns: [
      { name: 'cpf_anonimizado', type: 'string', nullRatio: 0.0, uniquenessRatio: 1.0, sampleValues: ['***.491.823-**', '***.289.304-**'] },
      { name: 'exercicio_fiscal', type: 'integer', nullRatio: 0.0, uniquenessRatio: 0.01, sampleValues: [2024, 2025, 2026] }
    ]
  },
  {
    id: 'ds-sap-erp',
    name: 'SAP ERP (Controladoria)',
    sourceType: 'sap',
    description: 'Centro de custos e plano de contas orçamentário.',
    rowCount: 89000,
    columnCount: 32,
    status: 'IDLE',
    lastSync: 'ontem',
    columns: [
      { name: 'ID_CONTRATO', type: 'string', nullRatio: 0.0, uniquenessRatio: 1.0, sampleValues: ['CT-2026-001', 'CT-2026-002'] }
    ]
  }
];

export const INITIAL_CANDIDATES: RelationshipCandidate[] = [
  {
    id: 'rel-matvinc-matricula',
    sourceDataSourceId: 'ds-postgres-comercial',
    sourceDataSourceName: 'PostgreSQL (Comercial / RH)',
    sourceColumn: 'MATVINC',
    targetDataSourceId: 'ds-excel-pagamentos',
    targetDataSourceName: 'Excel (Remuneração & Benefícios)',
    targetColumn: 'matricula_funcional',
    score: 94.0,
    classificacao: 'CANDIDATO_RECOMENDADO',
    confianca: 'ALTA',
    status: 'PROPOSTO_AGUARDANDO_APROVACAO',
    tipoRelacao: '1:1',
    algoritmo: 'Motor Heurístico SYNAPSE (Token Jaccard + Normalização de Dígitos + Overlap 96.8%)',
    explicacao: 'A coluna MATVINC (PostgreSQL) e matricula_funcional (Excel) possuem compatibilidade estrita de tipo (integer), 85% de afinidade semântica de identificador de servidor e 96.8% de sobreposição determinística de valores no domínio amostrado.',
    fatores: {
      similaridadeSemanticaNome: 0.85,
      compatibilidadeTipo: 1.0,
      sobreposicaoValoresMin: 0.968,
      jaccardValores: 0.94,
      consistenciaUnicidade: 1.0,
    },
    evidencias: {
      tipoA: 'integer',
      tipoB: 'integer',
      valoresEmComum: ['1001', '1002', '1004', '1005', '... (14.320 registros)'],
      qtdValoresEmComum: 14320,
      amostraValoresApenasEmA: ['1003 (Carla Dias — sem pagamento na competência)'],
      amostraValoresApenasEmB: ['1006 (Matrícula em folha sem cadastro RH ativo)'],
    },
    joinPreview: [
      { MATVINC: 1001, NOME_SERVIDOR: 'Ana Silva', SETOR: 'TI', valor_pagamento: 2500.0, competencia: '2026-10', status: 'CORRESPONDENCIA_ENCONTRADA' },
      { MATVINC: 1002, NOME_SERVIDOR: 'Bruno Costa', SETOR: 'RH', valor_pagamento: 3100.0, competencia: '2026-10', status: 'CORRESPONDENCIA_ENCONTRADA' },
      { MATVINC: 1003, NOME_SERVIDOR: 'Carla Dias', SETOR: 'Financeiro', valor_pagamento: null, competencia: null, status: 'SEM_PAGAMENTO' },
    ]
  },
  {
    id: 'rel-cpf-documento',
    sourceDataSourceId: 'ds-postgres-comercial',
    sourceDataSourceName: 'PostgreSQL (Comercial / RH)',
    sourceColumn: 'CPF',
    targetDataSourceId: 'ds-excel-pagamentos',
    targetDataSourceName: 'Excel (Remuneração & Benefícios)',
    targetColumn: 'doc_identificacao',
    score: 88.5,
    classificacao: 'CANDIDATO_RECOMENDADO',
    confianca: 'ALTA',
    status: 'PROPOSTO_AGUARDANDO_APROVACAO',
    tipoRelacao: '1:1',
    algoritmo: 'Sanitização de Máscaras RegEx + Validação de Dígito Módulo 11',
    explicacao: 'Identificadores federais de pessoa física coincidem após remoção de pontuação ("." e "-") e normalização de 11 dígitos.',
    fatores: {
      similaridadeSemanticaNome: 0.72,
      compatibilidadeTipo: 0.95,
      sobreposicaoValoresMin: 0.92,
      jaccardValores: 0.88,
      consistenciaUnicidade: 0.99,
    },
    evidencias: {
      tipoA: 'string (formatada)',
      tipoB: 'string (numérica pura)',
      valoresEmComum: ['44918237100', '12893041922', '89210455134'],
      qtdValoresEmComum: 13910,
      amostraValoresApenasEmA: ['55192837109'],
      amostraValoresApenasEmB: ['99182736412'],
    }
  },
  {
    id: 'rel-centro-custo',
    sourceDataSourceId: 'ds-postgres-comercial',
    sourceDataSourceName: 'PostgreSQL (Comercial / RH)',
    sourceColumn: 'SETOR',
    targetDataSourceId: 'ds-sap-erp',
    targetDataSourceName: 'SAP ERP (Controladoria)',
    targetColumn: 'DEPARTAMENTO_SOLICITANTE',
    score: 62.0,
    classificacao: 'CANDIDATO_AMBIGUO',
    confianca: 'MEDIA',
    status: 'PROPOSTO_AGUARDANDO_APROVACAO',
    tipoRelacao: '1:N',
    algoritmo: 'Agrupamento Semântico e Mapeamento Categórico',
    explicacao: 'Nomes de setores aproximados (ex: "TI" ↔ "TECNOLOGIA DA INFORMACAO"). Sobreposição categórica parcial. Requer intervenção humana para de-para.',
    fatores: {
      similaridadeSemanticaNome: 0.80,
      compatibilidadeTipo: 1.0,
      sobreposicaoValoresMin: 0.45,
      jaccardValores: 0.38,
      consistenciaUnicidade: 0.12,
    },
    evidencias: {
      tipoA: 'string',
      tipoB: 'string',
      valoresEmComum: ['Financeiro', 'RH'],
      qtdValoresEmComum: 4,
      amostraValoresApenasEmA: ['TI', 'Operações'],
      amostraValoresApenasEmB: ['DEPT_INFRA_TI', 'DEPT_LOGISTICA'],
    }
  }
];

export const INITIAL_PIPELINE: Pipeline = {
  id: 'pipe-reconciliacao-folha',
  name: 'ETL_Consolidacao_Funcionarios_Pagamentos_v2.0',
  cluster: 'Cluster Prod-Alpha #04',
  version: '2.0.4',
  status: 'PRONTO',
  lastRun: '2026-10-20 04:03 UTC (Sucesso via n8n Engine)',
  nodes: [
    {
      id: 'node-1',
      label: 'PostgreSQL Clientes & Servidores',
      nodeType: 'SOURCE',
      category: 'Fonte Primária',
      status: 'SUCCESS',
      latency: '24ms',
      itemsProcessed: 14820,
      x: 100,
      y: 180,
      description: 'Ingestão de dados mestres de servidores via replica read-only.',
      outputs: ['node-2']
    },
    {
      id: 'node-2',
      label: 'Normalização MATVINC',
      nodeType: 'TRANSFORM',
      category: 'Transformação',
      status: 'SUCCESS',
      latency: '12ms',
      itemsProcessed: 14820,
      x: 380,
      y: 180,
      description: 'Trim, conversão de tipo e remoção de zeros à esquerda.',
      inputs: ['node-1'],
      outputs: ['node-4']
    },
    {
      id: 'node-3',
      label: 'Excel Folha de Pagamentos',
      nodeType: 'SOURCE',
      category: 'Fonte Secundária',
      status: 'SUCCESS',
      latency: '18ms',
      itemsProcessed: 14790,
      x: 100,
      y: 380,
      description: 'Planilha de créditos bancários e valores da competência.',
      outputs: ['node-4']
    },
    {
      id: 'node-4',
      label: 'Intelligent JOIN Engine',
      nodeType: 'JOIN',
      category: 'Reconciliação',
      status: 'SUCCESS',
      latency: '45ms',
      itemsProcessed: 14820,
      x: 680,
      y: 280,
      description: 'Chave Relacionada: MATVINC ↔ matricula_funcional (Score 94%).',
      inputs: ['node-2', 'node-3'],
      outputs: ['node-5']
    },
    {
      id: 'node-5',
      label: 'Validador de Integridade & Auditoria',
      nodeType: 'VALIDATION',
      category: 'Auditoria de Regras',
      status: 'SUCCESS',
      latency: '8ms',
      itemsProcessed: 14820,
      x: 980,
      y: 280,
      description: 'Separação de casos sem pagamento e pagamentos órfãos.',
      inputs: ['node-4'],
      outputs: ['node-6']
    },
    {
      id: 'node-6',
      label: 'Data Mart Consolidado (JSON / API)',
      nodeType: 'EXPORT',
      category: 'Destino',
      status: 'IDLE',
      latency: '-',
      itemsProcessed: 14820,
      x: 1280,
      y: 280,
      description: 'Disponibilização para consumo pelo backend do SYNAPSE.',
      inputs: ['node-5']
    }
  ],
  edges: [
    { id: 'e1-2', fromNodeId: 'node-1', toNodeId: 'node-2', animated: true, status: 'ACTIVE' },
    { id: 'e2-4', fromNodeId: 'node-2', toNodeId: 'node-4', animated: true, status: 'ACTIVE' },
    { id: 'e3-4', fromNodeId: 'node-3', toNodeId: 'node-4', animated: true, status: 'ACTIVE' },
    { id: 'e4-5', fromNodeId: 'node-4', toNodeId: 'node-5', animated: true, status: 'ACTIVE' },
    { id: 'e5-6', fromNodeId: 'node-5', toNodeId: 'node-6', animated: false, status: 'IDLE' }
  ]
};

// Funções de Serviço para o Frontend
export const apiService = {
  getMetrics: async (): Promise<SystemMetrics> => {
    return { ...INITIAL_METRICS };
  },

  getDataSources: async (): Promise<DataSource[]> => {
    return [...INITIAL_DATA_SOURCES];
  },

  getCandidates: async (): Promise<RelationshipCandidate[]> => {
    return [...INITIAL_CANDIDATES];
  },

  getPipeline: async (): Promise<Pipeline> => {
    return { ...INITIAL_PIPELINE };
  },

  approveRelationship: async (candidateId: string): Promise<RelationshipCandidate> => {
    const candidate = INITIAL_CANDIDATES.find(c => c.id === candidateId);
    if (!candidate) throw new Error('Candidato não encontrado');
    candidate.status = 'PLANO_APROVADO_EXECUTADO';
    return { ...candidate };
  },

  rejectRelationship: async (candidateId: string, motivo: string): Promise<RelationshipCandidate> => {
    const candidate = INITIAL_CANDIDATES.find(c => c.id === candidateId);
    if (!candidate) throw new Error('Candidato não encontrado');
    candidate.status = 'REJEITADO_PELO_USUARIO';
    candidate.rejeicaoMotivo = motivo;
    return { ...candidate };
  },

  /**
   * Processa arquivo CSV/XLSX sintético submetido pelo usuário no frontend
   * e extrai esquema automaticamente para simulação no Workspace.
   */
  processUploadedFile: async (fileName: string, rawText: string): Promise<DataSource> => {
    const lines = rawText.split('\n').filter(l => l.trim().length > 0);
    if (lines.length < 2) {
      throw new Error('Arquivo vazio ou sem linhas de dados suficientes.');
    }

    const headers = lines[0].split(/[,;\t]/).map(h => h.trim().replace(/^["']|["']$/g, ''));
    const rows = lines.slice(1, 101).map(l => l.split(/[,;\t]/).map(c => c.trim().replace(/^["']|["']$/g, '')));

    const columns = headers.map((header, colIdx) => {
      const colValues = rows.map(r => r[colIdx] || '');
      const isInt = colValues.every(v => /^[0-9]+$/.test(v) || v === '');
      const isFloat = colValues.every(v => !isNaN(Number(v)) || v === '');
      
      const type = isInt ? 'integer' : (isFloat ? 'float' : 'string');
      const distinct = new Set(colValues.filter(Boolean));

      return {
        name: header,
        type: type as 'integer' | 'float' | 'string',
        nullRatio: colValues.filter(v => v === '').length / colValues.length,
        uniquenessRatio: distinct.size / (colValues.length || 1),
        sampleValues: colValues.slice(0, 5)
      };
    });

    const newSource: DataSource = {
      id: `ds-upload-${Date.now()}`,
      name: fileName.replace(/\.[^/.]+$/, ''),
      sourceType: fileName.endsWith('.xlsx') ? 'excel' : 'csv',
      description: `Arquivo customizado importado pelo usuário (${lines.length - 1} registros detectados).`,
      rowCount: lines.length - 1,
      columnCount: headers.length,
      status: 'ACTIVE',
      lastSync: 'agora mesmo',
      isCustomUpload: true,
      columns
    };

    return newSource;
  }
};
