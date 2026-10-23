# SYNAPSE AI — Relatório da Fase 8B

## Resultado

O repositório foi preparado para apresentação pública do Hackathon UNAMA 2026. A entrega preserva o histórico local, consolida a preparação de deploy da Fase 8A e não executa deploy em Railway ou Vercel.

## Conteúdo preparado

- README principal com problema, público, funcionalidades, arquitetura, instalação, testes, demonstração, segurança, limitações, autoria e licença;
- documentação técnica indexada em `docs/`;
- três capturas reais selecionadas após inspeção visual, sem nomes pessoais ou dados institucionais;
- base de staging composta por dois arquivos exclusivamente sintéticos;
- exemplos de ambiente sem credenciais reais;
- `.gitattributes`, guia de contribuição e dependências de teste separadas;
- configuração para FastAPI, PostgreSQL, n8n persistente e Vercel documentada na Fase 8A.

## Auditoria de segurança antes da publicação

- padrões conhecidos de tokens, chaves cloud e chaves privadas: nenhum encontrado;
- `.env`, SQLite, uploads, backups, logs e artefatos: ignorados e ausentes do conjunto destinado ao commit;
- valores semelhantes a segredos: somente placeholders explícitos em arquivos `.example` e na documentação;
- capturas descartadas: telas com nome de usuário ou referências potencialmente institucionais;
- limite: `gitleaks` não estava instalado; foram usadas varredura por padrões conhecidos, inspeção de arquivos rastreados/ignorados e revisão do diff.

## Validação

| Verificação | Resultado |
|---|---|
| pytest backend | 41 aprovados; 78 avisos de depreciação |
| Playwright | 5 aprovados; 1 teste visual opt-in ignorado |
| lint | 0 erros; 4 avisos não bloqueantes |
| build Vite | aprovado; aviso de bundle acima de 500 kB |
| links relativos da documentação | nenhum quebrado |
| leitura UTF-8 dos Markdown e exemplos de ambiente | aprovada |
| LF do entrypoint n8n | confirmado por `.gitattributes` |

Os testes integrados foram executados com SQLite, uploads e estado n8n isolados em diretório temporário. A estrutura foi removida após os testes; os dados locais existentes não foram lidos, migrados ou modificados.

## Estratégia GitHub

O remoto indicado estava público e vazio, com `main` configurada como branch padrão. A publicação segura consiste em enviar o mesmo commit auditado para `deploy/staging-8a` e para a primeira versão de `main`, sem reescrever histórico e sem force-push.

Descrição e topics sugeridos, caso precisem ser configurados manualmente:

- descrição: `Descoberta explicável, governança humana e integração auditável de fontes de dados.`
- topics: `fastapi`, `react`, `typescript`, `n8n`, `postgresql`, `data-engineering`, `data-governance`, `hackathon`.

## Pendências operacionais

- provisionar e homologar PostgreSQL real no Railway;
- criar secrets reais no Railway/Vercel, sem copiá-los para o repositório;
- validar backup e restauração dos volumes do FastAPI e n8n;
- executar o checklist A–F de `DEPLOYMENT.md`;
- adicionar migrações versionadas e identidade individual antes de ampliar o uso além do MVP.
