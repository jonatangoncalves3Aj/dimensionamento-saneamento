"""Linha de comando do agente de LinkedIn.

Uso: python -m agente <comando> [opções]   (rode com --help para ver tudo)
"""

import argparse
from datetime import date, datetime

from . import config, rascunhos


def _ia():
    from .ia import AgenteIA
    return AgenteIA(config.carregar_perfil())


def _salvar_saida(nome: str, conteudo: str) -> str:
    config.DIR_SAIDAS.mkdir(parents=True, exist_ok=True)
    caminho = config.DIR_SAIDAS / f"{date.today().isoformat()}-{nome}.md"
    caminho.write_text(conteudo, encoding="utf-8")
    return str(caminho.relative_to(config.RAIZ))


def _mostrar(r: dict) -> None:
    print(f"\n=== [{r['id']}] {r['status'].upper()} · {r['formato']} · tema: {r['tema']}")
    if r.get("agendado_para"):
        print(f"Agendado para: {r['agendado_para']}")
    print("-" * 60)
    print(r["texto"])
    if r["hashtags"]:
        print("\n" + " ".join("#" + h for h in r["hashtags"]))
    print("-" * 60)


def _confirmar(pergunta: str) -> bool:
    return input(f"{pergunta} [s/N] ").strip().lower() in ("s", "sim", "y", "yes")


# ---------- Comandos ----------

def cmd_auth(_):
    from . import linkedin
    token = linkedin.autenticar()
    print(f"Autenticado como {token.get('nome') or token['pessoa_urn']}. Token salvo em .tokens.json")


def cmd_perfil(_):
    a = _ia().analisar_perfil()
    md = [f"# Auditoria do perfil — nota {a.nota_geral}/100", "", a.diagnostico, "", "## Headlines sugeridas"]
    md += [f"{i}. {h}" for i, h in enumerate(a.headlines_sugeridas, 1)]
    md += ["", "## Sobre (sugestão)", "", a.sobre_sugerido, "", "## Competências prioritárias"]
    md += [f"- {c}" for c in a.competencias_prioritarias]
    md += ["", "## Palavras-chave para busca", ", ".join(a.palavras_chave_seo), "", "## Melhorias (por prioridade)"]
    md += [f"{i}. {m}" for i, m in enumerate(a.melhorias, 1)]
    texto = "\n".join(md)
    print(texto)
    print(f"\nSalvo em {_salvar_saida('auditoria-perfil', texto)}")
    print("Obs.: a API do LinkedIn não permite editar o perfil; aplique as mudanças manualmente.")


def cmd_calendario(args):
    inicio = args.inicio or date.today().isoformat()
    c = _ia().gerar_calendario(inicio, args.semanas, args.por_semana)
    md = ["# Calendário editorial", "", c.estrategia, "", "| Data | Pilar | Tema | Formato | Objetivo |", "|---|---|---|---|---|"]
    md += [f"| {i.data} | {i.pilar} | {i.tema} | {i.formato} | {i.objetivo} |" for i in c.itens]
    texto = "\n".join(md)
    print(texto)
    print(f"\nSalvo em {_salvar_saida('calendario', texto)}")
    print('Gere cada post com: python -m agente post --tema "<tema>"')


def cmd_post(args):
    p = _ia().gerar_post(args.tema, args.contexto or "", args.variacoes)
    for v in p.variacoes:
        r = rascunhos.criar(args.tema, v.texto, [h.lstrip("#") for h in v.hashtags], v.formato)
        _mostrar(r)
        print(f"Por que funciona: {v.justificativa}")
    print(f"\nSugestão visual: {p.sugestao_visual}")
    print(f"Melhor horário: {p.melhor_horario}")
    print("\nRascunhos salvos em rascunhos/. Revise, edite o JSON se quiser e aprove com:")
    print("  python -m agente aprovar <id> [--agendar AAAA-MM-DDTHH:MM]")


def cmd_listar(args):
    itens = rascunhos.listar(args.status)
    if not itens:
        print("Nenhum rascunho.")
    for r in itens:
        extra = f" → {r['agendado_para']}" if r.get("agendado_para") and r["status"] == rascunhos.APROVADO else ""
        print(f"[{r['id']}] {r['status']:<10} {r['formato']:<15} {r['texto'][:60].replace(chr(10), ' ')}…{extra}")


def cmd_ver(args):
    _mostrar(rascunhos.carregar(args.id))


def cmd_aprovar(args):
    r = rascunhos.carregar(args.id)
    problemas = rascunhos.validar(r)
    if problemas:
        raise SystemExit("Não é possível aprovar: " + "; ".join(problemas))
    _mostrar(r)
    if not _confirmar("Aprovar este texto para publicação?"):
        return
    r["status"] = rascunhos.APROVADO
    if args.agendar:
        r["agendado_para"] = datetime.fromisoformat(args.agendar).isoformat(timespec="minutes")
    rascunhos.salvar(r)
    print("Aprovado." + (f" Agendado para {r['agendado_para']}." if r["agendado_para"] else ""))


def cmd_descartar(args):
    r = rascunhos.carregar(args.id)
    r["status"] = rascunhos.DESCARTADO
    rascunhos.salvar(r)
    print("Descartado.")


def _publicar(r: dict, simular: bool) -> None:
    from . import linkedin
    if r["status"] != rascunhos.APROVADO:
        raise SystemExit(f"Rascunho {r['id']} está '{r['status']}'. Só rascunhos aprovados podem ser publicados.")
    problemas = rascunhos.validar(r)
    if problemas:
        raise SystemExit("Publicação bloqueada: " + "; ".join(problemas))
    if rascunhos.publicados_hoje() >= config.max_posts_por_dia():
        raise SystemExit(f"Limite diário de {config.max_posts_por_dia()} post(s) atingido (MAX_POSTS_POR_DIA).")
    texto = linkedin.montar_texto(r["texto"], r["hashtags"])
    if simular:
        print("[simulação] Seria publicado:\n" + texto)
        return
    r["urn_linkedin"] = linkedin.publicar(texto)
    r["status"] = rascunhos.PUBLICADO
    r["publicado_em"] = datetime.now().isoformat(timespec="seconds")
    rascunhos.salvar(r)
    print(f"Publicado! {r['urn_linkedin']}")


def cmd_publicar(args):
    r = rascunhos.carregar(args.id)
    _mostrar(r)
    if args.simular or _confirmar("Publicar AGORA no LinkedIn?"):
        _publicar(r, args.simular)


def cmd_agendados(args):
    """Publica os rascunhos aprovados cujo horário chegou. Ideal para cron."""
    prontos = rascunhos.prontos_para_publicar()
    if not prontos:
        print("Nada agendado para agora.")
    for r in prontos:
        try:
            _publicar(r, args.simular)
        except SystemExit as e:
            print(f"[{r['id']}] {e}")
            break


def cmd_responder(args):
    post = rascunhos.carregar(args.id)["texto"] if args.id else (args.post or "")
    resp = _ia().responder_comentario(post, args.comentario)
    for i, o in enumerate(resp.opcoes, 1):
        print(f"\n{i}. {o}")
    print("\nCopie a resposta escolhida e publique manualmente no LinkedIn.")


def main(argv=None):
    config.carregar_env()
    ap = argparse.ArgumentParser(prog="python -m agente", description="Agente de IA para gerenciar seu LinkedIn.")
    sub = ap.add_subparsers(dest="comando", required=True)

    sub.add_parser("auth", help="Conecta sua conta do LinkedIn (OAuth oficial)").set_defaults(f=cmd_auth)
    sub.add_parser("perfil", help="Audita o perfil e sugere headline, Sobre e melhorias").set_defaults(f=cmd_perfil)

    s = sub.add_parser("calendario", help="Gera um calendário editorial")
    s.add_argument("--inicio", help="Data inicial AAAA-MM-DD (padrão: hoje)")
    s.add_argument("--semanas", type=int, default=4)
    s.add_argument("--por-semana", type=int, default=2)
    s.set_defaults(f=cmd_calendario)

    s = sub.add_parser("post", help="Gera variações de post e salva como rascunhos")
    s.add_argument("--tema", required=True)
    s.add_argument("--contexto", help="Fatos, números ou história real para embasar o post")
    s.add_argument("--variacoes", type=int, default=3)
    s.set_defaults(f=cmd_post)

    s = sub.add_parser("listar", help="Lista rascunhos")
    s.add_argument("--status", choices=[rascunhos.PENDENTE, rascunhos.APROVADO, rascunhos.PUBLICADO, rascunhos.DESCARTADO])
    s.set_defaults(f=cmd_listar)

    for nome, func, ajuda in [("ver", cmd_ver, "Mostra um rascunho"), ("descartar", cmd_descartar, "Descarta um rascunho")]:
        s = sub.add_parser(nome, help=ajuda)
        s.add_argument("id")
        s.set_defaults(f=func)

    s = sub.add_parser("aprovar", help="Aprova um rascunho (opcionalmente agendando)")
    s.add_argument("id")
    s.add_argument("--agendar", help="Data/hora AAAA-MM-DDTHH:MM para publicação automática")
    s.set_defaults(f=cmd_aprovar)

    s = sub.add_parser("publicar", help="Publica agora um rascunho aprovado")
    s.add_argument("id")
    s.add_argument("--simular", action="store_true", help="Mostra o que seria publicado, sem publicar")
    s.set_defaults(f=cmd_publicar)

    s = sub.add_parser("agendados", help="Publica aprovados cujo horário chegou (use no cron)")
    s.add_argument("--simular", action="store_true")
    s.set_defaults(f=cmd_agendados)

    s = sub.add_parser("responder", help="Sugere respostas para um comentário")
    s.add_argument("--comentario", required=True)
    grupo = s.add_mutually_exclusive_group()
    grupo.add_argument("--id", help="ID do rascunho publicado ao qual o comentário pertence")
    grupo.add_argument("--post", help="Texto do post (se não estiver nos rascunhos)")
    s.set_defaults(f=cmd_responder)

    args = ap.parse_args(argv)
    args.f(args)


if __name__ == "__main__":
    main()
