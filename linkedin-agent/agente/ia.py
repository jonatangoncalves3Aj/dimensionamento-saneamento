"""Geração de conteúdo com o Claude (saídas estruturadas validadas por Pydantic).

Os comandos estratégicos seguem cinco frameworks adaptados para o LinkedIn:
diagnóstico, posicionamento, central de conteúdo, cirurgião de ganchos e roteiro.
"""

import json
from typing import Literal

import anthropic
from pydantic import BaseModel

from . import config

# Recusas de segurança são reencaminhadas automaticamente para o modelo
# recomendado pela Anthropic, em vez de devolver a recusa.
BETAS = ["server-side-fallback-2026-07-01"]

# Funil do LinkedIn usado no diagnóstico.
FUNIL = "CONTEÚDO > VISITA AO PERFIL > CONEXÃO/SEGUIDOR > CONVERSA (DM) > OPORTUNIDADE"


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


# Prompt 1 — Diagnóstico
class Achado(BaseModel):
    area: str
    prioridade: Literal["CRÍTICO", "ALTO IMPACTO", "OTIMIZAÇÃO", "IGNORAR POR ENQUANTO"]
    problema: str
    impacto: str
    evidencia: str
    correcao: str


class Vazamento(BaseModel):
    etapa: str  # ex.: "CONTEÚDO > VISITA AO PERFIL"
    problema: str
    correcao: str


class Diagnostico(BaseModel):
    nota_geral: int
    resumo: str
    achados: list[Achado]
    vazamentos: list[Vazamento]
    headlines_sugeridas: list[str]
    sobre_sugerido: str
    competencias_prioritarias: list[str]
    palavras_chave_seo: list[str]
    plano_7_dias: list[str]
    mudanca_de_maior_impacto: str


# Prompt 2 — Posicionamento
class MensagemSaturada(BaseModel):
    mensagem: str
    por_que_te_iguala: str


class Territorio(BaseModel):
    nome: str
    formula: str  # PÚBLICO + PROBLEMA + RESULTADO + MECANISMO + PONTO DE VISTA
    clareza: int
    diferenciacao: int
    autoridade: int
    memorabilidade: int
    potencial_comercial: int

    @property
    def total(self) -> int:
        return self.clareza + self.diferenciacao + self.autoridade + self.memorabilidade + self.potencial_comercial


class Posicionamento(BaseModel):
    mensagens_saturadas: list[MensagemSaturada]
    territorios: list[Territorio]
    territorio_escolhido: str
    justificativa: str
    frase_posicionamento: str
    promessa_central: str
    headline: str
    sobre: str
    cta_perfil: str
    posts_em_destaque: list[str]
    ideias_de_reforco: list[str]
    teste_sem_nome: str


# Prompt 3 — Central de conteúdo
class Proporcao(BaseModel):
    alcance: int
    autoridade: int
    relacionamento: int
    conversao: int
    justificativa: str


class ItemCalendario(BaseModel):
    data: str  # AAAA-MM-DD
    funcao: Literal["ALCANCE", "AUTORIDADE", "RELACIONAMENTO", "CONVERSÃO"]
    pilar: str
    tema: str
    angulo: str
    gancho: str
    formato: str
    motor: str  # dor, desejo, erro, segredo, comparação, prova, bastidor...
    promessa: str
    retencao: str
    cta: str
    metrica: str


class Calendario(BaseModel):
    estrategia: str
    proporcao: Proporcao
    itens: list[ItemCalendario]
    maior_potencial_alcance: list[str]
    maior_potencial_seguidores: list[str]
    maior_potencial_conversao: list[str]


# Prompt 4 — Cirurgião de ganchos
class Gancho(BaseModel):
    texto: str
    mecanismo: str
    clareza: int
    curiosidade: int
    relevancia: int
    interrupcao_de_padrao: int
    forca_da_promessa: int

    @property
    def total(self) -> int:
        return self.clareza + self.curiosidade + self.relevancia + self.interrupcao_de_padrao + self.forca_da_promessa


class GanchoVencedor(BaseModel):
    gancho: str
    versao_curta: str
    versao_ousada: str
    texto_visual: str
    primeira_frase_depois: str
    promessa_a_entregar: str


class Ganchos(BaseModel):
    ganchos: list[Gancho]
    vencedores: list[GanchoVencedor]
    campeao: str
    por_que_campeao: str


# Prompt 5 — Roteiro
class Bloco(BaseModel):
    etapa: Literal["GANCHO", "TENSÃO", "PRIMEIRA ENTREGA", "NOVA CURIOSIDADE", "PROVA", "VIRADA", "PAYOFF", "CTA"]
    o_que_dizer_ou_mostrar: str
    informacao_nova: str
    pergunta_aberta: str
    por_que_avancar: str


class Slide(BaseModel):
    numero: int
    headline: str
    conteudo: str
    funcao: str
    gancho_para_o_proximo: str


class Cena(BaseModel):
    tempo: str  # ex.: "0:00–0:03"
    fala: str
    texto_na_tela: str
    acao_visual: str
    quebra_de_padrao: str


class Roteiro(BaseModel):
    blocos: list[Bloco]
    slides: list[Slide]
    cenas: list[Cena]
    versao_final_enxuta: str
    versao_mais_direta: str
    hashtags: list[str]


class RespostasComentario(BaseModel):
    opcoes: list[str]


# ---------- Cliente ----------

def _system_prompt(perfil: dict) -> str:
    return (
        "Você é um estrategista de marca pessoal e ghostwriter especializado em LinkedIn, com "
        "a exigência de quem é pago como consultor sênior: decisões claras, priorizadas e "
        "justificadas. Você trabalha para a pessoa descrita abaixo e escreve sempre na voz dela, "
        "em português do Brasil, a menos que o perfil indique outro idioma.\n\n"
        "Princípios:\n"
        "- Nada vago. Proibido 'poste mais', 'melhore sua headline', 'gere valor'. Diga exatamente "
        "o que mudar, como mudar e por que importa.\n"
        "- Autenticidade acima de viralização: nada de clickbait, promessas exageradas, números "
        "inventados ou histórias que a pessoa não viveu. Se um fato não está no perfil ou no "
        "pedido, não o invente — escreva de forma que não dependa dele.\n"
        "- Sem curiosidade vazia: todo gancho precisa ser pago pelo conteúdo. Se o payoff não "
        "justifica o gancho, reescreva.\n"
        "- Precisão técnica: cite normas ou referências apenas quando tiver certeza.\n"
        "- LinkedIn: a primeira linha decide tudo (o texto é cortado após ~210 caracteres), "
        "parágrafos curtos, uma ideia central por post e um convite à conversa no final. "
        "Formatos nativos: texto, carrossel em PDF (documento), vídeo, imagem, enquete e artigo.\n"
        f"- Máximo de {config.LIMITE_CARACTERES_POST} caracteres por post e até "
        f"{config.MAX_HASHTAGS} hashtags, relevantes e sem o símbolo # no campo hashtags.\n"
        "- Notas de avaliação vão de 0 a 10.\n"
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
        # Streaming: as respostas estratégicas são longas e não devem estourar o timeout HTTP.
        with self.client.beta.messages.stream(
            model=config.modelo_claude(),
            max_tokens=64000,
            betas=BETAS,
            fallbacks="default",
            # O perfil é estável entre chamadas: cacheia o system prompt.
            system=[{"type": "text", "text": self.system, "cache_control": {"type": "ephemeral"}}],
            messages=[{"role": "user", "content": pedido}],
            output_format=formato,
        ) as stream:
            resposta = stream.get_final_message()
        if resposta.stop_reason == "refusal":
            raise RuntimeError("O modelo recusou o pedido. Reformule o tema e tente novamente.")
        if resposta.stop_reason == "max_tokens" or resposta.parsed_output is None:
            raise RuntimeError("A resposta veio incompleta. Tente novamente com um pedido mais curto.")
        return resposta.parsed_output

    def gerar_post(self, tema: str, contexto: str = "", n_variacoes: int = 3, gancho: str = "") -> PostGerado:
        pedido = (
            f"Escreva {n_variacoes} variações de post para o LinkedIn, cada uma com um formato "
            f"diferente, sobre o tema: {tema}\n"
        )
        if gancho:
            pedido += f"\nAbra todas as variações com este gancho (pode ajustar levemente): {gancho}\n"
        if contexto:
            pedido += f"\nContexto e fatos fornecidos pela pessoa (use apenas estes fatos):\n{contexto}\n"
        pedido += (
            "\nPara cada variação, explique em uma frase por que ela funciona para o público-alvo. "
            "Sugira também um visual (imagem, carrossel ou nenhum) e o melhor dia/horário para publicar."
        )
        return self._gerar(pedido, PostGerado)

    def diagnosticar(self) -> Diagnostico:
        pedido = (
            "# TAREFA\n"
            "Analise meu LinkedIn como se uma empresa estivesse pagando caro por esta consultoria. "
            "Use os dados do perfil, inclusive as métricas, se houver.\n"
            "Audite: POSICIONAMENTO, HEADLINE, FOTO/BANNER, SOBRE, DESTAQUES (Featured), EXPERIÊNCIAS, "
            "COMPETÊNCIAS/SEO, CONTEÚDO, GANCHOS, FORMATOS, CTAs, FUNIL e OFERTA. Para cada área, "
            "entregue problema encontrado, impacto provável, evidência, correção específica e prioridade.\n"
            f"Depois identifique os 5 maiores vazamentos no funil {FUNIL}.\n\n"
            "# SAÍDA\n"
            "Classifique cada achado como CRÍTICO, ALTO IMPACTO, OTIMIZAÇÃO ou IGNORAR POR ENQUANTO. "
            "Dê uma nota geral de 0 a 100. Inclua 5 opções de headline (até 220 caracteres), um 'Sobre' "
            "completo (até 2600 caracteres), as 10 competências que devem ficar em destaque e "
            "palavras-chave para a busca do LinkedIn. Termine com as 3 mudanças que eu executaria "
            "primeiro nos próximos 7 dias e a única mudança com maior potencial de impacto.\n\n"
            "# REGRA\nSe faltar um dado (ex.: métricas), diga qual dado falta e como coletá-lo, "
            "em vez de supor."
        )
        return self._gerar(pedido, Diagnostico)

    def posicionar(self) -> Posicionamento:
        pedido = (
            "# MISSÃO\n"
            "Reconstrua meu posicionamento no LinkedIn para que um recrutador, cliente ou colega que "
            "não me conhece entenda em segundos por que deveria me seguir e por que minha oferta é diferente.\n\n"
            "# ETAPA 1\nListe as 10 mensagens mais saturadas do meu nicho no LinkedIn e explique quais "
            "palavras, promessas e formatos me fariam parecer igual aos outros.\n\n"
            "# ETAPA 2\nCrie 7 territórios possíveis de posicionamento combinando PÚBLICO + PROBLEMA + "
            "RESULTADO + MECANISMO + PONTO DE VISTA. Dê nota de 0 a 10 a cada um em clareza, "
            "diferenciação, autoridade, memorabilidade e potencial comercial.\n\n"
            "# ETAPA 3\nEscolha o melhor e crie: frase de posicionamento, promessa central, headline "
            "(até 220 caracteres), 'Sobre' completo (até 2600 caracteres), CTA do perfil (botão/link "
            "personalizado ou chamada no Sobre), 3 posts para a seção Destaques (Featured) e 5 ideias de "
            "conteúdo que reforçam o novo posicionamento.\n\n"
            "# TESTE\nRetire meu nome do posicionamento. Se ele servir para dezenas de concorrentes, "
            "rejeite e refaça. Relate o resultado do teste.\n\n"
            "# REGRA\nQuero ser associado a uma ideia específica, não parecer 'mais um perfil sobre "
            "o meu nicho'."
        )
        return self._gerar(pedido, Posicionamento)

    def gerar_calendario(self, data_inicio: str, dias: int, posts_por_semana: int) -> Calendario:
        n_posts = max(1, round(dias / 7 * posts_por_semana))
        pedido = (
            f"# PAPEL\nVocê é meu Head de Conteúdo no LinkedIn durante os próximos {dias} dias, a "
            f"partir de {data_inicio}. Seu objetivo não é preencher calendário: cada publicação precisa "
            "contribuir para ALCANCE, AUTORIDADE, RELACIONAMENTO ou CONVERSÃO.\n\n"
            f"# TAREFA\nDefina primeiro a proporção ideal (em %) entre essas quatro funções. Depois crie "
            f"{n_posts} posts ({posts_por_semana} por semana, de preferência de terça a quinta, sem "
            "fins de semana), distribuídos estrategicamente entre os pilares de conteúdo do perfil. "
            "Para cada um entregue: data (AAAA-MM-DD), função, pilar, tema, ângulo, gancho, formato, "
            "motor, promessa, mecanismo de retenção, CTA e métrica principal.\n\n"
            "# VARIEDADE\nUse motores diferentes: dor, desejo, erro, segredo, comparação, prova, "
            "bastidor, opinião forte, transformação e oportunidade.\n\n"
            "# FILTRO\nElimine conteúdo genérico, repetitivo ou sem função clara. Evite assuntos quase "
            "idênticos em datas próximas.\n\n"
            "# FINAL\nListe os temas com maior potencial de alcance (até 10), de ganhar seguidores "
            "(até 5) e de conversão (até 5).\n\n"
            "# REGRA\nNenhum post entra apenas porque 'precisamos postar hoje'."
        )
        return self._gerar(pedido, Calendario)

    def gerar_ganchos(self, tema: str, formato: str, objetivo: str) -> Ganchos:
        pedido = (
            "# IDENTIDADE\nVocê é um copywriter especializado em atenção e retenção no LinkedIn.\n\n"
            f"# ENTRADA\nTema: {tema}\nFormato: {formato}\nObjetivo: {objetivo}\n\n"
            "# TAREFA\nCrie 30 ganchos (primeira linha do post ou capa do carrossel) usando mecanismos "
            "diferentes: curiosidade, medo de perda, oportunidade, erro, resultado, contraste, segredo, "
            "urgência, especificidade, prova, comparação e quebra de crença. Cada gancho precisa ser "
            "entendido rapidamente e abrir uma lacuna que o conteúdo consiga fechar.\n\n"
            "# TESTE\nDê nota de 0 a 10 a cada gancho em CLAREZA, CURIOSIDADE, RELEVÂNCIA, INTERRUPÇÃO "
            "DE PADRÃO e FORÇA DA PROMESSA.\n\n"
            "# FINAL\nPara os 5 melhores (todos com 38/50 ou mais) crie: versão curta, versão mais "
            "ousada (sem perder o profissionalismo), texto visual para imagem/capa, a primeira frase "
            "depois do gancho e a promessa que precisa ser entregue no final. Depois escolha apenas "
            "UM campeão e explique em uma frase por que ele tem maior potencial.\n\n"
            "# REGRA\nProibido curiosidade vazia. Se o payoff não justificar o gancho, reescreva."
        )
        return self._gerar(pedido, Ganchos)

    def gerar_roteiro(self, tema: str, gancho: str, formato: str, tamanho: str) -> Roteiro:
        pedido = (
            "# PAPEL\nVocê é um diretor de conteúdo focado em retenção no LinkedIn.\n\n"
            f"# CONTEXTO\nTema: {tema}\nGancho: {gancho or '(crie o melhor gancho possível)'}\n"
            f"Formato: {formato}\nDuração ou número de slides: {tamanho or '(defina o ideal)'}\n\n"
            "# TAREFA\nEstruture o conteúdo em GANCHO > TENSÃO > PRIMEIRA ENTREGA > NOVA CURIOSIDADE > "
            "PROVA > VIRADA > PAYOFF > CTA. Em cada bloco explique o que dizer ou mostrar, qual "
            "informação nova entra, qual pergunta continua aberta e por que alguém deveria avançar.\n\n"
        )
        if formato == "video":
            pedido += ("# VÍDEO\nPreencha 'cenas' com o roteiro por tempo: fala, texto na tela, ação "
                       "visual e quebra de padrão. Deixe 'slides' vazio. As versões finais são a "
                       "legenda do post.\n\n")
        elif formato == "carrossel":
            pedido += ("# CARROSSEL (PDF)\nPreencha 'slides' slide por slide com headline curta, "
                       "conteúdo, função do slide e gancho de continuidade para o próximo. Deixe "
                       "'cenas' vazio. As versões finais são a legenda do post.\n\n")
        else:
            pedido += ("# TEXTO\nDeixe 'slides' e 'cenas' vazios. As versões finais são o próprio "
                       "post, prontas para publicar.\n\n")
        pedido += (
            "# REVISÃO\nCorte redundâncias, introduções, frases previsíveis e qualquer trecho que não "
            "aumente entendimento ou interesse.\n\n"
            "# FINAL\nEntregue uma versão final enxuta e uma versão mais direta.\n\n"
            "# REGRA\nCada parte precisa comprar a atenção necessária para a próxima."
        )
        return self._gerar(pedido, Roteiro)

    def responder_comentario(self, post: str, comentario: str) -> RespostasComentario:
        pedido = (
            "Sugira 3 respostas curtas, cordiais e diferentes entre si para o comentário abaixo, "
            "mantendo a conversa viva (quando fizer sentido, termine com uma pergunta).\n\n"
            f"Post original:\n{post}\n\nComentário recebido:\n{comentario}"
        )
        return self._gerar(pedido, RespostasComentario)
