import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { analisar, dataBr, ehPreAprovada, podeTransicionar, ROTULO, type Analise, type Finalidade, type Papel, type Status } from "./regras";

const caminho = process.env.DB_PATH ?? "data/credito.db";
export const PASTA_UPLOADS = join(dirname(caminho), "uploads");
mkdirSync(PASTA_UPLOADS, { recursive: true });

export const db = new DatabaseSync(caminho);

function hashSenha(senha: string, sal = randomBytes(16).toString("hex")) {
  return `${sal}:${scryptSync(senha, sal, 32).toString("hex")}`;
}

export function senhaConfere(senha: string, hash: string) {
  const [sal, h] = hash.split(":");
  return timingSafeEqual(Buffer.from(h, "hex"), scryptSync(senha, sal, 32));
}

db.exec("pragma busy_timeout = 5000; pragma foreign_keys = on; begin immediate");
db.exec(`
  create table if not exists usuarios (
    id integer primary key,
    nome text not null,
    email text not null unique,
    senha text not null,
    papel text not null
  );
  create table if not exists solicitacoes (
    id integer primary key,
    produtor_id integer not null references usuarios(id),
    finalidade text not null,
    valor real not null,
    prazo integer not null,
    status text not null,
    cpf text not null default '',
    banco text not null default '',
    agencia text not null default '',
    conta text not null default '',
    analise text,
    data_deposito text,
    pre_aprovada integer not null default 0,
    criada_em text not null default (datetime('now', 'localtime'))
  );
  create table if not exists documentos (
    id integer primary key,
    solicitacao_id integer not null references solicitacoes(id),
    tipo text not null,
    nome text not null,
    unique (solicitacao_id, tipo)
  );
  create table if not exists historico (
    id integer primary key,
    solicitacao_id integer not null references solicitacoes(id),
    de text,
    para text not null,
    usuario_id integer references usuarios(id),
    obs text not null default '',
    em text not null default (datetime('now', 'localtime'))
  );
  create table if not exists notificacoes (
    id integer primary key,
    usuario_id integer not null references usuarios(id),
    solicitacao_id integer not null references solicitacoes(id),
    mensagem text not null,
    lida integer not null default 0,
    em text not null default (datetime('now', 'localtime'))
  );
`);

if (!db.prepare("select 1 from usuarios").get()) {
  const inserir = db.prepare("insert into usuarios (nome, email, senha, papel) values (?, ?, ?, ?)");
  const senha = hashSenha("123456");
  for (const [nome, email, papel] of [
    ["João Produtor", "produtor@credito.rural", "produtor"],
    ["Maria Produtora", "produtora@credito.rural", "produtor"],
    ["Carla Cadastro", "cadastro@credito.rural", "cadastro"],
    ["André Analista", "analista@credito.rural", "analista"],
    ["Luís Liberação", "liberacao@credito.rural", "liberacao"],
    ["Ana Atendente", "atendente@credito.rural", "atendente"],
  ]) inserir.run(nome, email, senha, papel);
}
db.exec("commit");

export type Usuario = { id: number; nome: string; papel: Papel };

export type Solicitacao = {
  id: number;
  produtor_id: number;
  produtor: string;
  finalidade: Finalidade;
  valor: number;
  prazo: number;
  status: Status;
  cpf: string;
  banco: string;
  agencia: string;
  conta: string;
  analise: string | null;
  data_deposito: string | null;
  pre_aprovada: number;
  criada_em: string;
};

export type Documento = { id: number; solicitacao_id: number; tipo: string; nome: string };

export type Evento = { id: number; de: Status | null; para: Status; usuario: string | null; obs: string; em: string };

type Notificacao = { id: number; solicitacao_id: number; mensagem: string; lida: number; em: string };

const SELECT_SOLICITACAO = `
  select s.*, u.nome as produtor from solicitacoes s join usuarios u on u.id = s.produtor_id`;

export function usuario(id: number) {
  return db.prepare("select id, nome, papel from usuarios where id = ?").get(id) as Usuario | undefined;
}

export function solicitacao(id: number) {
  return db.prepare(`${SELECT_SOLICITACAO} where s.id = ?`).get(id) as Solicitacao | undefined;
}

export function solicitacoes(filtro: { produtorId?: number; status?: string; busca?: string } = {}) {
  return db
    .prepare(
      `${SELECT_SOLICITACAO}
       where (:p is null or s.produtor_id = :p)
         and (:s is null or s.status = :s)
         and (:b is null or u.nome like '%' || :b || '%')
       order by s.id desc`,
    )
    .all({ p: filtro.produtorId ?? null, s: filtro.status || null, b: filtro.busca || null }) as Solicitacao[];
}

export function documentos(solicitacaoId: number) {
  return db.prepare("select * from documentos where solicitacao_id = ?").all(solicitacaoId) as Documento[];
}

export function historico(solicitacaoId: number) {
  return db
    .prepare(
      `select h.id, h.de, h.para, u.nome as usuario, h.obs, h.em
       from historico h left join usuarios u on u.id = h.usuario_id
       where h.solicitacao_id = ? order by h.id`,
    )
    .all(solicitacaoId) as Evento[];
}

export function notificacoes(usuarioId: number) {
  return db
    .prepare("select * from notificacoes where usuario_id = ? order by id desc")
    .all(usuarioId) as Notificacao[];
}

export function naoLidas(usuarioId: number) {
  return (db.prepare("select count(*) as n from notificacoes where usuario_id = ? and lida = 0").get(usuarioId) as {
    n: number;
  }).n;
}

export function analiseDe(s: Solicitacao) {
  return s.analise ? (JSON.parse(s.analise) as Analise) : null;
}

function emTransacao(fn: () => void) {
  db.exec("begin");
  try {
    fn();
    db.exec("commit");
  } catch (e) {
    db.exec("rollback");
    throw e;
  }
}

function registrar(s: Solicitacao, para: Status, usuarioId: number | null, obs: string) {
  db.prepare("insert into historico (solicitacao_id, de, para, usuario_id, obs) values (?, ?, ?, ?, ?)").run(
    s.id,
    s.status,
    para,
    usuarioId,
    obs,
  );
  const mensagem = `Solicitação #${s.id}: ${ROTULO[para]}${obs ? ` - ${obs}` : ""}`;
  db.prepare("insert into notificacoes (usuario_id, solicitacao_id, mensagem) values (?, ?, ?)").run(
    s.produtor_id,
    s.id,
    mensagem,
  );
}

export function criarSolicitacao(produtorId: number, finalidade: Finalidade, valor: number, prazo: number) {
  let id = 0;
  emTransacao(() => {
    id = Number(
      db
        .prepare(
          "insert into solicitacoes (produtor_id, finalidade, valor, prazo, pre_aprovada, status) values (?, ?, ?, ?, ?, 'SIMULANDO')",
        )
        .run(produtorId, finalidade, valor, prazo, ehPreAprovada(finalidade, valor, prazo) ? 1 : 0).lastInsertRowid,
    );
    db.prepare("insert into historico (solicitacao_id, para, usuario_id) values (?, 'SIMULANDO', ?)").run(id, produtorId);
  });
  return id;
}

export function transicionar(id: number, para: Status, por: { id: number | null; papel: Papel }, obs = "") {
  const s = solicitacao(id);
  if (!s) throw new Error("Solicitação não encontrada");
  if (!podeTransicionar(s.status, para, por.papel, s.pre_aprovada === 1))
    throw new Error(`Transição não permitida: ${s.status} -> ${para}`);
  emTransacao(() => {
    db.prepare("update solicitacoes set status = ? where id = ?").run(para, id);
    registrar(s, para, por.id, obs);
  });
}

export function anotar(id: number, usuarioId: number, obs: string) {
  const s = solicitacao(id);
  if (!s) throw new Error("Solicitação não encontrada");
  registrar(s, s.status, usuarioId, obs);
}

export function aprovarCadastro(id: number, cadastro: Usuario) {
  if (solicitacao(id)?.pre_aprovada)
    return transicionar(id, "AGENDANDO_DEPOSITO", cadastro, "Crédito pré-aprovado liberado");
  transicionar(id, "ANALISE_AUTOMATICA", cadastro);
  const analise = analisar(solicitacao(id)!, documentos(id).map((d) => d.tipo));
  db.prepare("update solicitacoes set analise = ? where id = ?").run(JSON.stringify(analise), id);
  const sistema = { id: null, papel: "sistema" as const };
  transicionar(id, "AGUARDANDO_ANALISTA", sistema, `${analise.recomendacao} (${analise.pontos} pontos)`);
}

export function agendarDeposito(id: number, data: string, liberacao: Usuario) {
  const s = solicitacao(id);
  if (s?.status !== "AGENDANDO_DEPOSITO") throw new Error("Solicitação não está aguardando depósito");
  db.prepare("update solicitacoes set data_deposito = ? where id = ?").run(data, id);
  anotar(id, liberacao.id, `Depósito agendado para ${dataBr(data)}`);
}

export function confirmarDeposito(id: number, liberacao: Usuario) {
  if (!solicitacao(id)?.data_deposito) throw new Error("Agende o depósito antes de confirmar");
  transicionar(id, "CONCLUIDA", liberacao, "Depósito realizado");
}
