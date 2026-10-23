# SYNAPSE AI — Relatório de prontidão da Fase 8A

Data da auditoria: 23/10/2026.

## Resultado

Pronto para iniciar a publicação controlada em **staging**, condicionado à criação dos serviços PostgreSQL/Railway e à homologação ponta a ponta descrita em `docs/DEPLOYMENT.md`. Nenhum commit, push, deploy ou migração do SQLite foi executado.

## Evidências

- Backend: **41/41 testes aprovados** em banco e uploads efêmeros, com FastAPI e n8n 2.43.8 locais.
- Frontend: `npm run build` aprovado; `npm run lint` sem erros e com quatro avisos não bloqueantes/preexistentes.
- PostgreSQL: os cinco modelos compilam para o dialeto PostgreSQL; URLs Railway `postgres://`/`postgresql://` são normalizadas para `psycopg`.
- Rotas e serviços: fontes, discovery, governança, execução e auditoria usam SQLAlchemy portável. A única rotina SQLite-específica é o backup da limpeza administrativa local, deliberadamente recusada para PostgreSQL e oculta em produção.
- Segurança: dados, previews, importações, discovery, decisões, execuções e métricas exigem operador quando `AUTH_REQUIRED=true`; exclusões exigem administrador e o gate destrutivo. Staging e produção ativam autenticação por padrão.
- Persistência: uploads e backups usam `UPLOAD_DIR`/`BACKUP_DIR`; o plano Railway monta `/data`. n8n usa PostgreSQL e volume `/home/node/.n8n`.
- Git: nenhum segredo conhecido foi encontrado nos arquivos candidatos; `.env`, SQLite, uploads, backups, logs, patches de backup e artefatos Playwright transitórios estão ignorados. Nenhum arquivo já rastreado passou a ser ignorado.
- Webhooks: somente o FastAPI chama os URLs configuráveis `N8N_DISCOVERY_WEBHOOK_URL` e `N8N_DATA_BRIDGE_WEBHOOK_URL`; o navegador não recebe URL ou segredo do n8n. Staging/produção exigem a configuração server-side de Header Auth.

## Correções aplicadas nesta fase

- Health check agora executa `SELECT 1` e retorna 503 se o banco estiver indisponível.
- Inicialização falha de forma segura se `AUTH_REQUIRED=true` sem `OPERATOR_API_KEY`.
- Uploads recebem nomes UUID definidos pelo servidor, eliminando traversal pelo nome original.
- Defaults de staging/produção exigem autenticação e deixam operações destrutivas desligadas.
- n8n fixado em 2.43.8, porta Railway dinâmica e exports sanitizados sem credenciais.
- Cliente n8n envia Header Auth configurável; os dois Webhook nodes devem receber a credencial no editor antes da publicação.
- Base sintética separada criada em `demo_data/staging/`, com 3 matches e duas divergências verificáveis.

## Bloqueadores e limites

1. **PostgreSQL real ainda não foi exercitado:** não existe instância PostgreSQL fornecida nesta etapa e o `psycopg` não está instalado no venv local (ele está declarado para instalação na imagem). A compilação do schema e a auditoria do ORM passaram, mas o gate de staging deve executar a jornada completa contra o Railway PostgreSQL.
2. **Imagem Docker não foi construída localmente:** o Docker daemon não está disponível neste host. O primeiro build Railway deve validar ambos os Dockerfiles antes da homologação.
3. **Sem migrações versionadas:** `Base.metadata.create_all()` atende um staging novo, mas não substitui Alembic para evolução de schema. Não promover alterações destrutivas de schema nem usar rollback automático do banco.
4. **Autenticação de demonstração:** tokens compartilhados não oferecem identidade individual, expiração ou rotação automática. Restringir staging, rotacionar após o evento e nunca expor `ADMIN_API_KEY` ao navegador.

## Decisão de promoção

Não promover para produção até concluir todos os itens A–F do checklist em `docs/DEPLOYMENT.md`, registrar backups e confirmar persistência após reinício dos três serviços Railway.
