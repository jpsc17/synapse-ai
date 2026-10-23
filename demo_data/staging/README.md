# Dados sintéticos de staging

Estes arquivos não derivam dos bancos locais. A relação segura esperada é
`cadastro_colaboradores.id_colaborador` ↔ `repasses_sinteticos.codigo_pessoa`.

Resultado verificável:

- 3 correspondências: `SYN-1001`, `SYN-1002` e `SYN-1005`;
- 1 registro somente no cadastro: `SYN-1003`;
- 1 registro somente nos repasses: `SYN-1004`.

Importe somente estes dois arquivos no staging. Não copie `synapse.db`, `uploads/`
ou qualquer exportação local para a demonstração.
