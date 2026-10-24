import Link from "next/link";
import { exigir } from "@/lib/auth";
import { notificacoes } from "@/lib/db";
import { dataBr } from "@/lib/regras";
import { marcarLidas } from "../../actions";
import { Titulo } from "../../ui";

export default async function Notificacoes() {
  const u = await exigir();
  const lista = notificacoes(u.id);
  return (
    <>
      <div className="flex items-start justify-between">
        <Titulo sub="Avisos sobre o andamento das suas solicitações.">Notificações</Titulo>
        {lista.some((n) => !n.lida) && (
          <form action={marcarLidas}>
            <button className="btn-sec">Marcar todas como lidas</button>
          </form>
        )}
      </div>
      <ul className="card divide-y divide-gray-100 p-0">
        {lista.length === 0 && <li className="p-6">Nenhuma notificação.</li>}
        {lista.map((n) => (
          <li key={n.id} className={`flex items-start gap-3 p-4 ${n.lida ? "" : "bg-verde-claro/50"}`}>
            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.lida ? "bg-gray-300" : "bg-ambar"}`} />
            <div className="flex-1">
              <p>{n.mensagem}</p>
              <p>{dataBr(n.em)}</p>
            </div>
            {u.papel === "produtor" && (
              <Link href={`/solicitacoes/${n.solicitacao_id}`} className="font-semibold text-verde underline">
                Ver
              </Link>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
