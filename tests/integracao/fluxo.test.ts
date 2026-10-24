import { beforeAll, describe, expect, test } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Usuario } from "@/lib/db";

process.env.DB_PATH = join(mkdtempSync(join(tmpdir(), "credito-")), "teste.db");
const db = await import("@/lib/db");

const porEmail = (email: string) =>
  db.db.prepare("select id, nome, papel from usuarios where email = ?").get(email) as Usuario;

let produtor: Usuario, cadastro: Usuario, analista: Usuario, liberacao: Usuario;

function solicitacaoPronta(valor = 100_000) {
  const id = db.criarSolicitacao(produtor.id, "custeio", valor, 12);
  return prepararEnvio(id);
}

function prepararEnvio(id: number) {
  db.db
    .prepare("update solicitacoes set cpf = '52998224725', banco = 'Banco do Brasil', agencia = '1234', conta = '12345-6' where id = ?")
    .run(id);
  for (const tipo of ["pessoal", "propriedade", "renda"])
    db.db.prepare("insert into documentos (solicitacao_id, tipo, nome) values (?, ?, ?)").run(id, tipo, `${tipo}.pdf`);
  db.transicionar(id, "AGUARDANDO_CADASTRO", produtor);
  return id;
}

beforeAll(() => {
  produtor = porEmail("produtor@credito.rural");
  cadastro = porEmail("cadastro@credito.rural");
  analista = porEmail("analista@credito.rural");
  liberacao = porEmail("liberacao@credito.rural");
});

describe("Fluxo TO-BE no banco", () => {
  test("CT-I01 caminho feliz até depósito concluído", () => {
    const id = solicitacaoPronta();
    db.aprovarCadastro(id, cadastro);
    expect(db.solicitacao(id)!.status).toBe("AGUARDANDO_ANALISTA");
    expect(db.analiseDe(db.solicitacao(id)!)!.pontos).toBe(100);

    db.transicionar(id, "AGENDANDO_DEPOSITO", analista);
    db.agendarDeposito(id, "2026-12-01", liberacao);
    db.confirmarDeposito(id, liberacao);

    expect(db.solicitacao(id)!.status).toBe("CONCLUIDA");
    expect(db.historico(id).map((h) => h.para)).toEqual([
      "SIMULANDO",
      "AGUARDANDO_CADASTRO",
      "ANALISE_AUTOMATICA",
      "AGUARDANDO_ANALISTA",
      "AGENDANDO_DEPOSITO",
      "AGENDANDO_DEPOSITO",
      "CONCLUIDA",
    ]);
  });

  test("CT-I02 devolução pelo cadastro notifica o produtor com o motivo", () => {
    const id = solicitacaoPronta();
    db.transicionar(id, "CORRIGINDO", cadastro, "Comprovante de renda ilegível");
    expect(db.solicitacao(id)!.status).toBe("CORRIGINDO");
    expect(db.notificacoes(produtor.id)[0].mensagem).toContain("Comprovante de renda ilegível");

    db.transicionar(id, "AGUARDANDO_CADASTRO", produtor);
    expect(db.solicitacao(id)!.status).toBe("AGUARDANDO_CADASTRO");
  });

  test("CT-I03 recusa encerra o processo", () => {
    const id = solicitacaoPronta(900_000);
    db.aprovarCadastro(id, cadastro);
    expect(db.analiseDe(db.solicitacao(id)!)!.recomendacao).toBe("Recomenda recusa");
    db.transicionar(id, "RECUSADA", analista, "Valor acima do teto");
    expect(() => db.transicionar(id, "AGENDANDO_DEPOSITO", analista)).toThrow("Transição não permitida");
  });

  test("CT-I04 transição com papel errado não grava nada", () => {
    const id = solicitacaoPronta();
    const antes = db.historico(id).length;
    expect(() => db.transicionar(id, "ANALISE_AUTOMATICA", produtor)).toThrow();
    expect(db.solicitacao(id)!.status).toBe("AGUARDANDO_CADASTRO");
    expect(db.historico(id)).toHaveLength(antes);
  });

  test("CT-I05 depósito não pode ser confirmado sem agendamento", () => {
    const id = solicitacaoPronta();
    db.aprovarCadastro(id, cadastro);
    db.transicionar(id, "AGENDANDO_DEPOSITO", analista);
    expect(() => db.confirmarDeposito(id, liberacao)).toThrow("Agende o depósito");
  });

  test("CT-I07 oferta pré-aprovada pula análise e vai para a liberação", () => {
    const id = prepararEnvio(db.criarSolicitacao(produtor.id, "custeio", 150_000, 12));
    expect(db.solicitacao(id)!.pre_aprovada).toBe(1);
    db.aprovarCadastro(id, cadastro);
    expect(db.solicitacao(id)!.status).toBe("AGENDANDO_DEPOSITO");
    expect(db.solicitacao(id)!.analise).toBeNull();
    expect(db.historico(id).map((h) => h.para)).not.toContain("AGUARDANDO_ANALISTA");
  });

  test("CT-I06 senha é armazenada com hash", () => {
    const linha = db.db.prepare("select senha from usuarios where id = ?").get(produtor.id) as { senha: string };
    expect(linha.senha).not.toContain("123456");
    expect(db.senhaConfere("123456", linha.senha)).toBe(true);
    expect(db.senhaConfere("errada", linha.senha)).toBe(false);
  });
});
