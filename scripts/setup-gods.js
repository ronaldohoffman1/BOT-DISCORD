require('dotenv').config();
const { Client, GatewayIntentBits, ChannelType, PermissionFlagsBits } = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

client.once('clientReady', async () => {
  try {
    const guildId = process.env.GUILD_ID;
    const guild = await client.guilds.fetch(guildId);
    await guild.roles.fetch();
    await guild.channels.fetch();

    console.log(`Conectado ao servidor: ${guild.name}`);

    // 1. Busca ou cria o cargo "Gods" (com emoji e hoist no topo)
    let godsRole = guild.roles.cache.find(
      r => r.name.toLowerCase() === '👑┃gods' || r.name.toLowerCase() === 'gods'
    );

    if (!godsRole) {
      godsRole = await guild.roles.create({
        name: '👑┃Gods',
        color: '#F1C40F', // Dourado
        hoist: true,      // Exibe separado no topo dos membros
        reason: 'Cargo exclusivo da área VIP Gods (apenas atribuído por admin)'
      });
      console.log(`Cargo ${godsRole.name} criado com sucesso!`);
    } else {
      if (!godsRole.hoist) {
        await godsRole.setHoist(true);
      }
      console.log(`Cargo ${godsRole.name} já existente.`);
    }

    // 2. Busca ou cria a categoria privada
    const categoryName = '🔒┃ÁREA DOS GODS';
    let category = guild.channels.cache.find(
      c => c.type === ChannelType.GuildCategory && c.name.toLowerCase() === categoryName.toLowerCase()
    );

    const botMember = await guild.members.fetchMe();

    const permissionOverwrites = [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionFlagsBits.ViewChannel] // ESCONDE PARA TODOS
      },
      {
        id: godsRole.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.Connect,
          PermissionFlagsBits.Speak,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks,
          PermissionFlagsBits.UseExternalEmojis
        ] // MOSTRA APENAS PARA QUEM TEM O CARGO GODS
      },
      {
        id: botMember.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.ManageChannels,
          PermissionFlagsBits.SendMessages
        ]
      }
    ];

    if (!category) {
      category = await guild.channels.create({
        name: categoryName,
        type: ChannelType.GuildCategory,
        permissionOverwrites
      });
      console.log(`Categoria ${category.name} criada com sucesso!`);
    } else {
      await category.permissionOverwrites.set(permissionOverwrites);
      console.log(`Permissões da categoria ${category.name} atualizadas.`);
    }

    // 3. Cria as salas solicitadas:
    // - sala de bate papo (texto)
    // - jogando (voz)
    // - ausente (voz)
    const requiredChannels = [
      { name: '💬・bate-papo-gods', type: ChannelType.GuildText, topic: 'Sala de bate-papo exclusiva para os Gods' },
      { name: '🎮・Jogando', type: ChannelType.GuildVoice },
      { name: '💤・Ausente', type: ChannelType.GuildVoice }
    ];

    for (const chDef of requiredChannels) {
      let ch = guild.channels.cache.find(
        c => c.parentId === category.id && c.name.toLowerCase() === chDef.name.toLowerCase()
      );

      if (!ch) {
        ch = await guild.channels.create({
          name: chDef.name,
          type: chDef.type,
          parent: category.id,
          topic: chDef.topic || undefined
        });
        console.log(`Sala criada: ${ch.name}`);
      } else {
        console.log(`Sala já existe: ${ch.name}`);
      }
    }

    console.log('✅ Área dos Gods configurada com 100% de sucesso!');
  } catch (err) {
    console.error('Erro ao configurar Área dos Gods:', err);
  } finally {
    client.destroy();
  }
});

client.login(process.env.DISCORD_TOKEN);
