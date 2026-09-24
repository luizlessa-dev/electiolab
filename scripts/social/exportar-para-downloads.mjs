#!/usr/bin/env node
/**
 * scripts/social/exportar-para-downloads.mjs
 *
 * Copia as peças prontas para uma pasta POR DIA em ~/Downloads, no formato em
 * que elas são efetivamente usadas: abrir a pasta do dia e ter tudo à mão
 * para subir no Meta Business Suite / X / LinkedIn.
 *
 * PADRÃO HERDADO (não inventado aqui):
 *   - Pasta por dia (DD-MM-diadasemana-assunto) e manifesto .exportados.json
 *     que sobrevive a mover a pasta pra um arquivo de "publicadas" — de
 *     scripts/social/exportar-para-downloads.mjs no repo do gastronomizae.
 *   - Legenda separada por rede (legenda-instagram.txt, legenda-x.txt,
 *     legenda-linkedin.txt) e um arquivo de imagem por rede dentro da MESMA
 *     pasta do dia — do padrão em uso no repo do thebrinsider
 *     (~/Downloads/thebrinsider-redes), porque lá, como aqui, o conteúdo é
 *     multi-rede (X + Instagram + LinkedIn), não só Instagram.
 *
 * DIFERENÇA DESTE REPO PRA OS OUTROS DOIS: cada rede pode nascer em um JSON
 * separado (ex.: 24-set-2turno-x.json, 24-set-2turno-instagram.json,
 * 24-set-2turno-linkedin.json), porque o mesmo assunto às vezes tem copy
 * diferente por rede — ao contrário do gastronomizae/thebrinsider, onde um
 * post = um JSON com todas as redes juntas. Por isso este script AGRUPA por
 * "assunto" (nome do arquivo sem o sufixo de rede reconhecido: -x, -instagram,
 * -linkedin) antes de decidir a pasta — ver `assuntoDoArquivo()`.
 *
 * DIFERENÇA EDITORIAL: todo JSON com `precisa_dado_fresco: true` carrega
 * `nota_checagem` explicando o que falta puxar antes de publicar (regra
 * definida em gerar-peca.py e no README deste diretório — número de pesquisa
 * eleitoral nunca é publicado sem checagem contra a fonte primária). O
 * LEIA.txt deste script trisca essas notas explicitamente, uma por rede
 * afetada — os LEIA.txt do gastronomizae/thebrinsider não tem esse bloco
 * porque aqueles produtos não carregam esse tipo de dado sensível.
 *
 * ESTRUTURA GERADA
 *   ~/Downloads/electiolab-instagram/
 *     24-09-qui-2turno/
 *       instagram-post.jpg  instagram-story.jpg  legenda-instagram.txt
 *       x.jpg                                    legenda-x.txt
 *       linkedin.jpg                             legenda-linkedin.txt
 *       LEIA.txt
 *
 * PRÉ-REQUISITO: as imagens já geradas em
 * scripts/social/<campanha>/pecas/<base>-<rede>.jpg — rodar
 * `python3 scripts/social/gerar-peca.py <json> --saida scripts/social/<campanha>/pecas`
 * pra cada peça nova antes de exportar (ou o loop abaixo, adaptado).
 *
 * USO
 *   node scripts/social/exportar-para-downloads.mjs                  # campanha mais recente
 *   node scripts/social/exportar-para-downloads.mjs setembro-2026    # campanha específica
 *   node scripts/social/exportar-para-downloads.mjs --todas          # todas as campanhas
 *   node scripts/social/exportar-para-downloads.mjs --pendentes      # só o que ainda não venceu
 *   node scripts/social/exportar-para-downloads.mjs --forcar --somente=24-set-2turno-x
 */

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const SOCIAL = path.join(RAIZ, 'scripts/social');
const SITE = 'https://electiolab.com';
const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

const DESTINO =
  process.env.ELECTIOLAB_INSTAGRAM_DIR ||
  path.join(homedir(), 'Downloads', 'electiolab-instagram');

const hoje = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());

const args = process.argv.slice(2);
const soPendentes = args.includes('--pendentes');
const forcar = args.includes('--forcar');
const todas = args.includes('--todas');
const somenteArg = args.find((a) => a.startsWith('--somente='));
const somente = somenteArg ? somenteArg.slice('--somente='.length) : null;
const campanhaPedida = args.find((a) => !a.startsWith('--'));

const campanhasDisponiveis = readdirSync(SOCIAL, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^[a-z]+-\d{4}$/.test(d.name))
  .map((d) => d.name)
  .sort();

if (!campanhasDisponiveis.length) {
  console.error(`Nenhuma pasta de campanha em ${SOCIAL} (esperado algo como "setembro-2026").`);
  process.exit(1);
}

let campanhas;
if (todas) {
  campanhas = campanhasDisponiveis;
} else {
  const campanha = campanhaPedida ?? campanhasDisponiveis[campanhasDisponiveis.length - 1];
  if (!campanhasDisponiveis.includes(campanha)) {
    console.error(`Campanha "${campanha}" não existe. Disponíveis: ${campanhasDisponiveis.join(', ')}`);
    process.exit(1);
  }
  campanhas = [campanha];
}

// Mapa rede -> {sufixo do arquivo de peca, nome do arquivo de imagem no destino, nome da legenda no destino}
const REDES = {
  'instagram-post': { pecaSufixo: 'instagram-post', imgDestino: 'instagram-post.jpg', legendaDestino: 'legenda-instagram.txt' },
  'instagram-story': { pecaSufixo: 'instagram-story', imgDestino: 'instagram-story.jpg', legendaDestino: null },
  x: { pecaSufixo: 'x', imgDestino: 'x.jpg', legendaDestino: 'legenda-x.txt' },
  linkedin: { pecaSufixo: 'linkedin', imgDestino: 'linkedin.jpg', legendaDestino: 'legenda-linkedin.txt' },
};

// Sufixos de nome de arquivo que indicam "este JSON e so pra essa rede" -
// usado pra agrupar 24-set-2turno-x.json + 24-set-2turno-instagram.json +
// 24-set-2turno-linkedin.json na mesma pasta "24-set-2turno".
const SUFIXOS_REDE = { '-x': ['x'], '-instagram': ['instagram-post', 'instagram-story'], '-linkedin': ['linkedin'] };

function assuntoDoArquivo(base, plataformas) {
  for (const [sufixo, redesDoSufixo] of Object.entries(SUFIXOS_REDE)) {
    if (base.endsWith(sufixo)) {
      const mesmoConjunto =
        plataformas.length === redesDoSufixo.length && redesDoSufixo.every((r) => plataformas.includes(r));
      if (mesmoConjunto) return base.slice(0, -sufixo.length);
    }
  }
  return base;
}

const manifestPath = path.join(DESTINO, '.exportados.json');
let jaExportadas = new Set();
if (existsSync(manifestPath)) {
  try {
    jaExportadas = new Set(JSON.parse(readFileSync(manifestPath, 'utf8')));
  } catch {
    console.error(`Aviso: ${manifestPath} corrompido ou ilegível — tratando como vazio.`);
  }
}
const salvarManifest = () => writeFileSync(manifestPath, JSON.stringify([...jaExportadas].sort(), null, 2) + '\n');

// grupo (pasta) -> acumulador
const grupos = new Map();
const semPeca = [];
const semData = [];

for (const campanha of campanhas) {
  const dirCampanha = path.join(SOCIAL, campanha);
  const dirPecas = path.join(dirCampanha, 'pecas');

  for (const arquivo of readdirSync(dirCampanha).filter((f) => f.endsWith('.json')).sort()) {
    const base = arquivo.replace(/\.json$/, '');
    if (somente && base !== somente) continue;

    const cfg = JSON.parse(readFileSync(path.join(dirCampanha, arquivo), 'utf8'));
    if (!cfg.publicar_em) {
      semData.push(`${campanha}/${base}`);
      continue;
    }

    // `repetir_em`: a mesma peça (mesma imagem, mesma legenda) republicada em
    // dias adicionais sem virar JSON novo — caso de uma âncora que vale por
    // vários dias (ex.: "virada de chave pro 2º turno", 07 a 10/10). A data
    // principal usa a chave de memória de sempre; cada data extra ganha
    // sufixo `@data` pra ser rastreada e pulada independentemente.
    const datasEfetivas = [
      { data: cfg.publicar_em, chaveMemoria: `${campanha}/${base}` },
      ...(cfg.repetir_em ?? []).map((data) => ({ data, chaveMemoria: `${campanha}/${base}@${data}` })),
    ];

    const plataformas = cfg.plataformas ?? ['instagram-post', 'instagram-story', 'x'];
    const assunto = assuntoDoArquivo(base, plataformas).replace(/^\d{2}-(set|out)-/, '');

    for (const { data, chaveMemoria } of datasEfetivas) {
      if (soPendentes && data < hoje) continue;

      const [, mes, dia] = data.split('-');
      const ddd = DIAS_SEMANA[new Date(`${data}T12:00:00-03:00`).getDay()];
      const nomePasta = `${dia}-${mes}-${ddd}-${assunto}`;

      if (!grupos.has(nomePasta)) {
        grupos.set(nomePasta, { data, url: cfg.url, pecas: [], notas: [] });
      }
      const grupo = grupos.get(nomePasta);

      let faltouPeca = false;
      for (const plataforma of plataformas) {
        const info = REDES[plataforma];
        if (!info) continue;
        const pecaPath = path.join(dirPecas, `${base}-${info.pecaSufixo}.jpg`);
        if (!existsSync(pecaPath)) {
          faltouPeca = true;
          continue;
        }
        grupo.pecas.push({ pecaPath, imgDestino: info.imgDestino, legendaDestino: info.legendaDestino, legenda: cfg.legenda, chaveMemoria });
      }
      if (faltouPeca) semPeca.push(`${data}  ${chaveMemoria}`);
      if (cfg.precisa_dado_fresco && cfg.nota_checagem) {
        grupo.notas.push(`[${plataformas.join('+')}] ${cfg.nota_checagem}`);
      }
      grupo.chaves = [...(grupo.chaves ?? []), chaveMemoria];
    }
  }
}

let exportadas = 0;
const jaExistem = [];

for (const [nomePasta, grupo] of grupos) {
  const todasJaExportadas = grupo.chaves.every((c) => jaExportadas.has(c));
  const pasta = path.join(DESTINO, nomePasta);
  if ((existsSync(pasta) || todasJaExportadas) && !forcar) {
    jaExistem.push(`${grupo.data}  ${nomePasta}`);
    continue;
  }

  mkdirSync(pasta, { recursive: true });
  const legendasEscritas = new Set();
  for (const p of grupo.pecas) {
    cpSync(p.pecaPath, path.join(pasta, p.imgDestino));
    if (p.legendaDestino && p.legenda && !legendasEscritas.has(p.legendaDestino)) {
      writeFileSync(path.join(pasta, p.legendaDestino), p.legenda);
      legendasEscritas.add(p.legendaDestino);
    }
  }

  const linhasChecklist = [];
  if (legendasEscritas.has('legenda-instagram.txt')) linhasChecklist.push('  [ ] instagram-post.jpg no feed, com a legenda de legenda-instagram.txt');
  if (existsSync(path.join(pasta, 'instagram-story.jpg'))) linhasChecklist.push('  [ ] instagram-story.jpg no story, com sticker de link quando fizer sentido');
  if (legendasEscritas.has('legenda-x.txt')) linhasChecklist.push('  [ ] x.jpg no X, com a legenda de legenda-x.txt');
  if (legendasEscritas.has('legenda-linkedin.txt')) linhasChecklist.push('  [ ] linkedin.jpg no LinkedIn, com a legenda de legenda-linkedin.txt (link no 1º comentário, não no corpo)');
  linhasChecklist.push(`  [ ] agendado para ${grupo.data}`);

  const blocoChecagem =
    grupo.notas.length > 0
      ? [
          '',
          'CHECAGEM OBRIGATÓRIA ANTES DE PUBLICAR (precisa_dado_fresco: true)',
          '  Nenhuma dessas peças vai ao ar com [ATUALIZAR] no lugar do número.',
          ...grupo.notas.map((n) => `  - ${n}`),
        ]
      : [];

  writeFileSync(
    path.join(pasta, 'LEIA.txt'),
    [
      `PUBLICAR EM: ${grupo.data}`,
      `LINK:        ${grupo.url ?? SITE}`,
      '',
      'CHECKLIST',
      ...linhasChecklist,
      ...blocoChecagem,
      '',
      'Gerado por scripts/social/exportar-para-downloads.mjs — pode rodar de novo.',
      'A fonte versionada fica no repo; esta pasta é descartável.',
      '',
    ].join('\n'),
  );

  for (const c of grupo.chaves) jaExportadas.add(c);
  salvarManifest();

  const marca = grupo.data < hoje ? 'passou  ' : grupo.data === hoje ? 'HOJE    ' : 'agendada';
  console.log(`  ${marca}  ${grupo.data}  ${nomePasta}${grupo.notas.length ? '  ⚠ checar antes de publicar' : ''}`);
  exportadas += 1;
}

console.log(`\n${exportadas} pasta(s) nova(s) em ${DESTINO}`);
if (jaExistem.length) {
  console.log(`\nJá exportadas antes — ${jaExistem.length} (use --forcar para reexportar):`);
  for (const j of jaExistem) console.log(`  ${j}`);
}
if (semPeca.length) {
  console.log(`\nSem imagem gerada ainda em pecas/ — ${semPeca.length} (rodar gerar-peca.py primeiro):`);
  for (const s of semPeca) console.log(`  ${s}`);
}
if (semData.length) {
  console.log(`\nSem "publicar_em" no JSON, puladas — ${semData.length}:`);
  for (const s of semData) console.log(`  ${s}`);
}
