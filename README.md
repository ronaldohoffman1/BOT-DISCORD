# ⚔️ Akaza BOT — Legião Fight Kings (Aion 2)

Bot do servidor da legião **Fight Kings** no Aion 2: escolha de classe, tags da legião e organização das salas.

---

## 🪽 Cargos

| Cargo | Quem | Como recebe |
|---|---|---|
| `👑┃Gods` | Administração do servidor | Manual (não é mexido pelo bot) |
| `👑┃Comandante` | Dono do clã | Manual, pela liderança |
| `⚜️┃Elite` | Abaixo do Comandante | Manual, pela liderança |
| `🪽┃Legionário` | Membros da guilda | Manual, pela liderança |
| `🎮┃Aion 2` + classe | Quem escolheu a classe no painel | Automático (painel em 🎭・escolha-de-classe) |

Classes: ⚔️ Gladiador, 🛡️ Templário, 🗡️ Assassino, 🏹 Arqueiro, 🔥 Feiticeiro, 🔮 Invocador, 💖 Clérigo, 📜 Cantor (até 2 por pessoa).

## 🗂️ Salas (definidas em `layout` no `src/config.js`)

- **📌┃INÍCIO** — regras, anúncios, escolha de classe (só leitura)
- **💬┃COMUNIDADE** — geral, recrutamento, procuro-clã, música, Bate Papo 1/2/3, Recrutamento (voz), Ausente (AFK)
- **📺┃MÍDIA** — lives, vídeos, prints e clipes
- **⚔️┃AION 2** — chat, procurar grupo, fórum de builds, atributos, VIP *(só quem escolheu classe)*
- **🐉┃PVE & RAID** — PvE 1/2/3 e Raid 1/2/3 *(só quem escolheu classe)*
- **⚔️┃PVP & GUERRA** — guerra-de-facções (texto), PvP 1/2/3 e Guerra de Facções 1/2/3 *(só quem escolheu classe)*
- **🔒┃PRIVADO** — bate-papo, pauta e Sala de Reunião *(só Gods e Comandante)*
- **📖┃GUIA DAS CLASSES** — uma sala por classe com as 5 builds PvE e 5 PvP mais vistas no YouTube (só leitura)

## 🛠️ Comandos

| Comando | Permissão | Descrição |
|---|---|---|
| `/criar-cargos` | Administrador | Cria/atualiza classes e tags da legião |
| `/criar-salas` | Administrador | Organiza todas as categorias e salas |
| `/setup-cargos [canal]` | Administrador | Envia o painel de escolha de classe |
| `/config-boas-vindas` | Administrador | Canal de anúncio e DM para novos membros |
| `/cargos` | Todos | Menu pessoal para escolher/trocar a classe |
| `/ajuda` | Todos | Instruções do bot |

## 📜 Scripts (rodar no PC, na pasta do bot)

- `node scripts/reorganizar-servidor.js` — aplica tudo do config: cargos, salas, ícone e painel
- `node scripts/postar-guia-classes.js` — publica os vídeos de `assets/videos-classes.json` nas salas das classes
- `node scripts/postar-regras.js` — publica as regras com o logo

Logo: `assets/logo-icone.png` (ícone do servidor) e `assets/logo-fight-kings.png` (com o nome). Os `.svg` são os arquivos editáveis.

---

## ☁️ Deixar o bot online 24h (Railway)

1. No Railway: **New Project → Deploy from GitHub repo → `BOT-DISCORD`**.
2. Em **Variables**, adicione as 3 variáveis do arquivo `.env` (copie os valores do seu `.env` local):
   `DISCORD_TOKEN`, `CLIENT_ID`, `GUILD_ID`.
3. (Opcional, recomendado) Em **Settings → Volumes**, crie um volume com o caminho `/app/data` para o bot lembrar das configurações feitas por comandos (`/setup-cargos`, `/config-boas-vindas`) mesmo depois de atualizar.
4. Pronto: o `railway.json` já manda o Railway religar o bot sozinho se ele cair.

⚠️ Depois que estiver no Railway, **não rode mais o `iniciar.bat`** no PC — dois bots com o mesmo token ao mesmo tempo dão erro nos cliques.
