import React from 'react';
import { Icon } from '../components/common/Icon';
import { useSynapse } from '../context/SynapseContext';

export const QualityPage: React.FC = () => {
  const { metrics, dataSources } = useSynapse();
  const assessments = dataSources.map(source => {
    const completeness = source.columns.length
      ? 100 * (1 - source.columns.reduce((total, column) => total + column.nullRatio, 0) / source.columns.length)
      : 0;
    const columnsWithNulls = source.columns.filter(column => column.nullRatio > 0);
    return { source, completeness: Number(completeness.toFixed(1)), columnsWithNulls };
  });

  return (
    <div className="mx-auto max-w-7xl space-y-space-lg pb-12">
      <div className="flex flex-col gap-4 border-b border-outline-variant pb-space-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-on-surface">Auditoria & Qualidade de Dados</h1>
          <p className="mt-0.5 text-xs text-on-surface-variant">Indicadores calculados dos metadados reais produzidos durante a importação.</p>
        </div>
        <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold font-code-compact text-emerald-400">Completude média: {metrics.qualidadeMedia}%</span>
      </div>

      {!assessments.length && <div className="rounded-lg border border-outline-variant bg-surface-container-low p-8 text-center text-xs text-on-surface-variant">Importe uma fonte para calcular indicadores de qualidade.</div>}
      <div className="space-y-3">
        {assessments.map(({ source, completeness, columnsWithNulls }) => (
          <article key={source.id} className="flex flex-col gap-4 rounded-lg border border-outline-variant bg-surface-container-low p-space-md md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <Icon name={columnsWithNulls.length ? 'warning' : 'check_circle'} className={`mt-0.5 h-5 w-5 shrink-0 ${columnsWithNulls.length ? 'text-amber-400' : 'text-emerald-400'}`} />
              <div className="min-w-0"><h2 className="truncate text-xs font-bold text-on-surface">{source.name}</h2><p className="break-all font-code-compact text-[10px] text-secondary">ID {source.id}</p><p className="mt-1 text-xs text-on-surface-variant">{source.columnCount} coluna(s) analisadas · {columnsWithNulls.length} coluna(s) com valores nulos.</p></div>
            </div>
            <div className="flex shrink-0 gap-4 text-right text-xs font-code-compact"><div><span className="block text-[10px] text-on-surface-variant">Completude</span><strong className="text-primary">{completeness}%</strong></div><div><span className="block text-[10px] text-on-surface-variant">Registros</span><strong>{source.rowCount.toLocaleString('pt-BR')}</strong></div></div>
          </article>
        ))}
      </div>
    </div>
  );
};
