const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

function normalize(str) {
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function findChannelByKeywords(guild, keywords) {
  return guild.channels.cache.find(c => {
    const clean = normalize(c.name);
    return keywords.some(k => clean.includes(normalize(k)));
  });
}

/**
 * Cria o embed explicativo do painel de advertências
 */
function createAdvertenciaPainelEmbed() {
  return new EmbedBuilder()
    .setColor(0xE74C3C)
    .setTitle("⚠️ SISTEMA DE ADVERTÊNCIAS — FIGHT KINGS ⚔️")
    .setDescription(
      "Este canal registra oficialmente todas as advertências disciplinares da legião **Fight Kings**.\n" +
      "O **Kokushibo** monitora e aplica as penalidades conforme as diretrizes da guilda.\n\n" +
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    )
    .addFields(
      {
        name: "📋 Como Funciona o Sistema",
        value:
          "• As advertências são aplicadas pela **liderança** (Comandante, Sub, Oficial)\n" +
          "• Cada advertência fica registrada com **motivo** e **data de expiração**\n" +
          "• Após **14 dias**, a tag de advertência é **removida automaticamente**\n" +
          "• O histórico permanece para controle interno da guilda"
      },
      {
        name: "🚨 Tabela de Penalidades",
        value:
          "⚠️ **1ª Advertência** — Aviso formal registrado\n" +
          "⚠️ **2ª Advertência** — Aviso grave, monitoramento intensificado\n" +
          "🚨 **3ª Advertência** — **KICK AUTOMÁTICO DA GUILDA** *(sem exceções)*"
      },
      {
        name: "⏰ Duração das Advertências",
        value:
          "• Cada advertência dura **14 dias** a partir da aplicação\n" +
          "• Após os 14 dias, a tag some **sozinha** sem precisar de ação manual\n" +
          "• Se receber nova advertência antes de expirar, o prazo **reinicia**"
      },
      {
        name: "📌 Motivos Comuns de Advertência",
        value:
          "• Falta em evento obrigatório **sem aviso prévio**\n" +
          "• Comportamento tóxico ou desrespeitoso com membros\n" +
          "• Descumprimento de regras de composição ou hierarquia\n" +
          "• Ausência reincidente sem justificativa"
      }
    )
    .setFooter({ text: "Kokushibo • Sistema Disciplinar • Fight Kings — Legião Lumiel" })
    .setTimestamp();
}

/**
 * Cria o botão de aplicar advertência
 */
function createAdvertenciaButton() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("btn_advertir_membro")
      .setLabel("⚠️ Aplicar Advertência")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("⚠️"),
    new ButtonBuilder()
      .setCustomId("btn_listar_advertencias")
      .setLabel("📋 Ver Advertidos")
      .setStyle(ButtonStyle.Secondary)
  );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("criar-categoria")
    .setDescription("Cria a categoria ⚔️ COMANDO & EVENTOS acima do Fight Kings com todos os canais")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  createAdvertenciaPainelEmbed,
  createAdvertenciaButton,

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const guild = interaction.guild;
    const client = interaction.client;
    const results = [];

    try {
      // 1. Localizar a categoria "Fight Kings" para posicionar acima dela
      const fkCategory = guild.channels.cache.find(c =>
        c.type === ChannelType.GuildCategory &&
        normalize(c.name).includes("fight kings")
      );

      // 2. Verificar se a categoria já existe
      let newCat = guild.channels.cache.find(c =>
        c.type === ChannelType.GuildCategory &&
        (normalize(c.name).includes("comando") || normalize(c.name).includes("eventos"))
      );

      if (!newCat) {
        newCat = await guild.channels.create({
          name: "⚔️ COMANDO & EVENTOS",
          type: ChannelType.GuildCategory,
          reason: "Criação da categoria de Comando & Eventos pelo /criar-categoria"
        });
        if (fkCategory) {
          await newCat.setPosition(fkCategory.position - 1).catch(() => {});
        }
        results.push(`✨ Categoria **${newCat.name}** criada!`);
      } else {
        results.push(`ℹ️ Categoria **${newCat.name}** já existe, usando ela.`);
      }

      // 3. Criar canal CONVOCAÇÃO EVENTO PVP (se não existir)
      let chPvp = findChannelByKeywords(guild, ["convocacao-pvp", "convocacao pvp", "evento-pvp"]);
      if (!chPvp) {
        chPvp = await guild.channels.create({
          name: "📢-convocação-pvp",
          type: ChannelType.GuildText,
          parent: newCat.id,
          reason: "Canal de convocação PvP"
        });
        results.push(`✨ Canal **${chPvp.name}** criado!`);
      } else {
        await chPvp.setParent(newCat.id, { lockPermissions: false });
        results.push(`📂 Canal **${chPvp.name}** movido para a nova categoria!`);
      }

      // 4. Criar canal CONVOCAÇÃO EVENTO PVE (se não existir)
      let chPve = findChannelByKeywords(guild, ["convocacao-pve", "convocacao pve", "evento-pve"]);
      if (!chPve) {
        chPve = await guild.channels.create({
          name: "⚔️-convocação-pve",
          type: ChannelType.GuildText,
          parent: newCat.id,
          reason: "Canal de convocação PvE"
        });
        results.push(`✨ Canal **${chPve.name}** criado!`);
      } else {
        await chPve.setParent(newCat.id, { lockPermissions: false });
        results.push(`📂 Canal **${chPve.name}** movido para a nova categoria!`);
      }

      // 5. Mover canal CONTROLE DE PRESENÇA
      const chPresenca = findChannelByKeywords(guild, ["controle-de-presenca", "presenca"]);
      if (chPresenca) {
        await chPresenca.setParent(newCat.id, { lockPermissions: false });
        results.push(`📂 Canal **${chPresenca.name}** movido!`);
      } else {
        results.push(`⚠️ Canal de controle de presença não encontrado.`);
      }

      // 6. Mover canal ANÚNCIOS
      const chAnuncios = findChannelByKeywords(guild, ["anuncios", "announcements"]);
      if (chAnuncios) {
        await chAnuncios.setParent(newCat.id, { lockPermissions: false });
        results.push(`📂 Canal **${chAnuncios.name}** movido!`);
      } else {
        results.push(`⚠️ Canal de anúncios não encontrado.`);
      }

      // 7. Mover canal SISTEMA DE ADVERTÊNCIAS
      const chAdvertencias = findChannelByKeywords(guild, ["sistema-de-advertencias", "advertencias-e-regras", "advertencias"]);
      if (chAdvertencias) {
        await chAdvertencias.setParent(newCat.id, { lockPermissions: false });
        results.push(`📂 Canal **${chAdvertencias.name}** movido!`);

        // Postar painel fixo de advertências (se ainda não houver)
        const msgs = await chAdvertencias.messages.fetch({ limit: 20 }).catch(() => null);
        const existing = msgs?.find(m =>
          m.author.id === client.user.id &&
          m.embeds.some(e => e.title?.includes("SISTEMA DE ADVERTÊNCIAS"))
        );

        if (!existing) {
          await chAdvertencias.send({
            embeds: [createAdvertenciaPainelEmbed()],
            components: [createAdvertenciaButton()]
          });
          results.push(`📋 Painel de Advertências postado em **${chAdvertencias.name}**!`);
        } else {
          await existing.edit({
            embeds: [createAdvertenciaPainelEmbed()],
            components: [createAdvertenciaButton()]
          });
          results.push(`🔄 Painel de Advertências atualizado em **${chAdvertencias.name}**!`);
        }
      } else {
        results.push(`⚠️ Canal de advertências não encontrado.`);
      }

      // 8. Mover canal CHAT DA GUILDA
      const chChat = findChannelByKeywords(guild, ["chat_guilda", "chat-guilda", "chatguilda"]);
      if (chChat) {
        await chChat.setParent(newCat.id, { lockPermissions: false });
        results.push(`📂 Canal **${chChat.name}** movido!`);
      } else {
        results.push(`⚠️ Canal chat da guilda não encontrado.`);
      }

      // 9. Ordenar os canais dentro da categoria
      // Ordem: pvp, pve, presença, anuncios, advertencias, chat
      const orderedChannels = [chPvp, chPve, chPresenca, chAnuncios, chAdvertencias, chChat].filter(Boolean);
      for (let i = 0; i < orderedChannels.length; i++) {
        try {
          await orderedChannels[i].setPosition(i, { relative: false });
        } catch {}
      }

      return interaction.editReply({
        content:
          `🏛️ **Categoria Organizada com Sucesso!**\n\n` +
          results.join("\n") +
          `\n\n✅ A categoria **⚔️ COMANDO & EVENTOS** está pronta com todos os canais!`
      });

    } catch (err) {
      console.error("Erro no /criar-categoria:", err);
      return interaction.editReply({
        content: `❌ Erro ao criar categoria: ${err.message}`
      });
    }
  }
};
