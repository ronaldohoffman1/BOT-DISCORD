const { ChannelType, PermissionFlagsBits } = require('discord.js');

async function setupGodsArea(guild) {
  await guild.roles.fetch();
  await guild.channels.fetch();

  const botMember = await guild.members.fetchMe();
  if (!botMember.permissions.has(PermissionFlagsBits.ManageChannels) || !botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
    return {
      error: '❌ O bot precisa de permissão de Gerenciar Canais e Gerenciar Cargos!'
    };
  }

  // 1. Cargo 👑┃Gods
  let godsRole = guild.roles.cache.find(
    r => r.name.toLowerCase() === '👑┃gods' || r.name.toLowerCase() === 'gods'
  );

  let roleCreated = false;
  if (!godsRole) {
    godsRole = await guild.roles.create({
      name: '👑┃Gods',
      color: '#F1C40F',
      hoist: true,
      reason: 'Cargo exclusivo da Área dos Gods (atribuído manualmente por admin)'
    });
    roleCreated = true;
  } else if (!godsRole.hoist) {
    await godsRole.setHoist(true);
  }

  // 2. Categoria Privada
  const categoryName = '🔒┃ÁREA DOS GODS';
  let category = guild.channels.cache.find(
    c => c.type === ChannelType.GuildCategory && c.name.toLowerCase() === categoryName.toLowerCase()
  );

  const permissionOverwrites = [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionFlagsBits.ViewChannel] // Invisível para @everyone
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
      ] // Visível e liberado apenas para Gods
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

  let categoryCreated = false;
  if (!category) {
    category = await guild.channels.create({
      name: categoryName,
      type: ChannelType.GuildCategory,
      permissionOverwrites
    });
    categoryCreated = true;
  } else {
    await category.permissionOverwrites.set(permissionOverwrites);
  }

  // 3. Salas
  const channelsToCreate = [
    { name: '💬・bate-papo-gods', type: ChannelType.GuildText, topic: 'Sala de bate-papo exclusiva para os Gods' },
    { name: '🎮・Jogando', type: ChannelType.GuildVoice },
    { name: '💤・Ausente', type: ChannelType.GuildVoice }
  ];

  const createdChannels = [];
  const existingChannels = [];

  for (const chDef of channelsToCreate) {
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
      createdChannels.push(ch.name);
    } else {
      existingChannels.push(ch.name);
    }
  }

  return {
    roleName: godsRole.name,
    categoryName: category.name,
    roleCreated,
    categoryCreated,
    createdChannels,
    existingChannels
  };
}

module.exports = {
  setupGodsArea
};
