const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const db = require("../database/db");
const { buildEventEmbed, buildEventComponents } = require("../utils/attendanceEmbed");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("presenca")
    .setDescription("Confirma sua presença em um evento")
    .addIntegerOption((opt) =>
      opt.setName("evento_id").setDescription("ID do evento").setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const eventId = interaction.options.getInteger("evento_id");
    let event = db.getEventById(eventId);

    if (!event && interaction.guild) {
      try {
        const { syncAllOpenCards } = require("../guildGuides");
        await syncAllOpenCards(interaction.client);
        event = db.getEventById(eventId);
      } catch {}
    }

    if (!event) {
      return interaction.editReply({ content: `❌ Evento \`${eventId}\` não encontrado.` });
    }
    if (!event.is_open) {
      return interaction.editReply({ content: `🔒 O evento **${event.name}** está encerrado.` });
    }
    if (db.hasCheckedIn(eventId, interaction.user.id)) {
      return interaction.editReply({
        content: `⚠️ Você já confirmou presença no evento **${event.name}**.`,
      });
    }

    // Usa o apelido dentro do servidor (displayName)
    const displayName = interaction.member?.displayName || interaction.user.displayName || interaction.user.username;
    db.checkIn(eventId, interaction.user.id, displayName);

    const attendance = db.getAttendance(eventId);
    const total = attendance.length;

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle("✅ Presença confirmada!")
      .addFields(
        { name: "Evento", value: event.name, inline: true },
        { name: "Total de presentes", value: `**${total}**`, inline: true }
      )
      .setFooter({ text: `Registrado como ${displayName} • Sumirá em 1m` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
    setTimeout(() => interaction.deleteReply().catch(() => {}), 60000);

    // Se o evento tem painel de mensagem ativo, atualiza o embed ao vivo em background
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
  },
};
