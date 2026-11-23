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

function buildLudraEmbed(event, attendance = [], guild = null) {
  const isOpen = !!event.is_open;
  const tanks = attendance.filter(a => a.role === 'tank');
  const healers = attendance.filter(a => a.role === 'healer');
  const cantores = attendance.filter(a => a.role === 'cantor');
  const dps = attendance.filter(a => a.role === 'dps');
  const reservas = attendance.filter(a => a.role === 'reserva');

  const getName = (entry) => {
    if (!entry) return "*── (Vaga Aberta) ──*";
    const member = guild?.members?.cache?.get(entry.user_id);
    const name = member?.displayName || entry.username;
    return `**${name}**`;
  };

  const pt1 = [
    `\`01.\` 🛡️ **Main Tank:** ${getName(tanks[0])}`,
    `\`02.\` 💚 **Main Healer:** ${getName(healers[0])}`,
    `\`03.\` 🎵 **Cantor / Buffer:** ${getName(cantores[0])}`,
    `\`04.\` ⚔️ **DPS Melee:** ${getName(dps[0])}`,
    `\`05.\` 🏹 **DPS Ranged:** ${getName(dps[1])}`,
  ].join("\n");

  const pt2 = [
    `\`06.\` 🛡️ **Off Tank:** ${getName(tanks[1])}`,
    `\`07.\` 💚 **Off Healer:** ${getName(healers[1])}`,
    `\`08.\` 🎵 **Cantor / Buffer:** ${getName(cantores[1])}`,
    `\`09.\` 🔮 **Magic DPS:** ${getName(dps[2])}`,
    `\`10.\` 💥 **DPS Flex:** ${getName(dps[3])}`,
  ].join("\n");

  const totalMain = Math.min(10, tanks.length + healers.length + cantores.length + dps.length);

  let reservaText = "*Nenhum reserva no momento.*";
  if (reservas.length > 0) {
    reservaText = reservas.map((r, i) => {
      const member = guild?.members?.cache?.get(r.user_id);
      const name = member?.displayName || r.username;
      return `\`${String(i + 1).padStart(2, "0")}.\` 🔄 **${name}** *(Suplente)*`;
    }).join("\n");
  }

  const embed = new EmbedBuilder()
    .setColor(isOpen ? 0x990000 : 0x7289da) // Carmesim Dragão
    .setTitle(`🐉 RAID LUDRA — 10 MEMBROS ${isOpen ? "[ABERTA]" : "[ENCERRADA]"}`)
    .setDescription(
      event.description ||
      "🔥 **Raid Oficial de Legião — Fight Kings (Ludra)**\nConcentração no Discord com **15 minutos de antecedência**. Consumíveis, poções e pergaminhos prontos!"
    );

  const startFormatted = formatStartAt(event.start_at);
  if (startFormatted) {
    embed.addFields({ name: "🗓️ Data e Horário", value: `⏰ **${startFormatted}**`, inline: true });
  }

  embed.addFields(
    { name: "👥 Vagas Escaladas", value: `**${totalMain} / 10** vagas preenchidas`, inline: true },
    { name: "📂 Categoria", value: "🐉 Ludra (Raid 10p)", inline: true },
    { name: "🛡️ GRUPO 1 — PT Alpha", value: pt1 },
    { name: "⚔️ GRUPO 2 — PT Beta", value: pt2 },
    { name: `🔄 Banco de Reservas (${reservas.length})`, value: reservaText }
  );

  embed.setFooter({
    text: isOpen
      ? `ID: ${event.id} • Clique no botão da sua função para entrar • Fight Kings`
      : `Raid Encerrada • Total de participantes: ${attendance.length}`,
  }).setTimestamp();

  return embed;
}

function buildLudraComponents(eventId, isOpen, attendance = []) {
  if (!isOpen) {
    return [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`ludra_closed:${eventId}`)
          .setLabel("🔒 Raid Encerrada")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true)
      ),
    ];
  }

  const tanks = attendance.filter(a => a.role === 'tank');
  const healers = attendance.filter(a => a.role === 'healer');
  const cantores = attendance.filter(a => a.role === 'cantor');
  const dps = attendance.filter(a => a.role === 'dps');

  // Linha 1: Funções para os membros se escalarem com 1 clique
  const rowRoles = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`lj:tank:${eventId}`)
      .setLabel(`🛡️ Tank (${tanks.length}/2)`)
      .setStyle(tanks.length >= 2 ? ButtonStyle.Secondary : ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`lj:healer:${eventId}`)
      .setLabel(`💚 Healer (${healers.length}/2)`)
      .setStyle(healers.length >= 2 ? ButtonStyle.Secondary : ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`lj:cantor:${eventId}`)
      .setLabel(`🎵 Cantor (${cantores.length}/2)`)
      .setStyle(cantores.length >= 2 ? ButtonStyle.Secondary : ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`lj:dps:${eventId}`)
      .setLabel(`⚔️ DPS (${dps.length}/4)`)
      .setStyle(dps.length >= 4 ? ButtonStyle.Secondary : ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`lj:reserva:${eventId}`)
      .setLabel("🔄 Reserva")
      .setStyle(ButtonStyle.Secondary)
  );

  // Linha 2: Ações de gerenciamento (Sair, Escalar Membro, Remover)
  const rowActions = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`lr_leave:${eventId}`)
      .setLabel("❌ Sair da Raid")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`lr_escalar:${eventId}`)
      .setLabel("👑 Escalar Membro")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`lr_remove:${eventId}`)
      .setLabel("🗑️ Remover Alguém")
      .setStyle(ButtonStyle.Danger)
  );

  return [rowRoles, rowActions];
}

module.exports = {
  buildEventEmbed,
  buildEventComponents,
  buildLudraEmbed,
  buildLudraComponents
};
