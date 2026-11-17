const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const db = require("../database/db");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("categorias")
    .setDescription("Lista todas as categorias com estatísticas de eventos e presenças"),

  async execute(interaction) {
    const categories = db.getCategories();

    if (!categories.length) {
      return interaction.reply({
        content: "📭 Nenhuma categoria criada ainda. Use `/categoria-criar` para adicionar.",
        ephemeral: true,
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
      .setFooter({ text: "Use /ranking categoria:<nome> para ver o ranking de cada uma" })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
