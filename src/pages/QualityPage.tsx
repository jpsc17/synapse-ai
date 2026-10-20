import React from 'react';
import { useSynapse } from '../context/SynapseContext';

export const QualityPage: React.FC = () => {
  const { metrics } = useSynapse();

  const auditRules = [
    { id: 'rule-1', name: 'Validação de CPF e Dígitos Verificadores', status: 'PASS', score: '100%', affected: 0, desc: 'Algoritmo Módulo 11 executado em 14.820 registros sem anomalias.' },
    { id: 'rule-2', name: 'Detecção de Pagamentos Órfãos', status: 'WARN', score: '99.8%', affected: 1, desc: 'Identificado 1 pagamento (matrícula 1004 / 1006) sem funcionário correspondente.' },
    { id: 'rule-3', name: 'Verificação de Servidores Sem Pagamento', status: 'WARN', score: '99.8%', affected: 1, desc: 'Funcionária Carla Dias (MATVINC 1003) sem remuneração lançada na competência 2026-10.' },
    { id: 'rule-4', name: 'Consistência de Tipagem Numérica', status: 'PASS', score: '100%', affected: 0, desc: 'Zeros à esquerda tratados e normalizados em formato inteiro de 32/64 bits.' },
    { id: 'rule-5', name: 'Taxa de Nulos em Atributos Obrigatórios', status: 'PASS', score: '99.9%', affected: 2, desc: 'Valores em campos de lotação e cargo dentro da margem de tolerância SLA.' },
  ];

  return (
    <div className="space-y-space-lg max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-space-sm border-b border-outline-variant">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-on-surface">Auditoria & Qualidade de Dados</h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Monitoramento de conformidade de esquemas, integridade referencial e detecção de anomalias.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs font-code-compact">
            SLA Geral: {metrics.qualidadeMedia}%
          </span>
        </div>
      </div>

      {/* Regras de Auditoria */}
      <div className="space-y-3">
        {auditRules.map(rule => (
          <div key={rule.id} className="p-space-md rounded-lg border border-outline-variant bg-surface-container-low flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className={`material-symbols-outlined text-[20px] mt-0.5 ${rule.status === 'PASS' ? 'text-emerald-400' : 'text-amber-400'}`}>
                {rule.status === 'PASS' ? 'check_circle' : 'warning'}
              </span>
              <div>
                <div className="text-xs font-bold text-on-surface flex items-center gap-2">
                  <span>{rule.name}</span>
                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-code-compact font-bold ${
                    rule.status === 'PASS' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {rule.status === 'PASS' ? 'APROVADO' : 'ALERTA REQUER ATENÇÃO'}
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant mt-1">{rule.desc}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-code-compact self-end md:self-auto shrink-0">
              <div className="text-right">
                <span className="text-[10px] text-on-surface-variant block">Conformidade:</span>
                <span className="font-bold text-primary">{rule.score}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-on-surface-variant block">Registros com Alerta:</span>
                <span className={`font-bold ${rule.affected > 0 ? 'text-amber-400' : 'text-on-surface'}`}>{rule.affected}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
