import React, { useState, useRef } from 'react';
import { useSynapse } from '../../context/SynapseContext';

export const FileUploadModal: React.FC = () => {
  const { isUploadModalOpen, setIsUploadModalOpen, addDataSourceFromUpload } = useSynapse();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [customText, setCustomText] = useState('');
  const [fileName, setFileName] = useState('dados_sinteticos_servidores.csv');
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isUploadModalOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setFileName(file.name);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setFileName(file.name);
    }
  };

  const handleLoadSampleData = () => {
    const sample = `MATVINC,NOME_SERVIDOR,SETOR,CARGO
1001,Ana Silva,TI,Analista de Sistemas
1002,Bruno Costa,RH,Especialista em Gestao
1003,Carla Dias,Financeiro,Auditora Fiscal
1004,Daniel Rocha,Operacoes,Engenheiro de Dados
1005,Eduarda Lima,TI,Arquiteta de Software`;
    setCustomText(sample);
    setFileName('funcionarios_base_a.csv');
    setSelectedFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      let content = customText;
      if (selectedFile) {
        content = await selectedFile.text();
      }
      if (!content.trim()) {
        alert('Por favor, carregue um arquivo ou cole o conteúdo CSV.');
        setIsLoading(false);
        return;
      }

      await addDataSourceFromUpload(fileName, content);
      setIsUploadModalOpen(false);
    } catch (err: unknown) {
      alert(`Falha ao processar arquivo: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-surface-container-low border border-outline-variant rounded-lg max-w-xl w-full shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-space-md py-space-sm bg-surface-container border-b border-outline-variant flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">upload_file</span>
            <span className="font-headline-sm font-semibold text-on-surface text-sm">
              Conectar Fonte de Dados (CSV / XLSX)
            </span>
          </div>
          <button 
            onClick={() => setIsUploadModalOpen(false)}
            className="text-on-surface-variant hover:text-on-surface p-1 rounded"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-space-md space-y-4">
          <p className="text-xs text-on-surface-variant">
            Importe arquivos tabulares para que o motor heurístico inspecione automaticamente os esquemas, tipos e proponha relacionamentos.
          </p>

          {/* Drag & Drop Area */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${
              dragActive 
                ? 'border-primary bg-primary/10' 
                : 'border-outline-variant hover:border-primary/50 bg-surface-container-lowest'
            }`}
          >
            <input 
              ref={fileInputRef} 
              type="file" 
              accept=".csv,.xlsx,.tsv" 
              onChange={handleFileChange}
              className="hidden" 
            />
            <span className="material-symbols-outlined text-[32px] text-secondary">cloud_upload</span>
            <span className="text-xs text-on-surface font-medium">
              {selectedFile ? selectedFile.name : 'Clique ou arraste um arquivo CSV / XLSX aqui'}
            </span>
            <span className="text-[10px] text-on-surface-variant font-code-compact">
              Compatível com UTF-8, delimitadores vírgula ou ponto-e-vírgula
            </span>
          </div>

          <div className="flex items-center justify-between text-xs text-on-surface-variant">
            <span>Ou insira dados sintéticos diretamente:</span>
            <button 
              type="button" 
              onClick={handleLoadSampleData}
              className="text-primary hover:underline text-[11px] font-code-compact"
            >
              [Carregar Exemplo Base A]
            </button>
          </div>

          <div>
            <textarea
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="MATVINC,NOME_SERVIDOR,SETOR&#10;1001,Ana,TI&#10;1002,Bruno,RH"
              rows={4}
              className="w-full text-xs font-code-compact p-2.5 rounded bg-surface-container-lowest border border-outline-variant text-on-surface focus:outline-none focus:border-primary"
            />
          </div>

          {/* Modal Footer */}
          <div className="pt-2 border-t border-outline-variant flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsUploadModalOpen(false)}
              className="px-3 py-1.5 rounded bg-surface-container hover:bg-surface-container-high border border-outline-variant text-xs font-medium text-on-surface transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-1.5 rounded bg-primary text-on-primary text-xs font-semibold hover:shadow-teal-glow transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              {isLoading ? (
                <>
                  <span className="w-3 h-3 rounded-full border-2 border-on-primary border-t-transparent animate-spin"></span>
                  <span>Analisando Esquema...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                  <span>Processar e Analisar</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
