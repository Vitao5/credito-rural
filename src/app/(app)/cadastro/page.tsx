import { exigir } from "@/lib/auth";
import { documentos, historico, solicitacao, solicitacoes } from "@/lib/db";
import { LIMITES } from "@/lib/regras";
import { decidirCadastro } from "../../actions";
import { Documentos, Erro, Fila, LinhaDoTempo, Resumo, Titulo } from "../../ui";

export default async function FilaCadastro({ searchParams }: PageProps<"/cadastro">) {
  await exigir("cadastro");
  const p = await searchParams;
  const itens = solicitacoes({ status: "AGUARDANDO_CADASTRO" });
  const s = p.id ? solicitacao(Number(p.id)) : undefined;
  const aberta = s?.status === "AGUARDANDO_CADASTRO" ? s : undefined;

  return (
    <>
      <Titulo sub="Verifique se os dados e documentos do produtor estão completos e atualizados.">Fila de cadastro</Titulo>
      <Fila itens={itens} selecionado={aberta?.id} rota="/cadastro" vazio="Nenhuma solicitação aguardando verificação.">
        {aberta && (
          <div className="space-y-6">
            <div className="card">
              <h2 className="text-xl mb-4 font-semibold">Solicitação #{aberta.id}</h2>
              <Resumo s={aberta} />
            </div>
            <div className="card">
              <h2 className="text-xl mb-3 font-semibold">Documentos enviados</h2>
              <Documentos docs={documentos(aberta.id)} />
            </div>
            <div className="card space-y-4">
              <h2 className="text-xl font-semibold">Decisão</h2>
              {p.erro && <Erro>Informe o motivo da devolução.</Erro>}
              <form action={decidirCadastro}>
                <input type="hidden" name="id" value={aberta.id} />
                <input type="hidden" name="decisao" value="aprovar" />
                <button className="btn">
                  {aberta.pre_aprovada
                    ? "Aprovar documentos e enviar para liberação"
                    : "Aprovar documentos e enviar para análise"}
                </button>
              </form>
              <form action={decidirCadastro} className="space-y-2 border-t border-gray-200 pt-4">
                <input type="hidden" name="id" value={aberta.id} />
                <input type="hidden" name="decisao" value="devolver" />
                <label htmlFor="motivo">Motivo da devolução</label>
                <textarea
                  id="motivo"
                  name="motivo"
                  rows={3}
                  maxLength={LIMITES.texto}
                  placeholder="Ex.: comprovante de renda ilegível"
                />
                <button className="btn-perigo">Devolver ao produtor</button>
              </form>
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
