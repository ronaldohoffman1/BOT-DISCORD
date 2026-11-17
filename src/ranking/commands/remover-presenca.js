const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const db = require("../database/db");
const { buildEventEmbed, buildEventComponents } = require("../utils/attendanceEmbed");

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
      await interaction.reply({ content: `❌ Evento \`${eventId}\` não encontrado.`, ephemeral: true });
      setTimeout(() => interaction.deleteReply().catch(() => {}), 30000);
      return;
    }
    if (!event.is_open) {
      await interaction.reply({ content: `🔒 O evento **${event.name}** já está encerrado.`, ephemeral: true });
      setTimeout(() => interaction.deleteReply().catch(() => {}), 30000);
      return;
    }
    if (!db.hasCheckedIn(eventId, interaction.user.id)) {
      await interaction.reply({
        content: `⚠️ Você não está registrado no evento **${event.name}**.`,
        ephemeral: true,
      });
      setTimeout(() => interaction.deleteReply().catch(() => {}), 30000);
      return;
    }

    db.checkOut(eventId, interaction.user.id);

    const attendance = db.getAttendance(eventId);
    if (event.message_id && event.channel_id) {
      try {
        const channel = await interaction.client.channels.fetch(event.channel_id);
        const message = await channel.messages.fetch(event.message_id);
        await message.edit({
          embeds: [buildEventEmbed(event, attendance, channel.guild)],
          components: buildEventComponents(eventId, !!event.is_open),
        });
      } catch {}
    }

    await interaction.reply({
      content: `✅ Presença removida do evento **${event.name}**. *(Esta mensagem sumirá em 1m)*`,
      ephemeral: true,
    });
    setTimeout(() => interaction.deleteReply().catch(() => {}), 60000);
  },
};
