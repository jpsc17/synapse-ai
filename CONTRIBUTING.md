# Contribuindo com o SYNAPSE AI

Obrigado pelo interesse no projeto. Para preservar a auditabilidade do MVP, cada alteração deve ser pequena, testável e baseada em dados sintéticos.

## Fluxo recomendado

1. crie uma branch a partir da branch de integração atual;
2. instale as dependências descritas no `README.md`;
3. implemente a mudança sem alterar regras de negócio não relacionadas;
4. execute `python -m pytest backend/tests -q`, `npm run lint` e `npm run build`;
5. descreva no pull request o problema, a solução, as evidências e riscos de rollback.

## Segurança de dados

- Não adicione `.env`, tokens, senhas, bancos SQLite, uploads, backups ou logs.
- Não use dados pessoais ou institucionais em fixtures, capturas ou exemplos.
- Use `demo_data/staging/` para demonstrações reproduzíveis.
- Nunca coloque credenciais em variáveis `VITE_*`, porque elas são públicas no bundle.
- Mantenha `AUTH_REQUIRED=true` em staging e produção.

## Compatibilidade

Mudanças no banco devem funcionar em SQLite e PostgreSQL. Mudanças de integração devem preservar os contratos dos workflows em `deploy/n8n/workflows/`. Novas dependências precisam de justificativa e versão compatível com os ambientes documentados.
