const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const db = require("../database/db");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("presenca")
    .setDescription("Confirma sua presença em um evento")
    .addIntegerOption((opt) =>
      opt.setName("evento_id").setDescription("ID do evento").setRequired(true)
    ),

  async execute(interaction) {
    const eventId = interaction.options.getInteger("evento_id");
    const event = db.getEventById(eventId);

    if (!event) {
      return interaction.reply({ content: `❌ Evento \`${eventId}\` não encontrado.`, ephemeral: true });
    }
    if (!event.is_open) {
      return interaction.reply({ content: `🔒 O evento **${event.name}** está encerrado.`, ephemeral: true });
    }
    if (db.hasCheckedIn(eventId, interaction.user.id)) {
      return interaction.reply({
        content: `⚠️ Você já confirmou presença no evento **${event.name}**.`,
        ephemeral: true,
      });
    }

    // Usa username atual — checkIn faz upsert para manter o nome sempre fresco
    db.checkIn(eventId, interaction.user.id, interaction.user.tag);

    const total = db.getAttendance(eventId).length;

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle("✅ Presença confirmada!")
      .addFields(
        { name: "Evento", value: event.name, inline: true },
        { name: "Total de presentes", value: `**${total}**`, inline: true }
      )
      .setFooter({ text: `Use /remover-presenca para cancelar sua confirmação` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
