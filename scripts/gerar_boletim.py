#!/usr/bin/env python3
"""Coleta notícias do dia, classifica com Claude e escreve rascunho do boletim.

Uso:
  python scripts/gerar_boletim.py                    # roda com defaults
  python scripts/gerar_boletim.py --dry-run          # imprime sem gravar
  python scripts/gerar_boletim.py --data-leitura 2026-05-07

Requer variável ANTHROPIC_API_KEY (fallback silencioso sem Claude usa
classificação por keywords, útil para testar sem consumir crédito).

O boletim gerado sai marcado como `draft: true`. Marcelo abre o painel
admin, revisa, adiciona análises e publica (o publish limpa a flag).
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import date, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

import feedparser

TZ = ZoneInfo("America/Sao_Paulo")
UTC = ZoneInfo("UTC")

# ------------------------------------------------------------
# Configuração de fontes
# ------------------------------------------------------------
FONTES = [
    # Nacional — política, economia, mundo
    {"nome": "Folha (Poder)",    "url": "https://feeds.folha.uol.com.br/poder/rss091.xml"},
    {"nome": "Folha (Mercado)",  "url": "https://feeds.folha.uol.com.br/mercado/rss091.xml"},
    {"nome": "Folha (Mundo)",    "url": "https://feeds.folha.uol.com.br/mundo/rss091.xml"},
    {"nome": "Poder360",         "url": "https://www.poder360.com.br/feed/"},
    {"nome": "O Antagonista",    "url": "https://www.oantagonista.com.br/feed/"},
    {"nome": "Gazeta do Povo",   "url": "https://www.gazetadopovo.com.br/feed/"},
    {"nome": "G1 Política",      "url": "https://g1.globo.com/rss/g1/politica/"},
    {"nome": "G1 Mundo",         "url": "https://g1.globo.com/rss/g1/mundo/"},
    {"nome": "G1 Economia",      "url": "https://g1.globo.com/rss/g1/economia/"},
    {"nome": "Agência Brasil",   "url": "https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml"},

    # Oficial — Câmara, Senado
    {"nome": "Agência Câmara",   "url": "https://www2.camara.leg.br/noticias/xml/notiRSS.xml"},
    {"nome": "Agência Senado",   "url": "https://www12.senado.leg.br/noticias/ultima-hora-rss-2"},

    # Regional Noroeste paulista
    {"nome": "Diário da Região", "url": "https://www.diariodaregiao.com.br/rss.xml"},
]

CIDADES_NOROESTE = [
    "São José do Rio Preto", "Rio Preto", "Araçatuba", "Presidente Prudente",
    "Votuporanga", "Birigui", "Catanduva", "Andradina", "Penápolis",
    "Mirassol", "Fernandópolis", "Jales", "Tupã", "Adamantina",
    "Noroeste paulista", "Alta Paulista", "Alta Sorocabana",
]

TERMOS_DE_INTERESSE = [
    # Personagens
    "Tarcísio", "Bolsonaro", "Lula", "Trump", "Milei", "Maduro",
    "Netanyahu",
    # Regiões e conflitos
    "Israel", "Hamas", "Irã", "Gaza", "Venezuela", "Argentina",
    "EUA", "Estados Unidos", "China",
    # Institucional
    "Câmara", "Senado", "ALESP", "STF", "Congresso",
    "Palácio do Planalto", "Bandeirantes",
    # Temas SP
    "Polícia Militar", "PMESP", "segurança pública",
    "SUS Paulista", "hospital",
    # Agro
    "agronegócio", "safra", "soja", "milho", "produtor rural",
    # Economia
    "Selic", "inflação", "PIB", "câmbio",
    # Geo
    "São Paulo", "interior de SP",
] + CIDADES_NOROESTE

SECTION_ORDER = ["noroeste-sp", "estado-sp", "brasil", "america-latina", "mundo", "agenda"]
SECTION_TITLES = {
    "noroeste-sp":     "Cidades do Noroeste do Estado de SP",
    "estado-sp":       "Estado de São Paulo",
    "brasil":          "Política e Economia do Brasil",
    "america-latina":  "América Latina",
    "mundo":           "Mundo",
    "agenda":          "Agenda · Câmara, Senado e ALESP",
}
WEEKDAYS = [
    "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira",
    "sexta-feira", "sábado", "domingo",
]


# ------------------------------------------------------------
# Coleta
# ------------------------------------------------------------
def parse_datetime(entry) -> datetime | None:
    for attr in ("published_parsed", "updated_parsed"):
        t = getattr(entry, attr, None)
        if t:
            return datetime(*t[:6], tzinfo=UTC).astimezone(TZ)
    return None


def coletar(fontes, dia_alvo: date, limite_por_fonte: int = 40) -> list[dict]:
    items = []
    for f in fontes:
        try:
            parsed = feedparser.parse(f["url"])
            aceitos = 0
            for entry in parsed.entries[:limite_por_fonte]:
                pub = parse_datetime(entry)
                if pub is None:
                    # Sem data — inclui e deixa Claude decidir (raro)
                    pass
                elif pub.date() != dia_alvo:
                    continue
                title = getattr(entry, "title", "").strip()
                if not title:
                    continue
                snippet = (getattr(entry, "summary", "") or getattr(entry, "description", ""))[:600]
                items.append({
                    "fonte":         f["nome"],
                    "title":         title,
                    "url":           getattr(entry, "link", ""),
                    "raw_summary":   snippet,
                    "published_at":  pub.isoformat() if pub else None,
                })
                aceitos += 1
            print(f"  {f['nome']}: {aceitos}/{len(parsed.entries)} do dia", file=sys.stderr)
        except Exception as e:
            print(f"  ! {f['nome']}: {e}", file=sys.stderr)
    return items


def filtrar_relevantes(items: list[dict], termos: list[str]) -> list[dict]:
    tl = [t.lower() for t in termos]
    out = []
    for it in items:
        hay = (it["title"] + " " + it["raw_summary"]).lower()
        if any(t in hay for t in tl):
            out.append(it)
    return out


def deduplicar_por_titulo(items: list[dict]) -> list[dict]:
    """Remove títulos quase idênticos (mesma manchete em fontes diferentes)."""
    visto = {}
    out = []
    for it in items:
        chave = it["title"].lower()[:60]
        if chave in visto:
            continue
        visto[chave] = True
        out.append(it)
    return out


# ------------------------------------------------------------
# Classificação com Claude
# ------------------------------------------------------------
CLASSIFY_SYSTEM = """Você é assistente do consultor político Marcelo Suano, que prepara o boletim diário do candidato Danilo Campetti (deputado estadual — SP, aliado de Tarcísio de Freitas e Bolsonaro).

Sua tarefa: classificar cada notícia em UMA seção e sugerir urgência.

Seções permitidas (use exatamente esses IDs):
- noroeste-sp: cidades do Noroeste paulista (São José do Rio Preto, Araçatuba, Presidente Prudente, Votuporanga, Birigui, Catanduva, Andradina, Penápolis, Mirassol, Fernandópolis, Jales, Tupã, Adamantina)
- estado-sp: Estado de São Paulo (política, economia, saúde, segurança, empreendedorismo, agronegócio de SP em geral)
- brasil: política e economia nacional (Câmara, Senado, STF, governo federal, macroeconomia)
- america-latina: América Latina (Argentina, Venezuela, Chile, México etc.)
- mundo: notícias internacionais (foco em Israel e EUA quando relevante)
- agenda: pautas e votações do dia na Câmara, Senado ou ALESP

Urgências:
- high: ruptura política, crise de segurança, ato oficial de grande impacto — Danilo PRECISA saber hoje
- medium: fato relevante, dá para acompanhar
- low: monitorar, contexto

DESCARTAR (não incluir): esportes, entretenimento, novelas, previsão do tempo, obituário, opinião não editorial, click-bait, listas de utilidade pública sem fato político. Se estiver em dúvida entre incluir ou descartar → descartar. Menos é mais.

Para cada item incluído, reescreva o summary em 2-3 linhas FACTUAIS (sem opinião nem paráfrase editorial), destacando O QUE ACONTECEU + POR QUE IMPORTA politicamente para um candidato de direita em SP. Máximo 260 caracteres. Nunca invente detalhes fora do que está no título+summary de entrada.

Responda APENAS com JSON estruturado no formato:
{
  "items": [
    {"i": 0, "section": "brasil", "urgency": "high", "summary": "resumo curto"},
    {"i": 3, "section": "noroeste-sp", "urgency": "medium", "summary": "resumo curto"}
  ]
}

Onde "i" é o índice na lista de entrada. Omita items descartados. Não inclua texto fora do JSON."""


def classificar_com_claude(items: list[dict]) -> dict[str, list[dict]]:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return _fallback_sem_claude(items)

    try:
        import anthropic
    except ImportError:
        print("SDK anthropic não instalado — usando fallback", file=sys.stderr)
        return _fallback_sem_claude(items)

    client = anthropic.Anthropic(api_key=api_key)

    prepared = [
        {"i": idx, "title": it["title"], "source": it["fonte"], "summary": it["raw_summary"][:300]}
        for idx, it in enumerate(items)
    ]

    resp = client.messages.create(
        model=os.environ.get("CLASSIFY_MODEL", "claude-sonnet-5"),
        max_tokens=8000,
        system=CLASSIFY_SYSTEM,
        messages=[{
            "role": "user",
            "content": "Classifique as seguintes notícias:\n\n" + json.dumps(prepared, ensure_ascii=False, indent=1)
        }],
    )

    text = resp.content[0].text.strip()
    if text.startswith("```"):
        # Remove fenced code block if present
        text = text.split("```", 2)[1]
        if text.lstrip().startswith("json"):
            text = text.lstrip()[4:]
        text = text.strip()

    try:
        result = json.loads(text)
    except json.JSONDecodeError as e:
        print(f"! JSON de retorno inválido: {e}", file=sys.stderr)
        print(text[:500], file=sys.stderr)
        return _fallback_sem_claude(items)

    return _agrupar_por_secao(result.get("items", []), items)


def _agrupar_por_secao(classificados: list[dict], items: list[dict]) -> dict[str, list[dict]]:
    sections: dict[str, list[dict]] = {}
    for r in classificados:
        idx = r.get("i")
        if not isinstance(idx, int) or idx < 0 or idx >= len(items):
            continue
        orig = items[idx]
        sec = r.get("section", "brasil")
        if sec not in SECTION_ORDER:
            sec = "brasil"
        sections.setdefault(sec, []).append({
            "urgency":       r.get("urgency", "medium"),
            "headline":      orig["title"],
            "summary":       r.get("summary") or orig["raw_summary"][:260],
            "source":        orig["fonte"],
            "url":           orig["url"],
            "published_at":  orig["published_at"],
        })
    return sections


def _fallback_sem_claude(items: list[dict]) -> dict[str, list[dict]]:
    """Sem Claude: joga tudo em 'brasil' com urgência media, corta em 20."""
    return {"brasil": [{
        "urgency":       "medium",
        "headline":      it["title"],
        "summary":       it["raw_summary"][:260],
        "source":        it["fonte"],
        "url":           it["url"],
        "published_at":  it["published_at"],
    } for it in items[:20]]}


# ------------------------------------------------------------
# Montagem e persistência
# ------------------------------------------------------------
def montar_boletim(sections_dict: dict[str, list[dict]], data_leitura: date) -> dict:
    return {
        "date":             data_leitura.isoformat(),
        "weekday":          WEEKDAYS[data_leitura.weekday()],
        "draft":            True,
        "generated_at":     datetime.now(TZ).isoformat(),
        "headline_overall": "",
        "summary_top3":     [],
        "sections": [
            {
                "id":       sid,
                "title":    SECTION_TITLES[sid],
                "analysis": "",
                "items":    (sections_dict.get(sid) or [])[:6],
            }
            for sid in SECTION_ORDER
        ],
    }


def atualizar_index(boletim: dict, index_path: Path) -> None:
    if index_path.exists():
        idx = json.loads(index_path.read_text(encoding="utf-8"))
    else:
        idx = {"briefings": []}

    total  = sum(len(s["items"]) for s in boletim["sections"])
    urgent = sum(len([i for i in s["items"] if i["urgency"] == "high"]) for s in boletim["sections"])

    entry = {
        "date":         boletim["date"],
        "weekday":      boletim["weekday"],
        "headline":     boletim.get("headline_overall") or "(rascunho — Marcelo revisa)",
        "items_count":  total,
        "urgent_count": urgent,
        "draft":        boletim.get("draft", False),
    }
    remaining = [b for b in idx.get("briefings", []) if b.get("date") != boletim["date"]]
    idx["briefings"] = sorted([entry] + remaining, key=lambda b: b["date"], reverse=True)

    index_path.write_text(json.dumps(idx, ensure_ascii=False, indent=2), encoding="utf-8")


# ------------------------------------------------------------
# CLI
# ------------------------------------------------------------
def main() -> int:
    parser = argparse.ArgumentParser(description="Gerador de rascunho do boletim diário.")
    parser.add_argument("--data-leitura", help="Data de leitura YYYY-MM-DD (padrão: amanhã em SP)")
    parser.add_argument("--data-coleta",  help="Data das notícias YYYY-MM-DD (padrão: hoje em SP)")
    parser.add_argument("--dry-run",      action="store_true", help="Não grava arquivos, apenas imprime")
    parser.add_argument("--out-dir",      default="briefings", help="Pasta de saída")
    args = parser.parse_args()

    hoje = datetime.now(TZ).date()
    amanha = hoje + timedelta(days=1)

    coleta_date  = date.fromisoformat(args.data_coleta)  if args.data_coleta  else hoje
    leitura_date = date.fromisoformat(args.data_leitura) if args.data_leitura else amanha

    print(f"→ Coleta: {coleta_date} · Leitura: {leitura_date}", file=sys.stderr)

    items = coletar(FONTES, coleta_date)
    print(f"→ Total coletado: {len(items)}", file=sys.stderr)

    items = deduplicar_por_titulo(items)
    print(f"→ Após dedup: {len(items)}", file=sys.stderr)

    relevantes = filtrar_relevantes(items, TERMOS_DE_INTERESSE)
    print(f"→ Após filtro por termos: {len(relevantes)}", file=sys.stderr)

    relevantes = relevantes[:60]  # cap para o LLM
    sections_dict = classificar_com_claude(relevantes)

    boletim = montar_boletim(sections_dict, leitura_date)
    total = sum(len(s["items"]) for s in boletim["sections"])
    ativas = len([s for s in boletim["sections"] if s["items"]])
    print(f"→ Boletim: {total} itens em {ativas} seções", file=sys.stderr)

    if args.dry_run:
        print(json.dumps(boletim, ensure_ascii=False, indent=2))
        return 0

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / f"{boletim['date']}.json"
    path.write_text(json.dumps(boletim, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✓ Gravado: {path}")

    atualizar_index(boletim, out_dir / "index.json")
    print("✓ Index atualizado")
    return 0


if __name__ == "__main__":
    sys.exit(main())
