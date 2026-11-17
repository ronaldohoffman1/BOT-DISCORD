const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const db = require("../database/db");
const { buildEventEmbed, buildEventComponents } = require("../utils/attendanceEmbed");
const { isEventLeader } = require("../guildGuides");

async function refreshEventEmbed(client, eventId) {
  const event = db.getEventById(eventId);
  if (!event?.message_id || !event?.channel_id) return;
  try {
    const channel = await client.channels.fetch(event.channel_id);
    const message = await channel.messages.fetch(event.message_id);
    const attendance = db.getAttendance(eventId);
    if (channel.guild && attendance.length > 0) {
      try {
        const fetched = await channel.guild.members.fetch({
          user: attendance.map(a => a.user_id)
        });
        for (const a of attendance) {
          const m = fetched.get(a.user_id);
          if (m && m.displayName !== a.username) {
            db.checkIn(event.id, a.user_id, m.displayName);
            a.username = m.displayName;
          }
        }
      } catch {}
    }
    await message.edit({
      embeds: [buildEventEmbed(event, attendance, channel.guild)],
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
    if (!isEventLeader(interaction)) {
      return interaction.reply({
        content: "❌ **Acesso Negado**: Apenas a liderança (**Administrador, Comandante, Sub Comandante ou Oficial**) pode usar este comando.",
        ephemeral: true,
      });
    }

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

    const member = await interaction.guild?.members?.fetch(target.id).catch(() => null);
    const displayName = member?.displayName || target.displayName || target.username;

    if (sub === "add") {
      if (db.hasCheckedIn(eventId, target.id)) {
        return interaction.reply({
          content: `⚠️ **${displayName}** já está registrado em **${event.name}**.`,
          ephemeral: true,
        });
      }
      db.checkIn(eventId, target.id, displayName);
      await refreshEventEmbed(interaction.client, eventId);
      return interaction.reply({
        content: `✅ **${displayName}** adicionado ao evento **${event.name}**.`,
        ephemeral: true,
      });
    }

    if (sub === "remover") {
      if (!db.hasCheckedIn(eventId, target.id)) {
        return interaction.reply({
          content: `⚠️ **${displayName}** não está registrado em **${event.name}**.`,
          ephemeral: true,
        });
      }
      db.checkOut(eventId, target.id);
      await refreshEventEmbed(interaction.client, eventId);
      return interaction.reply({
        content: `✅ Presença de **${displayName}** removida do evento **${event.name}**.`,
        ephemeral: true,
      });
    }
  },
};
