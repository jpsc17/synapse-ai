import { expect, test, type Page } from '@playwright/test';

const future = () => new Date(Date.now() + 60_000).toISOString();

async function mockApi(page: Page, options: { authenticated?: boolean; loginError?: boolean; shortExpiry?: boolean } = {}) {
  let authenticated = options.authenticated ?? false;
  await page.route('**/api/v1/**', async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path.endsWith('/auth/session')) {
      if (!authenticated) return route.fulfill({ status: 401, json: { detail: 'Autenticação obrigatória.' } });
      return route.fulfill({ json: { authenticated: true, user: { email: 'avaliador@example.org', role: 'evaluator' }, expires_at: future() } });
    }
    if (path.endsWith('/auth/login')) {
      if (options.loginError) return route.fulfill({ status: 401, json: { detail: 'E-mail ou senha inválidos.' } });
      authenticated = true;
      return route.fulfill({ json: {
        authenticated: true,
        access_token: 'opaque-test-token',
        token_type: 'bearer',
        user: { email: 'avaliador@example.org', role: 'evaluator' },
        expires_at: options.shortExpiry ? new Date(Date.now() + 150).toISOString() : future(),
      } });
    }
    if (path.endsWith('/auth/logout')) {
      authenticated = false;
      return route.fulfill({ json: { logged_out: true } });
    }
    if (path.endsWith('/health')) return route.fulfill({ json: { status: 'ONLINE', n8n_integration: { reachable: true } } });
    if (path.endsWith('/metrics')) return route.fulfill({ json: { totalFontes: 0, relacionamentosIdentificados: 0, planosAprovados: 0, planosPendentes: 0, pipelinesExecutados: 0, execucoesConcluidas: 0, taxaAutoMatch: 0, qualidadeMedia: 0 } });
    if (path.endsWith('/sources')) return route.fulfill({ json: [] });
    if (path.includes('/pipelines/executions')) return route.fulfill({ json: [] });
    return route.fulfill({ json: {} });
  });
}

async function submitLogin(page: Page) {
  await page.getByLabel('E-mail').fill('avaliador@example.org');
  await page.getByLabel('Senha').fill('senha-informada-fora-do-repositorio');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
}

test('renderiza login, envia credenciais e retorna à rota solicitada', async ({ page }) => {
  await mockApi(page);
  let submitted = false;
  page.on('request', request => {
    if (request.url().endsWith('/auth/login') && request.method() === 'POST') submitted = true;
  });
  await page.goto('/workspace');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Acesse sua plataforma' })).toBeVisible();
  await submitLogin(page);
  await expect(page).toHaveURL(/\/workspace$/);
  expect(submitted).toBeTruthy();
  await expect(page.getByText('avaliador@example.org')).toBeVisible();
});

test('mostra erro de credenciais sem expor token manual', async ({ page }) => {
  await mockApi(page, { loginError: true });
  await page.goto('/login');
  await submitLogin(page);
  await expect(page.getByRole('alert')).toHaveText('E-mail ou senha inválidos.');
  await expect(page.getByText(/Token Bearer/i)).toHaveCount(0);
});

test('restaura sessão no refresh e encerra no logout', async ({ page }) => {
  await mockApi(page, { authenticated: true });
  await page.addInitScript(() => sessionStorage.setItem('synapse_operator_token', 'opaque-test-token'));
  await page.goto('/');
  await expect(page.getByText('avaliador@example.org')).toBeVisible();
  await page.reload();
  await expect(page.getByText('avaliador@example.org')).toBeVisible();
  await page.getByRole('button', { name: 'Encerrar sessão' }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test('sessão expirada redireciona para login', async ({ page }) => {
  await mockApi(page, { shortExpiry: true });
  await page.goto('/login');
  await submitLogin(page);
  await expect(page).toHaveURL(/\/$/);
  await expect(page).toHaveURL(/\/login$/, { timeout: 5_000 });
});
