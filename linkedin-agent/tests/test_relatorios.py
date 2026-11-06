import unittest

from agente import relatorios
from agente.ia import (Achado, Bloco, Calendario, Diagnostico, Gancho, Ganchos, GanchoVencedor,
                       ItemCalendario, Posicionamento, Proporcao, Roteiro, Slide, Territorio, Vazamento)


def _gancho(texto, nota):
    return Gancho(texto=texto, mecanismo="erro", clareza=nota, curiosidade=nota, relevancia=nota,
                  interrupcao_de_padrao=nota, forca_da_promessa=nota)


class TestRelatorios(unittest.TestCase):
    def test_diagnostico_ordena_prioridades(self):
        achado = lambda area, p: Achado(area=area, prioridade=p, problema="p", impacto="i", evidencia="e", correcao="c")
        d = Diagnostico(nota_geral=60, resumo="r", achados=[achado("Banner", "OTIMIZAÇÃO"), achado("Headline", "CRÍTICO")],
                        vazamentos=[Vazamento(etapa="CONTEÚDO > VISITA AO PERFIL", problema="p", correcao="c")],
                        headlines_sugeridas=["h"], sobre_sugerido="s", competencias_prioritarias=["c"],
                        palavras_chave_seo=["k"], plano_7_dias=["a", "b", "c"], mudanca_de_maior_impacto="m")
        md = relatorios.diagnostico(d)
        self.assertLess(md.index("## CRÍTICO"), md.index("## OTIMIZAÇÃO"))
        self.assertNotIn("## IGNORAR POR ENQUANTO", md)

    def test_ganchos_elimina_abaixo_de_38(self):
        v = GanchoVencedor(gancho="A", versao_curta="a", versao_ousada="A!", texto_visual="t",
                           primeira_frase_depois="f", promessa_a_entregar="p")
        md = relatorios.ganchos(Ganchos(ganchos=[_gancho("Forte", 8), _gancho("Fraco", 7)],
                                        vencedores=[v], campeao="Forte", por_que_campeao="x"))
        aprovados, eliminados = md.split("## Eliminados")
        self.assertIn("Forte", aprovados.split("## Aprovados")[1])
        self.assertIn("~~Fraco~~ (35/50)", eliminados)

    def test_posicionamento_marca_escolhido_e_total(self):
        t = Territorio(nome="Saneamento sem retrabalho", formula="f", clareza=9, diferenciacao=8, autoridade=8,
                       memorabilidade=7, potencial_comercial=9)
        p = Posicionamento(mensagens_saturadas=[], territorios=[t], territorio_escolhido=t.nome, justificativa="j",
                           frase_posicionamento="f", promessa_central="p", headline="h", sobre="s", cta_perfil="c",
                           posts_em_destaque=[], ideias_de_reforco=[], teste_sem_nome="ok")
        self.assertIn("Saneamento sem retrabalho ✅", relatorios.posicionamento(p))
        self.assertIn("**41/50**", relatorios.posicionamento(p))

    def test_calendario_e_roteiro(self):
        item = ItemCalendario(data="2026-11-10", funcao="AUTORIDADE", pilar="p", tema="NBR | dica", angulo="a",
                              gancho="g", formato="texto", motor="erro", promessa="p", retencao="r", cta="c", metrica="m")
        c = Calendario(estrategia="e", proporcao=Proporcao(alcance=40, autoridade=30, relacionamento=20, conversao=10,
                                                            justificativa="j"),
                       itens=[item], maior_potencial_alcance=["x"], maior_potencial_seguidores=[], maior_potencial_conversao=[])
        self.assertIn("NBR / dica", relatorios.calendario(c))  # pipe escapado na tabela
        r = Roteiro(blocos=[Bloco(etapa="GANCHO", o_que_dizer_ou_mostrar="o", informacao_nova="i",
                                  pergunta_aberta="p", por_que_avancar="a")],
                    slides=[Slide(numero=1, headline="Capa", conteudo="c", funcao="f", gancho_para_o_proximo="g")],
                    cenas=[], versao_final_enxuta="E", versao_mais_direta="D", hashtags=["#agua"])
        md = relatorios.roteiro(r, "tema", "carrossel")
        self.assertIn("### Slide 1: Capa", md)
        self.assertIn("## Legenda — versão enxuta", md)
        self.assertNotIn("Roteiro por tempo", md)


if __name__ == "__main__":
    unittest.main()
