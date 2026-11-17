const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const db = require("../database/db");

const MAX_EVENTS_DESC = 3000;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("meu-historico")
    .setDescription("Exibe seu histórico de presenças com breakdown por categoria")
    .addUserOption((opt) =>
      opt.setName("membro").setDescription("Ver histórico de outro membro (mod)").setRequired(false)
    )
    .addStringOption((opt) =>
      opt
        .setName("categoria")
        .setDescription("Filtrar por categoria específica")
        .setRequired(false)
        .setAutocomplete(true)
        .setMaxLength(50)
    ),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused().toLowerCase();
    const choices = db.getCategoryNames()
      .filter((c) => c.toLowerCase().includes(focused))
      .slice(0, 25)
      .map((c) => ({ name: c, value: c }));
    await interaction.respond(choices);
  },

  async execute(interaction) {
    const targetUser = interaction.options.getUser("membro");
    const category = interaction.options.getString("categoria")?.trim() || null;
    const isSelf = !targetUser || targetUser.id === interaction.user.id;

    if (!isSelf) {
      const member = interaction.member;
      const hasPermission =
        member &&
        typeof member.permissions !== "string" &&
        member.permissions.has(PermissionFlagsBits.ManageEvents);

      if (!hasPermission) {
        return interaction.reply({
          content: "❌ Você precisa da permissão **Gerenciar Eventos** para ver o histórico de outros membros.",
          ephemeral: true,
        });
      }
    }

    const target = targetUser ?? interaction.user;
    const stats = db.getUserStats(target.id, category);

    if (!stats) {
      const scope = category ? ` na categoria **${category}**` : "";
      return interaction.reply({
        content: isSelf
          ? `📭 Você ainda não tem nenhuma presença registrada${scope}.`
          : `📭 **${target.tag}** não tem nenhuma presença registrada${scope}.`,
        ephemeral: true,
      });
    }

    // Breakdown por categoria (apenas no histórico geral)
    const breakdown = !category ? db.getUserCategoryBreakdown(target.id) : [];
    const breakdownText = breakdown.length
      ? breakdown.map((b) => `• **${b.category}**: ${b.total} presença${b.total !== 1 ? "s" : ""}`).join("\n")
      : null;

    const eventsList =
      stats.events && stats.events.length > MAX_EVENTS_DESC
        ? stats.events.slice(0, MAX_EVENTS_DESC) + "…"
        : stats.events || "*nenhum*";

    const title = category
      ? `📊 ${stats.username} — ${category}`
      : `📊 ${stats.username} — Histórico Geral`;

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(title)
      .setThumbnail(target.displayAvatarURL())
      .addFields({ name: "Total de presenças", value: `**${stats.total}**`, inline: true })
      .setTimestamp();

    if (breakdownText) {
      embed.addFields({ name: "Por categoria", value: breakdownText });
    }

    embed.addFields({ name: "Eventos participados", value: eventsList });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
