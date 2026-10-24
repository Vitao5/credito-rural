export type Papel = "produtor" | "cadastro" | "analista" | "liberacao" | "atendente" | "sistema";

export type Status =
  | "SIMULANDO"
  | "AGUARDANDO_CADASTRO"
  | "CORRIGINDO"
  | "ANALISE_AUTOMATICA"
  | "AGUARDANDO_ANALISTA"
  | "AGENDANDO_DEPOSITO"
  | "CONCLUIDA"
  | "RECUSADA";

export const ROTULO: Record<Status, string> = {
  SIMULANDO: "Simulando",
  AGUARDANDO_CADASTRO: "Aguardando cadastro",
  CORRIGINDO: "Corrigindo documentos",
  ANALISE_AUTOMATICA: "Análise automática",
  AGUARDANDO_ANALISTA: "Aguardando analista",
  AGENDANDO_DEPOSITO: "Agendando depósito",
  CONCLUIDA: "Concluída",
  RECUSADA: "Recusada",
};

const TRANSICOES: Record<Status, Partial<Record<Status, Papel>>> = {
  SIMULANDO: { AGUARDANDO_CADASTRO: "produtor" },
  AGUARDANDO_CADASTRO: { CORRIGINDO: "cadastro", ANALISE_AUTOMATICA: "cadastro" },
  CORRIGINDO: { AGUARDANDO_CADASTRO: "produtor" },
  ANALISE_AUTOMATICA: { AGUARDANDO_ANALISTA: "sistema" },
  AGUARDANDO_ANALISTA: { AGENDANDO_DEPOSITO: "analista", RECUSADA: "analista" },
  AGENDANDO_DEPOSITO: { CONCLUIDA: "liberacao" },
  CONCLUIDA: {},
  RECUSADA: {},
};

export function podeTransicionar(de: Status, para: Status, papel: Papel, preAprovada = false) {
  if (de === "AGUARDANDO_CADASTRO" && para === "AGENDANDO_DEPOSITO") return papel === "cadastro" && preAprovada;
  return TRANSICOES[de][para] === papel;
}

export const LIMITES = {
  email: 100,
  senha: 64,
  banco: 60,
  texto: 500,
  busca: 60,
  valorMax: 2_000_000,
  prazoMax: 120,
  diasAgendamento: 365,
};

export const FINALIDADES = {
  custeio: { nome: "Custeio", taxa: 0.005, teto: 500_000, prazoMax: 24 },
  investimento: { nome: "Investimento", taxa: 0.007, teto: 2_000_000, prazoMax: 120 },
  comercializacao: { nome: "Comercialização", taxa: 0.006, teto: 1_000_000, prazoMax: 12 },
};

export type Finalidade = keyof typeof FINALIDADES;

export const PRE_APROVADOS: { finalidade: Finalidade; valor: number; prazo: number; descricao: string }[] = [
  { finalidade: "custeio", valor: 150_000, prazo: 12, descricao: "Insumos e preparo da próxima safra" },
  { finalidade: "investimento", valor: 400_000, prazo: 60, descricao: "Máquinas, implementos e benfeitorias" },
  { finalidade: "comercializacao", valor: 200_000, prazo: 6, descricao: "Estocagem e venda da produção" },
];

export function ehPreAprovada(finalidade: Finalidade, valor: number, prazo: number) {
  return PRE_APROVADOS.some((o) => o.finalidade === finalidade && o.valor === valor && o.prazo === prazo);
}

export const DOCUMENTOS = {
  pessoal: "Documento pessoal (RG ou CNH)",
  propriedade: "Comprovante da propriedade",
  renda: "Comprovante de renda",
};

export function simulacaoValida(finalidade: string, valor: number, prazo: number): finalidade is Finalidade {
  return (
    finalidade in FINALIDADES &&
    valor >= 1 &&
    valor <= LIMITES.valorMax &&
    Number.isInteger(prazo) &&
    prazo >= 1 &&
    prazo <= LIMITES.prazoMax
  );
}

export function janelaAgendamento(hoje = new Date()) {
  const fim = new Date(hoje.getTime() + LIMITES.diasAgendamento * 86_400_000);
  return [hoje.toISOString().slice(0, 10), fim.toISOString().slice(0, 10)];
}

export function simular(finalidade: Finalidade, valor: number, prazo: number) {
  const taxa = FINALIDADES[finalidade].taxa;
  const parcela = (valor * taxa) / (1 - (1 + taxa) ** -prazo);
  return { taxa, parcela, total: parcela * prazo };
}

export function cpfValido(cpf: string) {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  for (const n of [9, 10]) {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(d[i]) * (n + 1 - i);
    if (((soma * 10) % 11) % 10 !== Number(d[n])) return false;
  }
  return true;
}

export const formatarCpf = (cpf: string) => cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");

export const agenciaValida = (agencia: string) => /^\d{4}$/.test(agencia);

export const contaValida = (conta: string) => /^\d{1,12}-[\dX]$/i.test(conta);

type DadosAnalise = {
  finalidade: Finalidade;
  valor: number;
  prazo: number;
  cpf: string;
  agencia: string;
  conta: string;
};

export function analisar(s: DadosAnalise, tiposAnexados: string[]) {
  const f = FINALIDADES[s.finalidade];
  const regras = [
    {
      regra: "Documentos obrigatórios anexados",
      ok: Object.keys(DOCUMENTOS).every((t) => tiposAnexados.includes(t)),
    },
    { regra: "CPF válido", ok: cpfValido(s.cpf) },
    { regra: "Agência e conta em formato válido", ok: agenciaValida(s.agencia) && contaValida(s.conta) },
    { regra: `Valor até o teto de ${moeda(f.teto)}`, ok: s.valor <= f.teto },
    { regra: `Prazo até ${f.prazoMax} meses`, ok: s.prazo <= f.prazoMax },
  ];
  const pontos = Math.round((100 * regras.filter((r) => r.ok).length) / regras.length);
  return { pontos, regras, recomendacao: pontos === 100 ? "Recomenda aprovação" : "Recomenda recusa" };
}

export type Analise = ReturnType<typeof analisar>;

export const dataBr = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/") + iso.slice(10, 16);

export const moeda =(v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
