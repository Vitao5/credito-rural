import { exigir } from "@/lib/auth";
import { analiseDe, documentos, historico, solicitacao, solicitacoes } from "@/lib/db";
import { LIMITES } from "@/lib/regras";
import { decidirCredito } from "../../actions";
import { Documentos, Erro, Fila, LinhaDoTempo, Resumo, ResultadoAnalise, Titulo } from "../../ui";

export default async function AnaliseCredito({ searchParams }: PageProps<"/credito">) {
  await exigir("analista");
  const p = await searchParams;
  const itens = solicitacoes({ status: "AGUARDANDO_ANALISTA" });
  const s = p.id ? solicitacao(Number(p.id)) : undefined;
  const aberta = s?.status === "AGUARDANDO_ANALISTA" ? s : undefined;
  const analise = aberta && analiseDe(aberta);

  return (
    <>
      <Titulo sub="Confirme ou altere a recomendação da análise automática do Sistema.">Análise de crédito</Titulo>
      <Fila itens={itens} selecionado={aberta?.id} rota="/credito" vazio="Nenhuma proposta aguardando confirmação.">
        {aberta && (
          <div className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-2">
              <div className="card">
                <h2 className="text-xl mb-4 font-semibold">Análise automática</h2>
                {analise && <ResultadoAnalise a={analise} />}
              </div>
              <div className="card">
                <h2 className="text-xl mb-4 font-semibold">Solicitação #{aberta.id}</h2>
                <Resumo s={aberta} />
              </div>
            </div>
            <div className="card">
              <h2 className="text-xl mb-3 font-semibold">Documentos</h2>
              <Documentos docs={documentos(aberta.id)} />
            </div>
            <form action={decidirCredito} className="card space-y-3">
              <h2 className="text-xl font-semibold">Decisão do analista</h2>
              {p.erro && <Erro>Informe o motivo da recusa.</Erro>}
              <input type="hidden" name="id" value={aberta.id} />
              <label htmlFor="motivo">Parecer (obrigatório para recusa)</label>
              <textarea id="motivo" name="motivo" rows={3} maxLength={LIMITES.texto} />
              <div className="flex gap-3">
                <button name="decisao" value="aprovar" className="btn">
                  Confirmar aprovação
                </button>
                <button name="decisao" value="recusar" className="btn-perigo">
                  Recusar proposta
                </button>
              </div>
            </form>
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
