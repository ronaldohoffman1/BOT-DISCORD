# 🎮 Akaza BOT - Gestor da Guilda

Bot completo para onboarding, gerenciamento de tags/cargos e criação de salas privadas para servidores de guildas e comunidades de jogos.

---

## 🕹️ Jogos, Tags e Organização Visual com Emojis

### 1. ⚔️ Aion 2 (Classes)
- **Cargo de Acesso à Categoria:** `🎮┃Aion 2`
- **Tags de Classes:**
  - `⚔️┃Gladiador` (Vermelho)
  - `🛡️┃Templário` (Azul)
  - `🏹┃Arqueiro` (Verde)
  - `🗡️┃Assassino` (Roxo)
  - `🔥┃Feiticeiro` (Laranja)
  - `🔮┃Invocador` (Ciano)
  - `💖┃Clérigo` (Amarelo)
  - `📜┃Chanter` (Âmbar)
- **Salas Automáticas Privadas:**
  - `💬・chat-aion`
  - `🔍・procurar-pt`
  - `📚・builds-e-guias` (fórum com etiquetas)
  - `📢・clipes-aion`
  - `🔊・Aion PT 1`
  - `🔊・Aion PT 2`
  - `🔊・Aion PvP / Raid`

### 2. 🛡️ Dota 2 (Medalhas)
- **Cargo de Acesso à Categoria:** `🎮┃Dota 2`
- **Tags de Medalhas:**
  - `🥉┃Dota: Arauto`, `🥉┃Dota: Guardião`, `🥈┃Dota: Cruzado`, `🥈┃Dota: Arconte`, `🥇┃Dota: Lenda`, `🥇┃Dota: Ancestral`, `💎┃Dota: Divino`, `👑┃Dota: Imortal`, `🕹️┃Dota: Casual`
- **Salas Automáticas Privadas:**
  - `💬・chat-dota`
  - `⚔️・procurar-partida`
  - `📚・builds-e-guias` (fórum com etiquetas)
  - `📢・clipes-dota`
  - `🔊・Dota Duo / Trio`
  - `🔊・Dota Stack 1`
  - `🔊・Dota Stack 2`

### 3. 🏕️ Conan Exiles (Modos de Jogo)
- **Cargo de Acesso à Categoria:** `🎮┃Conan Exiles`
- **Tags de Estilo:**
  - `🏰┃Conan: PvE`
  - `⚔️┃Conan: PvP`
  - `⚖️┃Conan: PvE-Conflito`
- **Salas Automáticas Privadas:**
  - `💬・chat-conan`
  - `⚔️・raids-e-guerra`
  - `📚・guias-e-bases` (fórum com etiquetas)
  - `🔊・Voz Clã Conan`
  - `🔊・Conan Farm / PvE`
  - `🔊・Conan PvP / Raid`

### 4. 🎯 Valorant (Elos)
- **Cargo de Acesso à Categoria:** `🎮┃Valorant`
- **Tags de Elos:**
  - `⚪┃VLR: Ferro`, `🟤┃VLR: Bronze`, `⚪┃VLR: Prata`, `🟡┃VLR: Ouro`, `🟢┃VLR: Platina`, `🟣┃VLR: Diamante`, `🟢┃VLR: Ascendente`, `🔴┃VLR: Imortal`, `🌟┃VLR: Radiante`, `🕹️┃VLR: Casual`
- **Salas Automáticas Privadas:**
  - `💬・chat-valorant`
  - `🎯・procurar-duo-trio`
  - `📚・guias-e-lineups` (fórum com etiquetas)
  - `📢・clipes-valorant`
  - `🔊・Valorant Duo / Trio`
  - `🔊・Valorant Full Team 1`
  - `🔊・Valorant Full Team 2`

---

## 🗂️ Organização do Servidor

`/criar-salas` deixa o servidor assim (definido em `serverLayout` e `games` no `src/config.js`):
- **📌┃INÍCIO**: regras, anúncios e escolha de cargos (somente leitura para membros)
- **🏆┃FIGHT KINGS**: geral, recrutamento, música, Bate Papo, Recrutamento (voz) e Ausente (AFK)
- **🔒┃PRIVADO** (Gods) e uma categoria privada por jogo

Salas com nome antigo (`aliases`) são renomeadas, não duplicadas. Salas que sobram nas categorias dos jogos são apagadas **apenas se estiverem vazias**. Salas `forum` viram Fórum quando a Comunidade do servidor está ativa (senão ficam como sala de texto).

---

## 🔒 Como Funciona o Sistema de Ocultar/Exibir Salas?

1. As categorias de cada jogo são configuradas com permissão privada: `@everyone` não tem permissão para visualizar (`ViewChannel: false`).
2. Quando um membro escolhe qualquer classe, medalha ou elo no painel interativo, o bot entrega a tag específica **E entrega automaticamente o cargo pai** (ex: `🎮┃Aion 2`).
3. No mesmo instante, a categoria inteira daquele jogo e todas as suas salas aparecem como mágica para o membro!
4. Se o membro desmarcar ou remover suas tags daquele jogo, o bot remove o cargo pai e as salas desaparecem do Discord dele novamente.

---

## 🛠️ Comandos Slash Disponíveis

| Comando | Permissão | Descrição |
|---|---|---|
| `/criar-cargos` | Administrador | Cria todos os ~30 cargos com cores e emojis organizados |
| `/criar-salas` | Administrador | Cria as categorias e salas privadas configuradas para cada jogo |
| `/setup-cargos [canal]` | Administrador | Envia o painel interativo de seleção de cargos para o canal |
| `/config-boas-vindas` | Administrador | Configura canal de anúncio e envio de DM para novos membros |
| `/cargos` | Todos | Abre o menu pessoal para escolher ou trocar tags |
| `/ajuda` | Todos | Exibe instruções completas de uso do bot |

---

## ☁️ Deixar o bot online 24h (Railway)

1. No Railway: **New Project → Deploy from GitHub repo → `BOT-DISCORD`**.
2. Em **Variables**, adicione as 3 variáveis do arquivo `.env` (copie os valores do seu `.env` local):
   `DISCORD_TOKEN`, `CLIENT_ID`, `GUILD_ID`.
3. (Opcional, recomendado) Em **Settings → Volumes**, crie um volume com o caminho `/app/data` para o bot lembrar das configurações feitas por comandos (`/setup-cargos`, `/config-boas-vindas`) mesmo depois de atualizar.
4. Pronto: o `railway.json` já manda o Railway religar o bot sozinho se ele cair.

⚠️ Depois que estiver no Railway, **não rode mais o `iniciar.bat`** no PC — dois bots com o mesmo token ao mesmo tempo dão erro nos cliques.
