---
name: Precision Orchestration
colors:
  surface: '#051424'
  surface-dim: '#051424'
  surface-bright: '#2c3a4c'
  surface-container-lowest: '#010f1f'
  surface-container-low: '#0d1c2d'
  surface-container: '#122131'
  surface-container-high: '#1c2b3c'
  surface-container-highest: '#273647'
  on-surface: '#d4e4fa'
  on-surface-variant: '#bacac4'
  inverse-surface: '#d4e4fa'
  inverse-on-surface: '#233143'
  outline: '#84948f'
  outline-variant: '#3b4a46'
  surface-tint: '#23dec1'
  primary: '#55fddf'
  on-primary: '#00382f'
  primary-container: '#27e0c3'
  on-primary-container: '#005f51'
  inverse-primary: '#006b5c'
  secondary: '#b8c3ff'
  on-secondary: '#002388'
  secondary-container: '#193aad'
  on-secondary-container: '#a1b1ff'
  tertiary: '#d9e4fe'
  on-tertiary: '#263144'
  tertiary-container: '#bdc8e1'
  on-tertiary-container: '#495469'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#53fbdd'
  primary-fixed-dim: '#23dec1'
  on-primary-fixed: '#00201a'
  on-primary-fixed-variant: '#005045'
  secondary-fixed: '#dde1ff'
  secondary-fixed-dim: '#b8c3ff'
  on-secondary-fixed: '#001356'
  on-secondary-fixed-variant: '#193aad'
  tertiary-fixed: '#d8e3fd'
  tertiary-fixed-dim: '#bcc7e0'
  on-tertiary-fixed: '#101c2e'
  on-tertiary-fixed-variant: '#3c475c'
  background: '#080D18'
  on-background: '#d4e4fa'
  surface-variant: '#273647'
typography:
  display-lg:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.03em
  display-lg-mobile:
    fontFamily: Geist
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.02em
  headline-sm:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-default:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: -0.005em
  body-muted:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
  code-base:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
  code-compact:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.08em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-mobile: 0.75rem
  margin: 1.5rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 2rem
---

## Brand & Style

Este sistema de design estabelece uma interface de alta densidade técnica, projetada para engenheiros de dados, arquitetos de sistemas e equipes de operações de infraestrutura. A estética combina o rigor e a clareza analítica de ferramentas contemporâneas para desenvolvedores com superfícies de saturação profunda, bordas nítidas e acentos luminosos controlados.

O tom visual prioriza:
- **Precisão Cirúrgica:** Alinhamento estrito, separadores milimétricos e ausência de ornamentos puramente decorativos.
- **Eficiência Cognitiva:** Redução drástica de ruído visual para facilitar o parsing rápido de fluxos de dados, pipelines e topologias complexas.
- **Foco Técnico:** Estética escura de alto contraste tonal, com pontos de brilho elétrico estritamente mapeados para estados de execução, nós selecionados e métricas críticas.
- **Linguagem Funcional (pt-BR):** Rótulos técnicos, terminologias universais e instruções de interface rigorosamente adaptadas à rotina de times de engenharia.

## Colors

A paleta é fundamentada na hierarquia de pretos profundos e azuis petróleo, permitindo que a luminescência elétrica sirva como âncora visual ativa sem fadigar o operador durante longos períodos de monitoramento.

### Mapeamento Estrutural
- **Canvas Principal (Base):** `#080D18` — O fundo imersivo base onde as áreas de trabalho e visualizações de grafos residem.
- **Painéis e Estrutura Secundária:** `#101827` — Painéis laterais, barras de ferramentas superiores e docks fixos.
- **Superfícies Elevadas (Containers & Cards):** `#172235` — Nós da DAG, diálogos modais e menus de contexto flutuantes.
- **Bordas Estruturais:** `#253247` — Delimitação nítida e de baixa opacidade para divisão de quadrantes e contornos de nós.
- **Acento Primário (Electric Teal):** `#27E0C3` — Execuções ativas, seleção de foco principal, switches ativados e nós em tráfego de dados.
- **Acento Secundário (Electric Indigo):** `#718BFF` — Rotas de dados secundárias, nós de agregação e links relacionais no canvas.

### Tipografia e Semântica de Estado
- **Texto Principal:** `#F3F6FC` — Títulos, IDs primários, valores numéricos de alta relevância.
- **Texto Secundário / Labels:** `#94A3B8` — Metadados, labels de esquemas, carimbos de data/hora e rótulos de portas.
- **Sucesso:** `#22C55E` — Nós completados com êxito, pipelines saudáveis.
- **Aviso:** `#F59E0B` — Degradação de latência, nós com avisos de deprecamento ou retentativas.
- **Erro:** `#EF4444` — Falha na DAG, portas desconectadas críticas, erros de parsing.

## Typography

O sistema tipográfico opera em dois eixos funcionais complementares:
1. **Geist** gerencia a hierarquia da interface, menus, dados tabulares de alto nível e navegação contextual, oferecendo proporções humanistas compactas e leitura rápida sem invasão gráfica.
2. **JetBrains Mono** é estritamente aplicado a identificadores de nós, esquemas JSON, portas de entrada/saída, timestamps ISO, queries SQL e logs de console.

### Regras de Emprego
- Todas as tags estruturais, status de execução e tipos de dados brutos (`STRING`, `INT64`, `TIMESTAMP`) utilizam obrigatoriamente `code-compact` ou `label-caps`.
- Títulos de painéis e seções mantêm tracking negativo moderado para assegurar consistência com interfaces analíticas avançadas.
- Rótulos em caixa alta (`label-caps`) devem empregar espaçamento entre caracteres relaxado para preservar a legibilidade em tamanhos diminutos.

## Layout & Spacing

A arquitetura de espaço adota uma grade fluida baseada em múltiplos estritos de 4px, com ênfase em densidade de informação compacta (`compact density model`).

### Estrutura de Painéis
- **Dock Lateral de Navegação Primária:** Fixo em 240px em desktop, colapsável para modo compacto de 56px de ícones.
- **Painel Lateral de Inspeção (Drawer/Inspector):** Largura padrão de 380px no desktop para depuração de nós e configurações de conexões.
- **Canvas de Orquestração (DAG Engine):** Área elástica central com grid matricial de pontos a cada 16px sobre o fundo `#080D18`.

### Responsividade e Breakpoints
- **Desktop (1280px+):** Layout de três colunas (navegação, canvas central e inspetor aberto lateralmente).
- **Tablet / Notebook Reduzido (768px a 1279px):** O inspetor transforma-se em painel sobreposto deslizante (*overlay sheet*); navegação recolhida por padrão.
- **Mobile (< 768px):** Transição para visão em lista sequencial dos nós e monitoramento de alertas; a tela de criação livre de grafos é bloqueada para visualização somente-leitura com cartões verticais empilhados.

## Elevation & Depth

A profundidade é expressa através de **camadas tonais sobrepostas e iluminação de contorno sutil**, em detrimento de sombras escuras tradicionais que se perderiam no fundo escuro.

### Tiers de Superfície
- **Camada 0 (Infraestrutura/Canvas):** Fundo fixo `#080D18`.
- **Camada 1 (Superfície de Apoio):** `#101827`, delimitada por bordas sólidas `#253247` de 1px.
- **Camada 2 (Elementos Interativos & Nós da DAG):** `#172235`, sustentada por contornos nítidos e preenchimentos opacos.
- **Camada 3 (Overlays & Menus Flutuantes):** `#172235` com backdrop filter blur de 12px e borda reflexiva clareada para `#33435C`.

### Acentos Luminosos (Glow Técnico)
Elementos em foco ativo, pipelines em processamento e portas de nós conectáveis recebem sombras externas difusas projetadas:
- **Nó Ativo / Foco:** `box-shadow: 0 0 0 1px #27E0C3, 0 0 16px -2px rgba(39, 224, 195, 0.25)`
- **Aresta / Cabo de Sinal Selecionado:** Filtro drop-shadow elétrico com 4px de espalhamento na cor da respectiva via (`#27E0C3` ou `#718BFF`).
- **Nó em Erro Crítico:** `box-shadow: 0 0 0 1px #EF4444, 0 0 12px -2px rgba(239, 68, 68, 0.3)`

## Shapes

O vocabulário geométrico adota um nível de curvatura contido e sóbrio (`roundedness: 1`), preservando a sensação estruturada de software desktop profissional e evitando contornos excessivamente amigáveis ou casuais.

### Aplicação de Raios
- **Botões, Entradas de Formulário e Abas:** 4px (`rounded-sm`).
- **Cards, Nós de Grafos e Painéis Flutuantes:** 6px a 8px (`rounded-md` / `rounded-lg`).
- **Portas de Conexão de Nós (Sockets):** Círculos perfeitos (50%) com diâmetro fixo de 10px embutidos nas extremidades verticais ou horizontais dos blocos.
- **Badges de Status e Pílulas de Contagem:** 4px ou círculos integrais (apenas para contadores microscópicos).

## Components

### Botões
- **Primário:** Fundo `#27E0C3`, texto `#080D18`, peso seminegrito, transição rápida de brilho ao hover (`box-shadow: 0 0 12px rgba(39, 224, 195, 0.4)`).
- **Secundário:** Fundo `#172235`, contorno `#253247`, texto `#F3F6FC`. No hover, contorno clareia para `#718BFF`.
- **Ghost / Ícone:** Sem preenchimento, ícones dimensionados em 16px cor `#94A3B8`, assumindo `#F3F6FC` e fundo `#101827` sob hover.

### Nós do Grafo (DAG Nodes)
- **Container do Nó:** Largura fixa de 220px a 280px. Fundo `#172235`, borda `#253247` de 1px.
- **Cabeçalho do Nó:** Divisor horizontal inferior com ícone do tipo de operação (ex.: transformação SQL, ingestão S3, modelo ML), título em `headline-sm` e badge de latência em `code-compact`.
- **Portas de Entrada/Saída:** Posicionadas na borda lateral. Círculos de 10px com preenchimento `#101827` e borda `#718BFF`. Ao conectar ou receber dados com sucesso, a porta preenche-se em `#27E0C3`.

### Campos de Entrada (Inputs)
- **Estrutura:** Fundo `#080D18`, borda `#253247`, altura compacta de 32px a 36px, texto em `Geist` ou `JetBrains Mono` conforme o contexto (ex.: expressões cron ou URLs usam mono).
- **Estado Ativo (Focus):** Borda salta para `#27E0C3` com anel luminoso sutil (`0 0 0 1px #27E0C3`).

### Chips e Badges
- **Tag Técnica de Esquema:** Fundo `#101827`, borda fina `#253247`, tipografia `code-compact` com identificador de tipo colorido (ex.: boolean em roxo claro, string em verde).
- **Status de Pipeline:** Pílula compacta contendo um ponto pulsante de 6px à esquerda (`#22C55E`, `#F59E0B` ou `#EF4444`) e texto descritivo curto em português ("Executando", "Ocioso", "Falha").

### Inspetor de Esquema & Logs
- **Visualizador de Código / Schema:** Linhas alternadas sutilmente sobre `#080D18`, números de linha em `#94A3B8` opacidade 40%, seleção de texto com preenchimento translúcido de `#718BFF` a 30%.
- **Listas de Métricas:** Tabela tabular ultra-densa com divisão por linhas horizontais `#253247`, padding vertical estrito de 6px por linha e números com alinhamento tabular (`font-variant-numeric: tabular-nums`).
