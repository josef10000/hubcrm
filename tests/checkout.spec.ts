import { test, expect } from '@playwright/test';

test.describe('Public Checkout Flow', () => {
  // Nota: Substitua pelo orgId real ou use uma organização de teste
  const orgId = '7v4SNo9B8E3U5kYm9L0p'; // Exemplo de OrgID

  test('deve completar o fluxo de checkout até a seleção de plano', async ({ page }) => {
    // 1. Acessar a página de checkout
    await page.goto(`/contratar/${orgId}`);
    
    // Validar título da página
    await expect(page.locator('h1')).toBeVisible();

    // 2. Passo 1: Dados do Cliente
    await page.fill('input[placeholder="Nome ou Razão Social"]', 'Cliente Teste E2E');
    await page.fill('input[type="email"]', 'teste_e2e@hubcrm.com.br');
    await page.fill('input[placeholder="(00) 00000-0000"]', '11999998888');
    await page.fill('input[placeholder="Somente números"]', '12345678909');
    
    await page.click('button:has-text("Continuar")');

    // 3. Passo 2: Briefing (Se houver perguntas obrigatórias, o Teste as preencheria aqui)
    // Como as perguntas são dinâmicas, o teste verifica se avançou para a seção de Briefing
    await expect(page.getByText('Briefing do Projeto')).toBeVisible();
    await page.click('button:has-text("Continuar")');

    // 4. Passo 3: Contrato
    await expect(page.getByText('Contrato de Prestação de Serviços')).toBeVisible();
    await page.fill('input[placeholder="Digite seu nome completo como assinatura"]', 'Cliente Teste E2E');
    await page.locator('input[type="checkbox"]').check();
    
    await page.click('button:has-text("Continuar")');

    // 5. Passo 4: Seleção de Plano
    await expect(page.getByText('Selecione o Escopo da Demanda')).toBeVisible();
    
    // Verifica se existem planos renderizados
    const offerButtons = page.locator('button.bg-black\\/40.border-white\\/10');
    const count = await offerButtons.count();
    
    if (count > 0) {
      // O sistema deve estar pronto para finalizar se um plano estiver selecionado
      await expect(page.locator('button:has-text("Finalizar e Registrar")')).toBeVisible();
    }
  });
});
