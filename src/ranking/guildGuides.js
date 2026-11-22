const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits
} = require("discord.js");
const { ensureWarningRoles } = require("../warningManager");

const GOLD = 0xD4AF37;
const CRIMSON = 0x990000;
const BLUE = 0x3498DB;
const YELLOW = 0xF1C40F;

function normalize(str) {
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function findChannelByKeywords(guild, keywords) {
  return guild.channels.cache.find(c => {
    if (!c.isTextBased()) return false;
    const clean = normalize(c.name);
    return keywords.some(k => clean.includes(normalize(k)));
  });
}

/**
 * 1. Painel de Controle de Presenças
 */
function createPresencaGuideEmbed(guildName) {
  return new EmbedBuilder()
    .setColor(BLUE)
    .setTitle("🛡️ CONTROLE DE PRESENÇAS — FIGHT KINGS")
    .setDescription(
      `Bem-vindos ao canal oficial de **Controle de Presença** da legião **Fight Kings**!\n` +
      `Aqui o **Kokushibo** monitora, registra e organiza a participação de todos os membros nas atividades oficiais da guilda.\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
    )
    .addFields(
      {
        name: "📌 Conteúdos Oficiais Monitorados",
        value:
          "• 🏰 **Guerra do Abismo**: Conteúdo obrigatório de PvP e dominação.\n" +
          "• 🐉 **Ludra / Raids de Legião**: Bosses essenciais para progressão e farm de equipamentos.\n" +
          "• ⚔️ **Treinos & Eventos Especiais**: GvGs, arenas e dinâmicas da liderança."
      },
      {
        name: "🎮 Como Você (Membro) Confirma sua Presença",
        value:
          "1. **Card Interativo**: Quando a liderança criar um evento, um card aparecerá aqui nesta sala com os botões:\n" +
          "   ↳ Clique em **`[ ✅ Confirmar Presença ]`** para registrar seu nome.\n" +
          "   ↳ Clique em **`[ ❌ Remover Presença ]`** caso precise cancelar antes do fechamento.\n" +
          "   ↳ Líderes (**Comandante, Sub Comandante e Oficial de Elite**) têm o botão **`[ 🗑️ Remover Membro ]`** para remover alguém da lista.\n" +
          "2. **Por Comando de Barra**:\n" +
          "   ↳ `/presenca evento_id:<id>` — Confirma sua presença.\n" +
          "   ↳ `/remover-presenca evento_id:<id>` — Remove sua presença."
      },
      {
        name: "📊 Como Consultar seu Histórico e o Ranking",
        value:
          "• `/ranking` — Exibe o ranking geral dos membros mais assíduos.\n" +
          "• `/ranking categoria:Guerra` ou `categoria:Ludra` — Ranking filtrado.\n" +
          "• `/meu-historico` — Mostra o seu total de presenças e divisão por categorias.\n" +
          "• `/evento-listar` — Lista os eventos abertos ou encerrados."
      },
      {
        name: "👑 Ações Rápidas da Liderança (Botões com 1 Clique)",
        value:
          "• Clique em **`[ ➕ Criar Evento ]`** abaixo para abrir um formulário direto na tela e lançar o evento sem precisar digitar comando!\n" +
          "• Clique em **`[ 🔒 Encerrar Evento ]`** para selecionar e encerrar qualquer evento aberto na hora.\n" +
          "• Clique em **`[ 📜 Histórico de Eventos ]`** para consultar qualquer evento passado e ver a lista completa de presentes!\n" +
          "• *(Ou se preferir, use os comandos `/evento-criar`, `/evento-fechar`, `/painel-admin`)*"
      }
    )
    .setFooter({ text: "Kokushibo • Sistema Automatizado de Presenças • Fight Kings" })
    .setTimestamp();
}

function createPresencaButtons() {
  const rowMembers = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("btn_guia_historico")
      .setLabel("📊 Meu Histórico")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("btn_guia_ranking")
      .setLabel("🏆 Ver Ranking")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("btn_guia_eventos")
      .setLabel("📋 Eventos Abertos")
      .setStyle(ButtonStyle.Secondary)
  );

  const rowAdmins = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("btn_criar_evento")
      .setLabel("➕ Criar Evento")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("btn_encerrar_evento")
      .setLabel("🔒 Encerrar Evento")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("btn_historico_eventos")
      .setLabel("📜 Histórico de Eventos")
      .setStyle(ButtonStyle.Primary)
  );

  return [rowMembers, rowAdmins];
}

/**
 * 2. Painel de Sistema de Advertências e Regras
 */
function createAdvertenciasGuideEmbed() {
  return new EmbedBuilder()
    .setColor(YELLOW)
    .setTitle("⚠️ SISTEMA DE ADVERTÊNCIAS & DIRETRIZES DISCIPLINARES")
    .setDescription(
      "Para manter a harmonia, o respeito mútuo e a competitividade do clã, seguimos diretrizes claras de conduta. " +
      "A transparência e a assiduidade são fundamentais para todos os membros da **Fight Kings**.\n\n" +
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    )
    .addFields(
      {
        name: "🔄 Funcionamento do Sistema de Advertências",
        value:
          "• **Resete Mensal**: Todas as advertências acumuladas são zeradas no primeiro dia de cada mês, garantindo ficha limpa.\n" +
          "• **Limite de Punição**: Acumular **3 advertências** dentro do mesmo mês acarreta punição (rebaixamento de cargo, suspensão de conteúdos ou remoção da guilda, a depender da gravidade)."
      },
      {
        name: "📝 Motivos Comuns de Advertência",
        value:
          "1. **Ausência não justificada** em conteúdos obrigatórios (**Guerra / Ludra**) após confirmação.\n" +
          "2. **Falta de respeito** com membros do clã ou toxicidade no chat/voz.\n" +
          "3. **Descumprimento de ordens de comando** durante os conteúdos PvP/PvE conduzidos pela liderança.\n" +
          "4. **Inatividade prolongada sem aviso prévio** à liderança."
      },
      {
        name: "💡 Regra de Ausência & Punições no Jogo",
        value:
          "> 📌 *Punições/advertências de ausência são aplicadas somente se o membro estiver **ONLINE no jogo** e não comparecer aos conteúdos designados.*\n\n" +
          "> Se você avisar previamente no **#chat-guilda** que não poderá estar presente ou não estiver logado, **nenhuma advertência será aplicada!** O respeito ao seu tempo vem primeiro."
      },
      {
        name: "🏷️ Tags Oficiais de Advertência",
        value:
          "• `⚠️┃Advertência 1` — 1ª advertência do mês.\n" +
          "• `⚠️┃Advertência 2` — 2ª advertência do mês (Atenção redobrada!).\n" +
          "• `🚨┃Advertência 3` — 3ª advertência (Limite máximo! Punição/expulsão imediata)."
      },
      {
        name: "👑 Comandos da Liderança",
        value:
          "• `/advertencia aplicar membro:@user motivo:...` — Aplica advertência e atualiza a tag.\n" +
          "• `/advertencia remover membro:@user` — Remove 1 nível de advertência.\n" +
          "• `/advertencia limpar membro:@user` — Remove todas as advertências do membro.\n" +
          "• `/advertencia listar` — Lista todos os membros com advertências ativas.\n" +
          "• `/advertencia resetar-mes` — Executa o resete mensal de todos os membros."
      },
      {
        name: "🤖 Como o Kokushibo Ajuda?",
        value:
          "O Kokushibo mantém o registro oficial de cada evento. Se você tiver dúvidas sobre presença registrada, " +
          "consulte seu `/meu-historico` e procure um oficial no privado para esclarecimentos."
      }
    )
    .setFooter({ text: "Fight Kings • Diretrizes Disciplinares" })
    .setTimestamp();
}

/**
 * 3. Painel de Hierarquia & Registro de Alts
 */
function createHierarquiaGuideEmbed() {
  return new EmbedBuilder()
    .setColor(GOLD)
    .setTitle("🏛️ HIERARQUIA & REGISTRO DE ALTS — FIGHT KINGS")
    .setDescription(
      "Conheça a estrutura de liderança da guilda e as instruções para registro de personagens secundários (Alts).\n\n" +
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    )
    .addFields(
      {
        name: "👑 Estrutura de Cargos da Legião",
        value:
          "• `👑┃Comandante` — Líder geral da legião e responsável pelas diretrizes estratégicas.\n" +
          "• `⚜️┃Sub Comandante / Oficial de Elite` — Oficiais responsáveis pela condução de raids, guerras e gestão interna.\n" +
          "• `💠┃Nobre` — Cargo administrativo de gestão de eventos e presenças via Kokushibo.\n" +
          "• `🪽┃Legionário` — Membros efetivos que lutam e representam a Fight Kings no Aion 2."
      },
      {
        name: "🔄 Registro e Uso de Alts (Personagens Secundários)",
        value:
          "1. **Nick no Discord**: Seu apelido no servidor deve sempre corresponder ao nome do seu **Personagem Principal (Main)**.\n" +
          "2. **Participação com Alt**: Caso você vá a um conteúdo oficial (Guerra ou Ludra) com um Alt, " +
          "avise o líder do call na hora da confirmação.\n" +
          "3. **Contagem de Presença**: Como o **Kokushibo** registra a presença pelo seu **usuário do Discord**, " +
          "suas presenças e rankings ficam centralizadas na sua conta oficial, sem perda de pontos!"
      },
      {
        name: "🎭 Classes e Tags de Jogo",
        value:
          "Use a sala de escolha de classes com o **Akaza BOT** para definir sua classe principal e secundária. " +
          "Isso ajuda a liderança a montar composições de grupos equilibradas para Raids e Abismo."
      }
    )
    .setFooter({ text: "Fight Kings • Hierarquia e Organização" })
    .setTimestamp();
}

/**
 * Atualiza ou envia os guias nas 3 salas oficiais
 */
async function setupGuildRooms(guild, client, forceRefresh = false) {
  const results = [];

  // Garante que as tags de advertência existam no servidor
  try {
    const warnRoles = await ensureWarningRoles(guild);
    if (warnRoles.created.length > 0) {
      results.push(`🏷️ Tags de Advertência criadas: ${warnRoles.created.join(", ")}`);
    }
  } catch {}

  // 1. Sala de Controle de Presença
  const chPresenca = findChannelByKeywords(guild, ["controle-de-presenca", "presenca"]);
  if (chPresenca) {
    try {
      const msgs = await chPresenca.messages.fetch({ limit: 20 }).catch(() => null);
      const existing = msgs ? msgs.find(m => m.author.id === client.user.id && m.embeds.some(e => e.title?.includes("CONTROLE DE PRESENÇAS"))) : null;

      const embed = createPresencaGuideEmbed(guild.name);
      const components = createPresencaButtons();

      if (existing && !forceRefresh) {
        await existing.edit({ embeds: [embed], components });
        results.push(`✅ Guia atualizado em ${chPresenca.name}`);
      } else {
        if (existing && forceRefresh) await existing.delete().catch(() => {});
        await chPresenca.send({ embeds: [embed], components });
        results.push(`✨ Guia enviado em ${chPresenca.name}`);
      }
    } catch (err) {
      results.push(`⚠️ Erro em ${chPresenca.name}: ${err.message}`);
    }
  }

  // 2. Sala de Sistema de Advertências
  const chAdvertencias = findChannelByKeywords(guild, ["sistema-de-advertencias", "advertencias-e-regras", "advertencias"]);
  if (chAdvertencias) {
    try {
      const msgs = await chAdvertencias.messages.fetch({ limit: 20 }).catch(() => null);
      const existing = msgs ? msgs.find(m => m.author.id === client.user.id && m.embeds.some(e => e.title?.includes("SISTEMA DE ADVERTÊNCIAS"))) : null;

      const embed = createAdvertenciasGuideEmbed();

      if (existing && !forceRefresh) {
        await existing.edit({ embeds: [embed] });
        results.push(`✅ Guia atualizado em ${chAdvertencias.name}`);
      } else {
        if (existing && forceRefresh) await existing.delete().catch(() => {});
        await chAdvertencias.send({ embeds: [embed] });
        results.push(`✨ Guia enviado em ${chAdvertencias.name}`);
      }
    } catch (err) {
      results.push(`⚠️ Erro em ${chAdvertencias.name}: ${err.message}`);
    }
  }

  // 3. Sala de Hierarquia e Alts
  const chHierarquia = findChannelByKeywords(guild, ["hierarquia-registro-de-alts", "registro-de-alts", "hierarquia"]);
  if (chHierarquia) {
    try {
      const msgs = await chHierarquia.messages.fetch({ limit: 20 }).catch(() => null);
      const existing = msgs ? msgs.find(m => m.author.id === client.user.id && m.embeds.some(e => e.title?.includes("HIERARQUIA & REGISTRO"))) : null;

      const embed = createHierarquiaGuideEmbed();

      if (existing && !forceRefresh) {
        await existing.edit({ embeds: [embed] });
        results.push(`✅ Guia atualizado em ${chHierarquia.name}`);
      } else {
        if (existing && forceRefresh) await existing.delete().catch(() => {});
        await chHierarquia.send({ embeds: [embed] });
        results.push(`✨ Guia enviado em ${chHierarquia.name}`);
      }
    } catch (err) {
      results.push(`⚠️ Erro em ${chHierarquia.name}: ${err.message}`);
    }
  }

  return results;
}

/**
 * Verifica se o membro tem cargo de liderança (Comandante, Sub Comandante, Oficial, Elite, Gods, Nobre ou Admin)
 */
function isEventLeader(interaction) {
  const member = interaction.member;
  if (!member) return false;

  if (member.permissions?.has(PermissionFlagsBits.Administrator)) return true;
  if (member.permissions?.has(PermissionFlagsBits.ManageGuild)) return true;
  if (member.permissions?.has(PermissionFlagsBits.ManageEvents)) return true;

  const authorizedKeywords = [
    "comandante",
    "sub comandante",
    "sub-comandante",
    "oficial",
    "elite",
    "gods",
    "nobre",
    "p-admin",
    "admin"
  ];

  return member.roles?.cache?.some((r) => {
    const roleName = r.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return authorizedKeywords.some(keyword => roleName.includes(keyword));
  }) || false;
}

module.exports = {
  isEventLeader,
  setupGuildRooms,
  createPresencaGuideEmbed,
  createPresencaButtons,
  createAdvertenciasGuideEmbed,
  createHierarquiaGuideEmbed
};
