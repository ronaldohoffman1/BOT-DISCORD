const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const db = require("../database/db");

const EMBED_DESC_LIMIT = 4096;
const truncate = (str, max) => (str.length > max ? str.slice(0, max - 1) + "…" : str);

module.exports = {
  data: new SlashCommandBuilder()
    .setName("presenca-listar")
    .setDescription("Lista todos os presentes em um evento")
    .addIntegerOption((opt) =>
      opt.setName("evento_id").setDescription("ID do evento").setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents),

  async execute(interaction) {
    const eventId = interaction.options.getInteger("evento_id");
    const event = db.getEventById(eventId);

    if (!event) {
      return interaction.reply({ content: `❌ Evento \`${eventId}\` não encontrado.`, ephemeral: true });
    }

    const attendance = db.getAttendance(eventId);

    if (!attendance.length) {
      return interaction.reply({
        content: `📭 Nenhuma presença registrada no evento **${event.name}**.`,
        ephemeral: true,
      });
    }

    const lines = attendance.map(
      (a, i) => `\`${String(i + 1).padStart(2, "0")}\` **${a.username}** — ${a.checked_in_at}`
    );

    // Monta descrição respeitando o limite de 4096 chars
    let description = "";
    let shown = 0;
    for (const line of lines) {
      if (description.length + line.length + 1 > EMBED_DESC_LIMIT - 60) break;
      description += (description ? "\n" : "") + line;
      shown++;
    }
    if (shown < attendance.length) {
      description += `\n*… e mais ${attendance.length - shown} presente(s) não exibido(s).*`;
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(truncate(`📋 Presenças — ${event.name}`, 256))
      .setDescription(description)
      .addFields({ name: "Total", value: `**${attendance.length}**`, inline: true })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
