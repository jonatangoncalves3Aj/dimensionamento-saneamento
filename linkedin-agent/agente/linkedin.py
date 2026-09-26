"""Integração com a API oficial do LinkedIn (OAuth 2.0 + Posts API).

Só usa endpoints oficiais e permitidos para membros:
- Sign In with LinkedIn using OpenID Connect (escopos openid, profile)
- Share on LinkedIn (escopo w_member_social) para publicar em nome do membro

A API não permite editar headline/"Sobre" do perfil pessoal; essas mudanças
são sugeridas pelo agente e aplicadas manualmente por você.
"""

import json
import os
import re
import secrets
import time
import webbrowser
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import parse_qs, urlencode, urlparse

import requests

from . import config

URL_AUTORIZACAO = "https://www.linkedin.com/oauth/v2/authorization"
URL_TOKEN = "https://www.linkedin.com/oauth/v2/accessToken"
URL_USERINFO = "https://api.linkedin.com/v2/userinfo"
URL_POSTS = "https://api.linkedin.com/rest/posts"
ESCOPOS = "openid profile w_member_social"

# Caracteres reservados do "little text format" do LinkedIn. Sem escape, o texto
# do post pode ser truncado (ex.: parênteses). O "#" fica de fora para manter hashtags.
_RESERVADOS = re.compile(r"([\\|{}@\[\]()<>*_~])")


def escapar_texto(texto: str) -> str:
    return _RESERVADOS.sub(r"\\\1", texto)


# ---------- OAuth ----------

def autenticar() -> dict:
    """Fluxo OAuth 3-legged: abre o navegador e recebe o código em localhost."""
    client_id = config.obter("LINKEDIN_CLIENT_ID")
    client_secret = config.obter("LINKEDIN_CLIENT_SECRET")
    redirect_uri = config.obter("LINKEDIN_REDIRECT_URI", "http://localhost:8765/callback")
    estado = secrets.token_urlsafe(16)

    url = URL_AUTORIZACAO + "?" + urlencode({
        "response_type": "code",
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "state": estado,
        "scope": ESCOPOS,
    })

    recebido: dict = {}

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):  # noqa: N802
            params = parse_qs(urlparse(self.path).query)
            recebido.update({k: v[0] for k, v in params.items()})
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write("Autorização recebida. Pode fechar esta aba.".encode("utf-8"))

        def log_message(self, *args):
            pass

    destino = urlparse(redirect_uri)
    servidor = HTTPServer((destino.hostname or "localhost", destino.port or 80), Handler)
    print("Abra este link para autorizar o acesso (se o navegador não abrir sozinho):\n" + url)
    webbrowser.open(url)
    while "code" not in recebido and "error" not in recebido:
        servidor.handle_request()
    servidor.server_close()

    if "error" in recebido:
        raise SystemExit(f"Autorização negada: {recebido.get('error_description', recebido['error'])}")
    if recebido.get("state") != estado:
        raise SystemExit("Parâmetro 'state' inválido — possível tentativa de CSRF. Tente novamente.")

    resp = requests.post(URL_TOKEN, data={
        "grant_type": "authorization_code",
        "code": recebido["code"],
        "redirect_uri": redirect_uri,
        "client_id": client_id,
        "client_secret": client_secret,
    }, timeout=30)
    resp.raise_for_status()
    token = resp.json()
    token["expira_em"] = int(time.time()) + int(token.get("expires_in", 0))

    info = requests.get(URL_USERINFO, headers={"Authorization": f"Bearer {token['access_token']}"}, timeout=30)
    info.raise_for_status()
    token["pessoa_urn"] = f"urn:li:person:{info.json()['sub']}"
    token["nome"] = info.json().get("name", "")

    config.ARQ_TOKENS.write_text(json.dumps(token, indent=2), encoding="utf-8")
    os.chmod(config.ARQ_TOKENS, 0o600)
    return token


def carregar_token() -> dict:
    if not config.ARQ_TOKENS.exists():
        raise SystemExit("Não autenticado. Rode: python -m agente auth")
    token = json.loads(config.ARQ_TOKENS.read_text(encoding="utf-8"))
    if token.get("expira_em", 0) < time.time() + 60:
        raise SystemExit("Token do LinkedIn expirado (validade de ~60 dias). Rode novamente: python -m agente auth")
    return token


# ---------- Publicação ----------

def montar_texto(texto: str, hashtags: list[str]) -> str:
    tags = " ".join("#" + h.lstrip("#").replace(" ", "") for h in hashtags[: config.MAX_HASHTAGS])
    return f"{texto.rstrip()}\n\n{tags}" if tags else texto


def publicar(texto_final: str) -> str:
    """Publica um post de texto no feed do membro. Retorna o URN do post criado."""
    token = carregar_token()
    corpo = {
        "author": token["pessoa_urn"],
        "commentary": escapar_texto(texto_final),
        "visibility": "PUBLIC",
        "distribution": {
            "feedDistribution": "MAIN_FEED",
            "targetEntities": [],
            "thirdPartyDistributionChannels": [],
        },
        "lifecycleState": "PUBLISHED",
        "isReshareDisabledByAuthor": False,
    }
    resp = requests.post(URL_POSTS, json=corpo, timeout=30, headers={
        "Authorization": f"Bearer {token['access_token']}",
        "LinkedIn-Version": os.environ.get("LINKEDIN_API_VERSION", "202608"),
        "X-Restli-Protocol-Version": "2.0.0",
        "Content-Type": "application/json",
    })
    if resp.status_code >= 400:
        raise RuntimeError(f"Erro {resp.status_code} ao publicar no LinkedIn: {resp.text}")
    return resp.headers.get("x-restli-id", "")
