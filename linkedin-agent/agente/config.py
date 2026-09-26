"""Carregamento de configuração (.env, perfil.json) e caminhos do projeto."""

import json
import os
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
ARQ_ENV = RAIZ / ".env"
ARQ_PERFIL = RAIZ / "perfil.json"
ARQ_TOKENS = RAIZ / ".tokens.json"
DIR_RASCUNHOS = RAIZ / "rascunhos"
DIR_SAIDAS = RAIZ / "saidas"

# Limites do LinkedIn para o texto de um post.
LIMITE_CARACTERES_POST = 3000
MAX_HASHTAGS = 5


def carregar_env(caminho: Path = ARQ_ENV) -> None:
    """Lê um .env simples (CHAVE=valor) sem sobrescrever variáveis já definidas."""
    if not caminho.exists():
        return
    for linha in caminho.read_text(encoding="utf-8").splitlines():
        linha = linha.strip()
        if not linha or linha.startswith("#") or "=" not in linha:
            continue
        chave, valor = linha.split("=", 1)
        os.environ.setdefault(chave.strip(), valor.strip().strip('"').strip("'"))


def obter(chave: str, padrao: str | None = None) -> str:
    valor = os.environ.get(chave, padrao)
    if valor is None or valor == "":
        raise SystemExit(f"Variável de ambiente ausente: {chave} (veja .env.exemplo)")
    return valor


def modelo_claude() -> str:
    return os.environ.get("CLAUDE_MODEL", "claude-opus-5")


def max_posts_por_dia() -> int:
    return int(os.environ.get("MAX_POSTS_POR_DIA", "1"))


def carregar_perfil(caminho: Path = ARQ_PERFIL) -> dict:
    if not caminho.exists():
        raise SystemExit(
            f"Arquivo {caminho.name} não encontrado. "
            "Copie perfil.exemplo.json para perfil.json e preencha com seus dados."
        )
    return json.loads(caminho.read_text(encoding="utf-8"))
