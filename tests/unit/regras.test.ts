import { describe, expect, test } from "vitest";
import { agenciaValida, analisar, ehPreAprovada, contaValida, cpfValido, janelaAgendamento, podeTransicionar, PRE_APROVADOS, simulacaoValida, simular } from "@/lib/regras";

const valida = {
  finalidade: "custeio" as const,
  valor: 100_000,
  prazo: 12,
  cpf: "529.982.247-25",
  agencia: "1234",
  conta: "12345-6",
};
const todos = ["pessoal", "propriedade", "renda"];

describe("CT-U01 a CT-U04: transições de estado", () => {
  test("CT-U01 produtor envia documentação de uma simulação", () => {
    expect(podeTransicionar("SIMULANDO", "AGUARDANDO_CADASTRO", "produtor")).toBe(true);
  });

  test("CT-U02 cadastro devolve ou aprova, nunca pula para o analista", () => {
    expect(podeTransicionar("AGUARDANDO_CADASTRO", "CORRIGINDO", "cadastro")).toBe(true);
    expect(podeTransicionar("AGUARDANDO_CADASTRO", "ANALISE_AUTOMATICA", "cadastro")).toBe(true);
    expect(podeTransicionar("AGUARDANDO_CADASTRO", "AGENDANDO_DEPOSITO", "cadastro")).toBe(false);
  });

  test("CT-U12 crédito pré-aprovado vai do cadastro direto para a liberação", () => {
    expect(podeTransicionar("AGUARDANDO_CADASTRO", "AGENDANDO_DEPOSITO", "cadastro", true)).toBe(true);
    expect(podeTransicionar("AGUARDANDO_CADASTRO", "AGENDANDO_DEPOSITO", "produtor", true)).toBe(false);
    expect(ehPreAprovada("custeio", 150_000, 12)).toBe(true);
    expect(ehPreAprovada("custeio", 150_001, 12)).toBe(false);
  });

  test("CT-U03 papel errado não altera o estado", () => {
    expect(podeTransicionar("AGUARDANDO_ANALISTA", "AGENDANDO_DEPOSITO", "produtor")).toBe(false);
    expect(podeTransicionar("AGENDANDO_DEPOSITO", "CONCLUIDA", "analista")).toBe(false);
  });

  test("CT-U04 estados finais não têm saída", () => {
    expect(podeTransicionar("RECUSADA", "AGENDANDO_DEPOSITO", "analista")).toBe(false);
    expect(podeTransicionar("CONCLUIDA", "SIMULANDO", "produtor")).toBe(false);
  });
});

describe("CT-U05 a CT-U07: validações do Sistema", () => {
  test("CT-U05 CPF", () => {
    expect(cpfValido("529.982.247-25")).toBe(true);
    expect(cpfValido("529.982.247-24")).toBe(false);
    expect(cpfValido("111.111.111-11")).toBe(false);
    expect(cpfValido("123")).toBe(false);
  });

  test("CT-U06 agência e conta", () => {
    expect(agenciaValida("1234")).toBe(true);
    expect(agenciaValida("12a4")).toBe(false);
    expect(contaValida("12345-6")).toBe(true);
    expect(contaValida("12345-X")).toBe(true);
    expect(contaValida("123456")).toBe(false);
  });

  test("CT-U13 limites da simulação e da data de depósito", () => {
    expect(simulacaoValida("custeio", 2_000_000, 120)).toBe(true);
    expect(simulacaoValida("custeio", 2_000_001, 12)).toBe(false);
    expect(simulacaoValida("custeio", 1000, 121)).toBe(false);
    expect(simulacaoValida("custeio", 1000, 1.5)).toBe(false);
    expect(simulacaoValida("outra", 1000, 12)).toBe(false);
    expect(janelaAgendamento(new Date("2026-01-01T12:00:00Z"))).toEqual(["2026-01-01", "2027-01-01"]);
  });

  test("CT-U07 simulação pela tabela Price", () => {
    const r = simular("custeio", 120_000, 12);
    expect(r.parcela).toBeCloseTo(10_327.97, 1);
    expect(r.total).toBeCloseTo(r.parcela * 12, 5);
  });
});

describe("CT-U08 a CT-U10: análise automática", () => {
  test("CT-U08 proposta completa recomenda aprovação", () => {
    const a = analisar(valida, todos);
    expect(a.pontos).toBe(100);
    expect(a.recomendacao).toBe("Recomenda aprovação");
  });

  test("CT-U09 valor acima do teto recomenda recusa", () => {
    const a = analisar({ ...valida, valor: 600_000 }, todos);
    expect(a.pontos).toBe(80);
    expect(a.recomendacao).toBe("Recomenda recusa");
  });

  test("CT-U10 documento faltando reprova a regra de documentos", () => {
    const a = analisar(valida, ["pessoal"]);
    expect(a.regras[0].ok).toBe(false);
  });

  test("CT-U11 ofertas pré-aprovadas respeitam teto e prazo da finalidade", () => {
    for (const o of PRE_APROVADOS) expect(analisar({ ...valida, ...o }, todos).pontos).toBe(100);
  });
});
