// SYNAPSE Intelligent Relationship Discovery Engine
const item = $input.first()?.json || {};
const body = item.body || item;

// 1. Funcao de normalizacao de valores (zeros a esquerda, trim, casing)
function normalizeVal(v) {
  if (v === null || v === undefined) return null;
  let s = String(v).trim();
  if (s === '') return null;
  if (/^[0-9]+$/.test(s)) {
    s = s.replace(/^0+/, '');
    return s === '' ? '0' : s;
  }
  return s.toLowerCase();
}

// 2. Inferencia de tipos e metricas de coluna
function analyzeColumn(rows, colName) {
  const rawValues = rows.map(r => r[colName]);
  const nonNulls = rawValues.filter(v => v !== null && v !== undefined && String(v).trim() !== '');
  const nullCount = rawValues.length - nonNulls.length;
  const nullRatio = rawValues.length > 0 ? nullCount / rawValues.length : 1;

  const normalized = nonNulls.map(normalizeVal).filter(v => v !== null);
  const distinctSet = new Set(normalized);
  const distinctCount = distinctSet.size;
  const uniquenessRatio = nonNulls.length > 0 ? distinctCount / nonNulls.length : 0;

  let isInt = true;
  let isNumeric = true;
  let isDate = true;

  for (const v of nonNulls) {
    const s = String(v).trim();
    if (!/^-?[0-9]+$/.test(s)) isInt = false;
    if (isNaN(Number(s))) isNumeric = false;
    // Validação estrita de data: exige formato ISO YYYY-MM(-DD) ou DD/MM/YYYY e sem letras
    const hasDatePattern = /^(\d{4}[-/]\d{1,2}([-/]\d{1,2})?|\d{1,2}[-/]\d{1,2}[-/]\d{4})$/.test(s);
    if (!hasDatePattern || isNaN(Date.parse(s))) isDate = false;
  }

  let type = 'string';
  if (nonNulls.length === 0) type = 'empty';
  else if (isInt) type = 'integer';
  else if (isNumeric) type = 'float';
  else if (isDate) type = 'date';

  return {
    name: colName,
    type,
    totalRows: rawValues.length,
    nullCount,
    nullRatio,
    distinctCount,
    uniquenessRatio,
    distinctValues: Array.from(distinctSet),
    sampleValues: nonNulls.slice(0, 5)
  };
}

// 3. Taxonomia e Similaridade Semantica Heuristica
const SEMANTIC_TAXONOMY = {
  id: ['mat', 'matr', 'matricula', 'vinc', 'vinculo', 'matvinc', 'id', 'cod', 'codigo', 'registro', 'funcional', 'servidor', 'colaborador', 'pessoal'],
  nome: ['nome', 'servidor', 'funcionario', 'colaborador', 'pessoa', 'titular'],
  setor: ['setor', 'dep', 'departamento', 'lotacao', 'unidade', 'orgao', 'divisao'],
  financeiro: ['val', 'valor', 'remuneracao', 'salario', 'provento', 'pagamento', 'pagto', 'liquido', 'bruto'],
  tempo: ['comp', 'competencia', 'ano', 'mes', 'periodo', 'exercicio', 'data']
};

function tokenize(name) {
  return name
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function calculateNameSimilarity(nameA, nameB) {
  const normA = nameA.toLowerCase().trim();
  const normB = nameB.toLowerCase().trim();
  if (normA === normB) return 1.0;

  const tokensA = tokenize(nameA);
  const tokensB = tokenize(nameB);

  const setB = new Set(tokensB);
  const commonTokens = tokensA.filter(t => setB.has(t));
  const tokenJaccard = commonTokens.length / (new Set([...tokensA, ...tokensB]).size || 1);

  let clusterMatchScore = 0;
  for (const keywords of Object.values(SEMANTIC_TAXONOMY)) {
    const matchA = tokensA.some(t => keywords.some(k => t.includes(k) || k.includes(t)));
    const matchB = tokensB.some(t => keywords.some(k => t.includes(k) || k.includes(t)));
    if (matchA && matchB) {
      clusterMatchScore = Math.max(clusterMatchScore, 0.85);
    }
  }

  let substringScore = 0;
  if (normA.includes(normB) || normB.includes(normA)) {
    substringScore = 0.7;
  }

  return Math.max(tokenJaccard, clusterMatchScore, substringScore);
}

function isIdentifierLike(name) {
  const tokens = tokenize(name);
  const identifierTerms = new Set(['id', 'cod', 'codigo', 'mat', 'matr', 'matricula', 'registro', 'chave', 'key']);
  return tokens.some(token => identifierTerms.has(token) || token.endsWith('id'));
}

function describeComparison(comparison) {
  const f = comparison.fatores;
  const e = comparison.evidencias;
  const overlap = Math.round(f.sobreposicaoValoresMin * 100);
  const uniqueness = Math.round(f.consistenciaUnicidade * 100);
  const commonSample = e.valoresEmComum.slice(0, 5).join(', ') || 'nenhum';
  return `${comparison.colunaBaseA} e ${comparison.colunaBaseB}: ${overlap}% de sobreposicao sobre o menor dominio, ` +
    `${uniqueness}% de unicidade minima e ${e.qtdValoresEmComum} valor(es) em comum (amostra: ${commonSample}). ` +
    `Classificacao heuristica: ${comparison.classificacao}.`;
}

// 4. Comparador de Colunas (Heuristica Deterministica)
function compareColumns(colA, colB) {
  let typeCompatibility = 0;
  if (colA.type === colB.type && colA.type !== 'empty') {
    typeCompatibility = 1.0;
  } else if ((colA.type === 'integer' || colA.type === 'string') && (colB.type === 'integer' || colB.type === 'string')) {
    typeCompatibility = 0.8;
  } else {
    typeCompatibility = 0.1;
  }

  const nameSim = calculateNameSimilarity(colA.name, colB.name);

  const setA = new Set(colA.distinctValues);
  const setB = new Set(colB.distinctValues);

  const intersection = colA.distinctValues.filter(v => setB.has(v));
  const unionSize = new Set([...colA.distinctValues, ...colB.distinctValues]).size || 1;
  const minDistinct = Math.min(colA.distinctValues.length, colB.distinctValues.length) || 1;

  const overlapRatioMin = intersection.length / minDistinct;
  const jaccardOverlap = intersection.length / unionSize;

  const uniquenessConsistency = Math.min(colA.uniquenessRatio, colB.uniquenessRatio);
  const identifierNameSignal = isIdentifierLike(colA.name) && isIdentifierLike(colB.name);
  const cardinalityFactor = 0.35 + (0.65 * Math.sqrt(uniquenessConsistency));
  const manyToManyRisk = colA.uniquenessRatio < 0.5 && colB.uniquenessRatio < 0.5;
  const penaltyNulls = (colA.nullRatio > 0.3 || colB.nullRatio > 0.3) ? 0.6 : 1.0;

  let score = 0;
  if (intersection.length > 0 && typeCompatibility > 0.3) {
    const rawScore = (
      (overlapRatioMin * 0.45) +
      (typeCompatibility * 0.25) +
      (nameSim * 0.20) +
      (uniquenessConsistency * 0.10)
    ) * 100 * penaltyNulls;
    score = Math.round(rawScore * cardinalityFactor * 10) / 10;
  } else if (nameSim > 0.7 && typeCompatibility > 0.5) {
    score = Math.round(nameSim * 25);
  }

  let classificacao = 'REJEITADO';
  let motivoRejeicao = null;

  if (score >= 80 && intersection.length > 0 && !manyToManyRisk && (uniquenessConsistency >= 0.5 || identifierNameSignal)) {
    classificacao = 'CANDIDATO_RECOMENDADO';
  } else if (score >= 40) {
    classificacao = 'CANDIDATO_AMBIGUO';
    motivoRejeicao = manyToManyRisk
      ? 'Alta repeticao dos valores nas duas colunas indica risco de relacionamento muitos-para-muitos.'
      : 'Similaridade parcial, sobreposicao moderada ou baixa qualidade de chave. Requer validacao humana adicional.';
  } else {
    classificacao = 'REJEITADO';
    if (intersection.length === 0) {
      motivoRejeicao = 'Zero sobreposicao de valores entre os dominios das duas colunas.';
    } else if (typeCompatibility < 0.3) {
      motivoRejeicao = 'Tipos de dados incompativeis: ' + colA.type + ' vs ' + colB.type + '.';
    } else {
      motivoRejeicao = 'Pontuacao heuristica insuficiente para inferir relacionamento confiavel.';
    }
  }

  return {
    colunaBaseA: colA.name,
    colunaBaseB: colB.name,
    score,
    classificacao,
    motivoRejeicao,
    fatores: {
      similaridadeSemanticaNome: Math.round(nameSim * 100) / 100,
      compatibilidadeTipo: Math.round(typeCompatibility * 100) / 100,
      sobreposicaoValoresMin: Math.round(overlapRatioMin * 100) / 100,
      jaccardValores: Math.round(jaccardOverlap * 100) / 100,
      consistenciaUnicidade: Math.round(uniquenessConsistency * 100) / 100,
      qualidadeCardinalidade: Math.round(cardinalityFactor * 100) / 100,
      sinalNomeIdentificador: identifierNameSignal
    },
    evidencias: {
      tipoA: colA.type,
      tipoB: colB.type,
      valoresEmComum: intersection,
      qtdValoresEmComum: intersection.length,
      totalValoresDistintosA: colA.distinctCount,
      totalValoresDistintosB: colB.distinctCount,
      unicidadeA: Math.round(colA.uniquenessRatio * 100) / 100,
      unicidadeB: Math.round(colB.uniquenessRatio * 100) / 100,
      riscoMuitosParaMuitos: manyToManyRisk,
      amostraValoresApenasEmA: colA.distinctValues.filter(v => !setB.has(v)).slice(0, 3),
      amostraValoresApenasEmB: colB.distinctValues.filter(v => !setA.has(v)).slice(0, 3)
    }
  };
}

// 5. Motor de Descoberta entre duas bases
function discoverRelationships(baseA, baseB, aprovadoManual = false) {
  if (!baseA || baseA.length === 0 || !baseB || baseB.length === 0) {
    return { erro: 'Bases de dados vazias ou invalidas' };
  }

  const colsA = Object.keys(baseA[0]).map(col => analyzeColumn(baseA, col));
  const colsB = Object.keys(baseB[0]).map(col => analyzeColumn(baseB, col));

  const comparacoes = [];
  for (const cA of colsA) {
    for (const cB of colsB) {
      comparacoes.push(compareColumns(cA, cB));
    }
  }

  comparacoes.sort((a, b) => b.score - a.score);

  const melhorCandidato = comparacoes[0] || null;
  const candidatosValidos = comparacoes.filter(c => c.classificacao === 'CANDIDATO_RECOMENDADO');

  let joinResultado = null;
  let statusPlano = 'PROPOSTO_AGUARDANDO_APROVACAO';

  if (melhorCandidato && melhorCandidato.classificacao === 'CANDIDATO_RECOMENDADO') {
    if (aprovadoManual === true) {
      statusPlano = 'PLANO_APROVADO_EXECUTADO';
      const colA = melhorCandidato.colunaBaseA;
      const colB = melhorCandidato.colunaBaseB;
      const mapB = new Map();
      baseB.forEach(r => {
        const k = normalizeVal(r[colB]);
        if (k) mapB.set(k, r);
      });

      joinResultado = baseA.map(rowA => {
        const kA = normalizeVal(rowA[colA]);
        const matchB = kA ? mapB.get(kA) : null;
        return {
          ...rowA,
          _match: matchB || null,
          _statusRelacao: matchB ? 'CORRESPONDENCIA_ENCONTRADA' : 'SEM_CORRESPONDENCIA'
        };
      });
    }
  } else {
    statusPlano = 'NENHUM_RELACIONAMENTO_CONFIAVEL_ENCONTRADO';
  }

  return {
    statusPlano,
    aprovado: aprovadoManual,
    melhorRelacaoSugerida: melhorCandidato,
    candidatosRecomendados: candidatosValidos,
    totalParesAnalisados: comparacoes.length,
    todasComparacoes: comparacoes,
    joinResultado
  };
}

// 6. Dados Principais do Desafio
const baseAPrincipal = [
  { MATVINC: 1001, NOME_SERVIDOR: 'Ana', SETOR: 'TI' },
  { MATVINC: 1002, NOME_SERVIDOR: 'Bruno', SETOR: 'RH' },
  { MATVINC: 1003, NOME_SERVIDOR: 'Carla', SETOR: 'Financeiro' }
];

const baseBPrincipal = [
  { matricula_funcional: 1001, valor_pagamento: 2500, competencia: '2026-10' },
  { matricula_funcional: 1002, valor_pagamento: 3100, competencia: '2026-10' },
  { matricula_funcional: 1004, valor_pagamento: 2800, competencia: '2026-10' }
];

// 7. Bateria de Casos de Teste Especiais Requisitados
const casosDeTeste = [
  {
    cenario: 'Caso 1: Nomes de colunas diferentes, mas semanticamente equivalentes',
    descricao: 'COD_COLABORADOR vs ID_PESSOAL com sobreposicao deterministica',
    baseA: [
      { COD_COLABORADOR: '501', NOME: 'Marcos' },
      { COD_COLABORADOR: '502', NOME: 'Juliana' }
    ],
    baseB: [
      { ID_PESSOAL: '501', BENEFICIO: 350 },
      { ID_PESSOAL: '502', BENEFICIO: 420 }
    ]
  },
  {
    cenario: 'Caso 2: Colunas com nomes semelhantes, mas valores incompativeis',
    descricao: 'ANO_BASE vs ANO_EXERCICIO possuem similaridade semantica alta, mas valores disjuntos (2010 vs 2026)',
    baseA: [
      { ID: 1, ANO_BASE: 2010 },
      { ID: 2, ANO_BASE: 2011 }
    ],
    baseB: [
      { ID_EXT: 10, ANO_EXERCICIO: 2025 },
      { ID_EXT: 20, ANO_EXERCICIO: 2026 }
    ]
  },
  {
    cenario: 'Caso 3: Identificadores com zeros a esquerda',
    descricao: 'MATRICULA com formatacao "001001" vs ID_REGISTRO "1001" normalizados automaticamente',
    baseA: [
      { MATRICULA: '001001', NOME: 'Lucas' },
      { MATRICULA: '001002', NOME: 'Fernanda' }
    ],
    baseB: [
      { ID_REGISTRO: 1001, DIARIAS: 2 },
      { ID_REGISTRO: 1002, DIARIAS: 5 }
    ]
  },
  {
    cenario: 'Caso 4: Valores duplicados e nulos',
    descricao: 'Campos com alta taxa de nulos e repeticoes penalizados na cardinalidade',
    baseA: [
      { MATRICULA: 1001, STATUS: null },
      { MATRICULA: null, STATUS: 'ATIVO' },
      { MATRICULA: 1001, STATUS: null }
    ],
    baseB: [
      { MAT_PAGTO: 1001, VALOR: 1000 },
      { MAT_PAGTO: 1002, VALOR: 1500 }
    ]
  },
  {
    cenario: 'Caso 5: Ausencia total de relacionamento confiavel',
    descricao: 'Tabelas sem atributos compativeis ou sobreposicao (ex: TELEFONE vs VALOR_PAGTO)',
    baseA: [
      { TELEFONE: '99881122', CIDADE: 'Brasilia' },
      { TELEFONE: '99773344', CIDADE: 'Goiania' }
    ],
    baseB: [
      { VALOR_PAGTO: 5000, COD_BANCO: 1 },
      { VALOR_PAGTO: 7200, COD_BANCO: 104 }
    ]
  }
];

// Execucao da Base Principal
const inputBaseA = (Array.isArray(body.baseA) && body.baseA.length > 0) ? body.baseA : baseAPrincipal;
const inputBaseB = (Array.isArray(body.baseB) && body.baseB.length > 0) ? body.baseB : baseBPrincipal;
const aprovado = body.aprovado === true;

const resultadoPrincipal = discoverRelationships(inputBaseA, inputBaseB, aprovado);

// Execucao da Bateria de Testes para Validacao Completa
const relatorioBateriaTestes = casosDeTeste.map(tc => {
  const res = discoverRelationships(tc.baseA, tc.baseB, false);
  return {
    cenario: tc.cenario,
    descricao: tc.descricao,
    melhorCandidatoEncontrado: res.melhorRelacaoSugerida ? {
      par: res.melhorRelacaoSugerida.colunaBaseA + ' <-> ' + res.melhorRelacaoSugerida.colunaBaseB,
      score: res.melhorRelacaoSugerida.score,
      classificacao: res.melhorRelacaoSugerida.classificacao,
      motivoRejeicao: res.melhorRelacaoSugerida.motivoRejeicao
    } : null,
    totalComparacoes: res.totalParesAnalisados,
    status: res.statusPlano
  };
});

// Resposta Final Estruturada
const respostaFinal = {
  workflow: 'SYNAPSE - Intelligent Discovery POC',
  modeloIAUtilizado: false,
  notaIA: 'Nenhuma credencial de LLM configurada na instancia local. Utilizado motor de inferencia heuristico deterministico com taxonomia semantica, normalizacao de formatos e analise de sobreposicao de conjuntos.',
  executadoEm: new Date().toISOString(),
  analisePrincipal: {
    status: resultadoPrincipal.statusPlano,
    aprovacaoRequeridaAntesDeJoin: !aprovado,
    relacaoSugerida: resultadoPrincipal.melhorRelacaoSugerida ? {
      colunaBaseA: resultadoPrincipal.melhorRelacaoSugerida.colunaBaseA,
      colunaBaseB: resultadoPrincipal.melhorRelacaoSugerida.colunaBaseB,
      score: resultadoPrincipal.melhorRelacaoSugerida.score,
      classificacao: resultadoPrincipal.melhorRelacaoSugerida.classificacao,
      motivoRejeicao: resultadoPrincipal.melhorRelacaoSugerida.motivoRejeicao,
      explicacao: describeComparison(resultadoPrincipal.melhorRelacaoSugerida),
      fatoresDetalhados: resultadoPrincipal.melhorRelacaoSugerida.fatores,
      evidenciasConcretas: resultadoPrincipal.melhorRelacaoSugerida.evidencias
    } : null,
    totalParesAvaliados: resultadoPrincipal.totalParesAnalisados,
    todasAsComparacoes: resultadoPrincipal.todasComparacoes.map(c => ({
      colunaBaseA: c.colunaBaseA,
      colunaBaseB: c.colunaBaseB,
      par: c.colunaBaseA + ' <-> ' + c.colunaBaseB,
      score: c.score,
      classificacao: c.classificacao,
      motivoRejeicao: c.motivoRejeicao,
      explicacao: describeComparison(c),
      fatoresDetalhados: c.fatores,
      evidenciasConcretas: c.evidencias
    })),
    resultadoJoinSeAprovado: resultadoPrincipal.joinResultado
  },
  validacaoCasosEspeciais: relatorioBateriaTestes
};

return [{ json: respostaFinal }];
