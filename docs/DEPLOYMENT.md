# Publicação do SYNAPSE AI

Este guia prepara a topologia, mas não executa deploy nem migra dados automaticamente.

## Topologia recomendada

- Vercel: frontend React/Vite estático. `VITE_API_URL` aponta para a URL pública do FastAPI com `/api/v1`.
- Railway `synapse-api`: FastAPI construído por `backend/Dockerfile`.
- Railway PostgreSQL: metadados do SYNAPSE. O backend recebe `DATABASE_URL` por referência privada.
- Railway `n8n`: `deploy/railway/n8n.Dockerfile`, fixado em `n8nio/n8n:2.43.8`, a mesma versão validada localmente. Use PostgreSQL dedicado (ou banco/schema isolado) e preserve `N8N_ENCRYPTION_KEY`.
- Railway Volume em `/data`: arquivos importados e backups do backend, com `UPLOAD_DIR=/data/uploads` e `BACKUP_DIR=/data/backups`.

SQLite permanece adequado ao desenvolvimento local. Para produção com serviços separados e reinícios, PostgreSQL evita depender do disco efêmero do contêiner. Arquivos importados continuam exigindo volume persistente ou, numa evolução posterior, storage de objetos.

## Matriz de variáveis

Somente `VITE_API_URL` pode ser exposta ao bundle do navegador. Valores entre `<...>` devem ser criados no gerenciador de segredos, não copiados literalmente.

| Nome | Serviço | Finalidade | Exemplo não secreto |
|---|---|---|---|
| `VITE_API_URL` | Vercel | Base pública da API | `https://synapse-api-staging.example.up.railway.app/api/v1` |
| `ENVIRONMENT` | FastAPI | Perfil seguro do ambiente | `staging` |
| `DATABASE_URL` | FastAPI | Metadados PostgreSQL via rede privada | `${{Postgres.DATABASE_URL}}` |
| `CORS_ORIGINS` | FastAPI | Origens exatas do Vercel | `https://synapse-staging.example.vercel.app` |
| `UPLOAD_DIR` | FastAPI | Arquivos em volume persistente | `/data/uploads` |
| `BACKUP_DIR` | FastAPI | Backups em volume persistente | `/data/backups` |
| `N8N_BASE_URL` | FastAPI | Health do n8n | `https://synapse-n8n-staging.example.up.railway.app` |
| `N8N_DISCOVERY_WEBHOOK_URL` | FastAPI | Webhook publicado de descoberta | `https://.../webhook/synapse-intelligent-discovery` |
| `N8N_DATA_BRIDGE_WEBHOOK_URL` | FastAPI | Webhook publicado de execução | `https://.../webhook/synapse-data-bridge` |
| `N8N_TIMEOUT_SECONDS` | FastAPI | Timeout das chamadas n8n | `15` |
| `N8N_WEBHOOK_AUTH_HEADER` | FastAPI | Nome do Header Auth configurado nos dois Webhook nodes | `X-Synapse-Webhook-Key` |
| `N8N_WEBHOOK_AUTH_VALUE` | FastAPI (secreto) | Valor compartilhado somente entre FastAPI e n8n | `<GERAR_NO_RAILWAY>` |
| `MAX_UPLOAD_SIZE_BYTES` | FastAPI | Limite de importação | `10485760` |
| `ALLOWED_EXTENSIONS` | FastAPI | Extensões permitidas | `.csv,.xlsx,.xls,.tsv` |
| `AUTH_REQUIRED` | FastAPI | Exige Bearer nas rotas funcionais | `true` |
| `OPERATOR_API_KEY` | FastAPI (secreto) | Dados, importação, descoberta, decisão e execução | `<GERAR_NO_RAILWAY>` |
| `ADMIN_API_KEY` | FastAPI (secreto) | Administração e exclusões quando habilitadas | `<GERAR_NO_RAILWAY>` |
| `DESTRUCTIVE_OPERATIONS_ENABLED` | FastAPI | Gate adicional para exclusão | `false` |
| `ADMIN_MAINTENANCE_ENABLED` | FastAPI | Gate de limpeza local | `false` |
| `SEED_DEMO_DATA` | FastAPI | Seed automático legado; manter desligado e importar a base versionada | `false` |
| `DB_TYPE` | n8n | Driver do banco do n8n | `postgresdb` |
| `DB_POSTGRESDB_HOST`, `DB_POSTGRESDB_PORT`, `DB_POSTGRESDB_DATABASE`, `DB_POSTGRESDB_USER`, `DB_POSTGRESDB_PASSWORD`, `DB_POSTGRESDB_SCHEMA` | n8n | PostgreSQL dedicado do n8n | Referências `${{N8nPostgres.*}}` |
| `N8N_HOST`, `N8N_PROTOCOL`, `N8N_EDITOR_BASE_URL`, `WEBHOOK_URL` | n8n | URLs externas canônicas | host Railway, `https`, URLs HTTPS |
| `N8N_ENCRYPTION_KEY` | n8n (secreto) | Criptografa credenciais do n8n | `<GERAR_E_PRESERVAR>` |
| `N8N_USER_FOLDER` | n8n | Estado persistente auxiliar | `/home/node/.n8n` |
| `N8N_PROXY_HOPS`, `N8N_SECURE_COOKIE` | n8n | Proxy e cookie seguro | `1`, `true` |
| `GENERIC_TIMEZONE`, `TZ` | n8n | Fuso de execução | `America/Sao_Paulo` |

`PORT` é injetada pelo Railway. O backend a usa no `Dockerfile`; o entrypoint do n8n a converte em `N8N_PORT`. `HOST` existe na configuração Python, mas o container fixa corretamente `0.0.0.0` e não precisa ser definido no Railway.

## 1. Preparar PostgreSQL sem alterar o SQLite local

1. Crie um PostgreSQL vazio no ambiente de staging e habilite backups/PITR conforme o plano Railway.
2. Não migre o SQLite nesta fase. O staging nasce vazio e recebe somente dados sintéticos.
3. Para uma futura migração autorizada, faça primeiro um backup externo e execute o dry-run, a partir de `backend/`:

   `python scripts/migrate_sqlite_to_postgres.py --sqlite synapse.db`

   Defina `TARGET_DATABASE_URL` apenas no terminal/gerenciador de segredos, nunca em arquivo versionado.
4. Revise as contagens. Somente com autorização, repita com `--execute`. O destino deve estar vazio e a origem não é modificada.

## 2. Backend Railway

Configure o serviço com root directory `backend`, Dockerfile `Dockerfile`, volume em `/data` e as variáveis de `deploy/railway/fastapi.env.example`.

```text
ENVIRONMENT=staging
DATABASE_URL=${{Postgres.DATABASE_URL}}
CORS_ORIGINS=https://<PROJETO>.vercel.app,https://<DOMINIO_CUSTOMIZADO>
UPLOAD_DIR=/data/uploads
BACKUP_DIR=/data/backups
N8N_BASE_URL=https://<N8N_PUBLIC_DOMAIN>
N8N_DISCOVERY_WEBHOOK_URL=https://<N8N_PUBLIC_DOMAIN>/webhook/synapse-intelligent-discovery
N8N_DATA_BRIDGE_WEBHOOK_URL=https://<N8N_PUBLIC_DOMAIN>/webhook/synapse-data-bridge
DESTRUCTIVE_OPERATIONS_ENABLED=false
ADMIN_MAINTENANCE_ENABLED=false
AUTH_REQUIRED=true
OPERATOR_API_KEY=<SEGREDO_DE_OPERADOR_FORTE>
ADMIN_API_KEY=<SEGREDO_FORTE_NAO_EXPOSTO_NO_FRONTEND>
SEED_DEMO_DATA=false
```

Anexe um volume em `/data`. O healthcheck configurado é `/api/v1/health`. Não habilite operações destrutivas no site público. Entregue a credencial de operador apenas ao apresentador, pelo modal “Acesso operador”; o token permanece em `sessionStorage`. A chave administrativa deve ser usada somente por cliente confiável fora do navegador e em janela de manutenção.

## 3. n8n Railway

1. Crie o serviço com root `deploy/railway` e Dockerfile `n8n.Dockerfile`; a imagem está fixada em `2.43.8`.
2. Configure as variáveis de `deploy/railway/n8n.env.example` com referências do PostgreSQL dedicado.
3. Defina uma única `N8N_ENCRYPTION_KEY` longa e preserve-a em todos os redeploys.
4. Anexe volume em `/home/node/.n8n`, crie o proprietário pelo fluxo do n8n e restrinja o editor; o volume não substitui o PostgreSQL.
5. Importe `deploy/n8n/workflows/intelligent-discovery.json` e `deploy/n8n/workflows/data-bridge.json` no editor. Em cada Webhook node, selecione **Header Auth**, crie/use uma credencial com o nome definido em `N8N_WEBHOOK_AUTH_HEADER` e o mesmo valor secreto de `N8N_WEBHOOK_AUTH_VALUE`; só então publique ambos. Os exports são gerados sem credenciais por `python backend/scripts/build_n8n_deploy_exports.py`.
6. Teste os dois webhooks pelo FastAPI. O navegador nunca deve chamar o n8n diretamente.

## 4. Frontend Vercel

1. Importe a raiz do repositório e configure `VITE_API_URL=https://<API_RAILWAY>/api/v1` para Preview e Production.
2. O `vercel.json` preserva deep links do SPA e direciona todas as rotas ao `index.html`.
3. Faça o primeiro deploy somente após incluir o domínio final em `CORS_ORIGINS` no backend.

## 5. Gate de publicação

- Confirmar backup do SQLite e dos uploads.
- Confirmar contagens antes/depois da migração.
- Validar CORS apenas para domínios conhecidos.
- Confirmar que `.env`, bancos, uploads, backups e relatórios transitórios não estão versionados.
- Rodar pytest, TypeScript/build, lint e Playwright contra o ambiente candidato.
- Validar importação → descoberta → aprovação → execução → exportação com dados de teste identificados e removê-los de forma controlada.
- Habilitar backups do PostgreSQL e do volume antes da demonstração.

## Diagnóstico

```bash
# FastAPI / banco / alcance do n8n
curl -fsS https://<API_RAILWAY>/api/v1/health

# autenticação (o token vem do secret manager/sessão, não do repositório)
curl -fsS -H "Authorization: Bearer $SYNAPSE_OPERATOR_TOKEN" https://<API_RAILWAY>/api/v1/sources

# health do n8n
curl -fsS https://<N8N_PUBLIC_DOMAIN>/healthz

# regressão local
backend/.venv/Scripts/python.exe -m pytest -q
npm.cmd run lint
npm.cmd run build
```

Nos logs Railway, confirme `uvicorn ... --port <PORT>` no FastAPI e `N8N_PORT=<PORT>` no n8n. Um `503` em `/api/v1/health` significa falha real de acesso ao banco; n8n indisponível aparece em `n8n_integration.reachable=false` sem derrubar o health do banco/API.

## 6. Implantação verificável e rollback

1. Registre as contagens do SQLite e execute a migração apenas em dry-run.
2. Crie PostgreSQL, volume e n8n em um ambiente Railway de staging.
3. Configure `AUTH_REQUIRED=true`, `DESTRUCTIVE_OPERATIONS_ENABLED=false` e segredos diferentes para operador e administrador.
4. Publique o backend e valide health, CORS, autenticação, webhooks e persistência após reiniciar o serviço.
5. Publique o frontend em Preview na Vercel, configure `VITE_API_URL` e execute Playwright contra o Preview.
6. Promova para produção somente após reconciliar fontes, planos, decisões e execuções.

Rollback:

1. Interrompa novas escritas removendo ou revogando temporariamente a credencial de operador.
2. Reverta frontend e backend para o deployment anterior nos respectivos painéis.
3. Não reverta o banco automaticamente. Compare schema e contagens; restaure PostgreSQL/volume apenas a partir do backup aprovado.
4. Restaure a mesma `N8N_ENCRYPTION_KEY` e a versão anterior dos workflows se o problema estiver no n8n.
5. Reexecute health, autenticação e uma jornada sintética antes de reabrir o acesso.

## Bloqueador de segurança conhecido

O gate mínimo usa tokens Bearer de operador e administrador validados no FastAPI. Ele é adequado à demonstração controlada, mas ainda não substitui identidade individual, expiração/rotação automatizada e RBAC com usuários. A chave administrativa nunca deve ser compilada como variável `VITE_*`.

O host desta auditoria não possui Docker daemon nem PostgreSQL de teste. Portanto, o build real das imagens e a jornada contra PostgreSQL continuam sendo gates obrigatórios do staging; a validação local cobriu compilação do schema PostgreSQL, normalização do driver e regressão funcional isolada.

## Checklist DEPLOY

### A. GitHub

- [ ] Revisar `git status`, `git diff --check` e `git diff` antes de criar o commit.
- [ ] Confirmar com `git ls-files -ci --exclude-standard` que nenhum arquivo rastreado passou a ser ignorado.
- [ ] Executar varredura de segredos; confirmar que `.env`, `*.db`, uploads, backups e logs não entram no commit.
- [ ] Criar branch de publicação: `git switch -c deploy/staging-8a`.
- [ ] Adicionar apenas os arquivos revisados, criar o commit e fazer push somente após aprovação humana.

Sequência exata, a executar somente depois da revisão humana do worktree atual:

```bash
git switch -c deploy/staging-8a
git status --short
git diff --check
git add -A
git diff --cached --check
git diff --cached --stat
git commit -m "chore: preparar staging Vercel Railway"
git push -u origin deploy/staging-8a
```

Antes do `commit`, inspecione `git diff --cached` porque o worktree já continha alterações das fases anteriores. Se qualquer arquivo não pertencer à entrega, remova-o apenas do staging com `git restore --staged -- <arquivo>`; não apague o arquivo local.

### B. PostgreSQL

- [ ] Criar PostgreSQL novo para metadados SYNAPSE e outro banco/serviço para n8n.
- [ ] Habilitar backups e registrar procedimento de restauração.
- [ ] Referenciar `DATABASE_URL` privadamente; não copiar credenciais ao Vercel.
- [ ] Confirmar tabelas, constraints e contagens; staging deve iniciar vazio.
- [ ] Não executar `migrate_sqlite_to_postgres.py --execute` nesta fase.

### C. FastAPI

- [ ] Root `backend`; volume `/data`; health `/api/v1/health`.
- [ ] Configurar todas as variáveis do exemplo, com `ENVIRONMENT=staging`, `AUTH_REQUIRED=true` e gates destrutivos `false`.
- [ ] Gerar `OPERATOR_API_KEY` e `ADMIN_API_KEY` diferentes no secret manager.
- [ ] Confirmar `401` sem token em fontes/importação/descoberta/governança/execução e `403` em exclusões.
- [ ] Reiniciar o serviço e confirmar persistência de arquivos em `/data/uploads`.

### D. n8n

- [ ] Usar imagem fixada `2.43.8`, PostgreSQL dedicado e volume `/home/node/.n8n`.
- [ ] Preservar `N8N_ENCRYPTION_KEY` fora do Git e configurar proprietário/editor protegido.
- [ ] Importar/publicar os dois workflows e validar paths de produção.
- [ ] Configurar Header Auth nos dois Webhook nodes e confirmar `401`/`403` sem o cabeçalho correto.
- [ ] Configurar `WEBHOOK_URL`/`N8N_EDITOR_BASE_URL` com HTTPS e testar `/healthz`.
- [ ] Confirmar que somente o FastAPI chama os webhooks.

### E. Vercel

- [ ] Importar a raiz, framework Vite, build `npm run build`, output `dist`.
- [ ] Definir somente `VITE_API_URL` para Preview/Production.
- [ ] Incluir o domínio exato em `CORS_ORIGINS`; validar deep links e headers.
- [ ] Nunca adicionar chaves de operador, admin, banco ou n8n como `VITE_*`.

### F. Homologação ponta a ponta

- [ ] Importar os dois arquivos de `demo_data/staging/`.
- [ ] Confirmar a relação `id_colaborador` ↔ `codigo_pessoa` e aprovar como operador.
- [ ] Executar e verificar 3 matches, 1 divergência em A e 1 em B.
- [ ] Conferir trilha de governança/auditoria e histórico de execuções.
- [ ] Reiniciar FastAPI e n8n; repetir preview e consulta da execução.
- [ ] Validar comportamento sem token, token inválido, CORS indevido e upload acima do limite.
- [ ] Registrar URLs, deployment IDs, contagens e backups aprovados antes de promover.
