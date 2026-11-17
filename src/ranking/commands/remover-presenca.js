const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const db = require("../database/db");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("remover-presenca")
    .setDescription("Remove sua presença de um evento ainda aberto")
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
      return interaction.reply({ content: `🔒 O evento **${event.name}** já está encerrado.`, ephemeral: true });
    }
    if (!db.hasCheckedIn(eventId, interaction.user.id)) {
      return interaction.reply({
        content: `⚠️ Você não está registrado no evento **${event.name}**.`,
        ephemeral: true,
      });
    }

    db.checkOut(eventId, interaction.user.id);

    await interaction.reply({
      content: `✅ Presença removida do evento **${event.name}**.`,
      ephemeral: true,
    });
  },
};
