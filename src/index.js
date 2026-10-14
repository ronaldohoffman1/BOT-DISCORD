require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActivityType,
  ChannelType,
  MessageFlags
} = require('discord.js');

const config = require('./config');
const { createGateEmbed, createGateComponents, createPanelEmbed, createPanelComponents } = require('./panel');
const {
  ensureRolesExist,
  handleRoleSelection,
  clearAllGameRoles,
  getMemberGameRoles
} = require('./roleManager');
const { getGuildSetting, setGuildSetting } = require('./storage');
const slashCommands = require('./commands');
const { setupGameChannels } = require('./channelManager');
const { startAvisos } = require('./avisos');
const { findWelcomeChannel, welcomeMessage } = require('./welcome');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers, // Necessário para detectar novos membros (GuildMemberAdd)
    GatewayIntentBits.GuildMessages
  ]
});

// Evento: Bot online
client.once('clientReady', async () => {
  console.log('====================================================');
  console.log(`🤖 Bot iniciado com sucesso como: ${client.user.tag}`);
  console.log(`🌐 Conectado em ${client.guilds.cache.size} servidor(es).`);
  console.log('====================================================');

  client.user.setPresence({
    activities: [{ name: '⚔️ Legião Fight Kings • Aion 2 | /ajuda', type: ActivityType.Custom }],
    status: 'online'
  });

  // Avisos automáticos do Aion 2 (atualizações, Fenda, Festival Shugo)
  startAvisos(client);

  // Registra automaticamente os comandos em cada servidor conectado
  for (const guild of client.guilds.cache.values()) {
    try {
      await guild.commands.set(slashCommands);
      console.log(`⚡ Comandos slash registrados com sucesso em: ${guild.name} (${guild.id})`);
    } catch (err) {
      console.error(`Erro ao registrar comandos no servidor ${guild.name}:`, err.message);
    }
  }
});

// Evento: Novo membro entra no servidor (guildMemberAdd)
client.on('guildMemberAdd', async (member) => {
  const guild = member.guild;
  console.log(`👋 Novo membro entrou no servidor ${guild.name}: ${member.user.tag} (${member.id})`);

  const rolesChannelId = getGuildSetting(guild.id, 'roles_channel_id');
  const sendDm = getGuildSetting(guild.id, 'send_dm', true);

  const rolesChannelMention = rolesChannelId ? `<#${rolesChannelId}>` : 'o canal de cargos da guilda';

  // 1. Boas-vindas na sala 👋・boas-vindas, com o passo a passo e o botão para pegar a tag
  const welcomeChannel = findWelcomeChannel(guild);
  if (welcomeChannel) {
    try {
      await welcomeChannel.send(welcomeMessage(member));
    } catch (err) {
      console.error('Erro ao enviar mensagem no canal de boas-vindas:', err.message);
    }
  }

  // 2. Enviar Mensagem Direta (DM) para o novo membro
  if (sendDm) {
    const dmEmbed = new EmbedBuilder()
      .setColor(config.embedColor)
      .setTitle(`⚔️ Bem-vindo(a) à ${guild.name}!`)
      .setDescription(
        `Olá **${member.user.username}**! 👋\n\n` +
        `Para liberar as salas do **Aion 2**, acesse ${rolesChannelMention} no servidor e escolha a sua classe:\n\n` +
        config.classes.map(c => `• ${c.emoji} **${c.name.split('┃')[1]}** (${c.en})`).join('\n') +
        `\n\nNa categoria **📖┃GUIA DAS CLASSES** tem as builds PvE e PvP mais vistas de cada classe. Bom jogo!`
      )
      .setFooter({ text: guild.name, iconURL: guild.iconURL() || undefined })
      .setTimestamp();

    try {
      await member.send({ embeds: [dmEmbed] });
      console.log(`📩 DM de boas-vindas enviada para ${member.user.tag}`);
    } catch (err) {
      // Erro comum: o usuário bloqueou mensagens privadas de servidores
      console.log(`ℹ️ Não foi possível enviar DM para ${member.user.tag} (DMs desativadas pelo usuário).`);
    }
  }
});

// Evento: Interações (Slash Commands, Menus Dropdown, Botões)
client.on('interactionCreate', async (interaction) => {
  // Trata Comandos de Barra (/setup-cargos, /criar-cargos, etc)
  if (interaction.isChatInputCommand()) {
    const { commandName } = interaction;

    // Comando: /setup-cargos
    if (commandName === 'setup-cargos') {
      const channel = interaction.options.getChannel('canal') || interaction.channel;

      if (!channel || !channel.isTextBased()) {
        return interaction.reply({
          content: '❌ O canal informado deve ser um canal de texto!',
          flags: MessageFlags.Ephemeral
        });
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      try {
        // Limpa mensagens anteriores do bot no canal para manter o chat 100% limpo
        try {
          const oldMsgs = await channel.messages.fetch({ limit: 10 });
          const botMsgs = oldMsgs.filter(m => m.author.id === client.user.id);
          for (const m of botMsgs.values()) {
            await m.delete().catch(() => {});
          }
        } catch (cleanErr) {
          console.error('Aviso ao limpar mensagens antigas:', cleanErr.message);
        }

        const embed = createGateEmbed(interaction.guild.name);
        const components = createGateComponents();

        await channel.send({ embeds: [embed], components });

        // Salva o canal como o canal oficial de cargos
        setGuildSetting(interaction.guild.id, 'roles_channel_id', channel.id);

        return interaction.editReply({
          content: `✅ **Painel de Abertura Privada configurado em ${channel}!**\nAgora qualquer membro que clicar em "Escolher Minhas Tags" abrirá uma tela **100% privada** (só ele vê) que se fecha automaticamente após escolher!`
        });
      } catch (err) {
        console.error('Erro no comando setup-cargos:', err);
        return interaction.editReply({
          content: `❌ Falha ao enviar o painel: ${err.message}`
        });
      }
    }

    // Comando: /criar-cargos
    if (commandName === 'criar-cargos') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      try {
        const result = await ensureRolesExist(interaction.guild);

        let desc = 'Aqui está o relatório de sincronização dos cargos da guilda:\n\n';
        if (result.created.length > 0) {
          desc += `✨ **Cargos Criados Automaticamente (${result.created.length}):**\n` +
                  result.created.map(n => `• \`${n}\``).join(', ') + '\n\n';
        } else {
          desc += 'ℹ️ Nenhum cargo novo precisou ser criado.\n\n';
        }

        if (result.existing.length > 0) {
          desc += `✅ **Cargos Já Existentes (${result.existing.length}):**\n` +
                  result.existing.map(n => `\`${n}\``).join(', ') + '\n\n';
        }

        if (result.errors.length > 0) {
          desc += `⚠️ **Erros ao criar alguns cargos:**\n` +
                  result.errors.map(e => `• ${e.name}: ${e.error}`).join('\n') + '\n\n';
        }

        desc += '⚠️ **Lembrete Importante de Hierarquia:**\n' +
                'Vá em **Configurações do Servidor ➔ Cargos** e verifique se o cargo do seu **Bot** está **acima** de todos esses cargos de jogos, para que ele possa atribuí-los sem problemas!';

        const embed = new EmbedBuilder()
          .setColor(0x2ECC71)
          .setTitle('🛠️ Sincronização de Cargos')
          .setDescription(desc)
          .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
      } catch (err) {
        console.error('Erro no comando criar-cargos:', err);
        return interaction.editReply({
          content: `❌ Erro ao criar cargos: ${err.message}`
        });
      }
    }

    // Comando: /criar-salas
    if (commandName === 'criar-salas') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      try {
        const result = await setupGameChannels(interaction.guild);
        if (result.error) {
          return interaction.editReply({ content: result.error });
        }

        let desc = '🔒 As salas do Aion 2 só aparecem para quem escolher uma classe; o 🔒┃PRIVADO só para a administração.\n\n';

        for (const item of result.report) {
          desc += `### ${item.categoryName}${item.categoryCreated ? ' *(nova)*' : ''}\n`;
          if (item.created.length > 0) {
            desc += `✨ **Criadas:** ${item.created.map(c => `\`${c}\``).join(', ')}\n`;
          }
          if (item.renamed.length > 0) {
            desc += `✏️ **Renomeadas:** ${item.renamed.map(c => `\`${c}\``).join(', ')}\n`;
          }
          if (item.deleted.length > 0) {
            desc += `🗑️ **Antigas removidas:** ${item.deleted.length}\n`;
          }
          desc += `✅ **Salas:** ${item.existing.length + item.created.length}\n\n`;
        }

        if (result.kept.length > 0) {
          desc += `⚠️ **Salas antigas mantidas por terem mensagens** (apague manualmente se quiser):\n` +
                  result.kept.map(c => `• \`${c}\``).join('\n') + '\n\n';
        }
        if (!result.hasForums) {
          desc += '💡 Ative a **Comunidade** do servidor para as salas `📚・builds/guias` virarem **Fórum** com etiquetas.\n';
        }
        desc = desc.slice(0, 4000);

        const embed = new EmbedBuilder()
          .setColor(0x2ECC71)
          .setTitle('🏗️ Servidor Organizado!')
          .setDescription(desc)
          .setFooter({ text: 'Fight Kings • Aion 2' })
          .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
      } catch (err) {
        console.error('Erro no comando criar-salas:', err);
        return interaction.editReply({
          content: `❌ Erro ao configurar salas: ${err.message}`
        });
      }
    }

    // Comando: /config-boas-vindas
    if (commandName === 'config-boas-vindas') {
      const channel = interaction.options.getChannel('canal');
      const sendDm = interaction.options.getBoolean('enviar_dm');

      if (channel) {
        setGuildSetting(interaction.guild.id, 'welcome_channel_id', channel.id);
      }
      if (sendDm !== null) {
        setGuildSetting(interaction.guild.id, 'send_dm', sendDm);
      }

      const currentWelcome = getGuildSetting(interaction.guild.id, 'welcome_channel_id');
      const currentDm = getGuildSetting(interaction.guild.id, 'send_dm', true);

      return interaction.reply({
        content: `⚙️ **Configurações de Boas-Vindas Atualizadas:**\n` +
                 `• Canal de Boas-Vindas: ${currentWelcome ? `<#${currentWelcome}>` : '*Nenhum configurado*'}\n` +
                 `• Mensagem Privada (DM) ao entrar: **${currentDm ? 'Ativada ✅' : 'Desativada ❌'}**`,
        flags: MessageFlags.Ephemeral
      });
    }

    // Comando: /cargos
    if (commandName === 'cargos') {
      const embed = createPanelEmbed(interaction.guild.name);
      const components = createPanelComponents();
      return interaction.reply({
        embeds: [embed],
        components,
        flags: MessageFlags.Ephemeral
      });
    }

    // Comando: /ajuda
    if (commandName === 'ajuda') {
      const rolesChannelId = getGuildSetting(interaction.guild.id, 'roles_channel_id');
      const embed = new EmbedBuilder()
        .setColor(config.embedColor)
        .setTitle('📖 Central de Ajuda — Akaza BOT')
        .setDescription(
          `Este bot cuida das classes, das tags da legião e das salas do servidor **Fight Kings** (Aion 2).\n\n` +
          (rolesChannelId ? `📍 Escolha sua classe em: <#${rolesChannelId}>\n\n` : '') +
          `### 🪽 Tags da legião (dadas pela liderança)\n` +
          config.legionRoles.map(r => `• **${r.name}** — ${r.description}`).join('\n') + '\n\n' +
          `### 👑 Comandos para Administradores:\n` +
          `• \`/criar-cargos\` : Cria/atualiza as classes e as tags da legião.\n` +
          `• \`/criar-salas\` : Organiza todas as categorias e salas do servidor.\n` +
          `• \`/setup-cargos [canal]\` : Envia o painel de escolha de classe.\n` +
          `• \`/config-boas-vindas [canal] [enviar_dm]\` : Define onde anunciar novos membros e se envia DM.\n\n` +
          `### 🎮 Comandos para Membros:\n` +
          `• \`/cargos\` : Abre o menu para escolher ou trocar a sua classe.\n` +
          `• \`/ajuda\` : Mostra esta mensagem.`
        )
        .setFooter({ text: 'Fight Kings • Aion 2' });

      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
  }

  // Trata Menus Dropdown (StringSelectMenu)
  if (interaction.isStringSelectMenu()) {
    const customId = interaction.customId;
    const gameKey = Object.keys(config.games).find(k => config.games[k].customId === customId) || null;

    if (gameKey) {
      const selectedIds = interaction.values;
      const result = await handleRoleSelection(interaction, gameKey, selectedIds);

      if (result.error) {
        return interaction.reply({
          content: result.error,
          flags: MessageFlags.Ephemeral
        });
      }

      let responseMsg = `🎮 **Tags de ${result.gameTitle} Atualizadas!**\n\n`;

      if (result.added.length > 0) {
        responseMsg += `➕ **Adicionado:** ${result.added.map(r => `\`${r}\``).join(', ')}\n`;
      }
      if (result.removed.length > 0) {
        responseMsg += `➖ **Removido:** ${result.removed.map(r => `\`${r}\``).join(', ')}\n`;
      }

      if (result.added.length === 0 && result.removed.length === 0) {
        responseMsg += `ℹ️ Nenhuma alteração foi necessária (seleção inalterada).\n`;
      }

      responseMsg += `\n✨ *Suas salas exclusivas foram liberadas no servidor!*\n` +
                     `Clique em **"Concluir e Limpar Chat"** abaixo para fechar esta tela (ou ela fechará automaticamente em 5s).`;

      const confirmEmbed = new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle(`✅ Sucesso - ${result.gameTitle}`)
        .setDescription(responseMsg)
        .setFooter({ text: 'Menu Privado • Clique em "Concluir e Limpar Chat" quando terminar' });

      // Atualiza o menu sem poluir o chat com mensagens novas
      await interaction.update({
        embeds: [confirmEmbed],
        components: createPanelComponents()
      });

      return;
    }
  }

  // Trata Botões
  if (interaction.isButton()) {
    // Botão que abre a tela de seleção privada
    if (interaction.customId === 'btn_open_tag_selector') {
      const embed = createPanelEmbed(interaction.guild.name);
      const components = createPanelComponents();
      return interaction.reply({
        embeds: [embed],
        components,
        flags: MessageFlags.Ephemeral
      });
    }

    // Botão que conclui e limpa o chat
    if (interaction.customId === 'btn_finish_and_clean') {
      try {
        await interaction.update({
          content: '✅ **Seleção concluída e chat limpo!** Suas salas exclusivas já estão disponíveis na barra lateral.',
          embeds: [],
          components: []
        });
      } catch (err) {
        console.error('Erro ao concluir:', err);
      }
      return;
    }

    if (interaction.customId === 'btn_view_roles') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const userRoles = await getMemberGameRoles(interaction);
      let desc = '';
      let hasAny = false;

      for (const [gameTitle, roles] of Object.entries(userRoles)) {
        if (roles.length > 0) {
          hasAny = true;
          desc += `### ${gameTitle}:\n${roles.join('\n')}\n\n`;
        }
      }

      if (!hasAny) {
        desc = 'Você ainda não possui nenhuma tag de jogo selecionada!\nUse os menus acima para escolher.';
      }

      const embed = new EmbedBuilder()
        .setColor(config.embedColor)
        .setTitle(`📋 Cargos de Jogo de ${interaction.member.displayName}`)
        .setDescription(desc)
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    if (interaction.customId === 'btn_clear_roles') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const result = await clearAllGameRoles(interaction);
      if (result.error) {
        return interaction.editReply({ content: result.error });
      }

      if (result.removed.length === 0) {
        return interaction.editReply({
          content: 'ℹ️ Você não possuía nenhum cargo de jogo para remover.'
        });
      }

      return interaction.editReply({
        content: `🗑️ **Cargos Removidos:**\n${result.removed.map(r => `• \`${r}\``).join('\n')}\n\nVocê pode selecionar novos cargos a qualquer momento nos menus acima!`
      });
    }
  }
});

// Tratamento de erros globais para evitar crash inesperado
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Promise Rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Inicia o bot
const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('❌ ERRO: DISCORD_TOKEN não encontrado no arquivo .env!');
  console.error('Por favor, configure o seu .env com o Token fornecido pelo Discord Developer Portal.');
  process.exit(1);
}

// Se o login falhar, encerra para o servidor (Railway) reiniciar o bot sozinho
client.login(token).catch((err) => {
  console.error('❌ Falha ao conectar no Discord:', err.message);
  process.exit(1);
});
