const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const db = require("../database/db");

const EMBED_DESC_LIMIT = 4096;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("evento-listar")
    .setDescription("Lista os eventos abertos ou todos os eventos")
    .addBooleanOption((opt) =>
      opt.setName("todos").setDescription("Mostrar todos (incluindo fechados)?").setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const showAll = interaction.options.getBoolean("todos") ?? false;
    let events = showAll ? db.getAllEvents() : db.getOpenEvents();

    if (!events.length && interaction.guild) {
      try {
        const { syncAllOpenCards } = require("../guildGuides");
        await syncAllOpenCards(interaction.client);
        events = showAll ? db.getAllEvents() : db.getOpenEvents();
      } catch {}
    }

    if (!events.length) {
      return interaction.editReply({
        content: showAll ? "📭 Nenhum evento cadastrado." : "📭 Nenhum evento aberto no momento.",
      });
    }

    const lines = events.map((e) => {
      const status = e.is_open ? "🟢" : "🔴";
      return `${status} \`ID ${e.id}\` **${e.name}** — ${e.created_at}`;
    });

    // Trunca para não ultrapassar o limite de 4096 chars do embed
    let description = "";
    let truncated = false;
    for (const line of lines) {
      if (description.length + line.length + 1 > EMBED_DESC_LIMIT - 50) {
        truncated = true;
        break;
      }
      description += (description ? "\n" : "") + line;
    }
    if (truncated) description += "\n*… lista truncada. Use `/evento-listar todos:true` com filtros.*";

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(showAll ? "📋 Todos os eventos" : "📋 Eventos abertos")
      .setDescription(description)
      .setFooter({ text: "Kokushibo • Lista de Eventos • Sumirá em 1m" })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
    setTimeout(() => interaction.deleteReply().catch(() => {}), 60000);
  },
};
