const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  StringSelectMenuBuilder,
  UserSelectMenuBuilder,
} = require("discord.js");
const db = require("../database/db");
const {
  buildEventEmbed,
  buildEventComponents,
  buildLudraEmbed,
  buildLudraComponents,
} = require("../utils/attendanceEmbed");
const { isEventLeader, findChannelByKeywords } = require("../guildGuides");

// ── Helpers ───────────────────────────────────────────────────────────────────

// Apaga a resposta da interação após o tempo limite (padrão: 60 segundos)
function scheduleAutoDelete(interaction, delayMs = 60000) {
  setTimeout(async () => {
    try {
      await interaction.deleteReply();
    } catch {
      try {
        await interaction.editReply({
          content: "⏱️ *Esta informação expirou após 1 minuto.*",
          embeds: [],
          components: [],
        });
      } catch {}
    }
  }, delayMs);
}

// Apaga mensagem de followUp após o tempo limite (padrão: 60 segundos)
function scheduleAutoDeleteMessage(message, delayMs = 60000) {
  if (!message) return;
  setTimeout(async () => {
    try {
      await message.delete();
    } catch {}
  }, delayMs);
}

async function refreshMessage(interaction, event) {
  const attendance = db.getAttendance(event.id);
  await interaction.update({
    embeds: [buildEventEmbed(event, attendance, interaction.guild)],
    components: buildEventComponents(event.id, !!event.is_open),
  });
}

const isPAdmin = isEventLeader;

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

  const creatorName = interaction.member?.displayName || interaction.user.displayName || interaction.user.username;
  const result = db.createEvent(data.name, data.description, creatorName, category, data.startAt);
  const eventId = result.lastInsertRowid;
  const event = db.getEventById(eventId);

  const embed = buildEventEmbed(event, [], interaction.guild);
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
    // Responde instantaneamente (< 30ms) para evitar timeout
    await interaction.deferUpdate().catch(() => {});

    if (!isEventLeader(interaction)) {
      await interaction.editReply({
        content: "❌ **Acesso Negado**: Apenas a liderança (**Administrador, Comandante, Sub Comandante ou Oficial de Elite**) pode encerrar eventos.",
        components: [],
        embeds: [],
      });
      scheduleAutoDelete(interaction, 30000);
      return;
    }

    const eventId = parseInt(interaction.values[0]);
    const event = db.getEventById(eventId);
    if (!event || !event.is_open) {
      await interaction.editReply({
        content: "⚠️ Este evento já foi encerrado ou não foi encontrado.",
        components: [],
        embeds: [],
      });
      scheduleAutoDelete(interaction, 30000);
      return;
    }

    db.closeEvent(eventId);
    const attendance = db.getAttendance(eventId);
    const closedEvent = db.getEventById(eventId);

    // Responde ao usuário primeiro para liberar a interface do Discord imediatamente
    await interaction.editReply({
      content: `🔒 **Evento #${eventId} (${closedEvent.name}) encerrado com sucesso!**\nTotal de presenças registradas: **${attendance.length}**.\n*(Esta mensagem sumirá em 1 minuto)*`,
      components: [],
      embeds: [],
    });
    scheduleAutoDelete(interaction, 60000);

    if (closedEvent.message_id && closedEvent.channel_id) {
      try {
        const channel = await interaction.client.channels.fetch(closedEvent.channel_id);
        const message = await channel.messages.fetch(closedEvent.message_id);
        const isLudra = closedEvent.event_type === 'ludra' || closedEvent.category?.toLowerCase() === 'ludra';
        if (isLudra) {
          await message.edit({
            embeds: [buildLudraEmbed(closedEvent, attendance, channel.guild)],
            components: buildLudraComponents(eventId, false, attendance),
          });
        } else {
          await message.edit({
            embeds: [buildEventEmbed(closedEvent, attendance, channel.guild)],
            components: buildEventComponents(eventId, false),
          });
        }
      } catch (err) {
        console.warn(`Não foi possível atualizar embed do evento encerrado ${eventId}:`, err.message);
      }
    }
    return;
  }

  // Consulta detalhada de evento com lista completa de presentes
  if (interaction.customId === "select_ver_evento_detalhes") {
    // Responde instantaneamente (< 30ms) para evitar timeout
    await interaction.deferUpdate().catch(() => {});

    const eventId = parseInt(interaction.values[0]);
    const event = db.getEventById(eventId);
    if (!event) {
      await interaction.editReply({
        content: "❌ Evento não encontrado.",
        components: [],
        embeds: [],
      });
      scheduleAutoDelete(interaction, 60000);
      return;
    }

    const attendance = db.getAttendance(eventId);
    const isOpen = !!event.is_open;

    // Sincroniza apelidos atuais dos membros com o servidor
    if (interaction.guild && attendance.length > 0) {
      try {
        const fetched = await interaction.guild.members.fetch({
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

    let listText = "*Nenhum membro confirmou presença neste evento.*";
    if (attendance.length > 0) {
      listText = attendance
        .map((a, i) => {
          const member = interaction.guild?.members?.cache?.get(a.user_id);
          const name = member?.displayName || a.username;
          return `\`${String(i + 1).padStart(2, "0")}.\` **${name}** (<@${a.user_id}>) — *${a.checked_in_at}*`;
        })
        .join("\n");
      if (listText.length > 3800) {
        listText = listText.slice(0, 3800) + "\n*… lista muito longa, exibindo os primeiros.*";
      }
    }

    const embed = new EmbedBuilder()
      .setColor(isOpen ? 0x57f287 : 0xed4245)
      .setTitle(`📋 Evento #${event.id} — ${event.name}`)
      .setDescription(event.description ? `*${event.description}*\n` : "")
      .addFields(
        { name: "📂 Categoria", value: event.category || "Geral", inline: true },
        { name: "🗓 Data / Início", value: event.start_at || event.created_at, inline: true },
        { name: "🔒 Status", value: isOpen ? "🟢 **Aberto**" : `🔴 **Encerrado**${event.closed_at ? ` em ${event.closed_at}` : ""}`, inline: true },
        { name: "👑 Criado por", value: event.created_by, inline: true },
        { name: `👥 Membros Presentes (${attendance.length})`, value: listText }
      )
      .setFooter({ text: "Kokushibo • Registro Oficial de Presenças • Sumirá em 1m" })
      .setTimestamp();

    await interaction.editReply({
      content: null,
      embeds: [embed],
      components: [],
    });
    scheduleAutoDelete(interaction, 60000);
    return;
  }

  // Remoção de membro pela liderança via dropdown do card do evento
  if (interaction.customId.startsWith("select_remover_membro_evento:")) {
    // Responde instantaneamente para o Discord não dar timeout
    await interaction.deferUpdate();

    if (!isEventLeader(interaction)) {
      await interaction.editReply({
        content: "❌ **Acesso Negado**: Apenas a liderança (**Administrador, Comandante, Sub Comandante ou Oficial de Elite**) pode remover membros da lista.",
        components: [],
        embeds: [],
      });
      scheduleAutoDelete(interaction, 30000);
      return;
    }

    const [, eventIdStr] = interaction.customId.split(":");
    const eventId = parseInt(eventIdStr);
    const event = db.getEventById(eventId);

    if (!event || !event.is_open) {
      await interaction.editReply({
        content: "⚠️ Este evento já foi encerrado ou não foi encontrado.",
        components: [],
        embeds: [],
      });
      scheduleAutoDelete(interaction, 30000);
      return;
    }

    const targetUserId = interaction.values[0];
    if (!db.hasCheckedIn(eventId, targetUserId)) {
      await interaction.editReply({
        content: "⚠️ O membro selecionado não está mais registrado neste evento.",
        components: [],
        embeds: [],
      });
      scheduleAutoDelete(interaction, 30000);
      return;
    }

    const member = interaction.guild?.members?.cache?.get(targetUserId);
    const memberName = member?.displayName || targetUserId;

    db.checkOut(eventId, targetUserId);

    await interaction.editReply({
      content: `✅ O membro **${memberName}** foi removido da lista de presenças do evento **${event.name}** pela liderança!\n*(Esta mensagem sumirá em 1 minuto)*`,
      components: [],
      embeds: [],
    });
    scheduleAutoDelete(interaction, 60000);

    // Atualiza a mensagem do evento no canal em segundo plano
    updateEmbedFromDB(interaction.client, eventId).catch(err => {
      console.warn(`Erro ao atualizar embed do evento ${eventId}:`, err.message);
    });
    return;
  }

  // ── Ludra: Seleção de Dia e Horário sem Digitar ──
  if (interaction.customId === "select_ludra_horario") {
    await interaction.deferUpdate().catch(() => {});

    if (!isEventLeader(interaction)) {
      await interaction.editReply({
        content: "❌ **Acesso Negado**: Apenas a liderança (**Administrador, Comandante, Sub Comandante ou Oficial de Elite**) pode criar Raids de Ludra.",
        components: [],
        embeds: [],
      });
      scheduleAutoDelete(interaction, 30000);
      return;
    }

    const selectedTime = interaction.values[0];
    const creatorName = interaction.member?.displayName || interaction.user.displayName || interaction.user.username;
    const desc = "🔥 **Raid Oficial de Legião — Fight Kings (Ludra 10p)**\nConcentração no Discord com **15 minutos de antecedência**. Consumíveis, poções e pergaminhos prontos!";

    const result = db.createLudraEvent("Raid Ludra", desc, creatorName, selectedTime);
    const eventId = result.lastInsertRowid;
    const event = db.getEventById(eventId);

    const embed = buildLudraEmbed(event, [], interaction.guild);
    const components = buildLudraComponents(eventId, true, []);

    let targetChannel = interaction.guild ? findChannelByKeywords(interaction.guild, ["controle-de-presenca", "presenca"]) : null;
    if (!targetChannel) targetChannel = interaction.channel;

    const msg = await targetChannel.send({ embeds: [embed], components });
    db.updateEventMessage(eventId, msg.id, targetChannel.id);

    await interaction.editReply({
      content: `✅ **Raid Ludra #${eventId} criada com sucesso!**\n🗓️ Data e Horário: **${selectedTime}**\nO card com os botões das funções e grupos já foi publicado em <#${targetChannel.id}>!\n*(Esta mensagem sumirá em 1 minuto)*`,
      components: [],
      embeds: [],
    });
    scheduleAutoDelete(interaction, 60000);
    return;
  }

  // ── Ludra: Liderança selecionou o usuário para escalar ──
  if (interaction.customId.startsWith("select_ludra_user:")) {
    await interaction.deferUpdate().catch(() => {});
    const [, evIdStr] = interaction.customId.split(":");
    const eventId = parseInt(evIdStr);
    const targetUserId = interaction.values[0];

    const roleSelect = new StringSelectMenuBuilder()
      .setCustomId(`select_ludra_role:${eventId}:${targetUserId}`)
      .setPlaceholder("Selecione a função deste membro...")
      .addOptions([
        { label: "🛡️ Main Tank / Off Tank", value: "tank", description: "Gladiador / Templário (Máx 2)" },
        { label: "💚 Main Healer / Off Healer", value: "healer", description: "Clérigo (Máx 2)" },
        { label: "🎵 Cantor / Buffer", value: "cantor", description: "Chanter (Máx 2)" },
        { label: "⚔️ DPS (Dano)", value: "dps", description: "Assassino / Ranger / Mago / SM (Máx 4)" },
        { label: "🔄 Reserva (Suplente)", value: "reserva", description: "Banco de reservas" },
      ]);

    await interaction.editReply({
      content: `👑 Membro selecionado: <@${targetUserId}>\nSelecione abaixo em qual função deseja escalá-lo na Raid Ludra:\n*(Esta mensagem sumirá em 1 minuto)*`,
      components: [new ActionRowBuilder().addComponents(roleSelect)],
    });
    scheduleAutoDelete(interaction, 60000);
    return;
  }

  // ── Ludra: Liderança escolheu a função do usuário escalado ──
  if (interaction.customId.startsWith("select_ludra_role:")) {
    await interaction.deferUpdate().catch(() => {});
    const [, evIdStr, targetUserId] = interaction.customId.split(":");
    const eventId = parseInt(evIdStr);
    const role = interaction.values[0];

    let memberName = targetUserId;
    try {
      const member = await interaction.guild.members.fetch(targetUserId);
      memberName = member?.displayName || member?.user?.username || targetUserId;
    } catch {}

    db.checkIn(eventId, targetUserId, memberName, role);

    const ROLE_LABELS = {
      tank: "🛡️ Tank",
      healer: "💚 Healer",
      cantor: "🎵 Cantor",
      dps: "⚔️ DPS",
      reserva: "🔄 Reserva",
    };

    await interaction.editReply({
      content: `✅ O membro **${memberName}** foi escalado como **${ROLE_LABELS[role] || role}** na Raid Ludra!\n*(Esta mensagem sumirá em 1 minuto)*`,
      components: [],
      embeds: [],
    });
    scheduleAutoDelete(interaction, 60000);

    updateEmbedFromDB(interaction.client, eventId).catch(err => {
      console.warn(`Erro ao atualizar embed da Ludra #${eventId}:`, err.message);
    });
    return;
  }

  // ── Ludra: Liderança removeu alguém da Raid Ludra ──
  if (interaction.customId.startsWith("select_ludra_remove_member:")) {
    await interaction.deferUpdate().catch(() => {});
    const [, evIdStr] = interaction.customId.split(":");
    const eventId = parseInt(evIdStr);
    const targetUserId = interaction.values[0];

    let memberName = targetUserId;
    try {
      const member = await interaction.guild.members.fetch(targetUserId);
      memberName = member?.displayName || member?.user?.username || targetUserId;
    } catch {}

    db.checkOut(eventId, targetUserId);

    await interaction.editReply({
      content: `✅ O membro **${memberName}** foi removido da Raid Ludra pela liderança!\n*(Esta mensagem sumirá em 1 minuto)*`,
      components: [],
      embeds: [],
    });
    scheduleAutoDelete(interaction, 60000);

    updateEmbedFromDB(interaction.client, eventId).catch(err => {
      console.warn(`Erro ao atualizar embed da Ludra #${eventId}:`, err.message);
    });
    return;
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
  const [action, eventIdStr] = interaction.customId.split(":");
  const isEventAction =
    ["pa", "pr", "lr", "lj"].includes(action) ||
    interaction.customId.startsWith("lr_leave:") ||
    interaction.customId.startsWith("lr_escalar:") ||
    interaction.customId.startsWith("lr_remove:");
  const isGuideQuery = [
    "btn_guia_historico",
    "btn_guia_ranking",
    "btn_guia_eventos",
    "btn_encerrar_evento",
    "btn_historico_eventos",
    "btn_criar_ludra",
  ].includes(interaction.customId);

  // Responde ao Discord IMEDIATAMENTE (< 30ms) para NUNCA dar timeout de 3 segundos
  if (isEventAction || isGuideQuery) {
    try {
      await interaction.deferReply({ ephemeral: true });
    } catch {}
  }

  // 1. Botão: Meu Histórico
  if (interaction.customId === "btn_guia_historico") {
    const stats = db.getUserStats(interaction.user.id);
    if (!stats) {
      await interaction.editReply({
        content: "📭 Você ainda não tem nenhuma presença registrada nos eventos.",
      });
      scheduleAutoDelete(interaction, 60000);
      return;
    }
    const breakdown = db.getUserCategoryBreakdown(interaction.user.id);
    const breakdownText = breakdown.length
      ? breakdown.map((b) => `• **${b.category}**: ${b.total} presença${b.total !== 1 ? "s" : ""}`).join("\n")
      : null;

    const memberName = interaction.member?.displayName || interaction.user.displayName || interaction.user.username;
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`📊 Histórico de Presenças — ${memberName}`)
      .setThumbnail(interaction.user.displayAvatarURL())
      .addFields({ name: "Total de Presenças", value: `**${stats.total}**`, inline: true })
      .setFooter({ text: "Kokushibo • Seu Histórico • Sumirá em 1m" })
      .setTimestamp();

    if (breakdownText) {
      embed.addFields({ name: "Por Categoria", value: breakdownText });
    }
    await interaction.editReply({ embeds: [embed] });
    scheduleAutoDelete(interaction, 60000);
    return;
  }

  // 2. Botão: Ver Ranking
  if (interaction.customId === "btn_guia_ranking") {
    const ranking = db.getRanking(10);
    if (!ranking.length) {
      await interaction.editReply({
        content: "📭 Ainda não há presenças registradas nos eventos.",
      });
      scheduleAutoDelete(interaction, 60000);
      return;
    }

    const MEDALS = ["🥇", "🥈", "🥉"];
    const lines = ranking.map((row, i) => {
      const medal = MEDALS[i] ?? `\`${String(i + 1).padStart(2, "0")}\``;
      const member = interaction.guild?.members?.cache?.get(row.user_id);
      const name = member?.displayName || row.username;
      return `${medal} **${name}** — ${row.total} presença${row.total !== 1 ? "s" : ""}`;
    });
    const embed = new EmbedBuilder()
      .setColor(0xfee75c)
      .setTitle("🏆 Ranking Geral de Presenças — Top 10")
      .setDescription(lines.join("\n"))
      .setFooter({ text: "Kokushibo • Ranking Geral • Sumirá em 1m" })
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
    scheduleAutoDelete(interaction, 60000);
    return;
  }

  // 3. Botão: Eventos Abertos
  if (interaction.customId === "btn_guia_eventos") {
    const events = db.getOpenEvents();
    if (!events.length) {
      await interaction.editReply({
        content: "📭 Não há nenhum evento aberto para presenças no momento.",
      });
      scheduleAutoDelete(interaction, 60000);
      return;
    }
    const lines = events.map(e => `🟢 \`ID ${e.id}\` **${e.name}** [${e.category || "Geral"}] — ${e.start_at || e.created_at}`);
    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle("📋 Eventos Abertos no Momento")
      .setDescription(lines.join("\n"))
      .setFooter({ text: "Use /presenca evento_id:<id> ou clique no botão do evento • Sumirá em 1m" })
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
    scheduleAutoDelete(interaction, 60000);
    return;
  }

  // 4. Botão: Criar Evento (Abre modal - NÃO DEFERE ANTES)
  if (interaction.customId === "btn_criar_evento") {
    if (!isEventLeader(interaction)) {
      await interaction.reply({
        content: "❌ **Acesso Negado**: Apenas a liderança (**Administrador, Comandante, Sub Comandante ou Oficial de Elite**) pode criar eventos.",
        ephemeral: true,
      });
      scheduleAutoDelete(interaction, 30000);
      return;
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

  // 4.1 Botão: Criar Raid Ludra (Zero digitação - Select Menu de horários)
  if (interaction.customId === "btn_criar_ludra") {
    if (!isEventLeader(interaction)) {
      await interaction.editReply({
        content: "❌ **Acesso Negado**: Apenas a liderança (**Administrador, Comandante, Sub Comandante ou Oficial de Elite**) pode criar Raids de Ludra.",
      });
      scheduleAutoDelete(interaction, 30000);
      return;
    }

    const now = new Date();
    const brNow = new Date(now.getTime() - (3 * 60 * 60 * 1000));
    const tmw = new Date(brNow.getTime() + (24 * 60 * 60 * 1000));

    const pad = (n) => String(n).padStart(2, "0");
    const dHoje = `${pad(brNow.getUTCDate())}/${pad(brNow.getUTCMonth() + 1)}/${brNow.getUTCFullYear()}`;
    const dAmanha = `${pad(tmw.getUTCDate())}/${pad(tmw.getUTCMonth() + 1)}/${tmw.getUTCFullYear()}`;
    const dHojeCurto = `${pad(brNow.getUTCDate())}/${pad(brNow.getUTCMonth() + 1)}`;
    const dAmanhaCurto = `${pad(tmw.getUTCDate())}/${pad(tmw.getUTCMonth() + 1)}`;
    const horaAtual = `${pad(brNow.getUTCHours())}:${pad(brNow.getUTCMinutes())}`;

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("select_ludra_horario")
      .setPlaceholder("Selecione o dia e horário da Raid Ludra...")
      .addOptions([
        {
          label: `Hoje (${dHojeCurto}) às 21:00`,
          description: "Horário nobre de Raids de Legião (21:00)",
          value: `${dHoje} às 21:00`,
        },
        {
          label: `Hoje (${dHojeCurto}) às 20:30`,
          description: "Concentração mais cedo (20:30)",
          value: `${dHoje} às 20:30`,
        },
        {
          label: `Hoje (${dHojeCurto}) às 21:30`,
          description: "Segundo turno da noite (21:30)",
          value: `${dHoje} às 21:30`,
        },
        {
          label: `Hoje (${dHojeCurto}) às 22:00`,
          description: "Horário tardio (22:00)",
          value: `${dHoje} às 22:00`,
        },
        {
          label: `Hoje (${dHojeCurto}) às 20:00`,
          description: "Início rápido (20:00)",
          value: `${dHoje} às 20:00`,
        },
        {
          label: `Amanhã (${dAmanhaCurto}) às 21:00`,
          description: "Raid marcada para amanhã (21:00)",
          value: `${dAmanha} às 21:00`,
        },
        {
          label: `Amanhã (${dAmanhaCurto}) às 20:30`,
          description: "Raid marcada para amanhã (20:30)",
          value: `${dAmanha} às 20:30`,
        },
        {
          label: `Amanhã (${dAmanhaCurto}) às 21:30`,
          description: "Raid marcada para amanhã (21:30)",
          value: `${dAmanha} às 21:30`,
        },
        {
          label: `Amanhã (${dAmanhaCurto}) às 22:00`,
          description: "Raid marcada para amanhã (22:00)",
          value: `${dAmanha} às 22:00`,
        },
        {
          label: `⚡ Começar Agora (${dHojeCurto} às ${horaAtual})`,
          description: "Raid imediata com concentração imediata",
          value: `${dHoje} às ${horaAtual}`,
        },
      ]);

    await interaction.editReply({
      content: "🐉 **Criar Raid Ludra (10 Membros — 2 PTs):**\nSelecione abaixo o dia e horário do evento para abrir o card automático:\n*(Esta mensagem sumirá em 1 minuto)*",
      components: [new ActionRowBuilder().addComponents(selectMenu)],
    });
    scheduleAutoDelete(interaction, 60000);
    return;
  }

  // 5. Botão: Encerrar Evento
  if (interaction.customId === "btn_encerrar_evento") {
    if (!isEventLeader(interaction)) {
      await interaction.editReply({
        content: "❌ **Acesso Negado**: Apenas a liderança (**Administrador, Comandante, Sub Comandante ou Oficial de Elite**) pode encerrar eventos.",
      });
      scheduleAutoDelete(interaction, 30000);
      return;
    }

    let openEvents = db.getOpenEvents();
    if (!openEvents.length && interaction.guild) {
      try {
        const { syncAllOpenCards } = require("../guildGuides");
        await syncAllOpenCards(interaction.client);
        openEvents = db.getOpenEvents();
      } catch {}
    }

    if (!openEvents.length) {
      await interaction.editReply({
        content: "📭 Não há nenhum evento aberto no momento para encerrar.",
      });
      scheduleAutoDelete(interaction, 60000);
      return;
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

    await interaction.editReply({
      content: "🔒 **Selecione abaixo o evento que deseja encerrar:**\n*(Esta mensagem sumirá em 1 minuto)*",
      components: [new ActionRowBuilder().addComponents(select)],
    });
    scheduleAutoDelete(interaction, 60000);
    return;
  }

  // 6. Botão: Histórico de Eventos
  if (interaction.customId === "btn_historico_eventos") {
    const allEvents = db.getAllEvents();
    if (!allEvents.length) {
      await interaction.editReply({
        content: "📭 Nenhum evento foi criado ainda no servidor.",
      });
      scheduleAutoDelete(interaction, 60000);
      return;
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId("select_ver_evento_detalhes")
      .setPlaceholder("Selecione um evento para ver todos os presentes...")
      .addOptions(
        allEvents.slice(0, 25).map(e => ({
          label: `${e.name}`.slice(0, 100),
          description: `ID ${e.id} • ${e.is_open ? '🟢 Aberto' : '🔒 Encerrado'} • ${e.category || 'Geral'} • ${e.start_at || e.created_at}`.slice(0, 100),
          value: String(e.id)
        }))
      );

    await interaction.editReply({
      content: "📜 **Histórico de Eventos do Servidor:**\nSelecione um evento abaixo para visualizar a lista completa de membros presentes:\n*(Esta mensagem sumirá em 1 minuto)*",
      components: [new ActionRowBuilder().addComponents(select)],
    });
    scheduleAutoDelete(interaction, 60000);
    return;
  }

  // ── Botão: Entrar em Função da Raid Ludra (lj:role:eventId) ──
  if (action === "lj") {
    const [, role, evIdStr] = interaction.customId.split(":");
    const eventId = parseInt(evIdStr);
    if (isNaN(eventId)) return;

    if (interaction.message?.id && interaction.channelId) {
      try {
        db.updateEventMessage(eventId, interaction.message.id, interaction.channelId);
      } catch {}
    }

    const event = db.getEventById(eventId);
    if (!event || !event.is_open) {
      await interaction.editReply({ content: "🔒 Esta Raid Ludra já está encerrada ou não foi encontrada." });
      scheduleAutoDelete(interaction, 30000);
      return;
    }

    const attendance = db.getAttendance(eventId);
    const ROLE_LIMITS = {
      tank: 2,
      healer: 2,
      cantor: 2,
      dps: 4,
      reserva: 99,
    };
    const ROLE_LABELS = {
      tank: "🛡️ Tank",
      healer: "💚 Healer",
      cantor: "🎵 Cantor",
      dps: "⚔️ DPS",
      reserva: "🔄 Reserva",
    };

    const limit = ROLE_LIMITS[role] || 99;
    const currentInRole = attendance.filter(a => a.role === role && a.user_id !== interaction.user.id).length;

    if (currentInRole >= limit) {
      await interaction.editReply({
        content: `⚠️ As vagas para **${ROLE_LABELS[role]}** já estão esgotadas (${limit}/${limit})!\nEscolha outra função ou clique em **🔄 Reserva**!`,
      });
      scheduleAutoDelete(interaction, 30000);
      return;
    }

    const displayName = interaction.member?.displayName || interaction.user.displayName || interaction.user.username;
    db.checkIn(eventId, interaction.user.id, displayName, role);

    await interaction.editReply({
      content: `✅ Presença confirmada como **${ROLE_LABELS[role]}** na **Raid Ludra**!\n*(Esta mensagem sumirá em 1m)*`,
    });
    scheduleAutoDelete(interaction, 60000);

    updateEmbedFromDB(interaction.client, eventId).catch(err => {
      console.warn(`Erro ao atualizar embed da Ludra #${eventId}:`, err.message);
    });
    return;
  }

  // ── Botão: Sair da Raid Ludra (lr_leave:eventId) ──
  if (action === "lr_leave") {
    const eventId = parseInt(eventIdStr);
    const event = db.getEventById(eventId);
    if (!event || !event.is_open) {
      await interaction.editReply({ content: "🔒 Esta Raid Ludra já está encerrada." });
      scheduleAutoDelete(interaction, 30000);
      return;
    }

    if (!db.hasCheckedIn(eventId, interaction.user.id)) {
      await interaction.editReply({ content: "⚠️ Você não está escalado nesta Raid Ludra." });
      scheduleAutoDelete(interaction, 30000);
      return;
    }

    db.checkOut(eventId, interaction.user.id);
    await interaction.editReply({ content: "✅ Você saiu da lista da Raid Ludra.\n*(Esta mensagem sumirá em 1m)*" });
    scheduleAutoDelete(interaction, 60000);

    updateEmbedFromDB(interaction.client, eventId).catch(err => {
      console.warn(`Erro ao atualizar embed da Ludra #${eventId}:`, err.message);
    });
    return;
  }

  // ── Botão: Escalar Membro na Raid Ludra (lr_escalar:eventId) ──
  if (action === "lr_escalar") {
    if (!isEventLeader(interaction)) {
      await interaction.editReply({
        content: "❌ **Acesso Negado**: Apenas a liderança (**Administrador, Comandante, Sub Comandante ou Oficial de Elite**) pode escalar membros manualmente.",
      });
      scheduleAutoDelete(interaction, 30000);
      return;
    }
    const eventId = parseInt(eventIdStr);
    const event = db.getEventById(eventId);
    if (!event || !event.is_open) {
      await interaction.editReply({ content: "🔒 Esta Raid Ludra já está encerrada." });
      scheduleAutoDelete(interaction, 30000);
      return;
    }

    const userSelect = new UserSelectMenuBuilder()
      .setCustomId(`select_ludra_user:${eventId}`)
      .setPlaceholder("Selecione o membro do Discord para escalar na Raid Ludra...");

    await interaction.editReply({
      content: "👑 **Escalar Membro na Raid Ludra:**\nSelecione abaixo o membro que você quer colocar na PT:\n*(Esta mensagem sumirá em 1 minuto)*",
      components: [new ActionRowBuilder().addComponents(userSelect)],
    });
    scheduleAutoDelete(interaction, 60000);
    return;
  }

  // ── Botão: Remover Membro da Raid Ludra (lr_remove:eventId) ──
  if (action === "lr_remove") {
    if (!isEventLeader(interaction)) {
      await interaction.editReply({
        content: "❌ **Acesso Negado**: Apenas a liderança (**Administrador, Comandante, Sub Comandante ou Oficial de Elite**) pode remover membros.",
      });
      scheduleAutoDelete(interaction, 30000);
      return;
    }
    const eventId = parseInt(eventIdStr);
    const event = db.getEventById(eventId);
    if (!event || !event.is_open) {
      await interaction.editReply({ content: "🔒 Esta Raid Ludra já está encerrada." });
      scheduleAutoDelete(interaction, 30000);
      return;
    }

    const attendance = db.getAttendance(eventId);
    if (!attendance.length) {
      await interaction.editReply({ content: "📭 Nenhum membro escalado nesta Raid Ludra no momento." });
      scheduleAutoDelete(interaction, 30000);
      return;
    }

    const ROLE_LABELS = {
      tank: "🛡️ Tank",
      healer: "💚 Healer",
      cantor: "🎵 Cantor",
      dps: "⚔️ DPS",
      reserva: "🔄 Reserva",
    };

    const select = new StringSelectMenuBuilder()
      .setCustomId(`select_ludra_remove_member:${eventId}`)
      .setPlaceholder("Selecione o membro para remover da Raid Ludra...")
      .addOptions(
        attendance.slice(0, 25).map((a, i) => {
          const member = interaction.guild?.members?.cache?.get(a.user_id);
          const name = member?.displayName || a.username;
          const roleLabel = ROLE_LABELS[a.role] || a.role || "Membro";
          return {
            label: `${String(i + 1).padStart(2, "0")}. ${name} [${roleLabel}]`.slice(0, 100),
            description: `ID: ${a.user_id}`.slice(0, 100),
            value: a.user_id,
          };
        })
      );

    await interaction.editReply({
      content: `🗑️ **Remover Membro da Raid Ludra:**\nSelecione abaixo quem você deseja remover da lista:\n*(Esta mensagem sumirá em 1 minuto)*`,
      components: [new ActionRowBuilder().addComponents(select)],
    });
    scheduleAutoDelete(interaction, 60000);
    return;
  }

  const eventId = parseInt(eventIdStr);
  if (isNaN(eventId)) return;

  // Garante que message_id e channel_id fiquem sempre registrados no banco
  if (interaction.message?.id && interaction.channelId) {
    try {
      db.updateEventMessage(eventId, interaction.message.id, interaction.channelId);
    } catch {}
  }

  let event = db.getEventById(eventId);
  if (!event) {
    // Tenta restaurar dados do evento e presentes a partir do embed da mensagem se o banco foi recriado
    if (interaction.message?.embeds?.[0]) {
      const emb = interaction.message.embeds[0];
      const evName = emb.title ? emb.title.replace(/^[📋🔒]\s*/, "") : `Evento #${eventId}`;
      const evDesc = emb.description || "";
      const evCat = emb.fields?.find(f => f.name?.includes("Categoria"))?.value || "Guerra";
      const evDate = emb.fields?.find(f => f.name?.includes("Data"))?.value || null;
      db.createEventWithId(eventId, evName, evDesc, "Liderança", evCat, evDate, interaction.message.id, interaction.channelId);
      event = db.getEventById(eventId);

      const presField = emb.fields?.find(f => f.name?.includes("Presentes"));
      if (presField?.value && !presField.value.includes("Nenhum")) {
        const lines = presField.value.split("\n");
        for (let i = 0; i < lines.length; i++) {
          const rawLine = lines[i].trim();
          if (!rawLine || rawLine.startsWith("*…")) continue;
          const cleanName = rawLine.replace(/^`?\d+\.?`?\s*/, "").trim();
          if (cleanName && !db.getAttendance(eventId).some(a => a.username === cleanName)) {
            db.checkIn(eventId, `restored_${eventId}_${i + 1}`, cleanName);
          }
        }
      }
    }
  }

  if (!event) {
    await interaction.editReply({ content: "❌ Evento não encontrado." });
    scheduleAutoDelete(interaction, 30000);
    return;
  }
  if (!event.is_open) {
    await interaction.editReply({ content: "🔒 Este evento já está encerrado." });
    scheduleAutoDelete(interaction, 30000);
    return;
  }

  if (action === "pa") {
    const displayName = interaction.member?.displayName || interaction.user.displayName || interaction.user.username;

    // Se existia entrada restaurada com o mesmo nome de exibição, remove para substituir pelo ID real
    const existingRestored = db.getAttendance(eventId).find(a => a.username === displayName && a.user_id.startsWith("restored_"));
    if (existingRestored) {
      db.checkOut(eventId, existingRestored.user_id);
    }

    if (db.hasCheckedIn(eventId, interaction.user.id)) {
      await interaction.editReply({ content: `⚠️ Você já confirmou presença em **${event.name}**.` });
      scheduleAutoDelete(interaction, 60000);
      return;
    }

    db.checkIn(eventId, interaction.user.id, displayName);

    await interaction.editReply({ content: `✅ Presença confirmada em **${event.name}**! *(Esta mensagem sumirá em 1m)*` });
    scheduleAutoDelete(interaction, 60000);

    // Atualiza o embed público no canal em background
    updateEmbedFromDB(interaction.client, eventId).catch(err => {
      console.warn(`Erro ao atualizar card público do evento #${eventId}:`, err.message);
    });
    return;
  }

  if (action === "pr") {
    const displayName = interaction.member?.displayName || interaction.user.displayName || interaction.user.username;
    const attendance = db.getAttendance(eventId);
    const userEntry = attendance.find(a => a.user_id === interaction.user.id || a.username === displayName);

    if (!userEntry) {
      await interaction.editReply({ content: `⚠️ Você não está registrado em **${event.name}**.` });
      scheduleAutoDelete(interaction, 60000);
      return;
    }

    db.checkOut(eventId, userEntry.user_id);

    await interaction.editReply({ content: `✅ Presença removida de **${event.name}**. *(Esta mensagem sumirá em 1m)*` });
    scheduleAutoDelete(interaction, 60000);

    // Atualiza o embed público no canal em background
    updateEmbedFromDB(interaction.client, eventId).catch(err => {
      console.warn(`Erro ao atualizar card público do evento #${eventId}:`, err.message);
    });
    return;
  }

  // Liderança removendo membro da lista de presença
  if (action === "lr") {
    if (!isEventLeader(interaction)) {
      await interaction.editReply({
        content: "❌ **Acesso Negado**: Apenas a liderança (**Administrador, Comandante, Sub Comandante ou Oficial de Elite**) pode remover membros da lista.",
      });
      scheduleAutoDelete(interaction, 30000);
      return;
    }

    const attendance = db.getAttendance(eventId);
    if (!attendance.length) {
      await interaction.editReply({
        content: `📭 Nenhum membro confirmou presença no evento **${event.name}** ainda.`,
      });
      scheduleAutoDelete(interaction, 30000);
      return;
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId(`select_remover_membro_evento:${eventId}`)
      .setPlaceholder("Selecione o membro que deseja remover...")
      .addOptions(
        attendance.slice(0, 25).map((a, i) => {
          const member = interaction.guild?.members?.cache?.get(a.user_id);
          const name = member?.displayName || a.username;
          return {
            label: `${String(i + 1).padStart(2, "0")}. ${name}`.slice(0, 100),
            description: `ID: ${a.user_id} • Registrado em: ${a.checked_in_at || "n/d"}`.slice(0, 100),
            value: a.user_id,
          };
        })
      );

    await interaction.editReply({
      content: `🗑️ **Remover Membro — ${event.name}**\nSelecione abaixo quem você deseja remover da lista de presenças:${attendance.length > 25 ? "\n*(Exibindo os primeiros 25 membros)*" : ""}\n*(Esta mensagem sumirá em 1 minuto)*`,
      components: [new ActionRowBuilder().addComponents(select)],
    });
    scheduleAutoDelete(interaction, 60000);
    return;
  }

  if (!isEventLeader(interaction)) {
    return interaction.reply({ content: "❌ **Acesso Negado**: Apenas a liderança (**Administrador, Comandante, Sub Comandante ou Oficial de Elite**) pode usar esta função.", ephemeral: true });
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
    if (!isEventLeader(interaction)) {
      return interaction.reply({
        content: "❌ **Acesso Negado**: Apenas a liderança (**Administrador, Comandante, Sub Comandante ou Oficial de Elite**) pode criar eventos.",
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

    const creatorName = interaction.member?.displayName || interaction.user.displayName || interaction.user.username;

    if (!db.getCategoryByName(category)) {
      try {
        db.createCategory(category, `Categoria criada para ${name}`, creatorName);
      } catch {}
    }

    const result = db.createEvent(name, description, creatorName, category, startAt);
    const eventId = result.lastInsertRowid;
    const event = db.getEventById(eventId);

    const embed = buildEventEmbed(event, [], interaction.guild);
    const components = buildEventComponents(eventId, true);

    const msg = await interaction.channel.send({ embeds: [embed], components });
    db.updateEventMessage(eventId, msg.id, interaction.channelId);

    await interaction.reply({
      content: `✅ **Evento criado com sucesso!**\nO card de presenças de **${name}** (ID #${eventId}) já foi aberto no canal com os botões de confirmação!\n*(Esta mensagem sumirá em 1 minuto)*`,
      ephemeral: true,
    });
    scheduleAutoDelete(interaction, 60000);
    return;
  }

  const [action, eventIdStr] = interaction.customId.split(":");
  const eventId = parseInt(eventIdStr);
  const event = db.getEventById(eventId);

  if (!event || !event.is_open) {
    await interaction.reply({ content: "❌ Evento não encontrado ou encerrado.", ephemeral: true });
    scheduleAutoDelete(interaction, 30000);
    return;
  }

  // Adicionar membros em lote
  if (action === "modal_add") {
    const text = interaction.fields.getTextInputValue("users_input");
    const ids = parseUserIds(text);
    if (!ids.length) {
      await interaction.reply({ content: "❌ Nenhum usuário válido encontrado.", ephemeral: true });
      scheduleAutoDelete(interaction, 30000);
      return;
    }

    await interaction.deferReply({ ephemeral: true });
    const added = [], skipped = [];

    for (const userId of ids) {
      try {
        const member = await interaction.guild.members.fetch(userId);
        const memberName = member.displayName || member.user.displayName || member.user.username;
        if (db.hasCheckedIn(eventId, userId)) {
          skipped.push(memberName);
        } else {
          db.checkIn(eventId, userId, memberName);
          added.push(memberName);
        }
      } catch {
        skipped.push(`ID \`${userId}\` (não encontrado)`);
      }
    }

    await updateEmbedFromDB(interaction.client, eventId);

    let reply = "";
    if (added.length) reply += `✅ **Adicionados (${added.length}):** ${added.join(", ")}\n`;
    if (skipped.length) reply += `⚠️ **Já registrados / não encontrados:** ${skipped.join(", ")}`;
    await interaction.editReply({ content: reply || "Nenhuma alteração." });
    scheduleAutoDelete(interaction, 60000);
    return;
  }

  // Remover membros em lote
  if (action === "modal_rem") {
    const text = interaction.fields.getTextInputValue("user_input");
    const ids = parseUserIds(text);
    if (!ids.length) {
      await interaction.reply({ content: "❌ Nenhum usuário válido encontrado.", ephemeral: true });
      scheduleAutoDelete(interaction, 30000);
      return;
    }

    await interaction.deferReply({ ephemeral: true });
    const removed = [], skipped = [];

    for (const userId of ids) {
      if (!db.hasCheckedIn(eventId, userId)) {
        skipped.push(`\`${userId}\``);
      } else {
        try {
          const member = await interaction.guild.members.fetch(userId);
          const memberName = member.displayName || member.user.displayName || member.user.username;
          db.checkOut(eventId, userId);
          removed.push(memberName);
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
    await interaction.editReply({ content: reply || "Nenhuma alteração." });
    scheduleAutoDelete(interaction, 60000);
    return;
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
    const isLudra = event.event_type === 'ludra' || event.category?.toLowerCase() === 'ludra';
    if (isLudra) {
      await message.edit({
        embeds: [buildLudraEmbed(event, attendance, channel.guild)],
        components: buildLudraComponents(eventId, !!event.is_open, attendance),
      });
    } else {
      await message.edit({
        embeds: [buildEventEmbed(event, attendance, channel.guild)],
        components: buildEventComponents(eventId, !!event.is_open),
      });
    }
  } catch (err) {
    console.warn(`Não foi possível atualizar embed do evento ${eventId}:`, err.message);
  }
}

// ── Entry point ───────────────────────────────────────────────────────────────

module.exports = {
  name: "interactionCreate",
  updateEmbedFromDB,
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
      if (
        interaction.isStringSelectMenu() ||
        interaction.isUserSelectMenu() ||
        interaction.isRoleSelectMenu() ||
        interaction.isMentionableSelectMenu() ||
        interaction.isChannelSelectMenu()
      ) return handleSelect(interaction, commands);
      if (interaction.isButton()) return handleButton(interaction);
      if (interaction.isModalSubmit()) return handleModal(interaction);
    } catch (err) {
      console.error("Erro não tratado em interactionCreate:", err);
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: `⚠️ Ocorreu um erro ao processar esta ação: ${err.message}`,
            ephemeral: true,
          });
        } else if (interaction.deferred) {
          await interaction.editReply({
            content: `⚠️ Ocorreu um erro ao processar esta ação: ${err.message}`,
          });
        }
      } catch {}
    }
  },
};
