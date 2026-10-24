"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import * as dados from "@/lib/db";
import { exigir, iniciarSessao } from "@/lib/auth";
import {
  agenciaValida,
  contaValida,
  cpfValido,
  DOCUMENTOS,
  janelaAgendamento,
  LIMITES,
  simulacaoValida,
  type Finalidade,
} from "@/lib/regras";

const texto = (f: FormData, campo: string, max = LIMITES.texto) => String(f.get(campo) ?? "").trim().slice(0, max);
const numero = (f: FormData, campo: string) => Number(f.get(campo));

const TIPOS_ARQUIVO = ["application/pdf", "image/png", "image/jpeg"];
const TAMANHO_MAXIMO = 5 * 1024 * 1024;

export async function entrar(f: FormData) {
  const email = texto(f, "email", LIMITES.email).toLowerCase();
  const linha = dados.db.prepare("select id, senha from usuarios where email = ?").get(email) as
    | { id: number; senha: string }
    | undefined;
  if (!linha || !dados.senhaConfere(texto(f, "senha", LIMITES.senha), linha.senha))
    redirect(`/login?erro=1&email=${encodeURIComponent(email)}`);
  await iniciarSessao(linha.id);
  redirect("/");
}

export async function sair() {
  (await cookies()).delete("sessao");
  redirect("/login");
}

export async function criarSolicitacao(f: FormData) {
  const u = await exigir("produtor");
  const finalidade = texto(f, "finalidade") as Finalidade;
  const valor = numero(f, "valor");
  const prazo = numero(f, "prazo");
  if (!simulacaoValida(finalidade, valor, prazo)) redirect("/solicitacoes/nova");
  redirect(`/solicitacoes/${dados.criarSolicitacao(u.id, finalidade, valor, prazo)}`);
}

export async function enviarDocumentacao(f: FormData) {
  const u = await exigir("produtor");
  const id = numero(f, "id");
  const s = dados.solicitacao(id);
  if (!s || s.produtor_id !== u.id) redirect("/solicitacoes");
  if (s.status !== "SIMULANDO" && s.status !== "CORRIGINDO") redirect(`/solicitacoes/${id}`);

  const voltar = (erro: string) => redirect(`/solicitacoes/${id}?erro=${encodeURIComponent(erro)}`);
  const cpf = texto(f, "cpf", 14).replace(/\D/g, "");
  const banco = texto(f, "banco", LIMITES.banco);
  const agencia = texto(f, "agencia", 4);
  const conta = texto(f, "conta", 14);

  dados.db
    .prepare("update solicitacoes set cpf = ?, banco = ?, agencia = ?, conta = ? where id = ?")
    .run(cpf, banco, agencia, conta, id);

  for (const tipo of Object.keys(DOCUMENTOS)) {
    const arquivo = f.get(`doc_${tipo}`);
    if (!(arquivo instanceof File) || arquivo.size === 0) continue;
    if (!TIPOS_ARQUIVO.includes(arquivo.type) || arquivo.size > TAMANHO_MAXIMO)
      voltar("Envie arquivos PDF, PNG ou JPG de até 5 MB");
    dados.db.prepare("delete from documentos where solicitacao_id = ? and tipo = ?").run(id, tipo);
    const docId = dados.db
      .prepare("insert into documentos (solicitacao_id, tipo, nome) values (?, ?, ?)")
      .run(id, tipo, arquivo.name).lastInsertRowid;
    writeFileSync(join(dados.PASTA_UPLOADS, String(docId)), Buffer.from(await arquivo.arrayBuffer()));
  }

  if (!cpfValido(cpf)) voltar("CPF inválido");
  if (!banco) voltar("Informe o banco");
  if (!agenciaValida(agencia)) voltar("Agência deve ter 4 dígitos");
  if (!contaValida(conta)) voltar("Conta deve estar no formato 12345-6");
  const anexados = dados.documentos(id).map((d) => d.tipo);
  const faltando = Object.entries(DOCUMENTOS).filter(([tipo]) => !anexados.includes(tipo));
  if (faltando.length) voltar(`Anexe: ${faltando.map(([, nome]) => nome).join(", ")}`);

  dados.transicionar(id, "AGUARDANDO_CADASTRO", u, s.status === "CORRIGINDO" ? "Documentação reenviada" : "");
  redirect(`/solicitacoes/${id}`);
}

export async function decidirCadastro(f: FormData) {
  const u = await exigir("cadastro");
  const id = numero(f, "id");
  if (texto(f, "decisao") === "aprovar") dados.aprovarCadastro(id, u);
  else {
    const motivo = texto(f, "motivo");
    if (!motivo) redirect(`/cadastro?id=${id}&erro=1`);
    dados.transicionar(id, "CORRIGINDO", u, motivo);
  }
  redirect("/cadastro");
}

export async function decidirCredito(f: FormData) {
  const u = await exigir("analista");
  const id = numero(f, "id");
  const motivo = texto(f, "motivo");
  if (texto(f, "decisao") === "aprovar") dados.transicionar(id, "AGENDANDO_DEPOSITO", u, motivo || "Proposta aprovada");
  else {
    if (!motivo) redirect(`/credito?id=${id}&erro=1`);
    dados.transicionar(id, "RECUSADA", u, motivo);
  }
  redirect("/credito");
}

export async function agendarDeposito(f: FormData) {
  const u = await exigir("liberacao");
  const id = numero(f, "id");
  const data = texto(f, "data", 10);
  const [min, max] = janelaAgendamento();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || data < min || data > max) redirect(`/liberacao?id=${id}&erro=1`);
  dados.agendarDeposito(id, data, u);
  redirect(`/liberacao?id=${id}`);
}

export async function confirmarDeposito(f: FormData) {
  const u = await exigir("liberacao");
  dados.confirmarDeposito(numero(f, "id"), u);
  redirect("/liberacao");
}

export async function intervir(f: FormData) {
  const u = await exigir("atendente");
  const id = numero(f, "id");
  const mensagem = texto(f, "mensagem");
  if (mensagem) dados.anotar(id, u.id, mensagem);
  redirect(`/atendimento?id=${id}`);
}

export async function marcarLidas() {
  const u = await exigir();
  dados.db.prepare("update notificacoes set lida = 1 where usuario_id = ?").run(u.id);
  redirect("/notificacoes");
}
