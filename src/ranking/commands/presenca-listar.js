const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const db = require("../database/db");

const EMBED_DESC_LIMIT = 4096;
const truncate = (str, max) => (str.length > max ? str.slice(0, max - 1) + "…" : str);

module.exports = {
  data: new SlashCommandBuilder()
    .setName("presenca-listar")
    .setDescription("Lista todos os presentes em um evento")
    .addIntegerOption((opt) =>
      opt.setName("evento_id").setDescription("ID do evento").setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents),

  async execute(interaction) {
    const eventId = interaction.options.getInteger("evento_id");
    const event = db.getEventById(eventId);

    if (!event) {
      return interaction.reply({ content: `❌ Evento \`${eventId}\` não encontrado.`, ephemeral: true });
    }

    const attendance = db.getAttendance(eventId);

    if (!attendance.length) {
      return interaction.reply({
        content: `📭 Nenhuma presença registrada no evento **${event.name}**.`,
        ephemeral: true,
      });
    }

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
      } catch { }
    }

    const lines = attendance.map((a, i) => {
      const member = interaction.guild?.members?.cache?.get(a.user_id);
      const name = member?.displayName || a.username;
      return `\`${String(i + 1).padStart(2, "0")}\` **${name}** — ${a.checked_in_at}`;
    });

    // Monta descrição respeitando o limite de 4096 chars
    let description = "";
    let shown = 0;
    for (const line of lines) {
      if (description.length + line.length + 1 > EMBED_DESC_LIMIT - 60) break;
      description += (description ? "\n" : "") + line;
      shown++;
    }
    if (shown < attendance.length) {
      description += `\n*… e mais ${attendance.length - shown} presente(s) não exibido(s).*`;
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(truncate(`📋 Presenças — ${event.name}`, 256))
      .setDescription(description)
      .addFields({ name: "Total", value: `**${attendance.length}**`, inline: true })
      .setFooter({ text: "Kokushibo • Presenças do Evento • Sumirá em 1m" })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
    setTimeout(() => interaction.deleteReply().catch(() => {}), 60000);
  },
};
