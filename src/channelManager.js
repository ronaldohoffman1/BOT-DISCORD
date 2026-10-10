const { ChannelType, PermissionFlagsBits } = require('discord.js');
const config = require('./config');

/**
 * Organiza o servidor inteiro:
 * - Categorias fixas do topo (📌┃INÍCIO, 💬┃COMUNIDADE) definidas em config.serverLayout
 * - Uma categoria privada por jogo (só aparece para quem tem o cargo 🎮┃Jogo)
 * - Fórum de builds/guias por jogo (vira sala de texto se o servidor não for Comunidade)
 * - Salas com nome antigo (aliases) são renomeadas em vez de duplicadas
 * - Salas que sobram nas categorias são apagadas, mas só se estiverem vazias
 * - Sala Oficial de Ausente (AFK) do Discord com descida automática após 5 min
 */
async function setupGameChannels(guild) {
  await guild.roles.fetch();
  await guild.channels.fetch();

  const botMember = guild.members.me;
  if (!botMember.permissions.has(PermissionFlagsBits.ManageChannels)) {
    return {
      error: '❌ O bot não possui permissão para criar ou gerenciar canais (`Gerenciar Canais` / `Manage Channels`)!'
    };
  }

  const hasForums = guild.features.includes('COMMUNITY');
  const report = [];
  const layoutReport = [];
  const kept = []; // salas que sobraram mas não foram apagadas por terem mensagens

  // 1. Categorias fixas do topo
  const layoutCategories = [];
  for (const catDef of config.serverLayout || []) {
    const category = await ensureCategory(guild, catDef);
    layoutCategories.push(category);

    // Salas do layout podem estar em qualquer lugar fora das categorias de jogos/privadas
    const gameCategoryNames = new Set(Object.values(config.games).map(g => g.categoryName.toLowerCase()));
    const scope = guild.channels.cache.filter(c => {
      if (c.type === ChannelType.GuildCategory) return false;
      const parent = c.parent;
      if (!parent) return true;
      if (gameCategoryNames.has(parent.name.toLowerCase())) return false;
      if (parent.permissionOverwrites.cache.get(guild.id)?.deny.has(PermissionFlagsBits.ViewChannel)) return false;
      return true;
    });

    const result = await syncChannels(guild, category, catDef.channels, { scope, hasForums, prune: false });
    layoutReport.push({ categoryName: category.name, ...result });
  }

  // 2. Categorias dos jogos
  for (const game of Object.values(config.games)) {
    let parentRole = guild.roles.cache.find(
      r => r.name.toLowerCase() === game.parentRole.name.toLowerCase()
    );
    if (!parentRole) {
      try {
        parentRole = await guild.roles.create({
          name: game.parentRole.name,
          color: game.parentRole.color,
          hoist: true,
          reason: `Cargo de acesso às salas de ${game.title}`
        });
      } catch (err) {
        console.error(`Erro ao criar cargo pai de ${game.title}:`, err);
        continue;
      }
    }

    const permissionOverwrites = [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      {
        id: parentRole.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.SendMessagesInThreads,
          PermissionFlagsBits.CreatePublicThreads,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.Connect,
          PermissionFlagsBits.Speak,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks
        ]
      },
      {
        id: botMember.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.SendMessages]
      }
    ];

    let category = guild.channels.cache.find(
      c => c.type === ChannelType.GuildCategory && c.name.toLowerCase() === game.categoryName.toLowerCase()
    );
    const categoryCreated = !category;
    try {
      if (!category) {
        category = await guild.channels.create({
          name: game.categoryName,
          type: ChannelType.GuildCategory,
          permissionOverwrites
        });
      } else {
        await category.permissionOverwrites.set(permissionOverwrites);
      }
    } catch (err) {
      console.error(`Erro ao configurar categoria ${game.categoryName}:`, err);
      continue;
    }

    const scope = guild.channels.cache.filter(c => c.parentId === category.id);
    const result = await syncChannels(guild, category, game.channels, { scope, hasForums, prune: true });
    kept.push(...result.kept);

    report.push({
      gameTitle: game.title,
      categoryName: category.name,
      parentRoleName: parentRole.name,
      categoryCreated,
      createdChannels: result.created,
      existingChannels: result.existing,
      renamedChannels: result.renamed,
      deletedChannels: result.deleted
    });
  }

  // 3. Apaga categorias antigas que ficaram vazias
  await guild.channels.fetch();
  for (const name of config.obsoleteCategories || []) {
    const cat = guild.channels.cache.find(
      c => c.type === ChannelType.GuildCategory && c.name.toLowerCase() === name.toLowerCase()
    );
    if (cat && guild.channels.cache.filter(c => c.parentId === cat.id).size === 0) {
      await cat.delete('Categoria antiga vazia').catch(err => console.error(`Erro ao apagar ${name}:`, err));
    }
  }

  // 4. Ordem das categorias: layout do topo primeiro, o resto mantém a ordem atual
  await guild.channels.fetch();
  const layoutIds = new Set(layoutCategories.map(c => c.id));
  const others = guild.channels.cache
    .filter(c => c.type === ChannelType.GuildCategory && !layoutIds.has(c.id))
    .sort((a, b) => a.rawPosition - b.rawPosition);
  const categoryOrder = [...layoutCategories, ...others.values()];
  const categoryUpdates = categoryOrder
    .map((c, i) => ({ channel: c.id, position: i, current: c.rawPosition }))
    .filter(u => u.current !== u.position)
    .map(({ channel, position }) => ({ channel, position }));
  if (categoryUpdates.length) await guild.channels.setPositions(categoryUpdates);

  // 5. Sala Oficial de Ausente (AFK) do Discord
  const afkChannel = guild.channels.cache.find(
    c => c.type === ChannelType.GuildVoice && c.name.toLowerCase().includes('ausente (afk)')
  );
  if (afkChannel) {
    try {
      if (guild.afkChannelId !== afkChannel.id) await guild.setAFKChannel(afkChannel, 'Definir canal oficial de AFK do Discord');
      if (guild.afkTimeout !== 300) await guild.setAFKTimeout(300, '5 minutos de inatividade move automaticamente');
    } catch (err) {
      console.error('Erro ao definir canal de AFK nas configurações do servidor:', err);
    }
  }

  return {
    report,
    layoutReport,
    kept,
    hasForums,
    afkChannelName: afkChannel ? afkChannel.name : null,
    afkCreated: false
  };
}

/**
 * Busca a categoria pelo nome (ou nome antigo) e renomeia; cria se não existir.
 */
async function ensureCategory(guild, catDef) {
  const names = [catDef.name, ...(catDef.aliases || [])].map(n => n.toLowerCase());
  let category = guild.channels.cache.find(
    c => c.type === ChannelType.GuildCategory && names.includes(c.name.toLowerCase())
  );
  if (!category) {
    return guild.channels.create({ name: catDef.name, type: ChannelType.GuildCategory });
  }
  if (category.name !== catDef.name) await category.setName(catDef.name);
  return category;
}

function isTextual(type) {
  return type === ChannelType.GuildText || type === ChannelType.GuildForum || type === ChannelType.GuildAnnouncement;
}

function wantedType(def, hasForums) {
  if (def.type === 'voice') return ChannelType.GuildVoice;
  if (def.type === 'forum' && hasForums) return ChannelType.GuildForum;
  return ChannelType.GuildText;
}

/**
 * Uma sala está vazia se não tem mensagens (texto), posts (fórum) nem gente conectada (voz).
 */
async function isEmpty(channel) {
  if (channel.type === ChannelType.GuildVoice) {
    if (channel.members.size > 0) return false;
    const msgs = await channel.messages.fetch({ limit: 1 }).catch(() => null);
    return !msgs || msgs.size === 0;
  }
  if (channel.type === ChannelType.GuildForum) {
    const active = await channel.threads.fetchActive().catch(() => null);
    const archived = await channel.threads.fetchArchived({ limit: 1 }).catch(() => null);
    return (!active || active.threads.size === 0) && (!archived || archived.threads.size === 0);
  }
  if (channel.messages) {
    const msgs = await channel.messages.fetch({ limit: 1 }).catch(() => null);
    return !msgs || msgs.size === 0;
  }
  return false;
}

function channelOptions(guild, def, type, hasForums) {
  const options = { name: def.name, type };
  if (type !== ChannelType.GuildVoice) {
    options.topic = def.type === 'forum' && !hasForums
      ? `${def.topic || ''} (Crie um tópico por assunto)`.trim()
      : def.topic || undefined;
  }
  if (type === ChannelType.GuildForum && def.tags) {
    options.availableTags = def.tags.map(t => ({ name: t.name, emoji: t.emoji ? { id: null, name: t.emoji } : null }));
  }
  if (def.readOnly) {
    options.permissionOverwrites = [
      { id: guild.roles.everyone.id, allow: [PermissionFlagsBits.ViewChannel], deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.CreatePublicThreads] },
      { id: guild.members.me.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages] }
    ];
  }
  return options;
}

/**
 * Deixa a categoria exatamente com as salas da lista, na ordem da lista.
 */
async function syncChannels(guild, category, defs, { scope, hasForums, prune }) {
  const created = [];
  const existing = [];
  const renamed = [];
  const deleted = [];
  const kept = [];
  const used = new Set();
  const ordered = [];

  for (const def of defs) {
    const type = wantedType(def, hasForums);
    const names = [def.name, ...(def.aliases || [])].map(n => n.toLowerCase());

    // Prefere o nome atual; senão o primeiro nome antigo encontrado
    let channel = null;
    for (const n of names) {
      channel = scope.find(c =>
        !used.has(c.id) &&
        c.name.toLowerCase() === n &&
        (type === ChannelType.GuildVoice ? c.type === ChannelType.GuildVoice : isTextual(c.type))
      );
      if (channel) break;
    }

    // Tipo diferente (ex: texto que deve virar fórum): recria se estiver vazia
    if (channel && channel.type !== type) {
      if (await isEmpty(channel)) {
        await channel.delete(`Recriada como ${def.type}`);
        channel = null;
      }
    }

    const options = channelOptions(guild, def, type, hasForums);
    try {
      if (!channel) {
        channel = await guild.channels.create({ ...options, parent: category.id });
        created.push(def.name);
      } else {
        const edit = {};
        if (channel.name !== def.name) {
          renamed.push(`${channel.name} → ${def.name}`);
          edit.name = def.name;
        }
        if (channel.parentId !== category.id) {
          edit.parent = category.id;
          edit.lockPermissions = !def.readOnly;
        }
        if (options.topic !== undefined && channel.topic !== options.topic) edit.topic = options.topic;
        if (options.availableTags && channel.type === ChannelType.GuildForum) edit.availableTags = options.availableTags;
        if (Object.keys(edit).length) await channel.edit(edit);
        if (def.readOnly) await channel.permissionOverwrites.set(options.permissionOverwrites);
        existing.push(def.name);
      }
      used.add(channel.id);
      ordered.push(channel);
    } catch (err) {
      console.error(`Erro ao configurar sala ${def.name}:`, err);
    }
  }

  // Remove as salas que sobraram na categoria
  if (prune) {
    await guild.channels.fetch();
    const leftovers = guild.channels.cache.filter(c => c.parentId === category.id && !used.has(c.id));
    for (const ch of leftovers.values()) {
      if (await isEmpty(ch)) {
        await ch.delete('Sala duplicada/antiga removida na reorganização');
        deleted.push(ch.name);
      } else {
        kept.push(`${category.name} / ${ch.name}`);
      }
    }
  }

  // Ordem das salas dentro da categoria (o Discord sempre mostra texto antes de voz)
  const updates = ordered.map((c, i) => ({ channel: c.id, position: i }));
  if (updates.length) await guild.channels.setPositions(updates);

  return { created, existing, renamed, deleted, kept };
}

module.exports = {
  setupGameChannels
};
