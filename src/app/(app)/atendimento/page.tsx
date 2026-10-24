import { exigir } from "@/lib/auth";
import { documentos, historico, solicitacao, solicitacoes } from "@/lib/db";
import { LIMITES, ROTULO } from "@/lib/regras";
import { intervir } from "../../actions";
import { Documentos, Fila, LinhaDoTempo, Resumo, StatusChip, Titulo } from "../../ui";

export default async function Atendimento({ searchParams }: PageProps<"/atendimento">) {
  await exigir("atendente");
  const p = await searchParams;
  const status = typeof p.status === "string" ? p.status : "";
  const busca = typeof p.busca === "string" ? p.busca.slice(0, LIMITES.busca) : "";
  const itens = solicitacoes({ status, busca });
  const s = p.id ? solicitacao(Number(p.id)) : undefined;

  return (
    <>
      <Titulo sub="Acompanhe todas as solicitações e intervenha apenas em exceções.">Acompanhamento</Titulo>
      <form className="card mb-6 flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1">
          <label htmlFor="busca">Produtor</label>
          <input id="busca" name="busca" defaultValue={busca} maxLength={LIMITES.busca} placeholder="Nome do produtor" />
        </div>
        <div className="min-w-48">
          <label htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={status}>
            <option value="">Todos</option>
            {Object.entries(ROTULO).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <button className="btn">Filtrar</button>
      </form>
      <Fila itens={itens} selecionado={s?.id} rota="/atendimento" vazio="Nenhuma solicitação encontrada.">
        {s && (
          <div className="space-y-6">
            <div className="card">
              <div className="mb-4 flex items-center gap-3">
                <h2 className="text-xl font-semibold">Solicitação #{s.id}</h2>
                <StatusChip status={s.status} />
              </div>
              <Resumo s={s} />
            </div>
            <div className="card">
              <h2 className="text-xl mb-3 font-semibold">Documentos</h2>
              <Documentos docs={documentos(s.id)} />
            </div>
            <form action={intervir} className="card space-y-3">
              <h2 className="text-xl font-semibold">Intervir em exceção</h2>
              <input type="hidden" name="id" value={s.id} />
              <label htmlFor="mensagem">Mensagem ao produtor (fica no histórico)</label>
              <textarea id="mensagem" name="mensagem" rows={3} maxLength={LIMITES.texto} required />
              <button className="btn">Registrar e notificar</button>
            </form>
            <div className="card">
              <h2 className="text-xl mb-4 font-semibold">Histórico</h2>
              <LinhaDoTempo eventos={historico(s.id)} />
            </div>
          </div>
        )}
      </Fila>
    </>
  );
}
