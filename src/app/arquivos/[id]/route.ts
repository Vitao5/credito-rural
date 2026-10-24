import { readFileSync } from "node:fs";
import { join } from "node:path";
import { usuarioAtual } from "@/lib/auth";
import { db, PASTA_UPLOADS, solicitacao, type Documento } from "@/lib/db";

export async function GET(_: Request, { params }: RouteContext<"/arquivos/[id]">) {
  const u = await usuarioAtual();
  const doc = db.prepare("select * from documentos where id = ?").get(Number((await params).id)) as Documento | undefined;
  if (!u || !doc) return new Response("Não encontrado", { status: 404 });
  if (u.papel === "produtor" && solicitacao(doc.solicitacao_id)?.produtor_id !== u.id)
    return new Response("Não encontrado", { status: 404 });
  return new Response(readFileSync(join(PASTA_UPLOADS, String(doc.id))), {
    headers: { "Content-Disposition": `attachment; filename="${encodeURIComponent(doc.nome)}"` },
  });
}
