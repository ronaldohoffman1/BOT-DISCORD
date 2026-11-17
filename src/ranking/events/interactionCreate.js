const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  PermissionFlagsBits,
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
