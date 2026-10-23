import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const apiBase = 'http://127.0.0.1:8000/api/v1';
mkdirSync('artifacts/playwright/phase5-screenshots', { recursive: true });

test('gerenciamento real de fonte de teste: impacto, arquivamento, restauração e exclusão', async ({ page, request }) => {
  const upload = await request.post(`${apiBase}/sources/upload`, {
    multipart: {
      custom_name: 'E2E Fase 5 - Fonte temporária',
      file: {
        name: 'fase5-temporaria.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from('id,nome\n1,Teste A\n2,Teste B\n', 'utf-8'),
      },
    },
  });
  expect(upload.ok()).toBeTruthy();
  const source = await upload.json() as { id: string };

  try {
    await page.goto('/datasources');
    const search = page.getByPlaceholder('Buscar por nome, ID ou coluna');
    await search.fill(source.id);
    const card = page.locator('article').filter({ hasText: source.id });
    await expect(card).toHaveCount(1);
    await page.screenshot({
      path: 'artifacts/playwright/phase5-screenshots/source-management-active.png',
      fullPage: true,
      animations: 'disabled',
    });

    await card.getByRole('button', { name: 'Dependências' }).click();
    const impact = page.getByRole('dialog', { name: 'Impacto da operação' });
    await expect(impact).toContainText('DELETE');
    await expect(impact).toContainText('0 plano(s)');
    await impact.getByRole('button', { name: 'Cancelar' }).click();

    await card.getByRole('button', { name: 'Arquivar' }).click();
    await expect(card).toHaveCount(0);
    await page.getByLabel('Filtrar por status').selectOption('ARCHIVED');
    const archivedCard = page.locator('article').filter({ hasText: source.id });
    await expect(archivedCard).toHaveCount(1);
    await expect(archivedCard).toContainText('ARCHIVED');
    await page.screenshot({
      path: 'artifacts/playwright/phase5-screenshots/source-management-archived.png',
      fullPage: true,
      animations: 'disabled',
    });

    await archivedCard.getByRole('button', { name: 'Restaurar' }).click();
    await expect(archivedCard).toHaveCount(0);
    await page.getByLabel('Filtrar por status').selectOption('ACTIVE');
    const restoredCard = page.locator('article').filter({ hasText: source.id });
    await expect(restoredCard).toHaveCount(1);

    await restoredCard.getByRole('button', { name: 'Excluir', exact: true }).click();
    const deleteDialog = page.getByRole('dialog', { name: 'Impacto da operação' });
    await deleteDialog.getByRole('button', { name: 'Confirmar exclusão definitiva' }).click();
    await expect(restoredCard).toHaveCount(0);
  } finally {
    const existing = await request.get(`${apiBase}/sources/${source.id}`);
    if (existing.ok()) {
      await request.post(`${apiBase}/sources/${source.id}/delete`, {
        data: { confirm: true, delete_eligible_plans: true },
      });
    }
  }
});
