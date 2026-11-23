const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const db = require("../database/db");
const { buildEventEmbed, buildEventComponents } = require("../utils/attendanceEmbed");
const { isEventLeader, findChannelByKeywords } = require("../guildGuides");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("evento-fechar")
    .setDescription("Fecha um evento e encerra o registro de presenças")
    .addIntegerOption((opt) =>
      opt.setName("id").setDescription("ID do evento a fechar (deixe vazio para fechar o evento aberto atual)").setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents),

  async execute(interaction) {
    // 1. Responde ao Discord IMEDIATAMENTE (< 30ms) para NUNCA dar timeout de 3 segundos
    await interaction.deferReply({ ephemeral: true });

    if (!isEventLeader(interaction)) {
      return interaction.editReply({
        content: "❌ **Acesso Negado**: Apenas a liderança (**Administrador, Comandante, Sub Comandante ou Oficial de Elite**) pode encerrar eventos.",
      });
    }

    let id = interaction.options.getInteger("id");

    // Se nenhum ID for passado, busca o último evento aberto
    if (!id) {
      const openEvents = db.getOpenEvents();
      if (openEvents.length > 0) {
        id = openEvents[0].id;
      }
    }

    let event = id ? db.getEventById(id) : null;

    // Se o evento não estiver no banco (ex: restart de container), busca no canal de presenças
    if ((!event || !id) && interaction.guild) {
      try {
        const chPresenca = findChannelByKeywords(interaction.guild, ["controle-de-presenca", "presencas", "presenca"]);
        if (chPresenca) {
          const msgs = await chPresenca.messages.fetch({ limit: 50 }).catch(() => null);
          if (msgs) {
            for (const msg of msgs.values()) {
              const paBtn = msg.components?.[0]?.components?.find(b => (b.customId || b.data?.custom_id)?.startsWith("pa:"));
              if (paBtn) {
                const btnId = paBtn.customId || paBtn.data?.custom_id;
                const foundId = parseInt(btnId.split(":")[1]);
                if (!id || foundId === id) {
                  const emb = msg.embeds?.[0];
                  const evName = emb?.title ? emb.title.replace(/^[📋🔒]\s*/, "") : `Evento #${foundId}`;
                  const evDesc = emb?.description || "";
                  const evCat = emb?.fields?.find(f => f.name?.includes("Categoria"))?.value || "Guerra";
                  const evDate = emb?.fields?.find(f => f.name?.includes("Data"))?.value || null;
                  db.createEventWithId(foundId, evName, evDesc, "Liderança", evCat, evDate, msg.id, chPresenca.id);
                  event = db.getEventById(foundId);
                  id = foundId;
                  break;
                }
              }
            }
          }
        }
      } catch {}
    }

    if (!event) {
      return interaction.editReply({
        content: id ? `❌ Evento \`${id}\` não encontrado.` : "📭 Nenhum evento aberto foi encontrado para encerrar.",
      });
    }
    if (!event.is_open) {
      return interaction.editReply({ content: `⚠️ Evento \`${id}\` já está fechado.` });
    }

    db.closeEvent(id);
    const attendance = db.getAttendance(id);
    const closedEvent = db.getEventById(id);

    // Responde ao usuário primeiro sem travar
    await interaction.editReply({
      content: `🔒 **Evento #${id} (${event.name}) encerrado com sucesso!**\nTotal de presenças registradas: **${attendance.length}**.`,
    });

    // Atualiza o card público no canal para o estado "encerrado" em segundo plano
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
  },
};
