import { expect, test, type Page } from "@playwright/test";

const pdf = (name: string) => ({ name, mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 teste") });

async function entrarComo(page: Page, papel: string) {
  await page.goto("/login");
  await page.getByRole("link", { name: papel, exact: true }).click();
  await expect(page.getByLabel("E-mail")).toHaveValue(/@credito\.rural$/);
  await page.getByLabel("Senha").fill("123456");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}

async function sair(page: Page) {
  await page.getByRole("button", { name: "Sair" }).click();
  await page.waitForURL("**/login");
}

async function novaSolicitacao(page: Page, valor: string) {
  await page.goto("/solicitacoes/nova");
  await page.getByLabel("Valor desejado (R$)").fill(valor);
  await page.getByLabel("Prazo (meses)").fill("12");
  await page.getByRole("button", { name: "Simular" }).click();
  await expect(page.getByText("Resultado da simulação")).toBeVisible();
  await page.getByRole("button", { name: "Continuar para anexar documentação" }).click();
  await page.waitForURL(/\/solicitacoes\/\d+$/);
  return page.url().split("/").at(-1)!;
}

async function preencherDados(page: Page) {
  await page.getByLabel("CPF").fill("529.982.247-25");
  await page.getByLabel("Banco").fill("Banco do Brasil");
  await page.getByLabel("Agência").fill("1234");
  await page.getByLabel("Conta").fill("12345-6");
}

test("CT-E01 login inválido mostra erro", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("produtor@credito.rural");
  await page.getByLabel("Senha").fill("errada");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByText("E-mail ou senha incorretos.")).toBeVisible();
});

test("CT-E07 perfil de demonstração só preenche o e-mail e exige a senha", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("link", { name: "Analista", exact: true }).click();
  await expect(page).toHaveURL(/\/login\?email=/);
  await expect(page.getByLabel("E-mail")).toHaveValue("analista@credito.rural");
  await expect(page.getByLabel("Senha")).toHaveValue("");
  await expect(page.getByLabel("Senha")).toHaveAttribute("maxlength", "64");
  await page.getByRole("link", { name: "Cadastro", exact: true }).click();
  await expect(page.getByLabel("E-mail")).toHaveValue("cadastro@credito.rural");
});

test("CT-E08 campos limitam o tamanho do preenchimento", async ({ page }) => {
  await entrarComo(page, "Produtor");
  await novaSolicitacao(page, "50000");
  await page.getByLabel("Agência").fill("123456789");
  await expect(page.getByLabel("Agência")).toHaveValue("1234");
  await page.getByLabel("CPF").fill("529.982.247-25999");
  await expect(page.getByLabel("CPF")).toHaveValue("529.982.247-25");
  await page.goto("/solicitacoes/nova");
  await expect(page.getByLabel("Valor desejado (R$)")).toHaveAttribute("max", "2000000");
  await expect(page.getByLabel("Prazo (meses)")).toHaveAttribute("max", "120");
});

test("CT-E02 rota protegida redireciona para o login", async ({ page }) => {
  await page.goto("/cadastro");
  await expect(page).toHaveURL(/\/login/);
});

test("CT-E03 Sistema bloqueia envio com CPF inválido", async ({ page }) => {
  await entrarComo(page, "Produtor");
  await novaSolicitacao(page, "50000");
  await preencherDados(page);
  await page.getByLabel("CPF").fill("111.111.111-11");
  await page.getByRole("button", { name: "Enviar para análise" }).click();
  await expect(page.getByText("CPF inválido")).toBeVisible();
});

test("CT-E04 fluxo completo com devolução, aprovação e depósito", async ({ page }) => {
  await entrarComo(page, "Produtor");
  const id = await novaSolicitacao(page, "100000");
  await page.getByLabel("Documento pessoal").setInputFiles(pdf("rg.pdf"));
  await page.getByLabel("Comprovante da propriedade").setInputFiles(pdf("matricula.pdf"));
  await page.getByLabel("Comprovante de renda").setInputFiles(pdf("renda.pdf"));
  await preencherDados(page);
  await page.getByRole("button", { name: "Enviar para análise" }).click();
  await expect(page.getByText("Aguardando cadastro").first()).toBeVisible();
  await sair(page);

  await entrarComo(page, "Cadastro");
  await page.goto(`/cadastro?id=${id}`);
  await page.getByLabel("Motivo da devolução").fill("Comprovante de renda ilegível");
  await page.getByRole("button", { name: "Devolver ao produtor" }).click();
  await sair(page);

  await entrarComo(page, "Produtor");
  await page.goto(`/solicitacoes/${id}`);
  await expect(page.getByText("Comprovante de renda ilegível").first()).toBeVisible();
  await page.getByLabel("Comprovante de renda").setInputFiles(pdf("renda-nova.pdf"));
  await page.getByRole("button", { name: "Reenviar documentação" }).click();
  await sair(page);

  await entrarComo(page, "Cadastro");
  await page.goto(`/cadastro?id=${id}`);
  await page.getByRole("button", { name: "Aprovar documentos e enviar para análise" }).click();
  await sair(page);

  await entrarComo(page, "Analista");
  await page.goto(`/credito?id=${id}`);
  await expect(page.getByText("Recomenda aprovação", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Confirmar aprovação" }).click();
  await sair(page);

  await entrarComo(page, "Liberação");
  await page.goto(`/liberacao?id=${id}`);
  await page.getByLabel("Data do depósito").fill(new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10));
  await page.getByRole("button", { name: "Agendar depósito" }).click();
  await page.getByRole("button", { name: "Confirmar depósito realizado" }).click();
  await sair(page);

  await entrarComo(page, "Produtor");
  await page.goto(`/solicitacoes/${id}`);
  await expect(page.getByText("Concluída").first()).toBeVisible();
  await page.goto("/notificacoes");
  await expect(page.getByText(`Solicitação #${id}: Concluída`)).toBeVisible();
});

test("CT-E05 analista recusa proposta acima do teto", async ({ page }) => {
  await entrarComo(page, "Produtor");
  const id = await novaSolicitacao(page, "900000");
  await page.getByLabel("Documento pessoal").setInputFiles(pdf("rg.pdf"));
  await page.getByLabel("Comprovante da propriedade").setInputFiles(pdf("matricula.pdf"));
  await page.getByLabel("Comprovante de renda").setInputFiles(pdf("renda.pdf"));
  await preencherDados(page);
  await page.getByRole("button", { name: "Enviar para análise" }).click();
  await sair(page);

  await entrarComo(page, "Cadastro");
  await page.goto(`/cadastro?id=${id}`);
  await page.getByRole("button", { name: "Aprovar documentos e enviar para análise" }).click();
  await sair(page);

  await entrarComo(page, "Analista");
  await page.goto(`/credito?id=${id}`);
  await expect(page.getByText("Recomenda recusa", { exact: true })).toBeVisible();
  await page.getByLabel("Parecer (obrigatório para recusa)").fill("Valor acima do teto de custeio");
  await page.getByRole("button", { name: "Recusar proposta" }).click();
  await sair(page);

  await entrarComo(page, "Produtor");
  await page.goto(`/solicitacoes/${id}`);
  await expect(page.getByText("Proposta recusada: Valor acima do teto de custeio")).toBeVisible();
});

test("CT-E06 oferta pré-aprovada vai do cadastro direto para a liberação", async ({ page }) => {
  await entrarComo(page, "Produtor");
  await page.getByRole("link", { name: "Simular esta oferta" }).first().click();
  await page.getByRole("button", { name: "Continuar para anexar documentação" }).click();
  await page.waitForURL(/\/solicitacoes\/\d+$/);
  const id = page.url().split("/").at(-1)!;
  await page.getByLabel("Documento pessoal").setInputFiles(pdf("rg.pdf"));
  await page.getByLabel("Comprovante da propriedade").setInputFiles(pdf("matricula.pdf"));
  await page.getByLabel("Comprovante de renda").setInputFiles(pdf("renda.pdf"));
  await preencherDados(page);
  await page.getByRole("button", { name: "Enviar para análise" }).click();
  await sair(page);

  await entrarComo(page, "Cadastro");
  await page.goto(`/cadastro?id=${id}`);
  await page.getByRole("button", { name: "Aprovar documentos e enviar para liberação" }).click();
  await sair(page);

  await entrarComo(page, "Liberação");
  await page.goto(`/liberacao?id=${id}`);
  await expect(page.getByText("Crédito pré-aprovado", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Agendar depósito" })).toBeVisible();
});
