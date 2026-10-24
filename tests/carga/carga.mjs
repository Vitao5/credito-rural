import autocannon from "autocannon";
import { createHmac } from "node:crypto";

const URL_BASE = process.env.URL_BASE ?? "http://localhost:3000";
const SEGREDO = process.env.SESSION_SECRET ?? "troque-este-segredo-em-producao";
const LIMITE_P99_MS = 500;

const cookie = (id) => `sessao=${id}.${createHmac("sha256", SEGREDO).update(String(id)).digest("hex")}`;

const cenarios = [
  { nome: "CT-P01 tela de login", url: "/login" },
  { nome: "CT-P02 lista do produtor", url: "/solicitacoes", headers: { cookie: cookie(1) } },
  { nome: "CT-P03 fila de cadastro", url: "/cadastro", headers: { cookie: cookie(3) } },
  { nome: "CT-P04 acompanhamento do atendente", url: "/atendimento", headers: { cookie: cookie(6) } },
];

let falhou = false;
for (const c of cenarios) {
  const r = await autocannon({ url: URL_BASE + c.url, headers: c.headers, connections: 20, duration: 10 });
  const erros = r.errors + r.timeouts + r.non2xx;
  const ok = erros === 0 && r.latency.p99 <= LIMITE_P99_MS;
  falhou ||= !ok;
  console.log(
    `${ok ? "PASSOU" : "FALHOU"} ${c.nome}: ${Math.round(r.requests.average)} req/s, ` +
      `latência média ${r.latency.average} ms, p99 ${r.latency.p99} ms, erros ${erros}`,
  );
}
process.exit(falhou ? 1 : 0);
