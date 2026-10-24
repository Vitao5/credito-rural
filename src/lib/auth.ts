import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, timingSafeEqual } from "node:crypto";
import { usuario, type Usuario } from "./db";
import type { Papel } from "./regras";

const SEGREDO = process.env.SESSION_SECRET ?? "troque-este-segredo-em-producao";

const assinar = (id: string) => `${id}.${createHmac("sha256", SEGREDO).update(id).digest("hex")}`;

export async function iniciarSessao(id: number) {
  (await cookies()).set("sessao", assinar(String(id)), { httpOnly: true, sameSite: "lax", path: "/" });
}

export async function usuarioAtual() {
  const valor = (await cookies()).get("sessao")?.value;
  if (!valor) return null;
  const esperado = assinar(valor.split(".")[0]);
  if (esperado.length !== valor.length || !timingSafeEqual(Buffer.from(esperado), Buffer.from(valor))) return null;
  return usuario(Number(valor.split(".")[0])) ?? null;
}

export async function exigir(...papeis: Papel[]): Promise<Usuario> {
  const u = await usuarioAtual();
  if (!u) redirect("/login");
  if (papeis.length && !papeis.includes(u.papel)) redirect("/");
  return u;
}
