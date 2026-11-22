const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const {
  ensureWarningRoles,
  getMemberWarningLevel,
  setMemberWarningLevel,
  logWarningToChannel,
  WARNING_ROLES,
} = require("../../warningManager");
const { isEventLeader } = require("../guildGuides");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("advertencia")
    .setDescription("Gerencia o sistema de advertências disciplinares da legião")
    .addSubcommand((sub) =>
      sub
        .setName("aplicar")
        .setDescription("Aplica uma advertência a um membro (avança para 1, 2 ou 3)")
        .addUserOption((opt) =>
          opt.setName("membro").setDescription("Membro que receberá a advertência").setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName("motivo").setDescription("Motivo da advertência").setRequired(true).setMaxLength(300)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("remover")
        .setDescription("Remove 1 nível de advertência de um membro")
        .addUserOption((opt) =>
          opt.setName("membro").setDescription("Membro a ter a advertência reduzida").setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName("motivo").setDescription("Motivo da remoção (opcional)").setRequired(false).setMaxLength(200)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("limpar")
        .setDescription("Remove todas as advertências de um membro específico")
        .addUserOption((opt) =>
          opt.setName("membro").setDescription("Membro a ser limpo").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("listar")
        .setDescription("Lista todos os membros que possuem advertências ativas")
    )
    .addSubcommand((sub) =>
      sub
        .setName("resetar-mes")
        .setDescription("Zera todas as advertências de todos os membros do servidor (Resete Mensal)")
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    if (!isEventLeader(interaction)) {
      return interaction.reply({
        content: "❌ **Acesso Negado**: Apenas a liderança (**Administrador, Comandante, Sub Comandante ou Oficial de Elite**) pode gerenciar advertências.",
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    // Garante que os cargos existam
    await ensureWarningRoles(interaction.guild);

    const sub = interaction.options.getSubcommand();

    // ── 1. APLICAR ADVERTÊNCIA ────────────────────────────────────────────────
    if (sub === "aplicar") {
      const targetUser = interaction.options.getUser("membro");
      const reason = interaction.options.getString("motivo").trim();

      const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      if (!member) {
        return interaction.editReply({ content: "❌ Membro não encontrado no servidor." });
      }

      const currentLvl = getMemberWarningLevel(member);
      if (currentLvl >= 3) {
        return interaction.editReply({
          content: `⚠️ **${member.displayName}** já atingiu o limite máximo de **3 advertências** (🚨)! Cabe à liderança aplicar a punição cabível (rebaixamento/remoção).`,
        });
      }

      const nextLvl = currentLvl + 1;
      const appliedRole = await setMemberWarningLevel(member, nextLvl, `Advertência aplicada por ${interaction.user.tag}: ${reason}`);

      const levelNames = {
        1: "⚠️ 1ª Advertência (1/3)",
        2: "⚠️ 2ª Advertência (2/3)",
        3: "🚨 3ª Advertência (3/3 — LIMITE DE PUNIÇÃO)",
      };

      const levelColors = {
        1: 0xf1c40f,
        2: 0xe67e22,
        3: 0xe74c3c,
      };

      const embedLog = new EmbedBuilder()
        .setColor(levelColors[nextLvl])
        .setTitle("⚠️ REGISTRO DISCIPLINAR — ADVERTÊNCIA APLICADA")
        .setDescription(`Uma advertência foi registrada oficialmente para o membro da legião.`)
        .addFields(
          { name: "👤 Membro Advertido", value: `<@${member.id}> (${member.displayName})`, inline: true },
          { name: "📊 Situação", value: `**${levelNames[nextLvl]}**`, inline: true },
          { name: "🛡️ Aplicada por", value: `<@${interaction.user.id}>`, inline: true },
          { name: "📝 Motivo", value: reason }
        )
        .setFooter({ text: "Kokushibo • Diretrizes Disciplinares • Fight Kings" })
        .setTimestamp();

      if (nextLvl === 3) {
        embedLog.addFields({
          name: "🚨 ALERTA DE PUNIÇÃO",
          value: "O membro acumulou o limite de **3 advertências no mês**. Reunião da liderança recomendada para avaliar rebaixamento ou expulsão.",
        });
      }

      // Envia no canal de advertências
      await logWarningToChannel(interaction.guild, embedLog);

      const rep = await interaction.editReply({
        content: `✅ Advertência nível **${nextLvl}/3** aplicada com sucesso para **${member.displayName}**! O registro foi postado no canal de advertências. *(Esta mensagem sumirá em 1m)*`,
      });
      setTimeout(() => interaction.deleteReply().catch(() => {}), 60000);
      return rep;
    }

    // ── 2. REMOVER ADVERTÊNCIA ────────────────────────────────────────────────
    if (sub === "remover") {
      const targetUser = interaction.options.getUser("membro");
      const reason = interaction.options.getString("motivo")?.trim() || "Remoção manual pela liderança";

      const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      if (!member) {
        return interaction.editReply({ content: "❌ Membro não encontrado no servidor." });
      }

      const currentLvl = getMemberWarningLevel(member);
      if (currentLvl === 0) {
        return interaction.editReply({ content: `ℹ️ **${member.displayName}** não possui nenhuma advertência ativa.` });
      }

      const nextLvl = currentLvl - 1;
      await setMemberWarningLevel(member, nextLvl, `Advertência removida por ${interaction.user.tag}: ${reason}`);

      const embedLog = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle("✅ REGISTRO DISCIPLINAR — ADVERTÊNCIA REMOVIDA")
        .setDescription(`Uma advertência foi revogada pela liderança.`)
        .addFields(
          { name: "👤 Membro", value: `<@${member.id}> (${member.displayName})`, inline: true },
          { name: "📊 Nova Situação", value: nextLvl === 0 ? "🟢 **Ficha Limpa (0/3)**" : `⚠️ **${nextLvl}ª Advertência (${nextLvl}/3)**`, inline: true },
          { name: "🛡️ Removida por", value: `<@${interaction.user.id}>`, inline: true },
          { name: "📝 Motivo", value: reason }
        )
        .setFooter({ text: "Kokushibo • Diretrizes Disciplinares • Fight Kings" })
        .setTimestamp();

      await logWarningToChannel(interaction.guild, embedLog);

      const rep = await interaction.editReply({
        content: `✅ Advertência de **${member.displayName}** reduzida para **${nextLvl}/3**! *(Esta mensagem sumirá em 1m)*`,
      });
      setTimeout(() => interaction.deleteReply().catch(() => {}), 60000);
      return rep;
    }

    // ── 3. LIMPAR ADVERTÊNCIAS DE UM MEMBRO ──────────────────────────────────
    if (sub === "limpar") {
      const targetUser = interaction.options.getUser("membro");
      const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      if (!member) {
        return interaction.editReply({ content: "❌ Membro não encontrado no servidor." });
      }

      await setMemberWarningLevel(member, 0, `Advertências zeradas por ${interaction.user.tag}`);

      const embedLog = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle("🧹 REGISTRO DISCIPLINAR — FICHA LIMPA")
        .setDescription(`Todas as advertências de <@${member.id}> (${member.displayName}) foram zeradas por <@${interaction.user.id}>.`)
        .setFooter({ text: "Kokushibo • Diretrizes Disciplinares • Fight Kings" })
        .setTimestamp();

      await logWarningToChannel(interaction.guild, embedLog);

      const rep = await interaction.editReply({
        content: `✅ Todas as advertências de **${member.displayName}** foram removidas! *(Esta mensagem sumirá em 1m)*`,
      });
      setTimeout(() => interaction.deleteReply().catch(() => {}), 60000);
      return rep;
    }

    // ── 4. LISTAR MEMBROS COM ADVERTÊNCIA ─────────────────────────────────────
    if (sub === "listar") {
      await interaction.guild.members.fetch();
      const warned = [];

      for (const member of interaction.guild.members.cache.values()) {
        if (member.user.bot) continue;
        const lvl = getMemberWarningLevel(member);
        if (lvl > 0) {
          warned.push({ member, lvl });
        }
      }

      if (!warned.length) {
        return interaction.editReply({
          content: "🎉 **Ficha Limpa Geral!** Nenhum membro possui advertências ativas no momento.",
        });
      }

      warned.sort((a, b) => b.lvl - a.lvl);

      const lines = warned.map((item, idx) => {
        const icon = item.lvl === 3 ? "🚨" : "⚠️";
        return `\`${String(idx + 1).padStart(2, "0")}.\` ${icon} **${item.member.displayName}** (<@${item.member.id}>) — **${item.lvl}/3**`;
      });

      const embed = new EmbedBuilder()
        .setColor(0xe67e22)
        .setTitle(`📋 Membros com Advertências Ativas (${warned.length})`)
        .setDescription(lines.join("\n"))
        .setFooter({ text: "Kokushibo • Sistema de Advertências • Sumirá em 1m" })
        .setTimestamp();

      const rep = await interaction.editReply({ embeds: [embed] });
      setTimeout(() => interaction.deleteReply().catch(() => {}), 60000);
      return rep;
    }

    // ── 5. RESETE MENSAL DE ADVERTÊNCIAS ─────────────────────────────────────
    if (sub === "resetar-mes") {
      await interaction.guild.members.fetch();
      let count = 0;

      for (const member of interaction.guild.members.cache.values()) {
        if (member.user.bot) continue;
        const lvl = getMemberWarningLevel(member);
        if (lvl > 0) {
          await setMemberWarningLevel(member, 0, `Resete mensal de advertências por ${interaction.user.tag}`);
          count++;
        }
      }

      const embedLog = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle("🔄 RESETE MENSAL DE ADVERTÊNCIAS CONCLUÍDO")
        .setDescription(
          `Conforme as regras oficiais da **Fight Kings**, todas as advertências do mês foram zeradas!\n` +
          `Total de membros limpos: **${count}**.\n\n` +
          `*Todos começam o novo mês com ficha limpa!*`
        )
        .setFooter({ text: "Kokushibo • Diretrizes Disciplinares • Fight Kings" })
        .setTimestamp();

      await logWarningToChannel(interaction.guild, embedLog);

      const rep = await interaction.editReply({
        content: `✅ **Resete mensal executado com sucesso!** ${count} membro(s) tiveram suas advertências zeradas. *(Esta mensagem sumirá em 1m)*`,
      });
      setTimeout(() => interaction.deleteReply().catch(() => {}), 60000);
      return rep;
    }
  },
};
