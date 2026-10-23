import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

type Severity = 'CRÍTICO' | 'ALTO' | 'MÉDIO' | 'BAIXO';
type Finding = {
  id: string;
  severity: Severity;
  area: string;
  title: string;
  evidence: string;
  reproduction: string[];
  screenshot?: string;
};

const artifactRoot = join(process.cwd(), 'artifacts', 'playwright');
const screenshotDir = join(artifactRoot, 'screenshots');
mkdirSync(screenshotDir, { recursive: true });

const screenshot = async (page: Page, name: string, fullPage = false) => {
  const path = join(screenshotDir, `${name}.png`);
  await page.screenshot({ path, fullPage, animations: 'disabled' });
  return `screenshots/${name}.png`;
};

test('homologação visual e funcional completa', async ({ page, request }, testInfo) => {
  test.skip(process.env.SYNAPSE_ALLOW_MUTATING_E2E !== '1', 'Jornada mutante exige autorização explícita e ambiente isolado.');
  test.slow();
  const findings: Finding[] = [];
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];
  const httpErrors: string[] = [];
  let findingCounter = 0;

  const addFinding = (finding: Omit<Finding, 'id'>) => {
    const signature = `${finding.area}:${finding.title}:${finding.evidence}`;
    if (findings.some(item => `${item.area}:${item.title}:${item.evidence}` === signature)) return;
    findingCounter += 1;
    findings.push({ id: `SYN-${String(findingCounter).padStart(3, '0')}`, ...finding });
  };

  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('requestfailed', requestEvent => {
    const failure = requestEvent.failure()?.errorText ?? 'falha desconhecida';
    if (!failure.includes('ERR_ABORTED')) failedRequests.push(`${requestEvent.method()} ${requestEvent.url()} — ${failure}`);
  });
  page.on('response', response => {
    if (response.status() >= 400) httpErrors.push(`${response.status()} ${response.request().method()} ${response.url()}`);
  });

  const sourcesResponse = await request.get('http://127.0.0.1:8000/api/v1/sources');
  const metricsResponse = await request.get('http://127.0.0.1:8000/api/v1/metrics');
  expect(sourcesResponse.ok()).toBeTruthy();
  expect(metricsResponse.ok()).toBeTruthy();
  const sources = await sourcesResponse.json() as Array<{ id: string; name: string; sourceType: string; rowCount: number }>;
  const metrics = await metricsResponse.json() as Record<string, unknown>;
  expect(sources).toHaveLength(45);

  let applicationLoaded = false;
  const navigate = async (route: string) => {
    if (!applicationLoaded) {
      const healthResponse = page.waitForResponse(response => response.url().endsWith('/api/v1/health'));
      await page.goto('/');
      expect((await healthResponse).status()).toBe(200);
      await expect(page.getByText('ONLINE', { exact: true }).first()).toBeVisible();
      applicationLoaded = true;
    }

    if (new URL(page.url()).pathname !== route) {
      const link = page.locator(`a[href="${route}"]`).first();
      if (await link.count()) {
        await link.click();
      } else {
        await page.goto(route);
      }
    }
    await expect(page).toHaveURL(new RegExp(`${route === '/' ? '/?$' : `${route}$`}`));
  };

  await test.step('navegação por todas as páginas', async () => {
    const routes = [
      ['overview-desktop', '/', 'Visão Geral'],
      ['workspace-desktop', '/workspace', 'Topologia:'],
      ['datasources-desktop', '/datasources', 'Fontes de Dados Conectadas'],
      ['discovery-desktop', '/discovery', 'Descoberta Inteligente'],
      ['pipelines-desktop', '/pipelines', 'Pipeline:'],
      ['quality-desktop', '/quality', 'Auditoria & Qualidade de Dados'],
    ] as const;

    for (const [imageName, route, expectedText] of routes) {
      await navigate(route);
      await page.getByText(expectedText, { exact: false }).first().waitFor();
      await screenshot(page, imageName, route === '/datasources');
    }

    await page.locator('a[href="/executions"]').first().click();
    await expect(page).toHaveURL(/\/pipelines$/);
    await page.locator('a[href="/reports"]').first().click();
    await expect(page).toHaveURL(/\/quality$/);
  });

  await test.step('visão geral e métricas', async () => {
    await navigate('/');
    await page.getByRole('heading', { name: 'Visão Geral' }).waitFor();
    const bodyText = await page.locator('body').innerText();
    await screenshot(page, 'overview-desktop');
    const staticClaims = [
      '94% confiança média',
      'Preditivas: 12',
      'Aprovadas: 2',
      '100% Saudáveis',
      '1.2M reg/dia',
      'Latência: 45ms',
      'Nulos tratados: 99.8%',
      'Inconsistências: 0',
    ].filter(claim => bodyText.includes(claim));

    if (staticClaims.length > 0) {
      addFinding({
        severity: 'ALTO',
        area: 'Visão Geral',
        title: 'Métricas demonstrativas são apresentadas como dados reais',
        evidence: `A API retornou ${JSON.stringify(metrics)}, mas a tela também exibe valores sem contrato correspondente: ${staticClaims.join('; ')}.`,
        reproduction: ['Abrir a Visão Geral.', 'Comparar os cards com GET /api/v1/metrics.'],
        screenshot: 'screenshots/overview-desktop.png',
      });
    }

    if (bodyText.includes(`0${sources.length}`)) {
      addFinding({
        severity: 'BAIXO',
        area: 'Visão Geral',
        title: 'Contagem de fontes recebe zero à esquerda',
        evidence: `Com ${sources.length} fontes, o card renderiza “0${sources.length}”.`,
        reproduction: ['Abrir a Visão Geral.', 'Observar o card Fontes Conectadas.'],
        screenshot: 'screenshots/overview-desktop.png',
      });
    }

    const highlight = page.locator('.lg\\:col-span-7').filter({ hasText: 'Descoberta Preditiva em Destaque' });
    const highlightBox = await highlight.boundingBox();
    if (highlightBox && !bodyText.includes('Score:') && highlightBox.height > 180) {
      addFinding({
        severity: 'MÉDIO',
        area: 'Visão Geral',
        title: 'Painel de descoberta vazio ocupa grande área',
        evidence: `Sem plano carregado, o painel permanece com ${Math.round(highlightBox.height)} px de altura e não apresenta estado vazio explicativo.`,
        reproduction: ['Recarregar a aplicação.', 'Abrir a Visão Geral sem executar descoberta.'],
        screenshot: 'screenshots/overview-desktop.png',
      });
    }
  });

  await test.step('fontes duplicadas e identificação', async () => {
    await navigate('/datasources');
    await page.getByRole('heading', { name: 'Fontes de Dados Conectadas' }).waitFor();
    const duplicateGroups = Object.entries(sources.reduce<Record<string, string[]>>((groups, source) => {
      (groups[source.name] ??= []).push(source.id);
      return groups;
    }, {})).filter(([, ids]) => ids.length > 1);

    for (const [name, ids] of duplicateGroups) {
      const cards = page.locator('.grid.grid-cols-1.md\\:grid-cols-2 > div').filter({ hasText: name });
      const texts = await cards.allInnerTexts();
      const identified = ids.every(id => texts.some(text => text.includes(id.slice(0, 8))));
      if (!identified) {
        addFinding({
          severity: 'ALTO',
          area: 'Fontes de Dados',
          title: 'Cards de fontes duplicadas não exibem identidade única',
          evidence: `“${name}” aparece ${ids.length} vezes, mas os cards não exibem ID abreviado ou outro identificador exclusivo.`,
          reproduction: ['Abrir Fontes de Dados.', `Localizar os ${ids.length} cards chamados “${name}”.`, 'Tentar distinguir os registros.'],
          screenshot: 'screenshots/datasources-desktop.png',
        });
        break;
      }
    }
  });

  await test.step('workspace com 45 fontes, pan, zoom e fit', async () => {
    await navigate('/workspace');
    const viewport = page.getByLabel(/Canvas de topologia/);
    await expect(page.locator('[data-dag-node]')).toHaveCount(45);
    await page.getByTitle('Ajustar todos os nós à tela').click();
    await page.waitForTimeout(300);
    const fitImage = await screenshot(page, 'workspace-fit-45-fontes');
    const viewportBox = await viewport.boundingBox();
    const nodeBoxes = await page.locator('[data-dag-node]').evaluateAll(nodes => nodes.map(node => {
      const box = node.getBoundingClientRect();
      return { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
    }));
    const clipped = viewportBox && nodeBoxes.some(box => box.left < viewportBox.x || box.right > viewportBox.x + viewportBox.width || box.top < viewportBox.y || box.bottom > viewportBox.y + viewportBox.height);
    if (clipped) {
      addFinding({
        severity: 'ALTO',
        area: 'Workspace DAG',
        title: 'Ajustar à tela não enquadra as 45 fontes',
        evidence: 'Após acionar fit_screen, ao menos um nó permanece fora dos limites do viewport. O limite mínimo de zoom é 50%.',
        reproduction: ['Abrir Workspace com 45 fontes.', 'Clicar em Ajustar todos os nós à tela.', 'Observar que nós das últimas linhas permanecem fora da área visível.'],
        screenshot: fitImage,
      });
    }

    const firstBefore = await page.locator('[data-dag-node]').first().boundingBox();
    const emptyPoint = await page.evaluate(() => {
      const canvas = document.querySelector<HTMLElement>('[aria-label^="Canvas de topologia"]');
      if (!canvas) return null;
      const bounds = canvas.getBoundingClientRect();
      for (let y = bounds.top + 60; y < bounds.bottom - 40; y += 30) {
        for (let x = bounds.left + 20; x < bounds.right - 20; x += 30) {
          const target = document.elementFromPoint(x, y) as HTMLElement | null;
          if (target && !target.closest('[data-dag-node], button')) return { x, y };
        }
      }
      return null;
    });
    if (emptyPoint) {
      await page.mouse.move(emptyPoint.x, emptyPoint.y);
      await page.mouse.down();
      await page.mouse.move(emptyPoint.x + 140, emptyPoint.y + 80, { steps: 6 });
      await page.mouse.up();
    }
    const firstAfter = await page.locator('[data-dag-node]').first().boundingBox();
    if (!firstBefore || !firstAfter || Math.abs(firstAfter.x - firstBefore.x) < 50) {
      addFinding({
        severity: 'ALTO',
        area: 'Workspace DAG',
        title: 'Pan do canvas não desloca os nós',
        evidence: 'O arraste do fundo não produziu deslocamento mensurável do primeiro nó.',
        reproduction: ['Abrir Workspace.', 'Arrastar uma área vazia do canvas.'],
      });
    }
    await screenshot(page, 'workspace-pan');

    const zoomLabelBefore = await page.getByText(/%$/).filter({ visible: true }).allInnerTexts();
    await page.getByTitle('Aumentar zoom').click();
    const zoomLabelAfter = await page.getByText(/%$/).filter({ visible: true }).allInnerTexts();
    if (JSON.stringify(zoomLabelBefore) === JSON.stringify(zoomLabelAfter)) {
      addFinding({
        severity: 'MÉDIO',
        area: 'Workspace DAG',
        title: 'Controle de zoom não atualiza o canvas',
        evidence: 'O valor percentual permaneceu inalterado após clicar em aumentar zoom.',
        reproduction: ['Abrir Workspace.', 'Clicar no botão de aumentar zoom.'],
      });
    }
    await screenshot(page, 'workspace-zoom');
  });

  await test.step('descoberta, candidato alternativo e governança com dados de teste', async () => {
    const sourceA = sources.find(source => source.name.includes('Produtos') && source.rowCount === 4);
    const sourceB = sources.find(source => source.name.includes('Vendas') && source.rowCount === 4);
    expect(sourceA, 'Fonte de teste de produtos').toBeTruthy();
    expect(sourceB, 'Fonte de teste de vendas').toBeTruthy();

    await navigate('/discovery');
    const selects = page.locator('select');
    await expect(selects.nth(0).locator('option')).toHaveCount(46);
    await selects.nth(0).selectOption(sourceA!.id);
    await selects.nth(1).selectOption(sourceB!.id);
    const selectedLabels = await Promise.all([selects.nth(0).locator('option:checked').innerText(), selects.nth(1).locator('option:checked').innerText()]);
    if (!selectedLabels.every(label => /· .+ · \d+ linhas · [0-9a-f]{8}$/i.test(label))) {
      addFinding({
        severity: 'MÉDIO',
        area: 'Descoberta',
        title: 'Seletores não diferenciam fontes por metadados e ID',
        evidence: `Rótulos selecionados: ${selectedLabels.join(' | ')}`,
        reproduction: ['Abrir Descoberta.', 'Selecionar fontes com nomes duplicados.'],
      });
    }

    const analyzeResponse = page.waitForResponse(response => response.url().endsWith('/discovery/analyze') && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Descobrir relações' }).click();
    expect((await analyzeResponse).status()).toBe(200);
    await page.getByText('Relação Sugerida:').waitFor();
    await selects.nth(2).selectOption('40');
    const secondaryCard = page.locator('.cursor-pointer').filter({ hasText: 'preco_tabela' }).filter({ hasText: 'valor_total' }).last();
    await secondaryCard.click();
    await expect(page.getByText('preco_tabela', { exact: true }).first()).toBeVisible();
    const alternateImage = await screenshot(page, 'discovery-candidato-alternativo');
    const approveAlternative = page.getByRole('button', { name: 'Aprovar Relação' });
    if (!(await approveAlternative.isDisabled())) {
      addFinding({
        severity: 'CRÍTICO',
        area: 'Governança',
        title: 'Candidato alternativo pode aprovar silenciosamente a proposta principal',
        evidence: 'O botão de aprovação permaneceu habilitado com o candidato alternativo selecionado.',
        reproduction: ['Executar descoberta de Produtos × Vendas.', 'Selecionar preco_tabela ↔ valor_total.', 'Verificar Aprovar Relação.'],
        screenshot: alternateImage,
      });
    }

    const primaryCard = page.locator('.cursor-pointer').filter({ hasText: 'cod_produto' }).filter({ hasText: 'codigo_item' }).last();
    await primaryCard.click();
    const decisionResponse = page.waitForResponse(response => response.url().endsWith('/governance/decide') && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Aprovar Relação' }).click();
    expect((await decisionResponse).status()).toBe(200);
    await page.getByText('PLANO_APROVADO', { exact: true }).waitFor();
    await screenshot(page, 'discovery-governanca-aprovada');

    await page.locator('a[href="/pipelines"]').first().click();
    await expect(page).toHaveURL(/\/pipelines$/);
    const pipelineHeader = await page.locator('h1').filter({ hasText: 'Pipeline:' }).innerText();
    if (!pipelineHeader.includes(sourceA!.name) || !pipelineHeader.includes(sourceB!.name)) {
      addFinding({
        severity: 'ALTO',
        area: 'Pipelines',
        title: 'Título do pipeline não corresponde às fontes utilizadas',
        evidence: `Fontes aprovadas: “${sourceA!.name}” e “${sourceB!.name}”. Cabeçalho exibido: “${pipelineHeader.replace(/\s+/g, ' ')}”.`,
        reproduction: ['Descobrir e aprovar Produtos × Vendas.', 'Abrir Pipelines.', 'Comparar o título com os nós de origem e destino.'],
      });
    }
    await screenshot(page, 'pipeline-antes-execucao');

    const executionResponse = page.waitForResponse(response => response.url().endsWith('/pipelines/execute') && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Executar Pipeline' }).click();
    expect((await executionResponse).status()).toBe(200);
    await page.getByRole('heading', { name: 'Resultado real do Data Bridge' }).waitFor();
    await expect(page.getByRole('columnheader', { name: 'valor_total', exact: true }).first()).toBeVisible();
    if (await page.getByRole('columnheader', { name: 'valor', exact: true }).count()) {
      addFinding({
        severity: 'ALTO',
        area: 'Data Bridge',
        title: 'Coluna valor artificial ainda é exibida',
        evidence: 'A tabela de resultados contém um cabeçalho “valor” sem atributo correspondente na fonte.',
        reproduction: ['Executar o pipeline Produtos × Vendas.', 'Inspecionar as colunas do resultado.'],
      });
    }
    await screenshot(page, 'pipeline-resultado-real');
  });

  await test.step('responsividade móvel', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const [name, route] of [['overview', '/'], ['workspace', '/workspace'], ['discovery', '/discovery'], ['pipelines', '/pipelines']] as const) {
      await navigate(route);
      await page.waitForLoadState('networkidle');
      const dimensions = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
      const image = await screenshot(page, `mobile-${name}`, true);
      if (dimensions.scrollWidth > dimensions.width + 2) {
        addFinding({
          severity: 'ALTO',
          area: 'Responsividade',
          title: `Overflow horizontal em ${name}`,
          evidence: `Viewport ${dimensions.width}px; conteúdo ${dimensions.scrollWidth}px.`,
          reproduction: [`Abrir ${route} em 390×844.`, 'Observar rolagem/corte horizontal causado pelo layout fixo.'],
          screenshot: image,
        });
      }
    }

    const sidebarWidth = await page.locator('aside').first().evaluate(element => element.getBoundingClientRect().width).catch(() => 0);
    if (sidebarWidth >= 200) {
      addFinding({
        severity: 'ALTO',
        area: 'Responsividade',
        title: 'Sidebar desktop permanece fixa no viewport móvel',
        evidence: `A sidebar ocupa ${Math.round(sidebarWidth)}px em uma tela de 390px.`,
        reproduction: ['Abrir a aplicação com viewport 390×844.', 'Observar a largura da navegação lateral.'],
        screenshot: 'screenshots/mobile-pipelines.png',
      });
    }
  });

  if (consoleErrors.length || pageErrors.length) {
    addFinding({
      severity: 'ALTO',
      area: 'Console',
      title: 'Erros JavaScript durante a jornada',
      evidence: [...consoleErrors, ...pageErrors].join(' | '),
      reproduction: ['Executar a jornada completa com o console aberto.'],
    });
  }
  const relevantHttpErrors = httpErrors.filter(error => !error.includes('favicon'));
  if (failedRequests.length || relevantHttpErrors.length) {
    addFinding({
      severity: 'MÉDIO',
      area: 'Rede',
      title: 'Requisições HTTP falharam durante a jornada',
      evidence: [...failedRequests, ...relevantHttpErrors].join(' | '),
      reproduction: ['Executar a jornada completa e observar a aba Network.'],
    });
  }

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: 'http://127.0.0.1:5173',
    browser: 'Google Chrome via Playwright',
    sourceCount: sources.length,
    findings,
    consoleErrors,
    pageErrors,
    failedRequests,
    httpErrors,
  };
  writeFileSync(join(artifactRoot, 'audit-findings.json'), JSON.stringify(report, null, 2), 'utf8');

  const markdown = [
    '# SYNAPSE AI — Auditoria Playwright',
    '',
    `Gerado em: ${report.generatedAt}`,
    `Navegador: ${report.browser}`,
    `Fontes auditadas: ${report.sourceCount}`,
    `Defeitos: ${findings.length}`,
    '',
    ...findings.flatMap(finding => [
      `## ${finding.id} — ${finding.title}`,
      '',
      `- Severidade: ${finding.severity}`,
      `- Área: ${finding.area}`,
      `- Evidência: ${finding.evidence}`,
      `- Reprodução: ${finding.reproduction.join(' → ')}`,
      ...(finding.screenshot ? [`- Screenshot: ${finding.screenshot}`] : []),
      '',
    ]),
  ].join('\n');
  writeFileSync(join(artifactRoot, 'audit-report.md'), markdown, 'utf8');
  await testInfo.attach('audit-findings', { body: JSON.stringify(report, null, 2), contentType: 'application/json' });
});
