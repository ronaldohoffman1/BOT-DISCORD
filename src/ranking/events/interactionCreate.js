const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");
const db = require("../database/db");
const { buildEventEmbed, buildEventComponents } = require("../utils/attendanceEmbed");

// ── Helpers ───────────────────────────────────────────────────────────────────

async function refreshMessage(interaction, event) {
  const attendance = db.getAttendance(event.id);
  await interaction.update({
    embeds: [buildEventEmbed(event, attendance)],
    components: buildEventComponents(event.id, !!event.is_open),
  });
}

const PADMIN_ROLE = "Nobre";

function isPAdmin(interaction) {
  if (interaction.member?.permissions?.has(PermissionFlagsBits.Administrator)) return true;
  if (interaction.member?.permissions?.has(PermissionFlagsBits.ManageEvents)) return true;
  return !!interaction.member?.roles?.cache?.some((r) =>
    r.name === PADMIN_ROLE || r.name === "P-Admin" || r.name === "Comandante" || r.name === "Elite"
  );
}

function parseUserIds(text) {
  const mentionRegex = /<@!?(\d{17,20})>/g;
  const rawIdRegex = /\b(\d{17,20})\b/g;
  const ids = new Set();
  let m;
  while ((m = mentionRegex.exec(text)) !== null) ids.add(m[1]);
  while ((m = rawIdRegex.exec(text)) !== null) ids.add(m[1]);
  return [...ids];
}

// Finaliza a criação do evento depois que a categoria é conhecida
async function finishEventCreation(interaction, category, pending) {
  const data = pending.get(interaction.user.id);
  if (!data) {
    return interaction.reply({ content: "❌ Sessão expirada. Use `/evento-criar` novamente.", ephemeral: true });
  }
  pending.delete(interaction.user.id);

  const result = db.createEvent(data.name, data.description, interaction.user.tag, category, data.startAt);
  const eventId = result.lastInsertRowid;
  const event = db.getEventById(eventId);

  const embed = buildEventEmbed(event, []);
  const components = buildEventComponents(eventId, true);

  // Edita a mensagem ephemeral de seleção com o embed público
  // e então posta o painel no canal
  await interaction.update({ content: "✅ Evento criado!", components: [], embeds: [] });

  const msg = await interaction.followUp({ embeds: [embed], components, fetchReply: true });
  db.updateEventMessage(eventId, msg.id, interaction.channelId);
}

// ── Slash Commands ────────────────────────────────────────────────────────────

async function handleSlash(interaction, commands) {
  const command = commands.get(interaction.commandName);
  if (!command) {
    console.warn(`⚠️ Comando desconhecido: ${interaction.commandName}`);
    return;
  }
  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(`Erro no comando ${interaction.commandName}:`, err);
    const msg = { content: "❌ Ocorreu um erro ao executar este comando.", ephemeral: true };
    try {
      if (interaction.replied || interaction.deferred) await interaction.followUp(msg);
      else await interaction.reply(msg);
    } catch {}
  }
}

// ── Select menus ──────────────────────────────────────────────────────────────

async function handleSelect(interaction, commands) {
  if (interaction.customId === "select_encerrar_evento") {
    if (!isPAdmin(interaction)) {
      return interaction.reply({
        content: "❌ Apenas a liderança pode encerrar eventos.",
        ephemeral: true,
      });
    }

    const eventId = parseInt(interaction.values[0]);
    const event = db.getEventById(eventId);
    if (!event || !event.is_open) {
      return interaction.update({
        content: "⚠️ Este evento já foi encerrado ou não foi encontrado.",
        components: [],
      });
    }

    db.closeEvent(eventId);
    const attendance = db.getAttendance(eventId);
    const closedEvent = db.getEventById(eventId);

    if (closedEvent.message_id && closedEvent.channel_id) {
      try {
        const channel = await interaction.client.channels.fetch(closedEvent.channel_id);
        const message = await channel.messages.fetch(closedEvent.message_id);
        await message.edit({
          embeds: [buildEventEmbed(closedEvent, attendance)],
          components: buildEventComponents(eventId, false),
        });
      } catch (err) {
        console.warn(`Não foi possível atualizar embed do evento encerrado ${eventId}:`, err.message);
      }
    }

    return interaction.update({
      content: `🔒 **Evento #${eventId} (${closedEvent.name}) encerrado com sucesso!**\nTotal de presenças registradas: **${attendance.length}**.`,
      components: [],
      embeds: [],
    });
  }

  if (interaction.customId !== "evento_cat_select") return;

  const { pending } = require("../commands/evento-criar");
  const selected = interaction.values[0];

  // "Nova categoria" abre modal para digitar
  if (selected === "__new__") {
    const modal = new ModalBuilder()
      .setCustomId("evento_cat_nova")
      .setTitle("Nova Categoria");
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("cat_input")
          .setLabel("Nome da nova categoria")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("Ex: Treino, Raid, PvP")
          .setRequired(true)
          .setMaxLength(50)
      )
    );
    return interaction.showModal(modal);
  }

  await finishEventCreation(interaction, selected, pending);
}

// ── Botões ────────────────────────────────────────────────────────────────────

async function handleButton(interaction) {
  // Botões do Guia de Presenças
  if (interaction.customId === "btn_guia_historico") {
    const stats = db.getUserStats(interaction.user.id);
    if (!stats) {
      return interaction.reply({
        content: "📭 Você ainda não tem nenhuma presença registrada nos eventos.",
        ephemeral: true,
      });
    }
    const breakdown = db.getUserCategoryBreakdown(interaction.user.id);
    const breakdownText = breakdown.length
      ? breakdown.map((b) => `• **${b.category}**: ${b.total} presença${b.total !== 1 ? "s" : ""}`).join("\n")
      : null;

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`📊 Histórico de Presenças — ${interaction.user.username}`)
      .setThumbnail(interaction.user.displayAvatarURL())
      .addFields({ name: "Total de Presenças", value: `**${stats.total}**`, inline: true })
      .setTimestamp();

    if (breakdownText) {
      embed.addFields({ name: "Por Categoria", value: breakdownText });
    }
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (interaction.customId === "btn_guia_ranking") {
    const ranking = db.getRanking(10);
    if (!ranking.length) {
      return interaction.reply({
        content: "📭 Ainda não há presenças registradas nos eventos.",
        ephemeral: true,
      });
    }
    const MEDALS = ["🥇", "🥈", "🥉"];
    const lines = ranking.map((row, i) => {
      const medal = MEDALS[i] ?? `\`${String(i + 1).padStart(2, "0")}\``;
      return `${medal} **${row.username}** — ${row.total} presença${row.total !== 1 ? "s" : ""}`;
    });
    const embed = new EmbedBuilder()
      .setColor(0xfee75c)
      .setTitle("🏆 Ranking Geral de Presenças — Top 10")
      .setDescription(lines.join("\n"))
      .setTimestamp();
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (interaction.customId === "btn_guia_eventos") {
    const events = db.getOpenEvents();
    if (!events.length) {
      return interaction.reply({
        content: "📭 Não há nenhum evento aberto para presenças no momento.",
        ephemeral: true,
      });
    }
    const lines = events.map(e => `🟢 \`ID ${e.id}\` **${e.name}** [${e.category || "Geral"}] — ${e.start_at || e.created_at}`);
    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle("📋 Eventos Abertos no Momento")
      .setDescription(lines.join("\n"))
      .setFooter({ text: "Use /presenca evento_id:<id> ou clique no botão do evento" })
      .setTimestamp();
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (interaction.customId === "btn_criar_evento") {
    if (!isPAdmin(interaction)) {
      return interaction.reply({
        content: "❌ Apenas a liderança (Comandante, Elite, Nobre ou Admins) pode criar eventos.",
        ephemeral: true,
      });
    }

    const now = new Date();
    // Horário de Brasília (UTC-3)
    const brDate = new Date(now.getTime() - (3 * 60 * 60 * 1000));
    const d = String(brDate.getUTCDate()).padStart(2, "0");
    const m = String(brDate.getUTCMonth() + 1).padStart(2, "0");
    const y = brDate.getUTCFullYear();
    const todayStr = `${d}/${m}/${y}`;

    const modal = new ModalBuilder()
      .setCustomId("modal_criar_evento_rapido")
      .setTitle("➕ Criar Novo Evento");

    const inputNome = new TextInputBuilder()
      .setCustomId("evento_nome")
      .setLabel("Nome do Evento")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("Ex: Guerra do Abismo ou Raid Ludra")
      .setRequired(true)
      .setMaxLength(100);

    const inputCategoria = new TextInputBuilder()
      .setCustomId("evento_categoria")
      .setLabel("Categoria")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("Ex: Guerra, Ludra, Treino, PvP")
      .setValue("Guerra")
      .setRequired(true)
      .setMaxLength(50);

    const inputData = new TextInputBuilder()
      .setCustomId("evento_data")
      .setLabel("Data (DD/MM/AAAA)")
      .setStyle(TextInputStyle.Short)
      .setValue(todayStr)
      .setRequired(true)
      .setMaxLength(10);

    const inputHora = new TextInputBuilder()
      .setCustomId("evento_hora")
      .setLabel("Hora de Início (HH:MM)")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("Ex: 21:00")
      .setRequired(true)
      .setMaxLength(5);

    const inputDesc = new TextInputBuilder()
      .setCustomId("evento_desc")
      .setLabel("Descrição / Observações (Opcional)")
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder("Ex: Todos conectados no canal de voz 10 minutos antes.")
      .setRequired(false)
      .setMaxLength(500);

    modal.addComponents(
      new ActionRowBuilder().addComponents(inputNome),
      new ActionRowBuilder().addComponents(inputCategoria),
      new ActionRowBuilder().addComponents(inputData),
      new ActionRowBuilder().addComponents(inputHora),
      new ActionRowBuilder().addComponents(inputDesc)
    );

    return interaction.showModal(modal);
  }

  if (interaction.customId === "btn_encerrar_evento") {
    if (!isPAdmin(interaction)) {
      return interaction.reply({
        content: "❌ Apenas a liderança (Comandante, Elite, Nobre ou Admins) pode encerrar eventos.",
        ephemeral: true,
      });
    }

    const openEvents = db.getOpenEvents();
    if (!openEvents.length) {
      return interaction.reply({
        content: "📭 Não há nenhum evento aberto no momento para encerrar.",
        ephemeral: true,
      });
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId("select_encerrar_evento")
      .setPlaceholder("Selecione qual evento você deseja encerrar...")
      .addOptions(
        openEvents.slice(0, 25).map(e => ({
          label: `${e.name}`.slice(0, 100),
          description: `ID ${e.id} • ${e.category || "Geral"} • ${e.start_at || e.created_at}`.slice(0, 100),
          value: String(e.id)
        }))
      );

    return interaction.reply({
      content: "🔒 **Selecione abaixo o evento que deseja encerrar:**",
      components: [new ActionRowBuilder().addComponents(select)],
      ephemeral: true,
    });
  }

  const [action, eventIdStr] = interaction.customId.split(":");
  const eventId = parseInt(eventIdStr);
  if (isNaN(eventId)) return;

  const event = db.getEventById(eventId);
  if (!event) return interaction.reply({ content: "❌ Evento não encontrado.", ephemeral: true });
  if (!event.is_open) return interaction.reply({ content: "🔒 Este evento já está encerrado.", ephemeral: true });

  if (action === "pa") {
    if (db.hasCheckedIn(eventId, interaction.user.id)) {
      return interaction.reply({ content: `⚠️ Você já confirmou presença em **${event.name}**.`, ephemeral: true });
    }
    db.checkIn(eventId, interaction.user.id, interaction.user.tag);
    await refreshMessage(interaction, db.getEventById(eventId));
    await interaction.followUp({ content: `✅ Presença confirmada em **${event.name}**!`, ephemeral: true });
    return;
  }

  if (action === "pr") {
    if (!db.hasCheckedIn(eventId, interaction.user.id)) {
      return interaction.reply({ content: `⚠️ Você não está registrado em **${event.name}**.`, ephemeral: true });
    }
    db.checkOut(eventId, interaction.user.id);
    await refreshMessage(interaction, db.getEventById(eventId));
    await interaction.followUp({ content: `✅ Presença removida de **${event.name}**.`, ephemeral: true });
    return;
  }

  if (!isPAdmin(interaction)) {
    return interaction.reply({ content: "❌ Você precisa do cargo **P-Admin** para usar esta função.", ephemeral: true });
  }

  if (action === "aa") {
    const modal = new ModalBuilder()
      .setCustomId(`modal_add:${eventId}`)
      .setTitle(`Adicionar Presentes — ${event.name}`.slice(0, 45));
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("users_input")
          .setLabel("Membros (separados por vírgula)")
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder("@Membro1, @Membro2, 123456789012345678, ...")
          .setRequired(true)
          .setMaxLength(1000)
      )
    );
    return interaction.showModal(modal);
  }

  if (action === "ar") {
    const modal = new ModalBuilder()
      .setCustomId(`modal_rem:${eventId}`)
      .setTitle(`Remover Presentes — ${event.name}`.slice(0, 45));
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("user_input")
          .setLabel("Membros (separados por vírgula)")
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder("@Membro1, @Membro2, 123456789012345678, ...")
          .setRequired(true)
          .setMaxLength(1000)
      )
    );
    return interaction.showModal(modal);
  }
}

// ── Modais ────────────────────────────────────────────────────────────────────

async function handleModal(interaction) {
  // Modal de nova categoria (criação de evento)
  if (interaction.customId === "evento_cat_nova") {
    const { pending } = require("../commands/evento-criar");
    const category = interaction.fields.getTextInputValue("cat_input").trim();
    return finishEventCreation(interaction, category, pending);
  }

  // Modal de criação rápida de evento via botão
  if (interaction.customId === "modal_criar_evento_rapido") {
    if (!isPAdmin(interaction)) {
      return interaction.reply({
        content: "❌ Apenas a liderança pode criar eventos.",
        ephemeral: true,
      });
    }

    const name = interaction.fields.getTextInputValue("evento_nome").trim();
    const category = interaction.fields.getTextInputValue("evento_categoria").trim() || "Guerra";
    const dateStr = interaction.fields.getTextInputValue("evento_data").trim();
    const hourStr = interaction.fields.getTextInputValue("evento_hora").trim();
    const description = (interaction.fields.getTextInputValue("evento_desc") || "").trim();

    const dateMatch = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    const hourMatch = hourStr.match(/^(\d{2}):(\d{2})$/);
    if (!dateMatch || !hourMatch) {
      return interaction.reply({
        content: "❌ Data ou hora inválida. Use o formato **DD/MM/AAAA** (ex: 17/11/2026) e **HH:MM** (ex: 21:00).",
        ephemeral: true,
      });
    }

    const [, d, m, y] = dateMatch;
    const [, hh, mm] = hourMatch;
    const dt = new Date(`${y}-${m}-${d}T${hh}:${mm}:00`);
    if (isNaN(dt.getTime())) {
      return interaction.reply({ content: "❌ Data inválida.", ephemeral: true });
    }

    const startAt = `${y}-${m}-${d} ${hh}:${mm}`;

    if (!db.getCategoryByName(category)) {
      try {
        db.createCategory(category, `Categoria criada para ${name}`, interaction.user.tag);
      } catch {}
    }

    const result = db.createEvent(name, description, interaction.user.tag, category, startAt);
    const eventId = result.lastInsertRowid;
    const event = db.getEventById(eventId);

    const embed = buildEventEmbed(event, []);
    const components = buildEventComponents(eventId, true);

    const msg = await interaction.channel.send({ embeds: [embed], components });
    db.updateEventMessage(eventId, msg.id, interaction.channelId);

    return interaction.reply({
      content: `✅ **Evento criado com sucesso!**\nO card de presenças de **${name}** (ID #${eventId}) já foi aberto no canal com os botões de confirmação!`,
      ephemeral: true,
    });
  }

  const [action, eventIdStr] = interaction.customId.split(":");
  const eventId = parseInt(eventIdStr);
  const event = db.getEventById(eventId);

  if (!event || !event.is_open) {
    return interaction.reply({ content: "❌ Evento não encontrado ou encerrado.", ephemeral: true });
  }

  // Adicionar membros em lote
  if (action === "modal_add") {
    const text = interaction.fields.getTextInputValue("users_input");
    const ids = parseUserIds(text);
    if (!ids.length) {
      return interaction.reply({ content: "❌ Nenhum usuário válido encontrado.", ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });
    const added = [], skipped = [];

    for (const userId of ids) {
      try {
        const member = await interaction.guild.members.fetch(userId);
        if (db.hasCheckedIn(eventId, userId)) {
          skipped.push(member.user.tag);
        } else {
          db.checkIn(eventId, userId, member.user.tag);
          added.push(member.user.tag);
        }
      } catch {
        skipped.push(`ID \`${userId}\` (não encontrado)`);
      }
    }

    await updateEmbedFromDB(interaction.client, eventId);

    let reply = "";
    if (added.length) reply += `✅ **Adicionados (${added.length}):** ${added.join(", ")}\n`;
    if (skipped.length) reply += `⚠️ **Já registrados / não encontrados:** ${skipped.join(", ")}`;
    return interaction.editReply({ content: reply || "Nenhuma alteração." });
  }

  // Remover membros em lote
  if (action === "modal_rem") {
    const text = interaction.fields.getTextInputValue("user_input");
    const ids = parseUserIds(text);
    if (!ids.length) {
      return interaction.reply({ content: "❌ Nenhum usuário válido encontrado.", ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });
    const removed = [], skipped = [];

    for (const userId of ids) {
      if (!db.hasCheckedIn(eventId, userId)) {
        skipped.push(`\`${userId}\``);
      } else {
        try {
          const member = await interaction.guild.members.fetch(userId);
          db.checkOut(eventId, userId);
          removed.push(member.user.tag);
        } catch {
          db.checkOut(eventId, userId);
          removed.push(`\`${userId}\``);
        }
      }
    }

    await updateEmbedFromDB(interaction.client, eventId);

    let reply = "";
    if (removed.length) reply += `✅ **Removidos (${removed.length}):** ${removed.join(", ")}\n`;
    if (skipped.length) reply += `⚠️ **Não estavam registrados:** ${skipped.join(", ")}`;
    return interaction.editReply({ content: reply || "Nenhuma alteração." });
  }
}

// Atualiza embed ao vivo buscando dados atuais do DB
async function updateEmbedFromDB(client, eventId) {
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

// ── Entry point ───────────────────────────────────────────────────────────────

module.exports = {
  name: "interactionCreate",
  async execute(interaction, commands) {
    try {
      if (interaction.isAutocomplete()) {
        const command = commands.get(interaction.commandName);
        if (command?.autocomplete) {
          try { await command.autocomplete(interaction); } catch (err) { console.error(err); }
        }
        return;
      }
      if (interaction.isChatInputCommand()) return handleSlash(interaction, commands);
      if (interaction.isStringSelectMenu()) return handleSelect(interaction, commands);
      if (interaction.isButton()) return handleButton(interaction);
      if (interaction.isModalSubmit()) return handleModal(interaction);
    } catch (err) {
      console.error("Erro não tratado em interactionCreate:", err);
    }
  },
};
