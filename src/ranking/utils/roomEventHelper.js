const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const db = require("../database/db");
const { buildEventEmbed, buildEventComponents } = require("./attendanceEmbed");
const { isEventLeader, findChannelByKeywords } = require("../guildGuides");

function parseDateTime(date, hour) {
  const dateMatch = date.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const hourMatch = hour.match(/^(\d{2}):(\d{2})$/);
  if (!dateMatch || !hourMatch) return null;

  const [, d, m, y] = dateMatch;
  const [, hh, mm] = hourMatch;
  const dt = new Date(`${y}-${m}-${d}T${hh}:${mm}:00`);
  if (isNaN(dt.getTime())) return null;

  return { iso: `${y}-${m}-${d} ${hh}:${mm}`, display: `${d}/${m}/${y} às ${hh}:${mm}` };
}

function getTodayBr() {
  const brNow = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(brNow.getUTCDate())}/${pad(brNow.getUTCMonth() + 1)}/${brNow.getUTCFullYear()}`;
}

/**
 * Cria um slash command de convocação de evento direcionado para uma sala específica (PvP ou PvE).
 */
function createRoomEventCommand({ commandName, description, category, channelKeywords, titlePrefix }) {
  return {
    data: new SlashCommandBuilder()
      .setName(commandName)
      .setDescription(description)
      .addStringOption((opt) =>
        opt.setName("nome").setDescription("Nome do evento").setRequired(true).setMaxLength(100)
      )
      .addStringOption((opt) =>
        opt.setName("hora").setDescription("Hora de início (HH:MM, ex: 21:00)").setRequired(true).setMaxLength(5)
      )
      .addStringOption((opt) =>
        opt.setName("data").setDescription("Data (DD/MM/AAAA) — padrão: hoje").setRequired(false).setMaxLength(10)
      )
      .addStringOption((opt) =>
        opt.setName("descricao").setDescription("Descrição / orientações do evento").setRequired(false).setMaxLength(500)
      )
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents),

    async execute(interaction) {
      if (!isEventLeader(interaction)) {
        return interaction.reply({
          content: "❌ **Acesso Negado**: Apenas a liderança (**Comandante, Sub Comandante ou Oficial**) pode criar eventos.",
          ephemeral: true,
        });
      }

      await interaction.deferReply({ ephemeral: true });

      const rawName = interaction.options.getString("nome").trim();
      const hourStr = interaction.options.getString("hora").trim();
      const dateStr = (interaction.options.getString("data") || getTodayBr()).trim();
      const descriptionText = (interaction.options.getString("descricao") || "").trim();

      const parsed = parseDateTime(dateStr, hourStr);
      if (!parsed) {
        return interaction.editReply({
          content: "❌ Data ou hora inválida. Use o formato **DD/MM/AAAA** (ex: 26/11/2026) e **HH:MM** (ex: 21:00).",
        });
      }

      const eventName = titlePrefix ? `${titlePrefix} ${rawName}` : rawName;
      const creatorName = interaction.member?.displayName || interaction.user.displayName || interaction.user.username;

      const result = db.createEvent(eventName, descriptionText, creatorName, category, parsed.iso);
      const eventId = result.lastInsertRowid;
      const event = db.getEventById(eventId);

      const embed = buildEventEmbed(event, [], interaction.guild);
      const components = buildEventComponents(eventId, true);

      let targetChannel = interaction.guild
        ? findChannelByKeywords(interaction.guild, channelKeywords)
        : null;
      if (!targetChannel) targetChannel = interaction.channel;

      const msg = await targetChannel.send({ embeds: [embed], components });
      db.updateEventMessage(eventId, msg.id, targetChannel.id);

      return interaction.editReply({
        content: `✅ Evento **${eventName}** (${parsed.display}) criado em <#${targetChannel.id}>!\nOs membros já podem confirmar presença pelo botão usando seu nick atual do Discord.`,
      });
    },
  };
}

module.exports = { createRoomEventCommand };
