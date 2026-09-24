#!/usr/bin/env python3
"""
Gera as pecas de dado do ElectioLab para Instagram (post 1080x1350 + story
1080x1920), LinkedIn (1080x1080) e X (1600x900) a partir de um unico JSON.

PADRAO DEFINIDO EM 2026-09-23, espelhando o padrao do gastronomizae
(scripts/social/gerar-peca.py e gerar-arte-dados.py naquele repo) — script em
vez de template de Canva, pra letra/cor da peca nunca descolar do produto e
pro credito de fonte nunca sumir. Se a peca precisar de layout diferente,
mude AQUI — uma variante paralela feita a mao mata o padrao na segunda peca.

POR QUE UM SCRIPT E NAO UM TEMPLATE DE CANVA
  - usa a fonte REAL do site (Geist + Geist Mono, a mesma que next/font/google
    serve em electiolab.com), vendorizada em assets/fonts/ porque o site a
    baixa do Google Fonts em build time em vez de guardar em node_modules.
  - usa o gradiente e as cores REAIS do site: o mesmo fundo
    #0b1220 -> #0f172a -> #111827 que já roda nas OG images
    (src/app/opengraph-image.tsx e afins) e o azul de marca #3b82f6.
  - a FONTE DA PESQUISA (instituto, data de campo, margem de erro, protocolo
    TSE quando houver) e GRAVADA na imagem, nao so na legenda — legenda some
    quando alguem reposta ou faz print, a fonte da pesquisa nao pode sumir.
    Campo obrigatorio: sem ele o script recusa gerar a peca.
  - respeita a area segura do story do Instagram (~200px de baixo, onde fica
    a barra de resposta e o sticker de link).

REGRA EDITORIAL, NAO NEGOCIAVEL: conteudo eleitoral pede neutralidade. Nunca
ilustre com opiniao sobre candidato, sempre cite instituto + data de campo +
margem de erro (quando disponivel), e NUNCA publique numero de pesquisa sem
checagem humana contra a fonte primaria (ver README.md).

USO
    python3 scripts/social/gerar-peca.py scripts/social/exemplos/lancamento.json
    python3 scripts/social/gerar-peca.py minha-peca.json --saida ~/Downloads
    python3 scripts/social/gerar-peca.py minha-peca.json --plataformas x,linkedin

DEPENDENCIAS
    python3 -m pip install pillow
"""

import argparse, json, math, sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    sys.exit("Falta dependencia. Rode: python3 -m pip install pillow")

FONTES_DIR = Path(__file__).resolve().parent / "assets" / "fonts"

# Cores REAIS do site (src/app/globals.css modo escuro + src/app/opengraph-image.tsx).
# ElectioLab usa o visual "Bloomberg Terminal" do dark mode como identidade de
# dado — e o que as OG images do proprio site ja usam pra cartao de numero.
BG_A, BG_B, BG_C = (11, 18, 32), (15, 23, 42), (17, 24, 39)   # #0b1220 #0f172a #111827
TEXTO, MUTED, SUBMUTED = (249, 250, 251), (203, 213, 225), (148, 163, 184)  # #f9fafb #cbd5e1 #94a3b8
AZUL = (59, 130, 246)         # #3b82f6 — accent/marca
POSITIVO, NEGATIVO, ALERTA = (34, 197, 94), (239, 68, 68), (245, 158, 11)  # tokens --positive/--negative/--warning (dark)
BORDA = (30, 45, 71)          # #1e2d47 — --border (dark)


def mix(a, b, t):
    return tuple(round(a[i] * (1 - t) + b[i] * t) for i in range(3))


def desenhar_fundo(W, H):
    """Gradiente diagonal 135deg #0b1220 -> #0f172a -> #111827, igual ao
    `linear-gradient(135deg,#0b1220 0%,#0f172a 60%,#111827 100%)` usado nas
    OG images do site. Renderizado numa grade pequena e escalado — um loop
    pixel a pixel em Python puro seria lento demais em 1600x900."""
    N = 64
    small = Image.new("RGB", (N, N))
    px = small.load()
    for y in range(N):
        for x in range(N):
            t = ((x / (N - 1)) + (y / (N - 1))) / 2  # aproxima 135deg
            cor = mix(BG_A, BG_B, min(t / 0.6, 1)) if t <= 0.6 else mix(BG_B, BG_C, (t - 0.6) / 0.4)
            px[x, y] = cor
    return small.resize((W, H), Image.BILINEAR)


FONTES = {
    "geist-400": FONTES_DIR / "Geist-400.ttf",
    "geist-600": FONTES_DIR / "Geist-600.ttf",
    "geist-700": FONTES_DIR / "Geist-700.ttf",
    "mono-400":  FONTES_DIR / "GeistMono-400.ttf",
    "mono-600":  FONTES_DIR / "GeistMono-600.ttf",
}

def preparar_fontes():
    for nome, caminho in FONTES.items():
        if not caminho.exists():
            sys.exit(
                f"Fonte nao encontrada: {caminho}\n"
                f"Rode o download uma vez (ver README.md, secao Fontes) — "
                f"os TTFs de Geist/Geist Mono ficam vendorizados em "
                f"scripts/social/assets/fonts/ porque o site os baixa do "
                f"Google Fonts em build time, sem guardar em node_modules."
            )
    return FONTES


def tracked(d, xy, txt, font, fill, tracking=0, alinhar_direita=False, alinhar_centro=False, larg_centro=0):
    x, y = xy
    largura_total = sum(d.textlength(c, font=font) + tracking for c in txt) - tracking if txt else 0
    if alinhar_direita:
        x -= largura_total
    elif alinhar_centro:
        x += (larg_centro - largura_total) / 2
    for c in txt:
        d.text((x, y), c, font=font, fill=fill)
        x += d.textlength(c, font=font) + tracking
    return largura_total


def quebrar(d, txt, font, larg):
    linhas, atual = [], ""
    for p in txt.split():
        teste = (atual + " " + p).strip()
        if d.textlength(teste, font=font) <= larg:
            atual = teste
        else:
            if atual:
                linhas.append(atual)
            atual = p
    if atual:
        linhas.append(atual)
    return linhas


def ajustar_titulo(d, txt, fonte_path, larg, tam_base, piso=48):
    tam = tam_base
    while tam >= piso:
        f = ImageFont.truetype(str(fonte_path), tam)
        if d.textlength(txt, font=f) <= larg:
            return f, [txt]
        tam -= 4
    tam = int(tam_base * 0.62)
    f = ImageFont.truetype(str(fonte_path), max(tam, piso - 8))
    return f, quebrar(d, txt, f, larg)


def logo(d, x, y, escala, fontes):
    """Selo 'E' azul + wordmark ELECTIOLAB, igual ao canto superior das OG
    images do site (src/app/opengraph-image.tsx)."""
    lado = round(40 * escala)
    d.rounded_rectangle([x, y, x + lado, y + lado], radius=round(9 * escala), fill=AZUL)
    fe = ImageFont.truetype(str(fontes["geist-700"]), round(24 * escala))
    bbox = d.textbbox((0, 0), "E", font=fe)
    ex = x + (lado - (bbox[2] - bbox[0])) / 2
    ey = y + (lado - (bbox[3] - bbox[1])) / 2 - bbox[1]
    d.text((ex, ey), "E", font=fe, fill=BG_A)
    fw = ImageFont.truetype(str(fontes["geist-700"]), round(21 * escala))
    tracked(d, (x + lado + round(14 * escala), y + round(9 * escala)), "ELECTIOLAB", fw, SUBMUTED, tracking=round(2.5 * escala))


# Especificacao por plataforma. `M` = margem, `base_y` = onde o bloco de
# conteudo comeca (depois do cabecalho de logo), `titulo_base` = tamanho de
# fonte de partida do titulo grande, `mostrar_campos` = se cabe o bloco de
# servico (instituto/campo/amostra) alem da fonte, `story` = reserva a area
# segura do Instagram no rodape.
# `footer_reserva` = altura reservada no rodape para linha divisoria + fonte
# (ate 2 linhas) + "electiolab.com" — tem que sobrar espaco pros dois, senao
# o rodape vaza pra fora da imagem.
PLATAFORMAS = {
    "instagram-post":  dict(W=1080, H=1350, M=72,  base_y=300, titulo_base=118, mostrar_campos=True,  story=False, escala=1.0,  footer_reserva=190),
    "instagram-story": dict(W=1080, H=1920, M=72,  base_y=660, titulo_base=118, mostrar_campos=True,  story=True,  escala=1.0,  footer_reserva=320),
    "linkedin":        dict(W=1080, H=1080, M=72,  base_y=250, titulo_base=104, mostrar_campos=True,  story=False, escala=1.0,  footer_reserva=190),
    "x":               dict(W=1600, H=900,  M=96,  base_y=200, titulo_base=104, mostrar_campos=False, story=False, escala=1.15, footer_reserva=210),
}


def montar(cfg, fontes, spec):
    W, H, M, escala = spec["W"], spec["H"], spec["M"], spec["escala"]
    larg = W - M * 2
    img = desenhar_fundo(W, H)
    d = ImageDraw.Draw(img)

    # faixa lateral azul, igual as OG images do site
    d.rectangle([0, 0, round(10 * escala), H], fill=AZUL)

    logo(d, M, M - round(6 * escala), escala, fontes)

    y = spec["base_y"]

    # eyebrow
    f_eyebrow = ImageFont.truetype(str(fontes["geist-700"]), round(28 * escala))
    tracked(d, (M, y), cfg["eyebrow"].upper(), f_eyebrow, AZUL, tracking=round(3.5 * escala))
    y += round(52 * escala)

    modo = cfg.get("modo", "comparacao")

    if modo == "numero":
        numeros = cfg["numeros"]
        n = len(numeros)
        gap = round(48 * escala)
        larg_col = (larg - gap * (n - 1)) // n
        f_num = None
        tam = round(spec["titulo_base"] * escala)
        while tam > 56:
            f_num = ImageFont.truetype(str(fontes["geist-700"]), tam)
            if all(d.textlength(str(it[1]), font=f_num) <= larg_col * 0.94 for it in numeros):
                break
            tam -= 4
        f_rot = ImageFont.truetype(str(fontes["geist-600"]), round(20 * escala))
        f_desc = ImageFont.truetype(str(fontes["geist-400"]), round(23 * escala))
        topo = y
        base_col = y
        alt_num = max(d.textbbox((0, 0), str(it[1]), font=f_num)[3] for it in numeros)
        for i, item in enumerate(numeros):
            rotulo, valor, desc = (list(item) + ["", "", ""])[:3]
            x = M + i * (larg_col + gap)
            cy = topo
            if rotulo:
                tracked(d, (x, cy), rotulo.upper(), f_rot, SUBMUTED, tracking=round(2 * escala))
                cy += round(30 * escala)
            d.text((x, cy), str(valor), font=f_num, fill=TEXTO)
            cy += alt_num + round(18 * escala)
            for linha in str(desc).split("\n"):
                for sub in quebrar(d, linha, f_desc, larg_col):
                    d.text((x, cy), sub, font=f_desc, fill=MUTED)
                    cy += round(30 * escala)
            base_col = max(base_col, cy)
        y = base_col + round(20 * escala)
    elif modo == "contagem":
        ftit, linhas_tit = ajustar_titulo(d, cfg["titulo"], fontes["geist-700"], larg, round(spec["titulo_base"] * 1.55 * escala))
        for ln in linhas_tit:
            d.text((M, y), ln, font=ftit, fill=TEXTO)
            y += ftit.size + round(10 * escala)
        y += round(18 * escala)
    elif modo == "citacao":
        f_aspas = ImageFont.truetype(str(fontes["geist-700"]), round(80 * escala))
        d.text((M - round(6 * escala), y - round(28 * escala)), "“", font=f_aspas, fill=AZUL)
        y += round(46 * escala)
        ftit, linhas_tit = ajustar_titulo(d, cfg["titulo"], fontes["geist-600"], larg, round(48 * escala), piso=32)
        # citacao sempre quebra em varias linhas (nao reduz pra caber numa so)
        f_cit = ImageFont.truetype(str(fontes["geist-600"]), round(46 * escala))
        for linha in quebrar(d, cfg["titulo"], f_cit, larg):
            d.text((M, y), linha, font=f_cit, fill=TEXTO)
            y += round(58 * escala)
        y += round(14 * escala)
    else:  # "comparacao" — numero grande centralizado, o padrao do post de lancamento
        ftit, linhas_tit = ajustar_titulo(d, cfg["titulo"], fontes["geist-700"], larg, round(spec["titulo_base"] * escala))
        for ln in linhas_tit:
            d.text((M, y), ln, font=ftit, fill=TEXTO)
            y += ftit.size + round(10 * escala)
        y += round(16 * escala)

    # linha fina — frase de contexto
    if cfg.get("linha_fina"):
        f_lf = ImageFont.truetype(str(fontes["geist-400"]), round(34 * escala))
        for ln in quebrar(d, cfg["linha_fina"], f_lf, larg):
            d.text((M, y), ln, font=f_lf, fill=MUTED)
            y += round(46 * escala)
        y += round(20 * escala)

    # bloco de servico (instituto, campo, amostra, margem) — so quando cabe
    if spec["mostrar_campos"] and cfg.get("campos"):
        d.line([(M, y), (M + round(90 * escala), y)], fill=AZUL, width=round(3 * escala))
        y += round(30 * escala)
        f_rot = ImageFont.truetype(str(fontes["mono-600"]), round(24 * escala))
        f_val = ImageFont.truetype(str(fontes["geist-400"]), round(24 * escala))
        for rot, val in cfg["campos"]:
            d.text((M, y), rot, font=f_rot, fill=SUBMUTED)
            d.text((M + d.textlength(rot, font=f_rot) + round(14 * escala), y), str(val), font=f_val, fill=MUTED)
            y += round(38 * escala)

    limite_rodape = H - spec["footer_reserva"]
    if y > limite_rodape:
        print(f"  aviso: o conteudo encostou no rodape ({y}px, limite {limite_rodape}px) "
              f"na plataforma {spec.get('_nome','?')}. Encurte a linha-fina ou tire um campo.",
              file=sys.stderr)

    # rodape: fonte da pesquisa (obrigatoria) + electiolab.com
    ry = H - spec["footer_reserva"]
    d.line([(M, ry), (W - M, ry)], fill=BORDA, width=1)
    ry += round(18 * escala)
    f_fonte = ImageFont.truetype(str(fontes["mono-400"]), round(20 * escala))
    for linha in quebrar(d, cfg["fonte"], f_fonte, larg):
        d.text((M, ry), linha, font=f_fonte, fill=SUBMUTED)
        ry += round(28 * escala)
    ry += round(8 * escala)
    tracked(d, (M, ry), "ELECTIOLAB.COM", ImageFont.truetype(str(fontes["geist-600"]), round(20 * escala)), AZUL, tracking=round(2 * escala))

    return img


def main():
    ap = argparse.ArgumentParser(description="Gera pecas de dado do ElectioLab (Instagram, LinkedIn, X).")
    ap.add_argument("config", help="JSON com eyebrow, titulo, linha_fina, fonte, etc.")
    ap.add_argument("--saida", default=".", help="diretorio de saida (padrao: atual)")
    ap.add_argument("--plataformas", default=None,
                     help="lista separada por virgula (instagram-post,instagram-story,linkedin,x). Padrao: as do JSON ou todas.")
    a = ap.parse_args()

    cfg = json.loads(Path(a.config).read_text(encoding="utf-8"))
    modo = cfg.get("modo", "comparacao")
    obrigatorios = ["eyebrow", "fonte"] + (["numeros"] if modo == "numero" else ["titulo"])
    for campo in obrigatorios:
        if not cfg.get(campo):
            sys.exit(f"Campo obrigatorio ausente no JSON (modo={modo}): {campo}")
    if not cfg.get("linha_fina") and modo != "citacao":
        print("  aviso: sem `linha_fina` — a peca fica só com número e fonte, sem contexto.", file=sys.stderr)

    if a.plataformas:
        alvo = [p.strip() for p in a.plataformas.split(",")]
    else:
        alvo = cfg.get("plataformas") or list(PLATAFORMAS.keys())
    for p in alvo:
        if p not in PLATAFORMAS:
            sys.exit(f"Plataforma desconhecida: {p}. Opcoes: {', '.join(PLATAFORMAS)}")

    fontes = preparar_fontes()
    base = cfg.get("saida", Path(a.config).stem)
    dst = Path(a.saida).expanduser()
    dst.mkdir(parents=True, exist_ok=True)

    for nome in alvo:
        spec = dict(PLATAFORMAS[nome]); spec["_nome"] = nome
        p = dst / f"{base}-{nome}.jpg"
        montar(cfg, fontes, spec).save(p, quality=92, subsampling=0)
        print(f"  {p}  ({spec['W']}x{spec['H']})")


if __name__ == "__main__":
    main()
