import { exigir } from "@/lib/auth";
import { FINALIDADES, LIMITES, moeda, simulacaoValida, simular, type Finalidade } from "@/lib/regras";
import { criarSolicitacao } from "../../../actions";
import { Titulo } from "../../../ui";

export default async function NovaSimulacao({ searchParams }: PageProps<"/solicitacoes/nova">) {
  await exigir("produtor");
  const p = await searchParams;
  const finalidade = (p.finalidade as Finalidade) ?? "custeio";
  const valor = Number(p.valor);
  const prazo = Number(p.prazo);
  const r = simulacaoValida(finalidade, valor, prazo) ? simular(finalidade, valor, prazo) : null;

  return (
    <>
      <Titulo sub="Informe a finalidade, o valor e o prazo para ver as condições.">Nova simulação</Titulo>
      <div className="grid gap-6 lg:grid-cols-2">
        <form className="card space-y-4">
          <div>
            <label htmlFor="finalidade">Finalidade</label>
            <select id="finalidade" name="finalidade" defaultValue={finalidade}>
              {Object.entries(FINALIDADES).map(([k, f]) => (
                <option key={k} value={k}>
                  {f.nome} (até {moeda(f.teto)} em {f.prazoMax} meses)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="valor">Valor desejado (R$)</label>
            <input
              id="valor"
              name="valor"
              type="number"
              min="1"
              max={LIMITES.valorMax}
              step="0.01"
              defaultValue={p.valor}
              required
            />
          </div>
          <div>
            <label htmlFor="prazo">Prazo (meses)</label>
            <input
              id="prazo"
              name="prazo"
              type="number"
              min="1"
              max={LIMITES.prazoMax}
              step="1"
              defaultValue={p.prazo}
              required
            />
          </div>
          <button className="btn">Simular</button>
        </form>

        {r && (
          <div className="card border-verde bg-verde-claro">
            <h2 className="text-xl mb-4 font-semibold text-verde">Resultado da simulação</h2>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt>Parcela mensal</dt>
                <dd className="text-2xl font-bold text-verde">{moeda(r.parcela)}</dd>
              </div>
              <div>
                <dt>Taxa</dt>
                <dd className="text-2xl font-bold">{(r.taxa * 100).toLocaleString("pt-BR")}% a.m.</dd>
              </div>
              <div>
                <dt>Valor solicitado</dt>
                <dd className="font-semibold">{moeda(valor)}</dd>
              </div>
              <div>
                <dt>Total a pagar</dt>
                <dd className="font-semibold">{moeda(r.total)}</dd>
              </div>
            </dl>
            <form action={criarSolicitacao} className="mt-6">
              <input type="hidden" name="finalidade" value={finalidade} />
              <input type="hidden" name="valor" value={valor} />
              <input type="hidden" name="prazo" value={prazo} />
              <button className="btn">Continuar para anexar documentação</button>
            </form>
          </div>
        )}
      </div>
    </>
  );
}
