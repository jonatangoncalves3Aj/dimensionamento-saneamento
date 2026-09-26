"""Geração de conteúdo com o Claude (saídas estruturadas validadas por Pydantic)."""

import json

import anthropic
from pydantic import BaseModel

from . import config

# Recusas de segurança são reencaminhadas automaticamente para o modelo
# recomendado pela Anthropic, em vez de devolver a recusa.
BETAS = ["server-side-fallback-2026-07-01"]


# ---------- Esquemas de saída ----------

class VariacaoPost(BaseModel):
    formato: str  # ex.: "história", "lista", "dica técnica", "opinião"
    texto: str
    hashtags: list[str]
    justificativa: str


class PostGerado(BaseModel):
    variacoes: list[VariacaoPost]
    sugestao_visual: str
    melhor_horario: str


class AnalisePerfil(BaseModel):
    nota_geral: int
    diagnostico: str
    headlines_sugeridas: list[str]
    sobre_sugerido: str
    competencias_prioritarias: list[str]
    palavras_chave_seo: list[str]
    melhorias: list[str]


class ItemCalendario(BaseModel):
    data: str  # AAAA-MM-DD
    pilar: str
    tema: str
    formato: str
    objetivo: str


class Calendario(BaseModel):
    estrategia: str
    itens: list[ItemCalendario]


class RespostasComentario(BaseModel):
    opcoes: list[str]


# ---------- Cliente ----------

def _system_prompt(perfil: dict) -> str:
    return (
        "Você é um estrategista de marca pessoal e ghostwriter especializado em LinkedIn. "
        "Você trabalha para a pessoa descrita abaixo e escreve sempre na voz dela, em "
        "português do Brasil, a menos que o perfil indique outro idioma.\n\n"
        "Princípios:\n"
        "- Autenticidade acima de viralização: nada de clickbait, promessas exageradas, "
        "números inventados ou histórias que a pessoa não viveu. Se um fato não está no "
        "perfil ou no pedido, não o invente — escreva de forma que não dependa dele.\n"
        "- Precisão técnica: cite normas ou referências apenas quando tiver certeza.\n"
        "- Primeira linha forte (o LinkedIn corta o texto após ~210 caracteres), parágrafos "
        "curtos, uma ideia central por post e um convite à conversa no final.\n"
        f"- Máximo de {config.LIMITE_CARACTERES_POST} caracteres por post e até "
        f"{config.MAX_HASHTAGS} hashtags, relevantes e sem o símbolo # no campo hashtags.\n"
        "- Respeite a lista 'evitar' do perfil.\n\n"
        "Perfil da pessoa (JSON):\n"
        + json.dumps(perfil, ensure_ascii=False, indent=2)
    )


class AgenteIA:
    def __init__(self, perfil: dict, client: anthropic.Anthropic | None = None):
        self.perfil = perfil
        self.client = client or anthropic.Anthropic()
        self.system = _system_prompt(perfil)

    def _gerar(self, pedido: str, formato: type[BaseModel]) -> BaseModel:
        resposta = self.client.beta.messages.parse(
            model=config.modelo_claude(),
            max_tokens=16000,
            betas=BETAS,
            # O perfil é estável entre chamadas: cacheia o system prompt.
            system=[{"type": "text", "text": self.system, "cache_control": {"type": "ephemeral"}}],
            messages=[{"role": "user", "content": pedido}],
            output_format=formato,
            fallbacks="default",
        )
        if resposta.stop_reason == "refusal":
            raise RuntimeError("O modelo recusou o pedido. Reformule o tema e tente novamente.")
        if resposta.stop_reason == "max_tokens" or resposta.parsed_output is None:
            raise RuntimeError("A resposta veio incompleta. Tente novamente com um pedido mais curto.")
        return resposta.parsed_output

    def gerar_post(self, tema: str, contexto: str = "", n_variacoes: int = 3) -> PostGerado:
        pedido = (
            f"Escreva {n_variacoes} variações de post para o LinkedIn, cada uma com um formato "
            f"diferente, sobre o tema: {tema}\n"
        )
        if contexto:
            pedido += f"\nContexto e fatos fornecidos pela pessoa (use apenas estes fatos):\n{contexto}\n"
        pedido += (
            "\nPara cada variação, explique em uma frase por que ela funciona para o público-alvo. "
            "Sugira também um visual (imagem, carrossel ou nenhum) e o melhor dia/horário para publicar."
        )
        return self._gerar(pedido, PostGerado)

    def analisar_perfil(self) -> AnalisePerfil:
        pedido = (
            "Faça uma auditoria do perfil do LinkedIn desta pessoa considerando os objetivos e o "
            "público-alvo. Dê uma nota geral de 0 a 100, um diagnóstico curto, 5 opções de headline "
            "(até 220 caracteres cada), um texto 'Sobre' completo (até 2600 caracteres, com gancho "
            "inicial, prova de experiência e chamada para ação), as 10 competências que devem ficar "
            "em destaque, palavras-chave para a busca do LinkedIn e uma lista priorizada de melhorias "
            "práticas (foto, banner, destaques, recomendações, experiências etc.)."
        )
        return self._gerar(pedido, AnalisePerfil)

    def gerar_calendario(self, data_inicio: str, semanas: int, posts_por_semana: int) -> Calendario:
        pedido = (
            f"Monte um calendário editorial de {semanas} semanas a partir de {data_inicio}, com "
            f"{posts_por_semana} posts por semana, distribuindo os pilares de conteúdo do perfil. "
            "Prefira terças a quintas, evite fins de semana e varie os formatos. Datas no formato "
            "AAAA-MM-DD. Explique a estratégia em um parágrafo."
        )
        return self._gerar(pedido, Calendario)

    def responder_comentario(self, post: str, comentario: str) -> RespostasComentario:
        pedido = (
            "Sugira 3 respostas curtas, cordiais e diferentes entre si para o comentário abaixo, "
            "mantendo a conversa viva (quando fizer sentido, termine com uma pergunta).\n\n"
            f"Post original:\n{post}\n\nComentário recebido:\n{comentario}"
        )
        return self._gerar(pedido, RespostasComentario)
