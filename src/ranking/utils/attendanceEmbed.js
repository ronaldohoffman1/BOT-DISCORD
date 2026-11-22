const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const MAX_LIST = 20;

function formatStartAt(startAt) {
  if (!startAt) return null;
  // Converte "AAAA-MM-DD HH:MM" → "DD/MM/AAAA às HH:MM"
  const m = startAt.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}:\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]} às ${m[4]}` : startAt;
}

function buildEventEmbed(event, attendance, guild = null) {
  const total = attendance.length;
  const isOpen = !!event.is_open;

  let listText = "*Nenhum presente ainda.*";
  if (total > 0) {
    listText = attendance
      .slice(0, MAX_LIST)
      .map((a, i) => {
        const member = guild?.members?.cache?.get(a.user_id);
        const name = member?.displayName || a.username;
        return `\`${String(i + 1).padStart(2, "0")}.\` ${name}`;
      })
      .join("\n");
    if (total > MAX_LIST) listText += `\n*… e mais ${total - MAX_LIST} membro(s)*`;
  }

  const embed = new EmbedBuilder()
    .setColor(isOpen ? 0x57f287 : 0xed4245)
    .setTitle(`${isOpen ? "📋" : "🔒"} ${event.name}`)
    .setDescription(event.description || "*Sem descrição*");

  const startFormatted = formatStartAt(event.start_at);
  if (startFormatted) {
    embed.addFields({ name: "🗓 Data e Hora", value: startFormatted, inline: true });
  }

  embed
    .addFields(
      { name: "📂 Categoria", value: event.category || "Geral", inline: true },
      { name: `👥 Presentes — ${total}`, value: listText }
    )
    .setFooter({
      text: isOpen
        ? `ID: ${event.id} · criado por ${event.created_by}`
        : `Encerrado · ${total} presença${total !== 1 ? "s" : ""}`,
    })
    .setTimestamp();

  return embed;
}

function buildEventComponents(eventId, isOpen) {
  if (!isOpen) {
    return [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`pa:${eventId}`)
          .setLabel("🔒 Evento Encerrado")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true)
      ),
    ];
  }

  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`pa:${eventId}`)
        .setLabel("✅ Confirmar Presença")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`pr:${eventId}`)
        .setLabel("❌ Remover Presença")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`lr:${eventId}`)
        .setLabel("🗑️ Remover Membro")
        .setStyle(ButtonStyle.Secondary)
    ),
  ];
}

module.exports = { buildEventEmbed, buildEventComponents };
