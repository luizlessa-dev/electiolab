#!/usr/bin/env npx tsx
/**
 * Coletor da apuração ao vivo, para rodar no terminal.
 *
 *   npx tsx scripts/apuracao-coletar.ts --ambiente=simulado --uma-vez
 *   npx tsx scripts/apuracao-coletar.ts --ambiente=simulado --loop=60
 *
 * Opções:
 *   --ambiente=simulado|oficial   (padrão: TSE_AMBIENTE do .env.local)
 *   --uma-vez                     um ciclo e sai
 *   --loop=N                      repete a cada N segundos (mede do início de um ciclo
 *                                 ao início do próximo; se o ciclo passar de N, o
 *                                 seguinte começa na hora)
 *   --cargos=1,3,5                códigos de cargo (padrão: onda 1 = 1,3,5)
 *   --onda=1|2                    atalho para os cargos da onda
 *   --sem-ea15                    não baixa o EA15 (economiza ~1 requisição por UF)
 *   --municipios                  carrega a config de municípios (EA12) se faltar
 *   --silencioso                  só o resumo de cada ciclo
 *
 * Ctrl+C: para de pedir arquivos novos, fecha o registro em `apuracao.coletor_execucao`
 * e sai com 0. Um segundo Ctrl+C encerra na hora.
 *
 * A rota da Vercel (`src/app/api/cron/apuracao`) é outra entrada para o mesmo
 * `executarCiclo` — este script não duplica lógica de coleta.
 */

import * as fs from "fs";
import * as path from "path";

// .env.local antes de qualquer import que leia process.env.
const envFile = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envFile)) {
  for (const linha of fs.readFileSync(envFile, "utf-8").split("\n")) {
    const semComentario = linha.trim();
    if (!semComentario || semComentario.startsWith("#")) continue;
    const [chave, ...resto] = semComentario.split("=");
    if (chave && resto.length > 0 && !(chave.trim() in process.env)) {
      process.env[chave.trim()] = resto.join("=").trim();
    }
  }
}

import {
  executarCiclo,
  mensagemDoCiclo,
  ONDA_1,
  ONDA_2,
  type ResultadoCiclo,
} from "../src/lib/apuracao/coletor";
import { dormir } from "../src/lib/apuracao/tse-cliente";
import type { Ambiente } from "../src/lib/apuracao/urls";

interface Argumentos {
  ambiente: Ambiente;
  umaVez: boolean;
  loopSegundos: number | null;
  cargos: number[];
  ea15: boolean;
  municipios: boolean;
  silencioso: boolean;
}

function lerArgumentos(argv: string[]): Argumentos {
  const mapa = new Map<string, string>();
  for (const a of argv) {
    const m = /^--([a-z0-9-]+)(?:=(.*))?$/.exec(a);
    if (!m) throw new Error(`Argumento não reconhecido: ${a}`);
    mapa.set(m[1], m[2] ?? "true");
  }

  const ambienteBruto = mapa.get("ambiente") ?? process.env.TSE_AMBIENTE ?? "simulado";
  if (ambienteBruto !== "simulado" && ambienteBruto !== "oficial") {
    throw new Error(`--ambiente deve ser simulado ou oficial (recebi "${ambienteBruto}")`);
  }

  let cargos = ONDA_1;
  const onda = mapa.get("onda");
  if (onda === "2") cargos = ONDA_2;
  else if (onda && onda !== "1") throw new Error(`--onda deve ser 1 ou 2 (recebi "${onda}")`);
  const cargosBruto = mapa.get("cargos");
  if (cargosBruto) {
    cargos = cargosBruto.split(",").map((c) => {
      const n = Number(c.trim());
      if (!Number.isInteger(n)) throw new Error(`--cargos inválido: "${c}"`);
      return n;
    });
  }

  const loopBruto = mapa.get("loop");
  let loopSegundos: number | null = null;
  if (loopBruto) {
    const n = Number(loopBruto);
    if (!Number.isFinite(n) || n < 5) throw new Error("--loop precisa ser >= 5 (segundos)");
    loopSegundos = n;
  }

  const umaVez = mapa.has("uma-vez");
  if (!umaVez && loopSegundos === null) {
    throw new Error("Escolha --uma-vez ou --loop=N.");
  }
  if (umaVez && loopSegundos !== null) {
    throw new Error("--uma-vez e --loop são mutuamente exclusivos.");
  }

  return {
    ambiente: ambienteBruto,
    umaVez,
    loopSegundos,
    cargos,
    ea15: !mapa.has("sem-ea15"),
    municipios: mapa.has("municipios"),
    silencioso: mapa.has("silencioso"),
  };
}

function agora(): string {
  return new Date().toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function imprimirResumo(r: ResultadoCiclo, ciclo: number): void {
  const c = r.contadores;
  console.log(
    `\n[${agora()}] ciclo ${ciclo} · execucao_id=${r.execucaoId ?? "—"} · ` +
      `${(r.duracaoMs / 1000).toFixed(1)}s`,
  );
  console.log(
    `  requisições ${c.requisicoes} · 200=${c.respostas200} 304=${c.respostas304} ` +
      `404=${c.respostas404} 429=${c.respostas429} 5xx=${c.respostas5xx} erros=${c.erros}` +
      (c.quarentenaEvitada > 0 ? ` · quarentena evitou ${c.quarentenaEvitada}` : "") +
      ` · ${(c.bytes / 1024).toFixed(0)} KB`,
  );
  console.log(`  ${mensagemDoCiclo(r)}`);

  const identidades = r.resumos.filter((x) => x.situacao === "identidade");
  for (const i of identidades) {
    console.error(`  !! identidade falhou em ${i.alvo.url}`);
    for (const f of i.falhas ?? []) {
      console.error(`     ${f.identidade} — esperado ${f.esperado}, obtido ${f.obtido}`);
    }
  }
  for (const e of r.resumos.filter((x) => x.situacao === "erro")) {
    console.error(`  !! erro em ${e.alvo.url}: ${e.mensagem}`);
  }
  if (r.erro) console.error(`  !! ${r.erro}`);
}

async function main(): Promise<void> {
  const args = lerArgumentos(process.argv.slice(2));

  let pararPedido = false;
  let ciclosRodando = 0;
  process.on("SIGINT", () => {
    if (pararPedido) {
      console.error("\nSegundo Ctrl+C — encerrando na hora.");
      process.exit(130);
    }
    pararPedido = true;
    console.error(
      ciclosRodando > 0
        ? "\nCtrl+C — terminando o ciclo em andamento e fechando o log (Ctrl+C de novo força a saída)."
        : "\nCtrl+C — encerrando.",
    );
  });

  console.log(
    `coletor da apuração · ambiente=${args.ambiente} · cargos=${args.cargos.join(",")} · ` +
      `EA15=${args.ea15 ? "sim" : "não"}` +
      (args.loopSegundos ? ` · loop=${args.loopSegundos}s` : " · uma vez"),
  );

  let ciclo = 0;
  let houveFalha = false;

  for (;;) {
    ciclo += 1;
    const inicioCiclo = Date.now();
    ciclosRodando += 1;
    const resultado = await executarCiclo({
      ambiente: args.ambiente,
      cargos: args.cargos,
      ea15: args.ea15,
      municipios: args.municipios,
      aoRegistrar: args.silencioso ? undefined : (l) => console.log(`  ${l}`),
      interromper: () => pararPedido,
    });
    ciclosRodando -= 1;
    imprimirResumo(resultado, ciclo);

    if (resultado.erro || resultado.resumos.some((r) => r.situacao === "identidade")) {
      houveFalha = true;
    }

    if (args.umaVez || pararPedido) break;

    const decorrido = Date.now() - inicioCiclo;
    const esperar = Math.max(0, (args.loopSegundos ?? 60) * 1000 - decorrido);
    if (esperar > 0) {
      // Espera em fatias para o Ctrl+C responder rápido.
      const fim = Date.now() + esperar;
      while (Date.now() < fim && !pararPedido) await dormir(Math.min(250, fim - Date.now()));
    }
    if (pararPedido) break;
  }

  console.log(`\n[${agora()}] fim · ${ciclo} ciclo(s).`);
  process.exit(houveFalha ? 1 : 0);
}

main().catch((e) => {
  console.error(`\nFalhou: ${(e as Error).message}`);
  process.exit(1);
});
