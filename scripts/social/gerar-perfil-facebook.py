#!/usr/bin/env python3
"""
Gera avatar e capa da Pagina do Facebook do ElectioLab.

PADRAO DEFINIDO EM 2026-09-24, companheiro do gerar-peca.py — reusa as
mesmas cores, fontes e o mesmo selo "E" do site (nao duplica constante
nenhuma, importa direto de gerar-peca.py) pra pagina nao descolar do
visual do produto.

Criar a Pagina em si (nome, categoria, link) e acao que so o dono da
conta Meta pode fazer — isso aqui so gera os 2 arquivos de imagem.
Ver scripts/social/README.md, secao Facebook, pro passo a passo.

USO
    python3 scripts/social/gerar-perfil-facebook.py
    python3 scripts/social/gerar-perfil-facebook.py --saida ~/Downloads
"""

import argparse
import importlib.util
import sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    sys.exit("Falta dependencia. Rode: python3 -m pip install pillow")

# gerar-peca.py tem hifen no nome, entao 'import' normal nao funciona —
# carrega o modulo pelo caminho do arquivo.
_spec = importlib.util.spec_from_file_location(
    "gerar_peca", Path(__file__).resolve().parent / "gerar-peca.py"
)
_gerar_peca = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_gerar_peca)

AZUL = _gerar_peca.AZUL
BG_A = _gerar_peca.BG_A
BORDA = _gerar_peca.BORDA
MUTED = _gerar_peca.MUTED
SUBMUTED = _gerar_peca.SUBMUTED
TEXTO = _gerar_peca.TEXTO
desenhar_fundo = _gerar_peca.desenhar_fundo
preparar_fontes = _gerar_peca.preparar_fontes
tracked = _gerar_peca.tracked

# Facebook recomenda avatar quadrado (upload minimo 320x320, exibe circular)
# e capa 820x312 — o tamanho "seguro" classico que nao corta em desktop nem
# mobile. O proprio editor de capa do Facebook deixa reposicionar na hora
# de publicar, entao nao precisamos acertar o recorte por dispositivo aqui.
AVATAR_LADO = 720
CAPA_W, CAPA_H = 820, 312


def gerar_avatar(fontes):
    """Selo 'E' grande, centralizado, mesmo estilo do canto das OG images
    do site — preenche o quadrado inteiro pra nao sumir miniaturizado."""
    img = desenhar_fundo(AVATAR_LADO, AVATAR_LADO)
    d = ImageDraw.Draw(img)

    lado = round(AVATAR_LADO * 0.62)
    x = (AVATAR_LADO - lado) / 2
    y = (AVATAR_LADO - lado) / 2
    d.rounded_rectangle([x, y, x + lado, y + lado], radius=round(lado * 0.22), fill=AZUL)

    fe = ImageFont.truetype(str(fontes["geist-700"]), round(lado * 0.58))
    bbox = d.textbbox((0, 0), "E", font=fe)
    ex = x + (lado - (bbox[2] - bbox[0])) / 2 - bbox[0]
    ey = y + (lado - (bbox[3] - bbox[1])) / 2 - bbox[1]
    d.text((ex, ey), "E", font=fe, fill=BG_A)

    return img


def gerar_capa(fontes):
    """Wordmark + tagline, mesma composicao das OG images do site, so que
    mais horizontal. Conteudo fica centralizado pra sobreviver ao recorte
    diferente de capa em desktop vs. mobile."""
    img = desenhar_fundo(CAPA_W, CAPA_H)
    d = ImageDraw.Draw(img)

    d.rectangle([0, 0, 8, CAPA_H], fill=AZUL)

    # selo + wordmark, centralizados como bloco
    lado_selo = 56
    f_wordmark = ImageFont.truetype(str(fontes["geist-700"]), 40)
    texto_wordmark = "ELECTIOLAB"
    larg_wordmark = sum(d.textlength(c, font=f_wordmark) + 3 for c in texto_wordmark) - 3
    larg_bloco = lado_selo + 18 + larg_wordmark
    x0 = (CAPA_W - larg_bloco) / 2
    y0 = 64

    d.rounded_rectangle([x0, y0, x0 + lado_selo, y0 + lado_selo], radius=13, fill=AZUL)
    fe = ImageFont.truetype(str(fontes["geist-700"]), 34)
    bbox = d.textbbox((0, 0), "E", font=fe)
    ex = x0 + (lado_selo - (bbox[2] - bbox[0])) / 2 - bbox[0]
    ey = y0 + (lado_selo - (bbox[3] - bbox[1])) / 2 - bbox[1]
    d.text((ex, ey), "E", font=fe, fill=BG_A)
    tracked(d, (x0 + lado_selo + 18, y0 + round(lado_selo * 0.32)), texto_wordmark, f_wordmark, TEXTO, tracking=3)

    # tagline
    f_tagline = ImageFont.truetype(str(fontes["geist-600"]), 26)
    tagline = "A verdade eleitoral está nos dados"
    larg_tag = d.textlength(tagline, font=f_tagline)
    tracked(d, ((CAPA_W - larg_tag) / 2, y0 + lado_selo + 22), tagline, f_tagline, MUTED)

    # linha fina
    f_sub = ImageFont.truetype(str(fontes["geist-400"]), 18)
    sub = "Médias ponderadas · Eleições 2026 · electiolab.com"
    larg_sub = d.textlength(sub, font=f_sub)
    tracked(d, ((CAPA_W - larg_sub) / 2, y0 + lado_selo + 62), sub, f_sub, SUBMUTED)

    d.rectangle([0, CAPA_H - 4, CAPA_W, CAPA_H], fill=BORDA)

    return img


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--saida", default=".", help="Pasta de saida (padrao: diretorio atual)")
    args = ap.parse_args()

    fontes_paths = preparar_fontes()
    fontes = {nome: caminho for nome, caminho in fontes_paths.items()}

    saida = Path(args.saida).expanduser()
    saida.mkdir(parents=True, exist_ok=True)

    avatar = gerar_avatar(fontes)
    caminho_avatar = saida / "electiolab-facebook-avatar.jpg"
    avatar.convert("RGB").save(caminho_avatar, quality=95)
    print(f"  {caminho_avatar}  ({AVATAR_LADO}x{AVATAR_LADO})")

    capa = gerar_capa(fontes)
    caminho_capa = saida / "electiolab-facebook-capa.jpg"
    capa.convert("RGB").save(caminho_capa, quality=95)
    print(f"  {caminho_capa}  ({CAPA_W}x{CAPA_H})")


if __name__ == "__main__":
    main()
