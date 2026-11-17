const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const db = require("../database/db");
const { buildEventEmbed, buildEventComponents } = require("../utils/attendanceEmbed");

async function refreshEventEmbed(client, eventId) {
  const event = db.getEventById(eventId);
  if (!event?.message_id || !event?.channel_id) return;
  try {
    const channel = await client.channels.fetch(event.channel_id);
    const message = await channel.messages.fetch(event.message_id);
    const attendance = db.getAttendance(eventId);
    await message.edit({
      embeds: [buildEventEmbed(event, attendance)],
      components: buildEventComponents(eventId, !!event.is_open),
    });
  } catch (err) {
    console.warn(`Não foi possível atualizar embed do evento ${eventId}:`, err.message);
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("presenca-admin")
    .setDescription("Gerencia presenças de membros em nome do admin")
    .addSubcommand((sub) =>
      sub
        .setName("add")
        .setDescription("Marca presença de um membro no evento")
        .addIntegerOption((opt) =>
          opt.setName("evento_id").setDescription("ID do evento").setRequired(true)
        )
        .addUserOption((opt) =>
          opt.setName("membro").setDescription("Membro a marcar presente").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("remover")
        .setDescription("Remove presença de um membro do evento")
        .addIntegerOption((opt) =>
          opt.setName("evento_id").setDescription("ID do evento").setRequired(true)
        )
        .addUserOption((opt) =>
          opt.setName("membro").setDescription("Membro a remover").setRequired(true)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const eventId = interaction.options.getInteger("evento_id");
    const target = interaction.options.getUser("membro");
    const event = db.getEventById(eventId);

    if (!event) {
      return interaction.reply({ content: `❌ Evento \`${eventId}\` não encontrado.`, ephemeral: true });
    }
    if (!event.is_open) {
      return interaction.reply({ content: `🔒 Evento **${event.name}** está encerrado.`, ephemeral: true });
    }

    if (sub === "add") {
      if (db.hasCheckedIn(eventId, target.id)) {
        return interaction.reply({
          content: `⚠️ **${target.tag}** já está registrado em **${event.name}**.`,
          ephemeral: true,
        });
      }
      db.checkIn(eventId, target.id, target.tag);
      await refreshEventEmbed(interaction.client, eventId);
      return interaction.reply({
        content: `✅ **${target.tag}** adicionado ao evento **${event.name}**.`,
        ephemeral: true,
      });
    }

    if (sub === "remover") {
      if (!db.hasCheckedIn(eventId, target.id)) {
        return interaction.reply({
          content: `⚠️ **${target.tag}** não está registrado em **${event.name}**.`,
          ephemeral: true,
        });
      }
      db.checkOut(eventId, target.id);
      await refreshEventEmbed(interaction.client, eventId);
      return interaction.reply({
        content: `✅ Presença de **${target.tag}** removida do evento **${event.name}**.`,
        ephemeral: true,
      });
    }
  },
};
