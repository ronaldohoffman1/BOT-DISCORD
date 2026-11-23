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
    await interaction.deferReply({ ephemeral: true });

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
        return interaction.editReply({
          content: "❌ Você precisa da permissão **Gerenciar Eventos** para ver o histórico de outros membros.",
        });
      }
    }

    const target = targetUser ?? interaction.user;
    const targetMember = await interaction.guild?.members?.fetch(target.id).catch(() => null);
    const targetDisplayName = targetMember?.displayName || target.displayName || target.username;
    const stats = db.getUserStats(target.id, category);

    if (!stats) {
      const scope = category ? ` na categoria **${category}**` : "";
      return interaction.editReply({
        content: isSelf
          ? `📭 Você ainda não tem nenhuma presença registrada${scope}.`
          : `📭 **${targetDisplayName}** não tem nenhuma presença registrada${scope}.`,
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
      ? `📊 ${targetDisplayName} — ${category}`
      : `📊 ${targetDisplayName} — Histórico Geral`;

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
    embed.setFooter({ text: "Kokushibo • Seu Histórico • Sumirá em 1m" });

    await interaction.editReply({ embeds: [embed] });
    setTimeout(() => interaction.deleteReply().catch(() => {}), 60000);
  },
};
