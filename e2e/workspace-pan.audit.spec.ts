import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const screenshotDir = 'artifacts/playwright/phase6-screenshots';
mkdirSync(screenshotDir, { recursive: true });

test('a visão geral termina de carregar as métricas reais antes da captura', async ({ page, request }) => {
  const sourceResponse = await request.get('http://127.0.0.1:8000/api/v1/sources');
  expect(sourceResponse.ok()).toBeTruthy();
  const sourceCount = (await sourceResponse.json() as unknown[]).length;
  await page.goto('/');
  const sourcesCard = page.getByText('Fontes Conectadas').locator('..').locator('..');
  await expect(sourcesCard).toContainText(String(sourceCount));
  await page.screenshot({
    path: `${screenshotDir}/overview-desktop.png`,
    animations: 'disabled',
  });
});

test('o pan desloca os nós quando o arraste começa no fundo vazio', async ({ page, request }) => {
  const sourceResponse = await request.get('http://127.0.0.1:8000/api/v1/sources');
  expect(sourceResponse.ok()).toBeTruthy();
  const sourceCount = (await sourceResponse.json() as unknown[]).length;
  await page.goto('/workspace');
  const nodes = page.locator('[data-dag-node]');
  await expect(nodes).toHaveCount(sourceCount);
  await page.getByTitle('Ajustar todos os nós à tela').click();

  const before = await nodes.first().boundingBox();
  const point = await page.evaluate(() => {
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

  expect(before).not.toBeNull();
  expect(point).not.toBeNull();
  await page.mouse.move(point!.x, point!.y);
  await page.mouse.down();
  await page.mouse.move(point!.x + 140, point!.y + 80, { steps: 8 });
  await page.mouse.up();

  const after = await nodes.first().boundingBox();
  expect(after).not.toBeNull();
  expect(Math.abs(after!.x - before!.x)).toBeGreaterThan(100);
  expect(Math.abs(after!.y - before!.y)).toBeGreaterThan(50);
});
