import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const screenshotDir = 'artifacts/playwright/phase4-screenshots';
mkdirSync(screenshotDir, { recursive: true });

const capture = (page: Page, name: string, fullPage = false) => page.screenshot({
  path: `${screenshotDir}/${name}.png`,
  fullPage,
  animations: 'disabled',
});

test('regressão dos 13 achados sem alterar dados', async ({ page, request }) => {
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('requestfailed', failed => failedRequests.push(`${failed.method()} ${failed.url()} ${failed.failure()?.errorText ?? ''}`));

  const sourceResponse = await request.get('http://127.0.0.1:8000/api/v1/sources');
  expect(sourceResponse.ok()).toBeTruthy();
  const sources = await sourceResponse.json() as Array<{ id: string; name: string }>;
  expect(sources.length).toBeGreaterThan(1);
  const sourceCount = sources.length;

  const health = page.waitForResponse(response => response.url().endsWith('/api/v1/health'));
  await page.goto('/');
  expect((await health).status()).toBe(200);
  await expect(page.getByText('ONLINE', { exact: true }).first()).toBeVisible();

  await test.step('visão geral usa somente contratos reais', async () => {
    const sourcesCard = page.getByText('Fontes Conectadas').locator('..').locator('..');
    await expect(sourcesCard).toContainText(String(sourceCount));
    for (const claim of ['94% confiança média', 'Preditivas: 12', '100% Saudáveis', '1.2M reg/dia', 'Latência: 45ms', 'Nulos tratados: 99.8%']) {
      await expect(page.getByText(claim, { exact: false })).toHaveCount(0);
    }
    await expect(page.getByText('Nenhuma descoberta ativa nesta sessão')).toBeVisible();
    await capture(page, 'overview-desktop-after');
  });

  await test.step('navegação e IDs de fontes duplicadas', async () => {
    const routes = ['/workspace', '/datasources', '/discovery', '/pipelines', '/quality'];
    for (const route of routes) {
      await page.locator(`a[href="${route}"]`).first().click();
      await expect(page).toHaveURL(new RegExp(`${route}$`));
    }
    await page.locator('a[href="/datasources"]').first().click();
    const duplicateName = sources.find(source => sources.filter(item => item.name === source.name).length > 1)?.name;
    for (const source of sources) {
      await expect(page.getByText(`ID: ${source.id}`, { exact: true })).toBeVisible();
    }
    if (duplicateName) {
      const duplicateCards = page.locator('article').filter({ hasText: duplicateName });
      expect(await duplicateCards.count()).toBeGreaterThan(1);
      const cardTexts = await duplicateCards.allInnerTexts();
      for (const source of sources.filter(item => item.name === duplicateName)) {
        expect(cardTexts.some(text => text.includes(source.id))).toBeTruthy();
      }
    }
    await page.getByPlaceholder('Buscar por nome, ID ou coluna').fill(sources[0].id);
    await expect(page.locator('article')).toHaveCount(1);
    await page.getByPlaceholder('Buscar por nome, ID ou coluna').fill('');
    await page.getByRole('checkbox', { name: 'Somente duplicatas' }).check();
    if (duplicateName) await expect(page.locator('article').first()).toContainText('Duplicata');
    else await expect(page.getByText('Nenhuma fonte encontrada')).toBeVisible();
    await capture(page, 'datasources-desktop-after', true);
  });

  await test.step('workspace enquadra as 45 fontes', async () => {
    await page.locator('a[href="/workspace"]').first().click();
    const viewport = page.getByLabel(/Canvas de topologia/);
    await expect(page.locator('[data-dag-node]')).toHaveCount(sourceCount);
    await page.getByTitle('Ajustar todos os nós à tela').click();
    const viewportBox = await viewport.boundingBox();
    const boxes = await page.locator('[data-dag-node]').evaluateAll(nodes => nodes.map(node => {
      const box = node.getBoundingClientRect();
      return { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
    }));
    expect(viewportBox).not.toBeNull();
    expect(boxes.every(box => box.left >= viewportBox!.x - 1 && box.right <= viewportBox!.x + viewportBox!.width + 1 && box.top >= viewportBox!.y - 1 && box.bottom <= viewportBox!.y + viewportBox!.height + 1)).toBeTruthy();
    await capture(page, 'workspace-fit-after');
  });

  await test.step('pipeline não usa título fixo e consulta histórico real', async () => {
    await page.locator('a[href="/pipelines"]').first().click();
    await expect(page.getByText('Folha & Pagamentos Funcionais', { exact: false })).toHaveCount(0);
    await expect(page.getByText('Data Bridge — aguardando plano aprovado', { exact: false })).toBeVisible();
    const history = page.getByText(/Histórico real de execuções/);
    await history.click();
    const execution = page.getByRole('button').filter({ hasText: 'match' }).first();
    await expect(execution).toBeVisible();
    await execution.click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Exportar CSV' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^synapse-.+\.csv$/);
    const jsonDownloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Exportar JSON' }).click();
    const jsonDownload = await jsonDownloadPromise;
    expect(jsonDownload.suggestedFilename()).toMatch(/^synapse-.+\.json$/);
    await capture(page, 'pipelines-desktop-after');
  });

  await test.step('responsividade móvel sem overflow', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Abrir navegação' }).click();
    await page.locator('a[href="/"]').first().click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText('ONLINE', { exact: true }).first()).toBeVisible();
    for (const route of ['/', '/workspace', '/discovery', '/pipelines']) {
      if (route !== '/') {
        await page.getByRole('button', { name: 'Abrir navegação' }).click();
        await page.locator(`a[href="${route}"]`).first().click();
        await expect(page).toHaveURL(new RegExp(`${route}$`));
      }
      const dimensions = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
      expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client + 1);
      await capture(page, `mobile-${route === '/' ? 'overview' : route.slice(1)}-after`, true);
    }
    await page.getByRole('button', { name: 'Abrir navegação' }).click();
    await expect(page.getByText('Fontes de Dados', { exact: true })).toBeVisible();
  });

  expect(consoleErrors).toEqual([]);
  expect(failedRequests.filter(item => item.includes('fonts.googleapis.com'))).toEqual([]);
});
