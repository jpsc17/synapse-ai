# SYNAPSE AI — Relatório da Fase 5

Data da validação: 21/10/2026.

## Entregue

- Impacto detalhado por fonte, com planos, decisões, execuções, elegibilidade e ação recomendada.
- Exclusão definitiva de fonte livre, com confirmação e remoção de arquivo gerenciado não compartilhado.
- Resolução explícita de planos transitórios sem decisão ou execução.
- Proteção de decisões e execuções auditadas, com arquivamento/restauração como alternativa.
- Exclusão em lote atômica: se uma fonte estiver bloqueada, nenhuma é excluída.
- Fontes arquivadas ficam fora de métricas ativas, descoberta e workspace; permanecem consultáveis na administração.
- Trilha administrativa para arquivar, restaurar e excluir.
- Limpeza de desenvolvimento desabilitada por padrão, inacessível em produção, protegida por chave e frase exata, com backup SQLite e uploads antes da operação.
- Configuração Vercel/Railway, PostgreSQL, volume persistente, CORS restrito e variáveis de ambiente.
- Migração SQLite → PostgreSQL em dry-run por padrão e recusando destino não vazio.
- Auditoria de segredos e ampliação do `.gitignore`.

## Validação

- Backend: 32/32 testes aprovados.
- Gerenciamento de fontes isolado: 10/10 aprovados.
- Playwright: 4 aprovados; 1 auditoria mutável legada ignorada por segurança.
- Fluxo real coberto: upload, descoberta, aprovação, execução, histórico e exportação CSV.
- Ciclo administrativo E2E: fonte temporária criada, impacto consultado, arquivada, restaurada, excluída e conferida sem resíduo.
- TypeScript + build Vite: aprovado.
- Lint: aprovado com quatro avisos preexistentes/não bloqueantes.
- `git diff --check`: aprovado; apenas avisos de conversão LF/CRLF do Git no Windows.
- CORS local: origem `http://127.0.0.1:5173` autorizada sem wildcard.
- FastAPI, n8n e frontend: online.

Capturas: `artifacts/playwright/phase5-screenshots/`.

## Dados preservados

- Nenhuma limpeza administrativa foi executada.
- Contagem final: 50 fontes ativas, 0 arquivadas, 52 planos e 23 execuções.
- A fonte E2E foi removida ao final. Um plano pendente, sem decisão ou execução, apareceu durante a janela de validação por uma chamada externa da interface; foi preservado por não haver autorização para removê-lo.

## Pendências/bloqueadores de publicação

- Autenticação de usuários e autorização por função ainda não existem. Em produção, mantenha exclusão destrutiva e manutenção desabilitadas; nunca exponha `ADMIN_API_KEY` como variável `VITE_*`.
- A migração PostgreSQL deve ser executada somente após backup e autorização, seguida de reconciliação das contagens.
- O volume Railway e os backups do PostgreSQL precisam ser criados/habilitados no painel.
- A versão da imagem n8n deve ser fixada na mesma versão validada localmente antes do deploy.
- O bundle JavaScript (~726 kB, ~226 kB gzip) gera aviso de tamanho, mas não bloqueia a demonstração.
- Persistem avisos de depreciação de FastAPI/Pydantic/datetime nos testes; não afetam a funcionalidade atual.

## Publicação

O passo a passo completo e as variáveis estão em `docs/DEPLOYMENT.md`. Nenhum commit, push ou deploy foi realizado.
