const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require("discord.js");

function normalize(str) {
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function findChannelByKeywords(guild, keywords) {
  return guild.channels.cache.find(c => {
    const clean = normalize(c.name);
    return keywords.some(k => clean.includes(normalize(k)));
  });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("criar-categoria")
    .setDescription("Cria a categoria ⚔️ COMANDO & EVENTOS acima do Fight Kings com todos os canais")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const guild = interaction.guild;
    const results = [];

    try {
      // 1. Localizar a categoria "Fight Kings" para posicionar acima dela
      const fkCategory = guild.channels.cache.find(c =>
        c.type === ChannelType.GuildCategory &&
        normalize(c.name).includes("fight kings")
      );

      const targetPosition = fkCategory ? fkCategory.position : 0;

      // 2. Verificar se a categoria já existe
      let newCat = guild.channels.cache.find(c =>
        c.type === ChannelType.GuildCategory &&
        (normalize(c.name).includes("comando") || normalize(c.name).includes("eventos"))
      );

      if (!newCat) {
        newCat = await guild.channels.create({
          name: "⚔️ COMANDO & EVENTOS",
          type: ChannelType.GuildCategory,
          position: targetPosition,
          reason: "Criação da categoria de Comando & Eventos pelo /criar-categoria"
        });
        // Ajusta posição para ficar ACIMA do Fight Kings
        if (fkCategory) {
          await newCat.setPosition(fkCategory.position - 1).catch(() => {});
        }
        results.push(`✨ Categoria **${newCat.name}** criada!`);
      } else {
        results.push(`ℹ️ Categoria **${newCat.name}** já existe, usando ela.`);
      }

      // 3. Criar canal CONVOCAÇÃO EVENTO PVP (se não existir)
      let chPvp = findChannelByKeywords(guild, ["convocacao-pvp", "convocação-pvp", "convocacao pvp", "evento-pvp"]);
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
      let chPve = findChannelByKeywords(guild, ["convocacao-pve", "convocação-pve", "convocacao pve", "evento-pve"]);
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
      const chPresenca = findChannelByKeywords(guild, ["controle-de-presenca", "presenca", "presença"]);
      if (chPresenca) {
        await chPresenca.setParent(newCat.id, { lockPermissions: false });
        results.push(`📂 Canal **${chPresenca.name}** movido para a nova categoria!`);
      } else {
        results.push(`⚠️ Canal de controle de presença não encontrado.`);
      }

      // 6. Mover canal ANÚNCIOS
      const chAnuncios = findChannelByKeywords(guild, ["anuncios", "anúncios", "announcements"]);
      if (chAnuncios) {
        await chAnuncios.setParent(newCat.id, { lockPermissions: false });
        results.push(`📂 Canal **${chAnuncios.name}** movido para a nova categoria!`);
      } else {
        results.push(`⚠️ Canal de anúncios não encontrado.`);
      }

      // 7. Mover canal CHAT DA GUILDA
      const chChat = findChannelByKeywords(guild, ["chat_guilda", "chat-guilda", "chat guilda", "chatguilda"]);
      if (chChat) {
        await chChat.setParent(newCat.id, { lockPermissions: false });
        results.push(`📂 Canal **${chChat.name}** movido para a nova categoria!`);
      } else {
        results.push(`⚠️ Canal chat da guilda não encontrado.`);
      }

      // 8. Ordenar os canais dentro da categoria
      // Ordem desejada: pvp, pve, presença, anuncios, chat
      const orderedChannels = [chPvp, chPve, chPresenca, chAnuncios, chChat].filter(Boolean);
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
