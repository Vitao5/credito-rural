import { exigir } from "@/lib/auth";
import { historico, solicitacao, solicitacoes } from "@/lib/db";
import { dataBr, janelaAgendamento } from "@/lib/regras";
import { agendarDeposito, confirmarDeposito } from "../../actions";
import { Erro, Fila, LinhaDoTempo, Resumo, Titulo } from "../../ui";

export default async function Liberacao({ searchParams }: PageProps<"/liberacao">) {
  await exigir("liberacao");
  const p = await searchParams;
  const itens = solicitacoes({ status: "AGENDANDO_DEPOSITO" });
  const s = p.id ? solicitacao(Number(p.id)) : undefined;
  const aberta = s?.status === "AGENDANDO_DEPOSITO" ? s : undefined;
  const [hoje, limite] = janelaAgendamento();

  return (
    <>
      <Titulo sub="Agende e confirme o depósito das propostas aprovadas.">Liberação de crédito</Titulo>
      <Fila itens={itens} selecionado={aberta?.id} rota="/liberacao" vazio="Nenhuma proposta aprovada aguardando depósito.">
        {aberta && (
          <div className="space-y-6">
            <div className="card">
              <h2 className="text-xl mb-4 font-semibold">Solicitação #{aberta.id}</h2>
              <Resumo s={aberta} />
            </div>
            <div className="card space-y-4">
              <h2 className="text-xl font-semibold">Depósito</h2>
              {p.erro && <Erro>Informe uma data entre hoje e {dataBr(limite)}.</Erro>}
              <form action={agendarDeposito} className="flex items-end gap-3">
                <input type="hidden" name="id" value={aberta.id} />
                <div className="flex-1">
                  <label htmlFor="data">Data do depósito</label>
                  <input id="data" name="data" type="date" min={hoje} max={limite} defaultValue={aberta.data_deposito ?? ""} required />
                </div>
                <button className="btn-sec">{aberta.data_deposito ? "Reagendar" : "Agendar depósito"}</button>
              </form>
              {aberta.data_deposito && (
                <form action={confirmarDeposito} className="border-t border-gray-200 pt-4">
                  <input type="hidden" name="id" value={aberta.id} />
                  <p className="mb-3">Agendado para {dataBr(aberta.data_deposito)}.</p>
                  <button className="btn">Confirmar depósito realizado</button>
                </form>
              )}
            </div>
            <div className="card">
              <h2 className="text-xl mb-4 font-semibold">Histórico</h2>
              <LinhaDoTempo eventos={historico(aberta.id)} />
            </div>
          </div>
        )}
      </Fila>
    </>
  );
}
