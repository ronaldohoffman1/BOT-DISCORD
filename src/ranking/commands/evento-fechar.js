const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const db = require("../database/db");
const { buildEventEmbed, buildEventComponents } = require("../utils/attendanceEmbed");
const { isEventLeader } = require("../guildGuides");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("evento-fechar")
    .setDescription("Fecha um evento e encerra o registro de presenças")
    .addIntegerOption((opt) =>
      opt.setName("id").setDescription("ID do evento a fechar").setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents),

  async execute(interaction) {
    if (!isEventLeader(interaction)) {
      return interaction.reply({
        content: "❌ **Acesso Negado**: Apenas a liderança (**Administrador, Comandante, Sub Comandante ou Oficial de Elite**) pode encerrar eventos.",
        ephemeral: true,
      });
    }

    const id = interaction.options.getInteger("id");
    const event = db.getEventById(id);

    if (!event) {
      return interaction.reply({ content: `❌ Evento \`${id}\` não encontrado.`, ephemeral: true });
    }
    if (!event.is_open) {
      return interaction.reply({ content: `⚠️ Evento \`${id}\` já está fechado.`, ephemeral: true });
    }

    db.closeEvent(id);
    const attendance = db.getAttendance(id);
    const closedEvent = db.getEventById(id);

    // Atualiza o embed ao vivo para estado "encerrado"
    if (event.message_id && event.channel_id) {
      try {
        const channel = await interaction.client.channels.fetch(event.channel_id);
        const message = await channel.messages.fetch(event.message_id);
        await message.edit({
          embeds: [buildEventEmbed(closedEvent, attendance, channel.guild)],
          components: buildEventComponents(id, false),
        });
      } catch (err) {
        console.warn(`Não foi possível atualizar o embed do evento ${id}:`, err.message);
      }
    }

    await interaction.reply({
      content: `🔒 Evento **${event.name}** encerrado com **${attendance.length}** presença(s).`,
      ephemeral: true,
    });
  },
};
