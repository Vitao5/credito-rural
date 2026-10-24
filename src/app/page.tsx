import { redirect } from "next/navigation";
import { exigir } from "@/lib/auth";

const INICIO: Record<string, string> = {
  produtor: "/solicitacoes",
  cadastro: "/cadastro",
  analista: "/credito",
  liberacao: "/liberacao",
  atendente: "/atendimento",
};

export default async function Inicio() {
  const u = await exigir();
  redirect(INICIO[u.papel]);
}
