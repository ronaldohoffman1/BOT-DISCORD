const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const db = require("../database/db");

const MEDALS = ["🥇", "🥈", "🥉"];
const EMBED_DESC_LIMIT = 4096;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ranking")
    .setDescription("Exibe o ranking de presenças (geral ou por categoria)")
    .addStringOption((opt) =>
      opt
        .setName("categoria")
        .setDescription("Filtrar por categoria específica (deixe vazio para ranking geral)")
        .setRequired(false)
        .setAutocomplete(true)
        .setMaxLength(50)
    )
    .addIntegerOption((opt) =>
      opt
        .setName("top")
        .setDescription("Quantidade de membros no ranking (padrão: 10)")
        .setMinValue(1)
        .setMaxValue(50)
        .setRequired(false)
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
    const category = interaction.options.getString("categoria")?.trim() || null;
    const limit = interaction.options.getInteger("top") ?? 10;

    const ranking = category
      ? db.getRankingByCategory(category, limit)
      : db.getRanking(limit);

    if (!ranking.length) {
      const msg = category
        ? `📭 Nenhuma presença registrada na categoria **${category}**.`
        : "📭 Ainda não há presenças registradas.";
      return interaction.reply({ content: msg, ephemeral: true });
    }

    const lines = ranking.map((row, i) => {
      const medal = MEDALS[i] ?? `\`${String(i + 1).padStart(2, "0")}\``;
      return `${medal} **${row.username}** — ${row.total} presença${row.total !== 1 ? "s" : ""}`;
    });

    let description = "";
    for (const line of lines) {
      if (description.length + line.length + 1 > EMBED_DESC_LIMIT) break;
      description += (description ? "\n" : "") + line;
    }

    const title = category
      ? `🏆 Ranking — ${category} · Top ${ranking.length}`
      : `🏆 Ranking Geral · Top ${ranking.length}`;

    const embed = new EmbedBuilder()
      .setColor(0xfee75c)
      .setTitle(title)
      .setDescription(description)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
