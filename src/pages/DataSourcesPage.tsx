import React from 'react';
import { useSynapse } from '../context/SynapseContext';

export const DataSourcesPage: React.FC = () => {
  const { dataSources, setIsUploadModalOpen, setSelectedDataSource } = useSynapse();

  return (
    <div className="space-y-space-lg max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-space-sm border-b border-outline-variant">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-on-surface">Fontes de Dados Conectadas</h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Gerencie bancos relacionais, data lakes corporativos e arquivos sintéticos tabulares importados.
          </p>
        </div>
        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="h-8 px-space-md rounded bg-primary text-on-primary text-xs font-semibold flex items-center gap-1.5 hover:shadow-teal-glow transition-all self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-[16px]">upload_file</span>
          <span>Upload CSV / XLSX</span>
        </button>
      </div>

      {/* Grid de Fontes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
        {dataSources.map(ds => (
          <div
            key={ds.id}
            onClick={() => setSelectedDataSource(ds)}
            className="p-space-md rounded-lg border border-outline-variant bg-surface-container-low hover:border-primary/50 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">
                    {ds.sourceType === 'postgresql' ? 'database' : ds.sourceType === 'excel' ? 'table_chart' : ds.sourceType === 'snowflake' ? 'cloud' : 'folder'}
                  </span>
                  <span className="text-sm font-bold text-on-surface">{ds.name}</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-surface-container text-xs font-code-compact text-primary font-medium border border-outline-variant">
                  {ds.sourceType.toUpperCase()}
                </span>
              </div>

              <p className="text-xs text-on-surface-variant mb-4">
                {ds.description}
              </p>

              <div className="grid grid-cols-3 gap-2 text-xs font-code-compact mb-4">
                <div className="bg-surface-container p-2 rounded">
                  <span className="text-[10px] text-on-surface-variant block">Registros:</span>
                  <span className="font-bold text-on-surface">{ds.rowCount.toLocaleString()}</span>
                </div>
                <div className="bg-surface-container p-2 rounded">
                  <span className="text-[10px] text-on-surface-variant block">Colunas:</span>
                  <span className="font-bold text-secondary">{ds.columnCount}</span>
                </div>
                <div className="bg-surface-container p-2 rounded">
                  <span className="text-[10px] text-on-surface-variant block">Último Sync:</span>
                  <span className="font-bold text-primary">{ds.lastSync}</span>
                </div>
              </div>

              {/* Colunas detectadas */}
              <div>
                <span className="text-[10px] font-code-compact text-outline uppercase block mb-1.5">
                  Amostra de Atributos:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {ds.columns.slice(0, 6).map(col => (
                    <span 
                      key={col.name} 
                      className="px-2 py-0.5 rounded bg-surface-container-lowest border border-outline-variant/60 text-[11px] font-code-compact text-on-surface"
                    >
                      {col.name} <span className="text-outline text-[10px]">({col.type})</span>
                    </span>
                  ))}
                  {ds.columns.length > 6 && (
                    <span className="px-2 py-0.5 rounded bg-surface-container text-[11px] font-code-compact text-outline">
                      +{ds.columns.length - 6} colunas
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-outline-variant/50 mt-4 flex items-center justify-between text-xs">
              <span className="text-on-surface-variant flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>Conector Ativo</span>
              </span>
              <span className="text-primary font-code-compact font-semibold text-[11px]">
                {ds.isCustomUpload ? 'Arquivo Sintético do Usuário' : 'Cluster Padrão'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
