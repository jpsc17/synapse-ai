// SYNAPSE - Data Bridge Generico & Agnóstico com Retrocompatibilidade
const item = $input.first()?.json || {};
const body = item.body || item;

// Suporte a baseA/baseB agnósticos ou funcionarios/pagamentos legados
const rawBaseA = (Array.isArray(body.baseA) && body.baseA.length > 0)
  ? body.baseA
  : (Array.isArray(body.funcionarios) && body.funcionarios.length > 0)
    ? body.funcionarios
    : [
        { MATVINC: 1001, nome: 'Ana', SETOR: 'TI' },
        { MATVINC: 1002, nome: 'Bruno', SETOR: 'RH' },
        { MATVINC: 1003, nome: 'Carla', SETOR: 'Financeiro' }
      ];

const rawBaseB = (Array.isArray(body.baseB) && body.baseB.length > 0)
  ? body.baseB
  : (Array.isArray(body.pagamentos) && body.pagamentos.length > 0)
    ? body.pagamentos
    : [
        { matricula: 1001, valor: 2500, competencia: '2026-10' },
        { matricula: 1002, valor: 3100, competencia: '2026-10' },
        { matricula: 1004, valor: 2800, competencia: '2026-10' }
      ];

// Identificação das chaves de junção
function findKey(sampleRow, preferredKey) {
  if (preferredKey && sampleRow && preferredKey in sampleRow) return preferredKey;
  if (!sampleRow) return 'id';
  const keys = Object.keys(sampleRow);
  for (const k of ['MATVINC', 'matricula', 'id', 'codigo', 'cod', 'chave']) {
    const found = keys.find(x => x.toLowerCase() === k.toLowerCase());
    if (found) return found;
  }
  return keys[0] || 'id';
}

const keyA = body.keyA || findKey(rawBaseA[0], null);
const keyB = body.keyB || findKey(rawBaseB[0], null);

// Normalização determinística de chaves
function normalizeKey(v) {
  if (v === null || v === undefined) return null;
  let s = String(v).trim();
  if (s === '') return null;
  if (/^[0-9]+$/.test(s)) {
    s = s.replace(/^0+/, '');
    return s === '' ? '0' : s;
  }
  return s.toLowerCase();
}

// Indexação da Base B para busca eficiente em O(1)
const mapB = new Map();
const matchedKeysB = new Set();

for (const rowB of rawBaseB) {
  const rawK = rowB[keyB] ?? rowB.matricula ?? rowB.MATVINC ?? rowB.id;
  const k = normalizeKey(rawK);
  if (k !== null) {
    if (!mapB.has(k)) {
      mapB.set(k, []);
    }
    mapB.get(k).push(rowB);
  }
}

const matched = [];
const unmatchedA = [];

// Cruzamento a partir da Base A
for (const rowA of rawBaseA) {
  const rawK = rowA[keyA] ?? rowA.MATVINC ?? rowA.matricula ?? rowA.id;
  const k = normalizeKey(rawK);

  if (k !== null && mapB.has(k)) {
    matchedKeysB.add(k);
    const rowsB = mapB.get(k);
    for (const matchB of rowsB) {
      const compatibilityValue = matchB.valor ?? matchB.valor_pagamento ?? matchB.valor_total_item;
      const merged = {
        ...rowA,
        ...matchB,
        _matchDetails: {
          keyA,
          keyB,
          keyValueA: rawK,
          keyValueB: matchB[keyB]
        },
        _statusRelacao: 'CORRESPONDENCIA_ENCONTRADA',
        // Retrocompatibilidade com testes e componentes legados
        matricula: String(rawK),
        nome: rowA.nome ?? rowA.NOME_SERVIDOR ?? rowA.DESCRICAO_ITEM ?? String(rawK),
        ...(compatibilityValue !== null && compatibilityValue !== undefined ? { valor: compatibilityValue } : {}),
        status: 'PAGO'
      };
      matched.push(merged);
    }
  } else {
    unmatchedA.push({
      ...rowA,
      _statusRelacao: 'SEM_CORRESPONDENCIA_EM_B',
      matricula: String(rawK),
      nome: rowA.nome ?? rowA.NOME_SERVIDOR ?? rowA.DESCRICAO_ITEM ?? String(rawK),
      status: 'SEM_PAGAMENTO'
    });
  }
}

// Identificação das divergências exclusivas da Base B
const unmatchedB = [];
for (const rowB of rawBaseB) {
  const rawK = rowB[keyB] ?? rowB.matricula ?? rowB.MATVINC ?? rowB.id;
  const k = normalizeKey(rawK);
  if (k === null || !matchedKeysB.has(k)) {
    const compatibilityValue = rowB.valor ?? rowB.valor_pagamento ?? rowB.valor_total_item;
    unmatchedB.push({
      ...rowB,
      _statusRelacao: 'SEM_CORRESPONDENCIA_EM_A',
      matricula: String(rawK),
      ...(compatibilityValue !== null && compatibilityValue !== undefined ? { valor: compatibilityValue } : {}),
      status: 'SEM_FUNCIONARIO_CORRESPONDENTE'
    });
  }
}

const resultado = {
  poc: 'SYNAPSE - Data Bridge Universal',
  executadoEm: new Date().toISOString(),
  resumo: {
    totalBaseA: rawBaseA.length,
    totalBaseB: rawBaseB.length,
    qtdCorrespondencias: matched.length,
    qtdApenasBaseA: unmatchedA.length,
    qtdApenasBaseB: unmatchedB.length,
    // Retrocompatibilidade
    totalFuncionarios: rawBaseA.length,
    totalPagamentos: rawBaseB.length,
    qtdFuncionariosComPagamento: matched.length,
    qtdFuncionariosSemPagamento: unmatchedA.length,
    qtdPagamentosSemFuncionario: unmatchedB.length
  },
  keyA,
  keyB,
  matched,
  unmatchedA,
  unmatchedB,
  // Retrocompatibilidade
  funcionariosComPagamento: matched,
  funcionariosSemPagamento: unmatchedA,
  pagamentosSemFuncionario: unmatchedB
};

return [{ json: resultado }];
