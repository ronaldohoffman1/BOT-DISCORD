/**
 * Configuração do servidor da guilda Fight Kings (Aion 2): cargos, classes e salas.
 */

// Classes do Aion 2 (nomes em português; "en" = nome oficial em inglês no jogo)
const classes = [
  { id: "aion_gladiador", key: "gladiador", name: "⚔️┃Gladiador", channel: "⚔️・gladiador", en: "Gladiator", emoji: "⚔️", color: "#E74C3C", description: "Dano corpo a corpo e controle com lança/espada" },
  { id: "aion_templario", key: "templario", name: "🛡️┃Templário", channel: "🛡️・templário", en: "Templar", emoji: "🛡️", color: "#3498DB", description: "Tanque principal, escudo e alta defesa" },
  { id: "aion_assassino", key: "assassino", name: "🗡️┃Assassino", channel: "🗡️・assassino", en: "Assassin", emoji: "🗡️", color: "#8E44AD", description: "Furtividade, venenos e dano crítico explosivo" },
  { id: "aion_ranger", key: "arqueiro", name: "🏹┃Arqueiro", channel: "🏹・arqueiro", en: "Ranger", emoji: "🏹", color: "#2ECC71", description: "Combate à distância com arco e armadilhas" },
  { id: "aion_feiticeiro", key: "feiticeiro", name: "🔥┃Feiticeiro", channel: "🔥・feiticeiro", en: "Sorcerer", emoji: "🔥", color: "#E67E22", description: "Magias poderosas de fogo, gelo e explosão" },
  { id: "aion_invocador", key: "invocador", name: "🔮┃Invocador", channel: "🔮・invocador", en: "Spiritmaster", emoji: "🔮", color: "#16A085", description: "Invoca espíritos elementais e lança debuffs" },
  { id: "aion_clerigo", key: "clerigo", name: "💖┃Clérigo", channel: "💖・clérigo", en: "Cleric", emoji: "💖", color: "#F1C40F", description: "Curandeiro supremo e suporte de grupo" },
  { id: "aion_cantor", key: "cantor", name: "📜┃Cantor", aliases: ["📜┃Chanter"], channel: "📜・cantor", en: "Chanter", emoji: "📜", color: "#F39C12", description: "Mantras, buffs e suporte híbrido corpo a corpo" }
];

// Cargo de quem já tem acesso total (admin do servidor). Não é criado nem alterado pelo bot.
const GODS = "👑┃Gods";

module.exports = {
  botName: "Akaza BOT",
  guildName: "Fight Kings",
  embedColor: 0xD4AF37,
  classes,

  // Cargos da legião, do mais alto para o mais baixo. Ficam logo abaixo dos Gods,
  // exibidos separadamente na lista de membros. Atribuídos manualmente pela liderança.
  legionRoles: [
    {
      name: "👑┃Comandante", color: "#D4AF37",
      description: "Dono do clã",
      permissions: ["KickMembers", "ManageMessages", "MuteMembers", "DeafenMembers", "MoveMembers", "ManageNicknames", "MentionEveryone", "ModerateMembers"]
    },
    {
      name: "⚜️┃Elite", color: "#C0392B",
      description: "Braço direito do Comandante",
      permissions: ["ManageMessages", "MuteMembers", "MoveMembers", "ModerateMembers"]
    },
    {
      name: "🪽┃Legionário", color: "#5DADE2",
      description: "Membro da guilda",
      permissions: []
    },
    {
      name: "🤝┃Amigos", color: "#95A5A6",
      description: "Amigo da guilda (não é membro)",
      permissions: []
    }
  ],

  // Categorias do servidor, na ordem em que aparecem.
  // access: "public" (todos), "readOnly" (todos leem, só o bot escreve),
  //         "game" (só quem escolheu uma classe), "staff" (só staffRoles).
  // aliases = nomes antigos: a categoria/sala é renomeada em vez de recriada.
  // prune = apaga as salas que sobram na categoria (só se estiverem vazias).
  // moveFrom = procura a sala em qualquer categoria (para mudar de lugar).
  staffRoles: [GODS, "👑┃Comandante"],
  layout: [
    {
      name: "👋┃SAUDAÇÕES",
      access: "public",
      channels: [
        { name: "👋・boas-vindas", type: "text", readOnly: true, topic: "Boas-vindas aos novos membros e como pegar sua tag" }
      ]
    },
    {
      name: "📌┃INÍCIO",
      access: "public",
      channels: [
        { name: "📜・regras", type: "text", readOnly: true, topic: "Regras da guilda Fight Kings" },
        { name: "📢・anúncios", type: "text", readOnly: true, topic: "Avisos oficiais da legião" }
      ]
    },
    {
      name: "💬┃COMUNIDADE",
      aliases: ["🏆┃FIGHT KINGS", "💬┃COMUNIDADE"],
      access: "public",
      channels: [
        { name: "💬・geral", type: "text", aliases: ["geral"], topic: "Bate-papo geral da Fight Kings" },
        { name: "📝・recrutamento", type: "text", topic: "Quer entrar na legião? Apresente-se: nick, classe, nível/GS e horários" },
        { name: "🙋・procuro-clã", type: "text", aliases: ["📝・procuro-clã"], topic: "Jogadores procurando legião" },
        { name: "🎵・toque-sua-música", type: "text", aliases: ["toque-sua-música"] },
        { name: "🔊・Bate Papo 1", type: "voice", aliases: ["🔊・Bate Papo", "Bate Papo"] },
        { name: "🔊・Bate Papo 2", type: "voice" },
        { name: "🔊・Bate Papo 3", type: "voice" },
        { name: "🎙️・Recrutamento", type: "voice" },
        { name: "💤・Ausente (AFK)", type: "voice", aliases: ["💤┃Ausente (AFK)"] }
      ]
    },
    {
      name: "📺┃MÍDIA",
      access: "public",
      channels: [
        { name: "🔴・lives", type: "text", topic: "Vai abrir live? Divulgue aqui: link, horário e o que vai jogar" },
        { name: "🎬・vídeos", type: "text", topic: "Divulgue seus vídeos do YouTube, TikTok, Kwai..." },
        { name: "📸・prints-e-clipes", type: "text", aliases: ["📢・clipes-aion"], moveFrom: true, topic: "Prints, clipes e jogadas épicas no Aion 2" }
      ]
    },
    {
      name: "⚔️┃AION 2",
      access: "game",
      game: "aion2",
      // sem prune: o dono cria salas aqui na mão (ex: farm, steam-url) e o bot não pode apagar
      channels: [
        // Igual ao servidor em 14/10/2026 (o dono moveu escolha-de-classe e avisos para cá)
        { name: "🎭・escolha-de-classe", type: "text", readOnly: true, aliases: ["🎭・escolha-de-cargos", "escolha-de-cargos"], topic: "Escolha aqui a sua classe no Aion 2 para liberar as salas" },
        { name: "💎・vantagem-vip", type: "text", aliases: ["📚-vantagem-vip"], topic: "Vantagens do VIP / assinatura" },
        { name: "💬・chat-guilda", type: "text", aliases: ["💬・chat-aion"] },
        { name: "📊・atributos-e-stats", type: "text", aliases: ["📚-atributos-stats"], topic: "Atributos, stats e como distribuir" },
        { name: "🌳・árvore-de-genus", type: "text", aliases: ["📚-tips-arvore-de-genus"], topic: "Dicas da árvore de Genus" },
        { name: "📢・avisos-rotações-aion2", type: "text", readOnly: true, aliases: ["📢・avisos-aion-2"], topic: "Avisos automáticos: atualizações oficiais, Fenda e Festival Shugo (horário de Brasília)" },
        { name: "farm", type: "text" },
        { name: "steam-url", type: "text" }
      ]
    },
    {
      name: "🐉┃PVE & RAID",
      access: "game",
      game: "aion2",
      channels: [
        { name: "🐉・PvE 1", type: "voice", aliases: ["🔊・Aion PVE", "🔊・Aion PT 1"], moveFrom: true },
        { name: "🐉・PvE 2", type: "voice", aliases: ["🔊・Aion FARM", "🔊・Aion PT 2"], moveFrom: true },
        { name: "🐉・PvE 3", type: "voice" },
        { name: "🔥・Raid 1", type: "voice" },
        { name: "🔥・Raid 2", type: "voice" },
        { name: "🔥・Raid 3", type: "voice" }
      ]
    },
    {
      name: "⚔️┃PVP & GUERRA",
      access: "game",
      game: "aion2",
      channels: [
        { name: "🏰・guerra-de-facções", type: "text", topic: "Chamadas e estratégia para a guerra Elyos x Asmodianos (Abismo, fortalezas, invasões)" },
        { name: "⚔️・PvP 1", type: "voice", aliases: ["🔊・Aion PvP / Raid"], moveFrom: true },
        { name: "⚔️・PvP 2", type: "voice" },
        { name: "⚔️・PvP 3", type: "voice" },
        { name: "🏰・Guerra de Facções 1", type: "voice" },
        { name: "🏰・Guerra de Facções 2", type: "voice" },
        { name: "🏰・Guerra de Facções 3", type: "voice" }
      ]
    },
    {
      name: "🔒┃PRIVADO",
      access: "staff",
      channels: [
        { name: "💬・bate-papo", type: "text", topic: "Conversa da administração" },
        { name: "📋・pauta-da-reunião", type: "text", topic: "Assuntos para a próxima reunião da administração" },
        { name: "🎙️・Sala de Reunião", type: "voice" },
        { name: "🎮・Jogando", type: "voice" },
        { name: "💤・Ausente", type: "voice" }
      ]
    },
    {
      name: "📖┃GUIA DAS CLASSES",
      access: "readOnly",
      prune: true,
      channels: classes.map(c => ({
        name: c.channel, type: "text",
        topic: `${c.name.split("┃")[1]} (${c.en}) — as 5 builds PvE e 5 PvP mais vistas no YouTube`
      }))
    }
  ],

  // Sala onde o bot dá boas-vindas a quem entra (ver src/welcome.js)
  welcomeChannel: "👋・boas-vindas",

  // Avisos automáticos na sala "channel" (ver src/avisos.js).
  // Horários no fuso "timeZone" (servidores da América do Sul = horário de Brasília).
  // Para mudar um horário, edite a lista "hours" e publique de novo.
  avisos: {
    channel: "📢・avisos-rotações-aion2",
    aliases: ["📢・avisos-aion-2"],
    timeZone: "America/Sao_Paulo",
    mention: "@everyone",
    steamAppId: 3393110, // Aion 2 na Steam: a NCSoft publica lá os comunicados oficiais
    newsEveryMinutes: 10,
    events: [
      {
        key: "fenda", name: "Fenda (Rift)", emoji: "🌀", color: 0x8E44AD, mention: "@everyone",
        hours: [2, 5, 8, 11, 14, 17, 20, 23], minute: 0, leadMinutes: 5,
        description: "Os portais da Fenda ficam abertos só **10 minutos**. Entrou, você tem cerca de **1 hora** no território inimigo.\n" +
          "⚔️ Bora de grupo: chama a galera em **⚔️・PvP 1** ou **🏰・Guerra de Facções 1**!"
      },
      {
        key: "shugo", name: "Festival Shugo", emoji: "🎪", color: 0xF1C40F, mention: "@everyone",
        hours: Array.from({ length: 24 }, (_, h) => h), minute: 0, leadMinutes: 5,
        description: "Minigame valendo recompensa em **Verteron** e **Altgard**. Entre pelo **Menu Principal → Shugo Festival** durante o lobby de 3 minutos.\n" +
          "🔑 A Chave de Recompensa dobra o prêmio (recarrega às 16h)."
      },
      {
        key: "invasao", name: "Invasão Dimensional", emoji: "👹", color: 0xC0392B, mention: "@everyone",
        hours: Array.from({ length: 24 }, (_, h) => h), minute: 30, leadMinutes: 5,
        description: "Pode ser **Assalto dos Espíritos**, **Ataque Aéreo de Beritra** ou **Espada Amaldiçoada** — defesa contra ondas de inimigos e chefe.\n" +
          "📍 A entrada aparece no mapa em **Verteron** ou **Altgard**. Lobby de **3 minutos**, rodada de **10 minutos**; dá para ir sozinho.\n" +
          "🔑 Chave de Recompensa da Invasão Dimensional: máximo 7, ganha +1 por dia às 16h."
      },
      {
        key: "arena", name: "Arena Tática 10x10", emoji: "🏟️", color: 0x3498DB, mention: "@everyone",
        hours: [11, 19], minute: 0, leadMinutes: 5,
        description: "Arena de times **10 contra 10**, partidas de 10 minutos.\n" +
          "🕒 Aberta das **11h às 14h** e das **19h às 21h**. Junta a legião em **⚔️・PvP 1**!"
      },
      {
        key: "cerco", name: "Cerco ao Artefato", emoji: "🏯", color: 0xD35400, mention: "@everyone",
        days: [1, 4, 6], hours: [21], minute: 0, leadMinutes: 10,
        description: "Guerra pelos artefatos no Abismo (segunda, quinta e sábado às 21h). O Corredor do Abismo fica aberto só **5 minutos**!\n" +
          "🏰 Todo mundo em **🏰・Guerra de Facções 1**."
      }
    ]
  },

  // Categorias antigas que são apagadas quando ficam vazias
  obsoleteCategories: ["Canais de Voz"],

  games: {
    aion2: {
      key: "aion2",
      title: "Aion 2",
      customId: "select_aion2",
      emoji: "⚔️",
      placeholder: "⚔️ Selecione sua(s) classe(s) no AION 2...",
      exclusive: false, // Pode ter mais de uma classe (ex: Main e Alt)
      minValues: 0,
      maxValues: 2,
      // Cargo que libera as salas do jogo
      parentRole: {
        id: "game_aion2",
        name: "🎮┃Aion 2",
        color: "#9B59B6",
        description: "Acesso às salas de Aion 2"
      },
      roles: classes
    }
  }
};
