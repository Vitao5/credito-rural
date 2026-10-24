import Link from "next/link";
import { exigir } from "@/lib/auth";
import { naoLidas } from "@/lib/db";
import type { Papel } from "@/lib/regras";
import { sair } from "../actions";

const MENU: Record<Papel, [string, string][]> = {
  produtor: [
    ["/solicitacoes", "Minhas solicitações"],
    ["/solicitacoes/nova", "Nova simulação"],
  ],
  cadastro: [["/cadastro", "Fila de cadastro"]],
  analista: [["/credito", "Análise de crédito"]],
  liberacao: [["/liberacao", "Liberação"]],
  atendente: [["/atendimento", "Acompanhamento"]],
  sistema: [],
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const u = await exigir();
  const pendentes = naoLidas(u.id);
  return (
    <>
      <header className="bg-verde text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-6 px-6 py-3">
          <Link href="/" className="text-lg font-bold">
            Crédito Rural
          </Link>
          <nav className="flex flex-1 gap-4">
            {MENU[u.papel].map(([href, nome]) => (
              <Link key={href} href={href} className="hover:text-ambar">
                {nome}
              </Link>
            ))}
          </nav>
          <Link href="/notificacoes" className="hover:text-ambar">
            Notificações
            {pendentes > 0 && (
              <span className="ml-1 rounded-full bg-ambar px-2 py-0.5 font-bold text-verde">{pendentes}</span>
            )}
          </Link>
          <span className="text-white">{u.nome}</span>
          <form action={sair}>
            <button className="underline hover:text-ambar">Sair</button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </>
  );
}
