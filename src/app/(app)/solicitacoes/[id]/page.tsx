import { notFound } from "next/navigation";
import { exigir } from "@/lib/auth";
import { documentos, historico, solicitacao } from "@/lib/db";
import { dataBr, DOCUMENTOS, formatarCpf, LIMITES } from "@/lib/regras";
import { enviarDocumentacao } from "../../../actions";
import { Documentos, Erro, LinhaDoTempo, Resumo, StatusChip, Titulo } from "../../../ui";

export default async function DetalheSolicitacao({ params, searchParams }: PageProps<"/solicitacoes/[id]">) {
  const u = await exigir("produtor");
  const s = solicitacao(Number((await params).id));
  if (!s || s.produtor_id !== u.id) notFound();
  const { erro } = await searchParams;
  const docs = documentos(s.id);
  const eventos = historico(s.id);
  const ultimo = eventos.at(-1);
  const editavel = s.status === "SIMULANDO" || s.status === "CORRIGINDO";

  return (
    <>
      <div className="flex items-start gap-4">
        <Titulo sub={editavel ? "Anexe a documentação e os dados bancários para enviar à análise." : undefined}>
          Solicitação #{s.id}
        </Titulo>
        <StatusChip status={s.status} />
      </div>

      {s.status === "CORRIGINDO" && (
        <div className="mb-6 rounded-xl border border-ambar bg-amber-50 p-4">
          <p className="font-semibold text-amber-900">Pendência apontada pelo setor de cadastro</p>
          <p className="text-amber-900">{eventos.findLast((e) => e.para === "CORRIGINDO")?.obs}</p>
          <p className="mt-1 text-amber-800">Corrija os itens abaixo e reenvie.</p>
        </div>
      )}
      {s.status === "RECUSADA" && <Erro>Proposta recusada: {ultimo?.obs}</Erro>}
      {s.status === "AGENDANDO_DEPOSITO" && s.data_deposito && (
        <p className="mb-6 rounded-xl bg-verde-claro p-4 font-semibold text-verde">
          Depósito agendado para {dataBr(s.data_deposito)}.
        </p>
      )}
      {typeof erro === "string" && <Erro>{erro}</Erro>}

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {editavel ? (
            <form action={enviarDocumentacao} className="card space-y-5">
              <input type="hidden" name="id" value={s.id} />
              <h2 className="text-xl font-semibold">Documentação</h2>
              {Object.entries(DOCUMENTOS).map(([tipo, nome]) => {
                const atual = docs.find((d) => d.tipo === tipo);
                return (
                  <div key={tipo}>
                    <label htmlFor={`doc_${tipo}`}>
                      {nome} {atual && <span className="font-normal text-verde">(enviado: {atual.nome})</span>}
                    </label>
                    <input id={`doc_${tipo}`} name={`doc_${tipo}`} type="file" accept=".pdf,.png,.jpg,.jpeg" />
                  </div>
                );
              })}
              <h2 className="text-xl pt-2 font-semibold">Dados pessoais e bancários</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="cpf">CPF</label>
                  <input
                    id="cpf"
                    name="cpf"
                    defaultValue={formatarCpf(s.cpf)}
                    placeholder="000.000.000-00"
                    inputMode="numeric"
                    maxLength={14}
                    pattern="\d{3}\.?\d{3}\.?\d{3}-?\d{2}"
                    title="11 dígitos, com ou sem pontuação"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="banco">Banco</label>
                  <input id="banco" name="banco" defaultValue={s.banco} maxLength={LIMITES.banco} required />
                </div>
                <div>
                  <label htmlFor="agencia">Agência</label>
                  <input
                    id="agencia"
                    name="agencia"
                    defaultValue={s.agencia}
                    placeholder="0000"
                    inputMode="numeric"
                    maxLength={4}
                    pattern="\d{4}"
                    title="4 dígitos"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="conta">Conta</label>
                  <input
                    id="conta"
                    name="conta"
                    defaultValue={s.conta}
                    placeholder="12345-6"
                    maxLength={14}
                    pattern="\d{1,12}-[\dXx]"
                    title="Número da conta, hífen e dígito (ex.: 12345-6)"
                    required
                  />
                </div>
              </div>
              <button className="btn">{s.status === "CORRIGINDO" ? "Reenviar documentação" : "Enviar para análise"}</button>
            </form>
          ) : (
            <>
              <div className="card">
                <Resumo s={s} />
              </div>
              <div className="card">
                <h2 className="text-xl mb-3 font-semibold">Documentos</h2>
                <Documentos docs={docs} />
              </div>
            </>
          )}
        </div>
        <div className="card self-start">
          <h2 className="text-xl mb-4 font-semibold">Linha do tempo</h2>
          <LinhaDoTempo eventos={eventos} />
        </div>
      </div>
    </>
  );
}
