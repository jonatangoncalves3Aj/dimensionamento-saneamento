# Agente de IA para LinkedIn

Agente de linha de comando que usa o **Claude** para cuidar da sua presença no LinkedIn de forma profissional, e a **API oficial do LinkedIn** para publicar. Nada vai ao ar sem a sua aprovação.

## O que ele faz

| Comando | Função |
|---|---|
| `perfil` | Audita o perfil: nota, 5 opções de headline, texto "Sobre", competências, palavras-chave e melhorias priorizadas |
| `calendario` | Monta um calendário editorial com base nos seus pilares de conteúdo |
| `post` | Gera variações de post em formatos diferentes e salva como rascunhos |
| `listar` / `ver` / `descartar` | Gerencia os rascunhos |
| `aprovar` | Aprova um rascunho, com opção de agendar data e hora |
| `publicar` | Publica agora um rascunho aprovado (`--simular` para testar) |
| `agendados` | Publica os aprovados cujo horário chegou (para rodar no cron) |
| `responder` | Sugere respostas para comentários recebidos |

### Salvaguardas

- **Aprovação humana obrigatória:** só rascunhos com status `aprovado` são publicados, e cada aprovação pede confirmação.
- **Limite diário** de posts (`MAX_POSTS_POR_DIA`, padrão 1) para evitar excesso de publicações.
- **Validação** do tamanho (3.000 caracteres) e do número de hashtags (até 5).
- O prompt proíbe **inventar fatos, números ou histórias**. Para posts baseados em casos reais, passe os fatos em `--contexto`.
- Usa apenas os **endpoints oficiais** (OAuth 2.0 + Posts API). Não faz scraping, não envia convites nem mensagens automáticas e não curte posts por você: essas ações violam os termos do LinkedIn e podem levar ao bloqueio da conta.
- A API **não permite editar headline nem "Sobre"** de perfis pessoais. O agente gera as sugestões e você cola no perfil.

## Instalação

```bash
cd linkedin-agent
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.exemplo .env                 # preencha as chaves
cp perfil.exemplo.json perfil.json   # descreva você, seu público e seu tom de voz
```

### 1. Chave do Claude
Crie uma chave em <https://platform.claude.com> e coloque em `ANTHROPIC_API_KEY`.

### 2. App do LinkedIn (uma vez)
1. Acesse <https://www.linkedin.com/developers/apps> e crie um app (ele precisa estar associado a uma Página, que pode ser uma página sua).
2. Em **Products**, adicione **Sign In with LinkedIn using OpenID Connect** e **Share on LinkedIn**.
3. Em **Auth**, cadastre a Redirect URL `http://localhost:8765/callback`.
4. Copie o Client ID e o Client Secret para o `.env`.
5. Rode `python -m agente auth` e autorize no navegador. O token vale cerca de 60 dias; depois disso, rode o comando de novo.

## Uso no dia a dia

```bash
python -m agente perfil                                   # auditoria do perfil
python -m agente calendario --semanas 4 --por-semana 2    # planejamento do mês

python -m agente post --tema "Erros comuns no dimensionamento de redes de esgoto" \
  --contexto "Revisei 12 projetos este ano; o erro mais frequente foi ..."

python -m agente listar --status pendente
python -m agente aprovar 3f9a1c2b --agendar 2026-10-01T08:30
python -m agente publicar 3f9a1c2b --simular              # confere antes
python -m agente publicar 3f9a1c2b                         # publica agora

python -m agente responder --id 3f9a1c2b --comentario "Qual NBR você usa para isso?"
```

Os rascunhos ficam em `rascunhos/*.json`. Se quiser ajustar o texto antes de aprovar, edite o JSON direto. Os relatórios (auditoria e calendário) vão para `saidas/`.

### Publicação automática agendada
Aprove com `--agendar` e deixe um cron chamando o agente, por exemplo a cada 30 minutos:

```cron
*/30 * * * * cd /caminho/linkedin-agent && .venv/bin/python -m agente agendados >> agente.log 2>&1
```

## Configuração opcional (`.env`)

| Variável | Padrão | Descrição |
|---|---|---|
| `CLAUDE_MODEL` | `claude-opus-5` | Modelo do Claude usado na geração |
| `LINKEDIN_API_VERSION` | `202608` | Versão da API REST do LinkedIn (formato AAAAMM). Atualize quando a versão for descontinuada |
| `MAX_POSTS_POR_DIA` | `1` | Limite de publicações por dia |

## Testes

```bash
python -m unittest discover -s tests -v
```

## Privacidade
`.env`, `.tokens.json`, `perfil.json`, `rascunhos/` e `saidas/` estão no `.gitignore`: seus dados e credenciais não vão para o repositório.
