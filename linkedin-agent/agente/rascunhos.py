"""Fila de rascunhos em disco com fluxo de aprovação: pendente → aprovado → publicado."""

import json
import uuid
from datetime import datetime
from pathlib import Path

from . import config

PENDENTE, APROVADO, PUBLICADO, DESCARTADO = "pendente", "aprovado", "publicado", "descartado"


def _caminho(id_: str, pasta: Path) -> Path:
    return pasta / f"{id_}.json"


def salvar(rascunho: dict, pasta: Path = config.DIR_RASCUNHOS) -> dict:
    pasta.mkdir(parents=True, exist_ok=True)
    _caminho(rascunho["id"], pasta).write_text(
        json.dumps(rascunho, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return rascunho


def criar(tema: str, texto: str, hashtags: list[str], formato: str, pasta: Path = config.DIR_RASCUNHOS) -> dict:
    return salvar({
        "id": uuid.uuid4().hex[:8],
        "criado_em": datetime.now().isoformat(timespec="seconds"),
        "tema": tema,
        "formato": formato,
        "texto": texto,
        "hashtags": hashtags,
        "status": PENDENTE,
        "agendado_para": None,
        "publicado_em": None,
        "urn_linkedin": None,
    }, pasta)


def carregar(id_: str, pasta: Path = config.DIR_RASCUNHOS) -> dict:
    caminho = _caminho(id_, pasta)
    if not caminho.exists():
        raise SystemExit(f"Rascunho {id_} não encontrado.")
    return json.loads(caminho.read_text(encoding="utf-8"))


def listar(status: str | None = None, pasta: Path = config.DIR_RASCUNHOS) -> list[dict]:
    if not pasta.exists():
        return []
    itens = [json.loads(p.read_text(encoding="utf-8")) for p in pasta.glob("*.json")]
    if status:
        itens = [r for r in itens if r["status"] == status]
    return sorted(itens, key=lambda r: r["criado_em"])


def validar(rascunho: dict) -> list[str]:
    """Retorna a lista de problemas que impedem a publicação (vazia = ok)."""
    problemas = []
    tamanho = len(rascunho["texto"]) + sum(len(h) + 2 for h in rascunho["hashtags"])
    if not rascunho["texto"].strip():
        problemas.append("texto vazio")
    if tamanho > config.LIMITE_CARACTERES_POST:
        problemas.append(f"texto com {tamanho} caracteres (limite {config.LIMITE_CARACTERES_POST})")
    if len(rascunho["hashtags"]) > config.MAX_HASHTAGS:
        problemas.append(f"{len(rascunho['hashtags'])} hashtags (máximo {config.MAX_HASHTAGS})")
    return problemas


def publicados_hoje(pasta: Path = config.DIR_RASCUNHOS) -> int:
    hoje = datetime.now().date().isoformat()
    return sum(1 for r in listar(PUBLICADO, pasta) if (r["publicado_em"] or "").startswith(hoje))


def prontos_para_publicar(agora: datetime | None = None, pasta: Path = config.DIR_RASCUNHOS) -> list[dict]:
    """Rascunhos aprovados cujo horário agendado já chegou."""
    agora = agora or datetime.now()
    return [
        r for r in listar(APROVADO, pasta)
        if r["agendado_para"] and datetime.fromisoformat(r["agendado_para"]) <= agora
    ]
