# SYNAPSE AI — Relatório de prontidão da Fase 6

Data da homologação: 21/10/2026.

## Resultado executivo

O código está homologado para uma demonstração local controlada. A publicação pública permanece condicionada à criação da infraestrutura de staging, configuração dos segredos, migração autorizada para PostgreSQL e execução da mesma jornada contra as URLs candidatas. Nenhum deploy, commit, push ou migração real foi realizado.

## PASSOU

- Descoberta diferencia relações recomendadas, candidatas e exploratórias sem alterar scores.
- A interface mostra total analisado, total exibido, total filtrado e motivos de exclusão pelos filtros.
- Múltiplas comparações e evidências próprias de cada relação são preservadas.
- Risco muitos-para-muitos, unicidade e impacto potencial do JOIN são apresentados.
- Uma proposta principal classificada como rejeitada/exploratória não pode ser aprovada no frontend nem no backend.
- Fluxo sintético isolado: upload, descoberta real no n8n, aprovação, Data Bridge e limpeza controlada dos dados de teste.
- Exportações CSV e JSON verificadas pelo Playwright.
- Autenticação Bearer mínima aplicada no FastAPI a catálogo, métricas, preview, dependências, uploads, renomeação, arquivamento, restauração, descoberta, governança, execução e histórico.
- Exclusão definitiva exige administrador quando autenticação está ativa e continua condicionada à flag destrutiva.
- Limpeza administrativa retorna 404 em produção, além de exigir administrador e flag fora de produção.
- `/docs`, `/redoc` e `/openapi.json` ficam desabilitados em produção.
- CORS não autoriza origem desconhecida; headers defensivos foram validados.
- Credencial de operador fica somente em `sessionStorage` e é validada pelo backend.
- Dry-run SQLite → PostgreSQL funciona sem exigir conexão de destino e não grava na origem.
- Integridade SQLite final: `quick_check=ok` e zero violações em `foreign_key_check`.
- Serviços locais ao final: frontend 200, FastAPI online/SQLite conectado/n8n alcançável, n8n health 200.

## FALHOU

- Nenhuma falha funcional ou de regressão permaneceu na execução final.

## NÃO TESTADO

- Deploy real na Vercel/Railway.
- Migração real para PostgreSQL e restauração de backup.
- Persistência após reinício dos serviços Railway e do volume.
- CORS, webhooks e DNS usando os domínios públicos finais.
- Jornada Playwright mutante global contra staging (`SYNAPSE_ALLOW_MUTATING_E2E=1`); ela permaneceu ignorada para proteger o banco local. Os fluxos mutantes necessários foram exercitados por testes isolados com limpeza controlada.
- Identidade individual, expiração automática, rotação de tokens e RBAC persistente; o gate atual é deliberadamente mínimo para demonstração controlada.
- Novo arquivo de logo: nenhum asset novo foi fornecido ou identificado, então o logo SYNAPSE existente foi preservado.

## Evidências de teste

- Backend: 37/37 testes aprovados.
- Regressões do workflow de descoberta: 3/3 aprovadas após iniciar o n8n.
- Data Bridge genérico isolado: 4/4 aprovados durante a Fase 6.
- Segurança: 4/4 aprovados.
- Playwright: 5 aprovados e 1 ignorado por proteção contra mutação global.
- TypeScript (`tsc -b`): aprovado.
- Lint (`oxlint`): aprovado com quatro avisos não bloqueantes, três em exemplos de skills e um de Fast Refresh no contexto.
- Build Vite: aprovado; bundle principal aproximado de 733 kB, com aviso não bloqueante de tamanho.
- `git diff --check`: aprovado; apenas avisos LF/CRLF do Git no Windows.
- Capturas: `artifacts/playwright/phase6-screenshots/`.

## Integridade dos dados

Antes da regressão final: 48 fontes, 50 planos, 34 decisões, 23 execuções e 59 eventos administrativos.

Depois da regressão final: 48 fontes, 50 planos, 34 decisões, 23 execuções e 62 eventos administrativos; 6 fontes ativas e 42 arquivadas. O acréscimo de três eventos é a trilha esperada do teste isolado de criar, arquivar/restaurar e excluir sua própria fonte temporária. As entidades de negócio existentes permaneceram com as mesmas contagens.

## Bloqueadores reais para publicação

1. Provisionar staging e produção na Vercel/Railway; ainda não há validação externa.
2. Configurar segredos fortes e distintos (`OPERATOR_API_KEY`, `ADMIN_API_KEY`, `N8N_ENCRYPTION_KEY`) no gerenciador da plataforma.
3. Criar PostgreSQL e volume persistente, habilitar backups e obter autorização antes do `--execute` da migração.
4. Fixar a versão da imagem n8n e usar runner externo em produção; a instalação local avisou que runner interno e execução fora de container serão descontinuados.
5. Validar os domínios finais em `CORS_ORIGINS`, `VITE_API_URL`, URLs dos webhooks e healthchecks.
6. Para exposição ampla além da demonstração controlada, substituir os tokens compartilhados por identidade individual, expiração/rotação, rate limiting e RBAC.

## Checklist objetivo de deploy

- [ ] Congelar uma versão candidata e gerar backups externos do SQLite, uploads e configuração n8n.
- [ ] Conferir novamente as contagens do dry-run e registrar o checksum do backup com os serviços de escrita pausados.
- [ ] Provisionar PostgreSQL e volume Railway em staging.
- [ ] Configurar `ENVIRONMENT=production`, `AUTH_REQUIRED=true`, `DESTRUCTIVE_OPERATIONS_ENABLED=false`, `ADMIN_MAINTENANCE_ENABLED=false` e `SEED_DEMO_DATA=false`.
- [ ] Configurar segredos no Railway, nunca como variável `VITE_*`.
- [ ] Fixar a imagem n8n, configurar PostgreSQL dedicado, volume, `N8N_ENCRYPTION_KEY` e runner externo.
- [ ] Publicar os workflows validados no n8n de staging e testar os dois webhooks pelo FastAPI.
- [ ] Executar a migração somente após autorização, contra PostgreSQL vazio, e reconciliar todas as contagens.
- [ ] Publicar o backend de staging; testar health, autenticação, CORS, headers, persistência e bloqueios administrativos.
- [ ] Publicar o frontend em Preview com `VITE_API_URL` apontando para staging.
- [ ] Rodar pytest, TypeScript, lint, build e Playwright contra staging com dados sintéticos identificados.
- [ ] Reiniciar API, n8n e banco; repetir healthcheck e jornada sintética para comprovar persistência.
- [ ] Promover para produção somente após aprovação da matriz e manter deployments/backups anteriores para rollback.

O procedimento detalhado e o rollback estão em `docs/DEPLOYMENT.md`; a matriz de rotas está em `docs/SECURITY.md`.
