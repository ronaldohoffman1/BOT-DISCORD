const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const db = require("../database/db");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("categorias")
    .setDescription("Lista todas as categorias com estatísticas de eventos e presenças"),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const categories = db.getCategories();

    if (!categories.length) {
      return interaction.editReply({
        content: "📭 Nenhuma categoria criada ainda. Use `/categoria-criar` para adicionar.",
      });
    }

    const lines = categories.map((c) => {
      const openTag = c.open_events > 0 ? ` *(${c.open_events} aberto${c.open_events > 1 ? "s" : ""})*` : "";
      const desc = c.description ? `\n  *${c.description}*` : "";
      return (
        `**${c.name}**${openTag}${desc}\n` +
        `↳ ${c.total_events} evento${c.total_events !== 1 ? "s" : ""} · ` +
        `${c.total_attendances} presença${c.total_attendances !== 1 ? "s" : ""}`
      );
    });

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("📂 Categorias de Eventos")
      .setDescription(lines.join("\n\n"))
      .setFooter({ text: "Use /ranking categoria:<nome> • Sumirá em 1m" })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
    setTimeout(() => interaction.deleteReply().catch(() => {}), 60000);
  },
};
