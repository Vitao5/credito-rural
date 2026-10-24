import Link from "next/link";
import { exigir } from "@/lib/auth";
import { solicitacoes } from "@/lib/db";
import { dataBr, FINALIDADES, moeda, PRE_APROVADOS, simular } from "@/lib/regras";
import { PreAprovado, StatusChip, Titulo } from "../../ui";

export default async function MinhasSolicitacoes() {
  const u = await exigir("produtor");
  const lista = solicitacoes({ produtorId: u.id });
  return (
    <>
      <div className="flex items-start justify-between">
        <Titulo sub="Acompanhe o andamento de cada pedido de crédito.">Minhas solicitações</Titulo>
        <Link href="/solicitacoes/nova" className="btn">
          Nova simulação
        </Link>
      </div>
      <h2 className="mb-3 text-xl font-semibold text-verde">Crédito pré-aprovado para você</h2>
      <div className="mb-8 grid gap-4 md:grid-cols-3">
        {PRE_APROVADOS.map((o) => (
          <div key={o.finalidade} className="card flex flex-col border-t-4 border-t-ambar">
            <span className="font-semibold uppercase">{FINALIDADES[o.finalidade].nome}</span>
            <span className="mt-1 text-2xl font-bold text-verde">{moeda(o.valor)}</span>
            <span>{o.descricao}</span>
            <span className="mt-3">
              {o.prazo}x de <strong>{moeda(simular(o.finalidade, o.valor, o.prazo).parcela)}</strong>
            </span>
            <Link
              href={`/solicitacoes/nova?finalidade=${o.finalidade}&valor=${o.valor}&prazo=${o.prazo}`}
              className="btn mt-4 text-center"
            >
              Simular esta oferta
            </Link>
          </div>
        ))}
      </div>
      <h2 className="mb-3 text-xl font-semibold text-verde">Solicitações em andamento</h2>
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-left">
          <thead className="bg-gray-50">
            <tr>
              {["Nº", "Finalidade", "Valor", "Prazo", "Criada em", "Status", ""].map((h) => (
                <th key={h} className="px-4 py-3 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lista.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center">
                  Nenhuma solicitação ainda. Comece por uma simulação.
                </td>
              </tr>
            )}
            {lista.map((s) => (
              <tr key={s.id} className="border-t border-gray-100">
                <td className="px-4 py-3 font-semibold">#{s.id}</td>
                <td className="px-4 py-3">
                  {FINALIDADES[s.finalidade].nome}
                  {s.pre_aprovada === 1 && <PreAprovado />}
                </td>
                <td className="px-4 py-3">{moeda(s.valor)}</td>
                <td className="px-4 py-3">{s.prazo} meses</td>
                <td className="px-4 py-3">{dataBr(s.criada_em)}</td>
                <td className="px-4 py-3">
                  <StatusChip status={s.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/solicitacoes/${s.id}`} className="font-semibold text-verde underline">
                    Abrir
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
