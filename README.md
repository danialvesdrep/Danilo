# Boletim Danilo Campetti

Aplicativo móvel (PWA) que entrega ao candidato Danilo Campetti um boletim diário
de notícias preparado pelo consultor Marcelo Suano.

- **Para o Danilo:** abrir `index.html` no celular, instalar como atalho na tela inicial,
  ler o boletim em poucos minutos, reagir aos itens e enviar feedback ao Marcelo via WhatsApp.
- **Para o Marcelo:** abrir `admin.html`, montar o boletim do dia em formulário e publicar com 1 clique.

## Estrutura

```
/
├── index.html                  # App do Danilo
├── admin.html                  # Painel do Marcelo
├── manifest.webmanifest        # Configuração PWA
├── sw.js                       # Service worker (offline)
├── vercel.json                 # Headers de cache para deploy
│
├── assets/
│   ├── styles.css              # Tema dark moderno
│   └── icons/                  # Ícone do app
│
├── js/
│   ├── app.js                  # Bootstrap + roteador hash
│   ├── store.js                # Estado + IndexedDB para feedback
│   ├── post-generator.js       # Gerador de posts alinhado ao posicionamento
│   ├── render/
│   │   ├── briefing.js         # Render do boletim do dia
│   │   ├── archive.js          # Render do histórico + busca
│   │   ├── share.js            # Web Share / WhatsApp fallback
│   │   └── tts.js              # Áudio (Web Speech API)
│   └── admin/
│       ├── auth.js             # Login com GitHub PAT
│       ├── editor.js           # Editor visual do boletim
│       └── publish.js          # PUT via GitHub Contents API
│
├── briefings/
│   ├── index.json              # Lista de boletins publicados
│   └── 2026-05-05.json         # Boletim de exemplo (notícias reais de 5/5/2026)
│
└── config/
    ├── cidades-noroeste.json   # Lista padrão de cidades-alvo
    ├── fontes.json             # Jornais monitorados
    └── posicionamento.json     # Diretrizes do gerador de posts
```

## Como hospedar

Recomendado: **Vercel** (deploy estático, invalidação de cache imediata).

```bash
# Em https://vercel.com, importar o repositório.
# Não precisa de build: Vercel serve os arquivos estáticos diretamente.
```

Também funciona em **Netlify**, **Cloudflare Pages** ou **GitHub Pages**
(este último com aviso: cache da CDN do GH Pages pode demorar alguns minutos para
refletir o boletim recém-publicado — Vercel é a opção sem essa fricção).

## Como o Danilo usa

1. Abrir o link do app no Safari (iPhone) ou Chrome (Android).
2. Na primeira vez, o app mostra uma tela ensinando a "Adicionar à Tela de Início".
3. A partir daí, basta tocar no ícone do Boletim para abrir.
4. Ler o **Top 3 do dia** (30 segundos) e depois passar pelas seções na ordem:
   Cidades do Noroeste de SP → Estado de SP → Brasil → América Latina → Mundo → Agenda.
5. Em cada notícia, tocar:
   - **Saber+** para marcar interesse em aprofundar.
   - **Urgente** para sinalizar prioridade alta.
   - **Post** para gerar texto pronto (Instagram, X, WhatsApp).
   - **Notas** para escrever um comentário ao Marcelo.
   - **Compartilhar** para mandar a fonte para alguém.
6. No final do boletim, tocar em **"Enviar feedback ao Marcelo (WhatsApp)"** —
   abre o WhatsApp com mensagem pronta listando todas as marcações e notas.

Para ouvir o boletim (modo carro), tocar no ícone de alto-falante na barra superior.

## Como o Marcelo publica

### Setup único (5 minutos)

1. Acessar https://github.com/settings/personal-access-tokens/new
2. Criar um *Personal Access Token (fine-grained)* com:
   - **Repository access**: somente este repositório.
   - **Permissions** → **Contents**: Read and write.
3. Copiar o token (começa com `github_pat_`).

### Diário (2 minutos)

1. Abrir `admin.html` no navegador.
2. Na primeira vez, preencher: usuário do GitHub, repositório, branch e PAT. O token
   fica salvo apenas no localStorage do seu navegador — nunca é commitado.
3. Para cada seção, clicar em **"+ Adicionar item"** e preencher:
   - Urgência (🔴 urgente / 🟡 importante / 🟢 monitorar)
   - Manchete
   - Resumo curto (2-3 linhas)
   - Fonte e URL
   - Cidades / tags geográficas (opcional)
   - Tópicos (opcional, ajuda o gerador de posts)
4. Adicionar a **análise** do consultor por seção (opcional).
5. Preencher manchete geral e Top 3 do dia.
6. Clicar em **"Publicar boletim"** → revisar o JSON → confirmar.

A publicação cria o arquivo `briefings/<data>.json` no repositório e atualiza o
`briefings/index.json`. O Danilo abre o app e o boletim atualiza automaticamente.

## Posicionamento e gerador de posts

O arquivo `config/posicionamento.json` define o tom da campanha
(aliado a Tarcísio e Bolsonaro, defesa do agronegócio, segurança, livre iniciativa).
O gerador de posts (botão **Post** em cada notícia) usa essas diretrizes para sugerir
3 versões: Instagram, X/Twitter, WhatsApp. Marcelo pode editar `posicionamento.json`
para ajustar tom ou expandir bandeiras.

## Configurações editáveis

- `config/cidades-noroeste.json` — cidades-alvo da campanha. Editar livremente.
- `config/fontes.json` — fontes monitoradas (referência para Marcelo).
- `config/posicionamento.json` — diretrizes do gerador de posts.

## Funcionalidades implementadas

- ✅ Boletim diário com seções fixas e ordem definida (Noroeste SP → Estado SP →
  Brasil → América Latina → Mundo → Agenda).
- ✅ Top 3 do dia em destaque para leitura em 30s.
- ✅ Tempo estimado de leitura, contagem de itens e urgentes.
- ✅ Tags de urgência por cor, cidades, tópicos.
- ✅ Análise por seção do consultor.
- ✅ Reações em 1 toque (saber mais / urgente).
- ✅ Notas/comentários por item.
- ✅ Gerador de posts (Instagram, X, WhatsApp) alinhado ao posicionamento.
- ✅ Compartilhar via Web Share API com fallback WhatsApp.
- ✅ Modo áudio (TTS) — leitura em pt-BR.
- ✅ Histórico de boletins com busca full-text e filtros por seção.
- ✅ Restauração de scroll por boletim.
- ✅ Tema dark/light.
- ✅ Painel admin com publicação 1-clique via GitHub API.
- ✅ Service worker para leitura offline.
- ✅ Onboarding iOS para "Adicionar à Tela de Início".

## Roadmap (não no MVP)

- Notificações push (limitação do iOS PWA — exige iOS 16.4+ e instalação prévia).
- Pré-geração de áudio MP3 via ElevenLabs/Azure para qualidade superior.
- Bot do WhatsApp do Marcelo notificando quando o boletim é publicado.
- Painel de analytics: padrões de interesse do candidato ao longo da campanha.
- Integração com Google Calendar (agendamentos relacionados a notícias).

## Contato e manutenção

- Issues e melhorias: editar arquivos diretamente neste repositório.
- Para mudanças no design: `assets/styles.css`.
- Para mudanças no comportamento: `js/`.
- Para mudanças de conteúdo: `briefings/` e `config/`.
