/**
 * Configuração dos Jogos, Classes, Medalhas, Elos e Salas para a Guilda.
 * Emojis e organização visual profissional estilo eSports/MMO.
 */

module.exports = {
  botName: "Akaza BOT",
  embedColor: 0x5865F2,

  // Categorias fixas do topo do servidor (antes da área dos Gods e dos jogos).
  // "aliases" = nomes antigos: a categoria/sala é renomeada em vez de recriada.
  // readOnly = membros leem mas não escrevem (regras, anúncios, escolha de cargos).
  serverLayout: [
    {
      name: "📌┃INÍCIO",
      channels: [
        { name: "📜・regras", type: "text", readOnly: true, topic: "Regras da guilda Fight Kings" },
        { name: "📢・anúncios", type: "text", readOnly: true, topic: "Avisos oficiais da guilda" },
        { name: "🎭・escolha-de-cargos", type: "text", readOnly: true, aliases: ["escolha-de-cargos"], topic: "Escolha aqui as tags dos jogos que você joga" }
      ]
    },
    {
      name: "🏆┃FIGHT KINGS",
      aliases: ["💬┃COMUNIDADE", "Canais de Texto"],
      channels: [
        { name: "💬・geral", type: "text", aliases: ["geral"] },
        { name: "📝・recrutamento", type: "text", topic: "Quer entrar na guilda? Apresente-se aqui: nick, jogos, classe/elo e horários" },
        { name: "🎵・toque-sua-música", type: "text", aliases: ["toque-sua-música"] },
        { name: "🔊・Bate Papo", type: "voice", aliases: ["Bate Papo"] },
        { name: "🎙️・Recrutamento", type: "voice" },
        { name: "💤┃Ausente (AFK)", type: "voice" }
      ]
    }
  ],
  // Categorias antigas que são apagadas quando ficam vazias
  obsoleteCategories: ["Canais de Voz"],

  // Jogos suportados pela guilda
  games: {
    aion2: {
      key: "aion2",
      title: "Aion 2",
      customId: "select_aion2",
      emoji: "⚔️",
      categoryName: "⚔️┃AION 2",
      placeholder: "⚔️ Selecione sua(s) classe(s) no AION 2...",
      exclusive: false, // Pode ter mais de uma classe (ex: Main e Alt)
      minValues: 0,
      maxValues: 2,
      // Cargo principal que dá acesso às salas do jogo
      parentRole: {
        id: "game_aion2",
        name: "🎮┃Aion 2",
        color: "#9B59B6",
        description: "Acesso aos canais e comunidade de Aion 2"
      },
      // Classes individuais
      roles: [
        { id: "aion_gladiador", name: "⚔️┃Gladiador", emoji: "⚔️", color: "#E74C3C", description: "Dano corpo a corpo e controle com lança/espada" },
        { id: "aion_templario", name: "🛡️┃Templário", emoji: "🛡️", color: "#3498DB", description: "Tanque principal, escudo e alta defesa" },
        { id: "aion_ranger", name: "🏹┃Arqueiro", emoji: "🏹", color: "#2ECC71", description: "Combate à distância com arco e armadilhas" },
        { id: "aion_assassino", name: "🗡️┃Assassino", emoji: "🗡️", color: "#8E44AD", description: "Furtividade, venenos e dano crítico explosivo" },
        { id: "aion_feiticeiro", name: "🔥┃Feiticeiro", emoji: "🔥", color: "#E67E22", description: "Magias poderosas de fogo, gelo e explosão" },
        { id: "aion_invocador", name: "🔮┃Invocador", emoji: "🔮", color: "#16A085", description: "Invoca espíritos elementais e lança debuffs" },
        { id: "aion_clerigo", name: "💖┃Clérigo", emoji: "💖", color: "#F1C40F", description: "Curandeiro supremo e suporte de grupo" },
        { id: "aion_cantor", name: "📜┃Chanter", emoji: "📜", color: "#F39C12", description: "Buffs, mantras e suporte híbrido corpo a corpo" }
      ],
      // Salas do jogo. "aliases" = nomes antigos (a sala é renomeada em vez de recriada).
      // Salas da categoria que não estão aqui são apagadas pelo /criar-salas se estiverem vazias.
      channels: [
        { name: "💬・chat-aion", type: "text", topic: "Bate-papo geral sobre o universo de Aion 2", aliases: ["💬・chat-geral-aion"] },
        { name: "🔍・procurar-pt", type: "text", topic: "Encontre grupos e jogadores para masmorras, chefes e PvP" },
        {
          name: "📚・builds-e-guias", type: "forum", topic: "Um post por build ou guia. Use a etiqueta da classe!",
          aliases: ["📢・guias-e-builds", "💡・tips-e-guias-aion"],
          tags: [
            { name: "Gladiador", emoji: "⚔️" }, { name: "Templário", emoji: "🛡️" },
            { name: "Arqueiro", emoji: "🏹" }, { name: "Assassino", emoji: "🗡️" },
            { name: "Feiticeiro", emoji: "🔥" }, { name: "Invocador", emoji: "🔮" },
            { name: "Clérigo", emoji: "💖" }, { name: "Chanter", emoji: "📜" },
            { name: "Guia", emoji: "💡" }, { name: "PvP", emoji: "⚔️" }, { name: "PvE", emoji: "🐉" }
          ]
        },
        { name: "📢・clipes-aion", type: "text", topic: "Compartilhe prints, clipes e jogadas de Aion 2" },
        { name: "🔊・Aion PT 1", type: "voice" },
        { name: "🔊・Aion PT 2", type: "voice", aliases: ["🔊・Aion PT Masmorra"] },
        { name: "🔊・Aion PvP / Raid", type: "voice", aliases: ["🔊・Aion PT PvP / Raid"] }
      ]
    },

    dota2: {
      key: "dota2",
      title: "Dota 2",
      customId: "select_dota2",
      emoji: "🛡️",
      categoryName: "🛡️┃DOTA 2",
      placeholder: "🛡️ Selecione sua medalha no DOTA 2...",
      exclusive: true, // Apenas uma medalha ativa
      minValues: 0,
      maxValues: 1,
      parentRole: {
        id: "game_dota2",
        name: "🎮┃Dota 2",
        color: "#E74C3C",
        description: "Acesso aos canais e comunidade de Dota 2"
      },
      roles: [
        { id: "dota_arauto", name: "🥉┃Dota: Arauto", emoji: "🥉", color: "#7F8C8D", description: "Medalha Arauto (Herald)" },
        { id: "dota_guardiao", name: "🥉┃Dota: Guardião", emoji: "🥉", color: "#95A5A6", description: "Medalha Guardião (Guardian)" },
        { id: "dota_cruzado", name: "🥈┃Dota: Cruzado", emoji: "🥈", color: "#BDC3C7", description: "Medalha Cruzado (Crusader)" },
        { id: "dota_arconte", name: "🥈┃Dota: Arconte", emoji: "🥈", color: "#D35400", description: "Medalha Arconte (Archon)" },
        { id: "dota_lenda", name: "🥇┃Dota: Lenda", emoji: "🥇", color: "#C0392B", description: "Medalha Lenda (Legend)" },
        { id: "dota_ancestral", name: "🥇┃Dota: Ancestral", emoji: "🥇", color: "#8E44AD", description: "Medalha Ancestral (Ancient)" },
        { id: "dota_divino", name: "💎┃Dota: Divino", emoji: "💎", color: "#2980B9", description: "Medalha Divino (Divine)" },
        { id: "dota_imortal", name: "👑┃Dota: Imortal", emoji: "👑", color: "#F1C40F", description: "Medalha Imortal (Immortal)" },
        { id: "dota_casual", name: "🕹️┃Dota: Casual", emoji: "🕹️", color: "#7F8C8D", description: "Partidas Casuais / Turbo / Sem Rank" }
      ],
      channels: [
        { name: "💬・chat-dota", type: "text", topic: "Bate-papo geral sobre Dota 2", aliases: ["💬・chat-geral-dota"] },
        { name: "⚔️・procurar-partida", type: "text", topic: "Chame membros para fechar duo, trio ou stack" },
        {
          name: "📚・builds-e-guias", type: "forum", topic: "Um post por build, herói ou guia. Use as etiquetas!",
          aliases: ["💡・tips-e-builds-dota"],
          tags: [
            { name: "Carry", emoji: "⚔️" }, { name: "Mid", emoji: "🎯" }, { name: "Offlane", emoji: "🛡️" },
            { name: "Suporte", emoji: "💖" }, { name: "Meta / Patch", emoji: "📈" }, { name: "Guia", emoji: "💡" }
          ]
        },
        { name: "📢・clipes-dota", type: "text", topic: "Compartilhe jogadas épicas e clipes", aliases: ["📢・clipes-e-jogadas"] },
        { name: "🔊・Dota Duo / Trio", type: "voice" },
        { name: "🔊・Dota Stack 1", type: "voice", aliases: ["🔊・Dota Full Stack (5x5)"] },
        { name: "🔊・Dota Stack 2", type: "voice" }
      ]
    },

    conan: {
      key: "conan",
      title: "Conan Exiles",
      customId: "select_conan",
      emoji: "🏕️",
      categoryName: "🏕️┃CONAN EXILES",
      placeholder: "🏕️ Selecione seu modo no CONAN EXILES...",
      exclusive: false,
      minValues: 0,
      maxValues: 3,
      parentRole: {
        id: "game_conan",
        name: "🎮┃Conan Exiles",
        color: "#D35400",
        description: "Acesso aos canais e comunidade de Conan Exiles"
      },
      roles: [
        { id: "conan_pve", name: "🏰┃Conan: PvE", emoji: "🏰", color: "#27AE60", description: "Exploração, construção e masmorras" },
        { id: "conan_pvp", name: "⚔️┃Conan: PvP", emoji: "⚔️", color: "#C0392B", description: "Raids de clãs, batalhas e guerras territoriais" },
        { id: "conan_pvec", name: "⚖️┃Conan: PvE-Conflito", emoji: "⚖️", color: "#E67E22", description: "Construção segura com PvP em horários marcados" }
      ],
      channels: [
        { name: "💬・chat-conan", type: "text", topic: "Bate-papo geral sobre Conan Exiles", aliases: ["💬・chat-geral-conan"] },
        { name: "⚔️・raids-e-guerra", type: "text", topic: "Estratégia de guerras, ataques, defesas de clã e PvP", aliases: ["⚔️・raids-e-pvp"] },
        {
          name: "📚・guias-e-bases", type: "forum", topic: "Um post por guia, base ou rota. Use as etiquetas!",
          aliases: ["💡・tips-e-guias-conan", "🏰・bases-e-construcao", "🌾・farm-e-rotas"],
          tags: [
            { name: "Base / Construção", emoji: "🏰" }, { name: "Farm / Rotas", emoji: "🌾" },
            { name: "Thralls", emoji: "⛓️" }, { name: "PvP / Raid", emoji: "⚔️" }, { name: "Guia", emoji: "💡" }
          ]
        },
        { name: "🔊・Voz Clã Conan", type: "voice" },
        { name: "🔊・Conan Farm / PvE", type: "voice", aliases: ["🔊・Conan Farm"] },
        { name: "🔊・Conan PvP / Raid", type: "voice", aliases: ["🔊・Conan Raid / Guerra"] }
      ]
    },

    valorant: {
      key: "valorant",
      title: "Valorant",
      customId: "select_valorant",
      emoji: "🎯",
      categoryName: "🎯┃VALORANT",
      placeholder: "🎯 Selecione seu elo no VALORANT...",
      exclusive: true, // Apenas um elo por vez
      minValues: 0,
      maxValues: 1,
      parentRole: {
        id: "game_valorant",
        name: "🎮┃Valorant",
        color: "#FD4556",
        description: "Acesso aos canais e comunidade de Valorant"
      },
      roles: [
        { id: "vlr_ferro", name: "⚪┃VLR: Ferro", emoji: "⚪", color: "#5D6D7E", description: "Elo Ferro (Iron)" },
        { id: "vlr_bronze", name: "🟤┃VLR: Bronze", emoji: "🟤", color: "#A0522D", description: "Elo Bronze" },
        { id: "vlr_prata", name: "⚪┃VLR: Prata", emoji: "⚪", color: "#BDC3C7", description: "Elo Prata (Silver)" },
        { id: "vlr_ouro", name: "🟡┃VLR: Ouro", emoji: "🟡", color: "#F39C12", description: "Elo Ouro (Gold)" },
        { id: "vlr_platina", name: "🟢┃VLR: Platina", emoji: "🟢", color: "#16A085", description: "Elo Platina (Platinum)" },
        { id: "vlr_diamante", name: "🟣┃VLR: Diamante", emoji: "🟣", color: "#8E44AD", description: "Elo Diamante (Diamond)" },
        { id: "vlr_ascendente", name: "🟢┃VLR: Ascendente", emoji: "🟢", color: "#27AE60", description: "Elo Ascendente (Ascendant)" },
        { id: "vlr_imortal", name: "🔴┃VLR: Imortal", emoji: "🔴", color: "#C0392B", description: "Elo Imortal (Immortal)" },
        { id: "vlr_radiante", name: "🌟┃VLR: Radiante", emoji: "🌟", color: "#F1C40F", description: "Elo Radiante (Radiant)" },
        { id: "vlr_sem_rank", name: "🕹️┃VLR: Casual", emoji: "🕹️", color: "#95A5A6", description: "Sem Classificação / Apenas modos casuais" }
      ],
      channels: [
        { name: "💬・chat-valorant", type: "text", topic: "Bate-papo geral de Valorant", aliases: ["💬・chat-geral-valorant"] },
        { name: "🎯・procurar-duo-trio", type: "text", topic: "Chame pessoas com elos compatíveis para ranked" },
        {
          name: "📚・guias-e-lineups", type: "forum", topic: "Um post por lineup, agente ou tática. Use as etiquetas!",
          aliases: ["💡・tips-e-lineups"],
          tags: [
            { name: "Lineup", emoji: "🎯" }, { name: "Agente", emoji: "🦸" }, { name: "Mapa", emoji: "🗺️" },
            { name: "Tática", emoji: "🧠" }, { name: "Guia", emoji: "💡" }
          ]
        },
        { name: "📢・clipes-valorant", type: "text", topic: "Compartilhe seus clutches e jogadas", aliases: ["📢・clipes-e-jogadas"] },
        { name: "🔊・Valorant Duo / Trio", type: "voice", aliases: ["🔊・Ranked Trio"] },
        { name: "🔊・Valorant Full Team 1", type: "voice", aliases: ["🔊・Valorant Full Team (5v5)", "🔊・Ranked Full Team"] },
        { name: "🔊・Valorant Full Team 2", type: "voice" }
      ]
    }
  }
};
