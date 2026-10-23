import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';

mkdirSync('artifacts/playwright/phase6-screenshots', { recursive: true });

const candidate = (id: string, sourceColumn: string, targetColumn: string, score: number, classificacao: string, reason: string | null) => ({
  id,
  sourceColumn,
  targetColumn,
  score,
  classificacao,
  motivoRejeicao: reason,
  explicacao: `Comparação controlada ${sourceColumn} ↔ ${targetColumn}.`,
  fatores: {
    similaridadeSemanticaNome: 0.5,
    compatibilidadeTipo: 1,
    sobreposicaoValoresMin: score / 100,
    jaccardValores: score / 120,
    consistenciaUnicidade: score >= 80 ? 1 : 0.3,
    qualidadeCardinalidade: score >= 80 ? 1 : 0.55,
    sinalNomeIdentificador: score >= 80,
  },
  evidencias: {
    tipoA: 'string', tipoB: 'string', valoresEmComum: ['A-1'], qtdValoresEmComum: 1,
    totalValoresDistintosA: 4, totalValoresDistintosB: 4, unicidadeA: score >= 80 ? 1 : 0.3,
    unicidadeB: score >= 80 ? 1 : 0.3, riscoMuitosParaMuitos: score < 40,
    amostraValoresApenasEmA: ['A-2'], amostraValoresApenasEmB: ['B-2'],
  },
});

test('score exploratório e múltiplas correspondências são explicados pelos filtros', async ({ page, request }) => {
  const sourceResponse = await request.get('http://127.0.0.1:8000/api/v1/sources');
  expect(sourceResponse.ok()).toBeTruthy();
  const sources = await sourceResponse.json() as Array<{ id: string }>;
  expect(sources.length).toBeGreaterThan(1);

  const candidates = [
    candidate('phase6-exploratory', 'descricao', 'nome', 25.1, 'REJEITADO', 'Pontuação heurística insuficiente para inferir relacionamento confiável.'),
    candidate('phase6-candidate', 'categoria', 'grupo', 45, 'CANDIDATO_AMBIGUO', 'Risco muitos-para-muitos; requer validação humana.'),
    candidate('phase6-recommended', 'codigo', 'codigo_ref', 88, 'CANDIDATO_RECOMENDADO', null),
  ];
  await page.route('**/api/v1/discovery/analyze', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      plan_id: 'phase6-filter-plan', source_a_id: sources[0].id, source_b_id: sources[1].id,
      status: 'PENDING_APPROVAL', suggested_relation: candidates[0], all_candidates: candidates,
      total_comparisons: 3, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }),
  }));

  await page.goto('/discovery');
  const selects = page.locator('select');
  await selects.nth(0).selectOption(sources[0].id);
  await selects.nth(1).selectOption(sources[1].id);
  await page.getByRole('button', { name: 'Descobrir relações' }).click();

  await expect(page.getByText('25.1%', { exact: true })).toBeVisible();
  await expect(page.getByText(/EXPLORATÓRIA/).first()).toBeVisible();
  await expect(page.getByText(/Fora dos filtros atuais/)).toContainText('abaixo do mínimo de 70%');
  await expect(page.getByText(/Relações analisadas \(3\).*Exibidas \(1\).*Filtradas \(2\)/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Aprovar Relação' })).toBeDisabled();

  await selects.nth(2).selectOption('0');
  await page.getByRole('checkbox', { name: 'Apenas Chaves Candidatas' }).uncheck();
  await expect(page.getByText(/Relações analisadas \(3\).*Exibidas \(3\).*Filtradas \(0\)/)).toBeVisible();
  await expect(page.getByText('Score 25%', { exact: true })).toBeVisible();
  await expect(page.getByText('Score 45%', { exact: true })).toBeVisible();
  await expect(page.getByText('Score 88%', { exact: true })).toBeVisible();
  await page.screenshot({
    path: 'artifacts/playwright/phase6-screenshots/discovery-filter-explainability.png',
    fullPage: true,
    animations: 'disabled',
  });
});
