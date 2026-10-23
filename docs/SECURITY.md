# Matriz de segurança da API

## Papéis

- Público: somente health e estado de autenticação.
- Operador: token Bearer; preview, dependências, upload, renomeação, arquivamento, descoberta, governança, execução e histórico.
- Administrador: token Bearer distinto; exclusão definitiva. A limpeza também exige flag, ambiente não produtivo e confirmação exata.

## Rotas

| Grupo | Acesso |
|---|---|
| `GET /health`, `/auth/status` | Público |
| `POST /auth/verify` | Operador ou administrador |
| Métricas, catálogo e detalhe de fontes | Operador ou administrador quando `AUTH_REQUIRED=true` |
| Preview, dependências e impacto em lote | Operador ou administrador |
| Upload, renomear, arquivar e restaurar | Operador ou administrador |
| Descoberta, leitura de plano, decisão e execução | Operador ou administrador |
| Histórico e resultados de execuções | Operador ou administrador |
| Exclusão individual/em lote | Administrador quando `AUTH_REQUIRED=true`; adicionalmente exige `DESTRUCTIVE_OPERATIONS_ENABLED=true` |
| Limpeza administrativa | Administrador, somente fora de produção e com `ADMIN_MAINTENANCE_ENABLED=true` |

## Operação segura

- Produção deve usar `AUTH_REQUIRED=true` e `DESTRUCTIVE_OPERATIONS_ENABLED=false`.
- Em `ENVIRONMENT=production`, `/docs`, `/redoc` e `/openapi.json` ficam desabilitados.
- Gere tokens aleatórios longos e diferentes. Armazene-os como secrets no Railway; nunca use prefixo `VITE_`.
- O frontend guarda o token de operador somente em `sessionStorage`, portanto ele desaparece ao fechar a aba.
- A autenticação não usa cookie e não depende da interface; o FastAPI valida cada rota protegida.
- CORS deve conter somente os domínios Vercel autorizados.
- O gate por token é deliberadamente mínimo para a demonstração. Produção multiusuário requer identidade individual, expiração, rotação, rate limiting e RBAC persistente.
