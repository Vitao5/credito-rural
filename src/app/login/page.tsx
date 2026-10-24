import Link from "next/link";
import { LIMITES } from "@/lib/regras";
import { entrar } from "../actions";
import { Erro } from "../ui";

const DEMO = [
  ["Produtor", "produtor@credito.rural"],
  ["Cadastro", "cadastro@credito.rural"],
  ["Analista", "analista@credito.rural"],
  ["Liberação", "liberacao@credito.rural"],
  ["Atendente", "atendente@credito.rural"],
];

export default async function Login({ searchParams }: PageProps<"/login">) {
  const { erro, email } = await searchParams;
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="hidden flex-col justify-center bg-verde p-16 text-white lg:flex">
        <h1 className="text-6xl font-bold">Crédito Rural</h1>
        <p className="mt-6 max-w-lg text-2xl text-white">
          Solicite, acompanhe e receba seu crédito de custeio, investimento ou comercialização sem sair da propriedade.
        </p>
        <p className="mt-10 text-lg font-semibold tracking-wide text-ambar">
          SIMULAR - ANEXAR - CADASTRO - SISTEMA - ANALISTA - LIBERAÇÃO
        </p>
      </section>
      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <h2 className="mb-2 text-4xl font-bold text-verde">Entrar</h2>
          <p className="mb-6 text-lg">Acesse com seu e-mail e senha.</p>
          {erro && <Erro>E-mail ou senha incorretos.</Erro>}
          <form key={String(email)} action={entrar} className="space-y-4">
            <div>
              <label htmlFor="email" className="text-lg">E-mail</label>
              <input
                id="email"
                className="py-3 text-lg"
                name="email"
                type="email"
                maxLength={LIMITES.email}
                defaultValue={typeof email === "string" ? email : ""}
                required
              />
            </div>
            <div>
              <label htmlFor="senha" className="text-lg">Senha</label>
              <input
                id="senha"
                className="py-3 text-lg"
                name="senha"
                type="password"
                minLength={6}
                maxLength={LIMITES.senha}
                autoFocus={typeof email === "string"}
                required
              />
            </div>
            <button className="btn w-full py-3 text-lg">Entrar</button>
          </form>
          <p className="mb-3 mt-8 font-semibold">
            Perfis de demonstração (senha 123456)
          </p>
          <div className="flex flex-wrap gap-2">
            {DEMO.map(([papel, endereco]) => (
              <Link key={endereco} href={`/login?email=${endereco}`} className="btn-sec">
                {papel}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
