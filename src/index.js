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
const { setupGodsArea } = require('./godsManager');

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
    activities: [{ name: '🎮 Gerenciando tags da guilda | /ajuda', type: ActivityType.Custom }],
    status: 'online'
  });

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
  const welcomeChannelId = getGuildSetting(guild.id, 'welcome_channel_id');
  const sendDm = getGuildSetting(guild.id, 'send_dm', true);

  const rolesChannelMention = rolesChannelId ? `<#${rolesChannelId}>` : 'o canal de cargos da guilda';

  // 1. Enviar mensagem no canal de boas-vindas do servidor (se configurado)
  if (welcomeChannelId) {
    const welcomeChannel = guild.channels.cache.get(welcomeChannelId);
    if (welcomeChannel && welcomeChannel.isTextBased()) {
      const welcomeEmbed = new EmbedBuilder()
        .setColor(config.embedColor)
        .setTitle(`🎉 Bem-vindo(a) à Guilda, ${member.displayName}!`)
        .setDescription(
          `Olá ${member}! Ficamos felizes em ter você aqui no servidor da guilda **${guild.name}**.\n\n` +
          `👉 **Próximo passo obrigatório:**\n` +
          `Vá até ${rolesChannelMention} para selecionar as tags dos jogos que você joga (**Aion 2**, **Dota 2**, **Conan Exiles** e **Valorant**).\n` +
          `Isso liberará as salas exclusivas e facilitará encontrar grupos para jogar!`
        )
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: 'Sistema de Registro da Guilda' })
        .setTimestamp();

      try {
        await welcomeChannel.send({ content: `Bem-vindo(a) ${member}!`, embeds: [welcomeEmbed] });
      } catch (err) {
        console.error('Erro ao enviar mensagem no canal de boas-vindas:', err.message);
      }
    }
  }

  // 2. Enviar Mensagem Direta (DM) para o novo membro
  if (sendDm) {
    const dmEmbed = new EmbedBuilder()
      .setColor(config.embedColor)
      .setTitle(`⚔️ Bem-vindo(a) à Guilda em ${guild.name}!`)
      .setDescription(
        `Olá **${member.user.username}**! 👋\n\n` +
        `Para personalizar o seu perfil na guilda e liberar o acesso às salas certas, por favor acesse ${rolesChannelMention} no servidor e selecione:\n\n` +
        `• ⚔️ **Aion 2**: Sua classe principal (Gladiador, Templário, Ranger, etc.)\n` +
        `• 🛡️ **Dota 2**: Sua medalha atual (Arauto até Imortal)\n` +
        `• 🏕️ **Conan Exiles**: Seu modo preferido (PvE / PvP / Conflito)\n` +
        `• 🎯 **Valorant**: Seu elo atual (Ferro até Radiante)\n\n` +
        `Esperamos que aproveite a jogatina com a guilda!`
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

        let desc = 'As categorias e salas exclusivas foram criadas e configuradas com sucesso!\n\n' +
                   '🔒 **Privacidade**: As salas estão 100% ocultas para `@everyone` e só aparecem no Discord de quem selecionar a respectiva tag de jogo!\n\n';

        for (const item of result.report) {
          desc += `### ${item.categoryName} *(Cargo: \`${item.parentRoleName}\`)*\n`;
          if (item.categoryCreated) {
            desc += `📁 Categoria criada com sucesso.\n`;
          }
          if (item.createdChannels.length > 0) {
            desc += `✨ **Salas Criadas:** ${item.createdChannels.map(c => `\`${c}\``).join(', ')}\n`;
          }
          if (item.renamedChannels.length > 0) {
            desc += `✏️ **Renomeadas:** ${item.renamedChannels.map(c => `\`${c}\``).join(', ')}\n`;
          }
          if (item.deletedChannels.length > 0) {
            desc += `🗑️ **Duplicadas removidas:** ${item.deletedChannels.length}\n`;
          }
          desc += `✅ **Salas no total:** ${item.existingChannels.length + item.createdChannels.length}\n\n`;
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
          .setTitle('🏗️ Salas dos Jogos Configuradas com Sucesso!')
          .setDescription(desc)
          .setFooter({ text: 'Apenas membros com a tag do jogo verão os canais correspondentes!' })
          .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
      } catch (err) {
        console.error('Erro no comando criar-salas:', err);
        return interaction.editReply({
          content: `❌ Erro ao configurar salas: ${err.message}`
        });
      }
    }

    // Comando: /setup-gods
    if (commandName === 'setup-gods') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      try {
        const result = await setupGodsArea(interaction.guild);
        if (result.error) {
          return interaction.editReply({ content: result.error });
        }

        let desc = `👑 **Área Privada dos Gods Configurada com Sucesso!**\n\n` +
                   `• **Cargo Exclusivo:** \`${result.roleName}\` *(Dourado, separado no topo da lista de membros)*\n` +
                   `• **Categoria Privada:** \`${result.categoryName}\`\n\n` +
                   `🔒 **Permissões:** Oculta para @everyone. Apenas membros que receberem a tag \`${result.roleName}\` manualmente de um Administrador conseguirão enxergar e acessar as salas!\n\n` +
                   `### 📁 Salas Configuradas:\n` +
                   `• 💬 **\`💬・bate-papo-gods\`** (Texto)\n` +
                   `• 🎮 **\`🎮・Jogando\`** (Voz)\n` +
                   `• 💤 **\`💤・Ausente\`** (Voz)\n\n` +
                   `💡 *Para dar acesso a alguém, basta um Administrador ir no perfil do membro e adicionar o cargo \`${result.roleName}\`!*`;

        const embed = new EmbedBuilder()
          .setColor(0xF1C40F)
          .setTitle('👑 Área dos Gods')
          .setDescription(desc)
          .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
      } catch (err) {
        console.error('Erro no comando setup-gods:', err);
        return interaction.editReply({
          content: `❌ Erro ao configurar Área dos Gods: ${err.message}`
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
        .setTitle('📖 Central de Ajuda - Bot da Guilda')
        .setDescription(
          `Este bot gerencia automaticamente o onboarding, as tags e os canais privados dos membros da guilda nos seguintes jogos:\n` +
          `• ⚔️ **Aion 2** (Classes de combate)\n` +
          `• 🛡️ **Dota 2** (Medalhas ranqueadas)\n` +
          `• 🏕️ **Conan Exiles** (PvE / PvP / Conflito)\n` +
          `• 🎯 **Valorant** (Todos os elos)\n\n` +
          (rolesChannelId ? `📍 Canal oficial de cargos: <#${rolesChannelId}>\n\n` : '') +
          `### 👑 Comandos para Administradores:\n` +
          `• \`/criar-cargos\` : Cria automaticamente no servidor todos os cargos e tags com cores e emojis.\n` +
          `• \`/criar-salas\` : Cria as categorias e salas privadas que só aparecem para quem tiver a tag do jogo.\n` +
          `• \`/setup-gods\` : Cria/sincroniza a Área Privada dos Gods (com bate-papo, jogando e ausente).\n` +
          `• \`/setup-cargos [canal]\` : Envia o painel interativo fixo para o canal selecionado.\n` +
          `• \`/config-boas-vindas [canal] [enviar_dm]\` : Define onde anunciar membros e se envia DM.\n\n` +
          `### 🎮 Comandos para Membros:\n` +
          `• \`/cargos\` : Abre um painel pessoal para você escolher suas tags onde estiver.\n` +
          `• \`/ajuda\` : Mostra esta mensagem explicativa.`
        )
        .setFooter({ text: 'Guild Bot • Desenvolvido com Discord.js' });

      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
  }

  // Trata Menus Dropdown (StringSelectMenu)
  if (interaction.isStringSelectMenu()) {
    const customId = interaction.customId;
    let gameKey = null;

    if (customId === config.games.aion2.customId) gameKey = 'aion2';
    else if (customId === config.games.dota2.customId) gameKey = 'dota2';
    else if (customId === config.games.conan.customId) gameKey = 'conan';
    else if (customId === config.games.valorant.customId) gameKey = 'valorant';

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
