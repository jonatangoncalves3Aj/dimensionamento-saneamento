"""Converte as saídas estruturadas da IA em relatórios Markdown."""

from .ia import Calendario, Diagnostico, Ganchos, Posicionamento, Roteiro

NOTA_MINIMA_GANCHO = 38
ORDEM_PRIORIDADE = ["CRÍTICO", "ALTO IMPACTO", "OTIMIZAÇÃO", "IGNORAR POR ENQUANTO"]


def _celula(texto: str) -> str:
    return texto.replace("|", "/").replace("\n", " ")


def diagnostico(d: Diagnostico) -> str:
    md = [f"# Diagnóstico do perfil — nota {d.nota_geral}/100", "", d.resumo, "",
          "## A única mudança com maior impacto", "", f"**{d.mudanca_de_maior_impacto}**", "",
          "## Plano dos próximos 7 dias"]
    md += [f"{i}. {p}" for i, p in enumerate(d.plano_7_dias, 1)]
    for prioridade in ORDEM_PRIORIDADE:
        achados = [a for a in d.achados if a.prioridade == prioridade]
        if not achados:
            continue
        md += ["", f"## {prioridade}"]
        for a in achados:
            md += ["", f"### {a.area}", f"- **Problema:** {a.problema}", f"- **Impacto:** {a.impacto}",
                   f"- **Evidência:** {a.evidencia}", f"- **Correção:** {a.correcao}"]
    md += ["", "## 5 maiores vazamentos do funil"]
    md += [f"{i}. **{v.etapa}**: {v.problema} → {v.correcao}" for i, v in enumerate(d.vazamentos, 1)]
    md += ["", "## Headlines sugeridas"]
    md += [f"{i}. {h}" for i, h in enumerate(d.headlines_sugeridas, 1)]
    md += ["", "## Sobre (sugestão)", "", d.sobre_sugerido, "", "## Competências prioritárias"]
    md += [f"- {c}" for c in d.competencias_prioritarias]
    md += ["", "## Palavras-chave para busca", ", ".join(d.palavras_chave_seo)]
    return "\n".join(md)


def posicionamento(p: Posicionamento) -> str:
    md = ["# Novo posicionamento", "", f"> {p.frase_posicionamento}", "",
          f"**Promessa central:** {p.promessa_central}", "", f"**Headline:** {p.headline}", "",
          f"**CTA do perfil:** {p.cta_perfil}", "", "## Sobre", "", p.sobre, "",
          "## Posts para a seção Destaques"]
    md += [f"{i}. {x}" for i, x in enumerate(p.posts_em_destaque, 1)]
    md += ["", "## Ideias que reforçam o posicionamento"]
    md += [f"{i}. {x}" for i, x in enumerate(p.ideias_de_reforco, 1)]
    md += ["", "## Teste sem o nome", "", p.teste_sem_nome, "", "## Territórios avaliados", "",
           "| Território | Fórmula | Clareza | Dif. | Autor. | Memor. | Comercial | Total |",
           "|---|---|---|---|---|---|---|---|"]
    for t in sorted(p.territorios, key=lambda t: t.total, reverse=True):
        marca = " ✅" if t.nome == p.territorio_escolhido else ""
        md.append(f"| {_celula(t.nome)}{marca} | {_celula(t.formula)} | {t.clareza} | {t.diferenciacao} | "
                  f"{t.autoridade} | {t.memorabilidade} | {t.potencial_comercial} | **{t.total}/50** |")
    md += ["", f"**Por que este território:** {p.justificativa}", "", "## Mensagens saturadas do nicho (evitar)"]
    md += [f"{i}. **{m.mensagem}**: {m.por_que_te_iguala}" for i, m in enumerate(p.mensagens_saturadas, 1)]
    return "\n".join(md)


def calendario(c: Calendario) -> str:
    p = c.proporcao
    md = ["# Central de conteúdo", "", c.estrategia, "",
          f"**Proporção:** alcance {p.alcance}% · autoridade {p.autoridade}% · "
          f"relacionamento {p.relacionamento}% · conversão {p.conversao}%", "", p.justificativa, "",
          "| Data | Função | Tema | Ângulo | Gancho | Formato | Motor | CTA | Métrica |",
          "|---|---|---|---|---|---|---|---|---|"]
    md += [f"| {i.data} | {i.funcao} | {_celula(i.tema)} | {_celula(i.angulo)} | {_celula(i.gancho)} | "
           f"{_celula(i.formato)} | {_celula(i.motor)} | {_celula(i.cta)} | {_celula(i.metrica)} |"
           for i in c.itens]
    md += ["", "## Detalhes por post"]
    for i in c.itens:
        md += ["", f"### {i.data} — {i.tema}", f"- **Pilar:** {i.pilar}", f"- **Promessa:** {i.promessa}",
               f"- **Retenção:** {i.retencao}"]
    for titulo, lista in [("Maior potencial de alcance", c.maior_potencial_alcance),
                          ("Maior potencial de seguidores", c.maior_potencial_seguidores),
                          ("Maior potencial de conversão", c.maior_potencial_conversao)]:
        md += ["", f"## {titulo}"] + [f"- {x}" for x in lista]
    return "\n".join(md)


def ganchos(g: Ganchos) -> str:
    aprovados = sorted((x for x in g.ganchos if x.total >= NOTA_MINIMA_GANCHO), key=lambda x: x.total, reverse=True)
    eliminados = [x for x in g.ganchos if x.total < NOTA_MINIMA_GANCHO]
    md = ["# Cirurgião de ganchos", "", "## 🏆 Campeão", "", f"**{g.campeao}**", "", g.por_que_campeao, "",
          "## Os 5 vencedores"]
    for i, v in enumerate(g.vencedores, 1):
        md += ["", f"### {i}. {v.gancho}", f"- **Versão curta:** {v.versao_curta}",
               f"- **Versão ousada:** {v.versao_ousada}", f"- **Texto visual:** {v.texto_visual}",
               f"- **Primeira frase depois:** {v.primeira_frase_depois}",
               f"- **Promessa a entregar:** {v.promessa_a_entregar}"]
    md += ["", f"## Aprovados (≥ {NOTA_MINIMA_GANCHO}/50)", "",
           "| Gancho | Mecanismo | Clar. | Curio. | Relev. | Interr. | Promessa | Total |",
           "|---|---|---|---|---|---|---|---|"]
    md += [f"| {_celula(x.texto)} | {_celula(x.mecanismo)} | {x.clareza} | {x.curiosidade} | {x.relevancia} | "
           f"{x.interrupcao_de_padrao} | {x.forca_da_promessa} | **{x.total}** |" for x in aprovados]
    md += ["", f"## Eliminados ({len(eliminados)})"] + [f"- ~~{x.texto}~~ ({x.total}/50)" for x in eliminados]
    return "\n".join(md)


def roteiro(r: Roteiro, tema: str, formato: str) -> str:
    md = [f"# Roteiro — {tema} ({formato})", "", "## Estrutura de retenção"]
    for b in r.blocos:
        md += ["", f"### {b.etapa}", f"- **O que dizer/mostrar:** {b.o_que_dizer_ou_mostrar}",
               f"- **Informação nova:** {b.informacao_nova}", f"- **Pergunta aberta:** {b.pergunta_aberta}",
               f"- **Por que avançar:** {b.por_que_avancar}"]
    if r.slides:
        md += ["", "## Slides"]
        for s in r.slides:
            md += ["", f"### Slide {s.numero}: {s.headline}", s.conteudo, f"- *Função:* {s.funcao}",
                   f"- *Gancho para o próximo:* {s.gancho_para_o_proximo}"]
    if r.cenas:
        md += ["", "## Roteiro por tempo", "", "| Tempo | Fala | Texto na tela | Ação visual | Quebra de padrão |",
               "|---|---|---|---|---|"]
        md += [f"| {c.tempo} | {_celula(c.fala)} | {_celula(c.texto_na_tela)} | {_celula(c.acao_visual)} | "
               f"{_celula(c.quebra_de_padrao)} |" for c in r.cenas]
    rotulo = "Post" if formato == "texto" else "Legenda"
    md += ["", f"## {rotulo} — versão enxuta", "", r.versao_final_enxuta,
           "", f"## {rotulo} — versão mais direta", "", r.versao_mais_direta]
    if r.hashtags:
        md += ["", " ".join("#" + h.lstrip("#") for h in r.hashtags)]
    return "\n".join(md)
