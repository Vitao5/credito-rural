import Link from "next/link";
import type { Documento, Evento, Solicitacao } from "@/lib/db";
import { dataBr, DOCUMENTOS, FINALIDADES, formatarCpf, moeda, ROTULO, type Analise, type Status } from "@/lib/regras";

const COR: Record<Status, string> = {
  SIMULANDO: "bg-gray-100",
  AGUARDANDO_CADASTRO: "bg-blue-100 text-blue-800",
  CORRIGINDO: "bg-amber-100 text-amber-800",
  ANALISE_AUTOMATICA: "bg-purple-100 text-purple-800",
  AGUARDANDO_ANALISTA: "bg-indigo-100 text-indigo-800",
  AGENDANDO_DEPOSITO: "bg-teal-100 text-teal-800",
  CONCLUIDA: "bg-verde-claro text-verde",
  RECUSADA: "bg-red-100 text-red-800",
};

export function StatusChip({ status }: { status: Status }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-3 py-1 font-semibold ${COR[status]}`}>
      {ROTULO[status]}
    </span>
  );
}

export function PreAprovado() {
  return (
    <span className="ml-2 inline-block whitespace-nowrap rounded-full bg-ambar px-2 py-0.5 font-semibold text-verde">
      Pré-aprovado
    </span>
  );
}

export function Titulo({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-verde">{children}</h1>
      {sub && <p className="mt-1">{sub}</p>}
    </div>
  );
}

export function Erro({ children }: { children: React.ReactNode }) {
  return <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">{children}</p>;
}

export function Resumo({ s }: { s: Solicitacao }) {
  const itens = [
    ["Produtor", s.produtor],
    ["Finalidade", FINALIDADES[s.finalidade].nome],
    ["Valor", moeda(s.valor)],
    ["Prazo", `${s.prazo} meses`],
    ["Modalidade", s.pre_aprovada ? "Crédito pré-aprovado" : "Análise de crédito"],
    ["CPF", formatarCpf(s.cpf) || "-"],
    ["Banco", s.banco || "-"],
    ["Agência / Conta", s.agencia ? `${s.agencia} / ${s.conta}` : "-"],
    ["Criada em", dataBr(s.criada_em)],
  ];
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
      {itens.map(([k, v]) => (
        <div key={k}>
          <dt className="font-semibold text-verde">{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Documentos({ docs }: { docs: Documento[] }) {
  return (
    <ul className="space-y-2">
      {Object.entries(DOCUMENTOS).map(([tipo, nome]) => {
        const d = docs.find((x) => x.tipo === tipo);
        return (
          <li key={tipo} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
            <span>{nome}</span>
            {d ? (
              <a className="font-medium text-verde underline" href={`/arquivos/${d.id}`}>
                {d.nome}
              </a>
            ) : (
              <span className="text-red-700">Não enviado</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function LinhaDoTempo({ eventos }: { eventos: Evento[] }) {
  return (
    <ol className="relative space-y-4 border-l-2 border-verde-claro pl-5">
      {eventos.map((e) => (
        <li key={e.id} className="relative">
          <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full bg-verde" />
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip status={e.para} />
            <span>
              {dataBr(e.em)} - {e.usuario ?? "Sistema"}
            </span>
          </div>
          {e.obs && <p className="mt-1">{e.obs}</p>}
        </li>
      ))}
    </ol>
  );
}

export function ResultadoAnalise({ a }: { a: Analise }) {
  const aprova = a.pontos === 100;
  return (
    <div>
      <div className="mb-3 flex items-center gap-4">
        <span className={`text-4xl font-bold ${aprova ? "text-verde" : "text-red-700"}`}>{a.pontos}</span>
        <div>
          <p>pontos de 100</p>
          <p className={`font-semibold ${aprova ? "text-verde" : "text-red-700"}`}>{a.recomendacao}</p>
        </div>
      </div>
      <ul className="space-y-1">
        {a.regras.map((r) => (
          <li key={r.regra} className="flex justify-between gap-3">
            <span>{r.regra}</span>
            <span className={`font-semibold ${r.ok ? "text-verde" : "text-red-700"}`}>
              {r.ok ? "Atende" : "Não atende"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Fila({
  itens,
  selecionado,
  rota,
  vazio,
  children,
}: {
  itens: Solicitacao[];
  selecionado?: number;
  rota: string;
  vazio: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <ul className="card space-y-2 self-start p-3">
        {itens.length === 0 && <li className="p-3">{vazio}</li>}
        {itens.map((s) => (
          <li key={s.id}>
            <Link
              href={`${rota}?id=${s.id}`}
              className={`block rounded-lg px-3 py-2 ${s.id === selecionado ? "bg-verde-claro" : "hover:bg-gray-50"}`}
            >
              <p className="font-semibold">
                #{s.id} {s.produtor}
              </p>
              <p>
                {FINALIDADES[s.finalidade].nome} - {moeda(s.valor)}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-y-1">
                <StatusChip status={s.status} />
                {s.pre_aprovada === 1 && <PreAprovado />}
              </div>
            </Link>
          </li>
        ))}
      </ul>
      <div>{children ?? <div className="card">Selecione uma solicitação na lista.</div>}</div>
    </div>
  );
}
