const { ChannelType, PermissionFlagsBits } = require('discord.js');
const config = require('./config');

const MEMBER_ALLOW = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.SendMessagesInThreads,
  PermissionFlagsBits.CreatePublicThreads,
  PermissionFlagsBits.ReadMessageHistory,
  PermissionFlagsBits.Connect,
  PermissionFlagsBits.Speak,
  PermissionFlagsBits.Stream,
  PermissionFlagsBits.AttachFiles,
  PermissionFlagsBits.EmbedLinks
];
const BOT_ALLOW = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.ManageChannels,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.ManageMessages,
  PermissionFlagsBits.EmbedLinks,
  PermissionFlagsBits.AttachFiles
];
const READ_ONLY_DENY = [
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.CreatePublicThreads,
  PermissionFlagsBits.CreatePrivateThreads,
  PermissionFlagsBits.SendMessagesInThreads
];

/**
 * Organiza o servidor inteiro conforme config.layout:
 * - Categorias na ordem do layout, com as permissões do tipo de acesso
 * - Salas com nome antigo (aliases) são renomeadas em vez de duplicadas
 * - Salas que sobram nas categorias com prune são apagadas, mas só se estiverem vazias
 * - Sala Oficial de Ausente (AFK) do Discord com descida automática após 5 min
 */
async function setupGameChannels(guild) {
  await guild.roles.fetch();
  await guild.channels.fetch();

  const botMember = await guild.members.fetchMe();
  if (!botMember.permissions.has(PermissionFlagsBits.ManageChannels)) {
    return {
      error: '❌ O bot não possui permissão para criar ou gerenciar canais (`Gerenciar Canais` / `Manage Channels`)!'
    };
  }

  const hasForums = guild.features.includes('COMMUNITY');
  const report = [];
  const kept = [];
  const layoutCategories = [];
  const usedIds = new Set();
  const pruneCategories = [];

  // Categorias de onde as salas não podem ser "puxadas" por nome (privadas)
  const privateNames = new Set(
    config.layout
      .filter(c => c.access === 'game' || c.access === 'staff' || c.access === 'readOnly')
      .flatMap(c => [c.name, ...(c.aliases || [])].map(n => n.toLowerCase()))
  );

  for (const catDef of config.layout) {
    let overwrites;
    try {
      overwrites = await categoryOverwrites(guild, catDef, botMember);
    } catch (err) {
      console.error(`Erro ao preparar permissões de ${catDef.name}:`, err);
      continue;
    }

    let category;
    let categoryCreated = false;
    try {
      ({ category, created: categoryCreated } = await ensureCategory(guild, catDef, overwrites));
    } catch (err) {
      console.error(`Erro ao configurar categoria ${catDef.name}:`, err);
      continue;
    }
    layoutCategories.push(category);

    // Salas que podem ser reaproveitadas: as desta categoria e as soltas em categorias públicas
    await guild.channels.fetch();
    const scope = guild.channels.cache.filter(c => {
      if (c.type === ChannelType.GuildCategory) return false;
      if (c.parentId === category.id) return true;
      if (!c.parent) return true;
      return !privateNames.has(c.parent.name.toLowerCase()) &&
        !c.parent.permissionOverwrites.cache.get(guild.id)?.deny.has(PermissionFlagsBits.ViewChannel);
    });

    const result = await syncChannels(guild, category, catDef, { scope, hasForums, usedIds });
    if (catDef.prune) pruneCategories.push({ category, result });

    // Salas fechadas seguem as permissões da categoria (mantendo extras, ex: bot de música)
    if (overwrites) await syncChildPermissions(guild, category, overwrites);

    report.push({ categoryName: category.name, categoryCreated, ...result });
  }

  // Remove as salas que sobraram nas categorias com prune (depois de todas as categorias,
  // para uma sala antiga poder ser reaproveitada por outra categoria)
  await guild.channels.fetch();
  for (const { category, result } of pruneCategories) {
    const leftovers = guild.channels.cache.filter(c => c.parentId === category.id && !usedIds.has(c.id));
    for (const ch of leftovers.values()) {
      if (await isEmpty(ch)) {
        await ch.delete('Sala antiga removida na reorganização');
        result.deleted.push(ch.name);
      } else {
        kept.push(`${category.name} / ${ch.name}`);
      }
    }
  }

  // Apaga categorias antigas que ficaram vazias
  await guild.channels.fetch();
  const layoutIds = new Set(layoutCategories.map(c => c.id));
  for (const name of config.obsoleteCategories || []) {
    const cat = guild.channels.cache.find(
      c => c.type === ChannelType.GuildCategory && c.name.toLowerCase() === name.toLowerCase() && !layoutIds.has(c.id)
    );
    if (cat && guild.channels.cache.filter(c => c.parentId === cat.id).size === 0) {
      await cat.delete('Categoria antiga vazia').catch(err => console.error(`Erro ao apagar ${name}:`, err));
    }
  }

  // Ordem das categorias: layout primeiro, o resto mantém a ordem atual
  await guild.channels.fetch();
  const others = guild.channels.cache
    .filter(c => c.type === ChannelType.GuildCategory && !layoutIds.has(c.id))
    .sort((a, b) => a.rawPosition - b.rawPosition);
  const categoryUpdates = [...layoutCategories, ...others.values()]
    .map((c, i) => ({ channel: c.id, position: i, current: guild.channels.cache.get(c.id)?.rawPosition }))
    .filter(u => u.current !== u.position)
    .map(({ channel, position }) => ({ channel, position }));
  if (categoryUpdates.length) await guild.channels.setPositions(categoryUpdates);

  // Sala Oficial de Ausente (AFK) do Discord
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
    kept,
    hasForums,
    afkChannelName: afkChannel ? afkChannel.name : null
  };
}

/**
 * Permissões da categoria conforme o tipo de acesso. "public" não mexe nas permissões (null).
 */
async function categoryOverwrites(guild, catDef, botMember) {
  const everyone = guild.roles.everyone.id;
  const bot = { id: botMember.id, allow: BOT_ALLOW };

  if (catDef.access === 'readOnly') {
    return [
      { id: everyone, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory], deny: READ_ONLY_DENY },
      bot
    ];
  }

  if (catDef.access === 'game') {
    const game = config.games[catDef.game];
    let parentRole = findRole(guild, game.parentRole.name);
    if (!parentRole) {
      parentRole = await guild.roles.create({
        name: game.parentRole.name,
        color: game.parentRole.color,
        hoist: true,
        reason: `Cargo de acesso às salas de ${game.title}`
      });
    }
    return [
      { id: everyone, deny: [PermissionFlagsBits.ViewChannel] },
      { id: parentRole.id, allow: MEMBER_ALLOW },
      bot
    ];
  }

  if (catDef.access === 'staff') {
    const staff = (config.staffRoles || []).map(n => findRole(guild, n)).filter(Boolean);
    return [
      { id: everyone, deny: [PermissionFlagsBits.ViewChannel] },
      ...staff.map(r => ({ id: r.id, allow: [...MEMBER_ALLOW, PermissionFlagsBits.UseExternalEmojis] })),
      bot
    ];
  }

  return null;
}

function findRole(guild, name) {
  return guild.roles.cache.find(r => r.name.toLowerCase() === name.toLowerCase());
}

/**
 * Busca a categoria pelo nome (ou nome antigo), renomeia e aplica as permissões; cria se não existir.
 */
async function ensureCategory(guild, catDef, overwrites) {
  const names = [catDef.name, ...(catDef.aliases || [])].map(n => n.toLowerCase());
  let category = guild.channels.cache.find(
    c => c.type === ChannelType.GuildCategory && names.includes(c.name.toLowerCase())
  );
  if (!category) {
    category = await guild.channels.create({
      name: catDef.name,
      type: ChannelType.GuildCategory,
      ...(overwrites ? { permissionOverwrites: overwrites } : {})
    });
    return { category, created: true };
  }
  if (category.name !== catDef.name) await category.setName(catDef.name);
  if (overwrites) await category.permissionOverwrites.set(overwrites);
  return { category, created: false };
}

/**
 * Aplica as permissões da categoria em cada sala, preservando permissões extras da sala
 * (ex: bot de música) que não fazem parte da categoria.
 */
async function syncChildPermissions(guild, category, overwrites) {
  await guild.channels.fetch();
  const ids = new Set(overwrites.map(o => o.id));
  for (const ch of guild.channels.cache.filter(c => c.parentId === category.id).values()) {
    const extras = ch.permissionOverwrites.cache
      .filter(o => !ids.has(o.id))
      .map(o => ({ id: o.id, type: o.type, allow: o.allow.bitfield, deny: o.deny.bitfield }));
    try {
      await ch.permissionOverwrites.set([...overwrites, ...extras]);
    } catch (err) {
      console.error(`Erro ao aplicar permissões em ${ch.name}:`, err.message);
    }
  }
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
 * Se o Discord não responder, a sala conta como NÃO vazia (nunca apaga na dúvida).
 */
async function isEmpty(channel) {
  if (channel.type === ChannelType.GuildVoice) {
    if (channel.members.size > 0) return false;
    const msgs = await channel.messages.fetch({ limit: 1 }).catch(() => null);
    return !!msgs && msgs.size === 0;
  }
  if (channel.type === ChannelType.GuildForum) {
    const active = await channel.threads.fetchActive().catch(() => null);
    const archived = await channel.threads.fetchArchived({ limit: 2 }).catch(() => null);
    return !!active && !!archived && active.threads.size === 0 && archived.threads.size === 0;
  }
  if (channel.messages) {
    const msgs = await channel.messages.fetch({ limit: 1 }).catch(() => null);
    return !!msgs && msgs.size === 0;
  }
  return false;
}

/**
 * Etiquetas do fórum, reaproveitando as existentes (pelo nome ou nome antigo) para os posts não perderem a etiqueta.
 */
function forumTags(def, channel) {
  const current = channel?.availableTags || [];
  return def.tags.map(t => {
    const names = [t.name, ...(t.aliases || [])].map(n => n.toLowerCase());
    const existing = current.find(c => names.includes(c.name.toLowerCase()));
    return {
      ...(existing ? { id: existing.id } : {}),
      name: t.name,
      emoji: t.emoji ? { id: null, name: t.emoji } : null
    };
  });
}

function channelOptions(guild, def, type, hasForums) {
  const options = { name: def.name, type };
  if (type !== ChannelType.GuildVoice) {
    options.topic = def.type === 'forum' && !hasForums
      ? `${def.topic || ''} (Crie um tópico por assunto)`.trim()
      : def.topic || undefined;
  }
  if (type === ChannelType.GuildForum && def.tags) options.availableTags = forumTags(def, null);
  if (def.readOnly) {
    options.permissionOverwrites = [
      { id: guild.roles.everyone.id, allow: [PermissionFlagsBits.ViewChannel], deny: READ_ONLY_DENY },
      { id: guild.members.me.id, allow: BOT_ALLOW }
    ];
  }
  return options;
}

/**
 * Deixa a categoria com as salas da lista, na ordem da lista.
 */
async function syncChannels(guild, category, catDef, { scope, hasForums, usedIds }) {
  const created = [];
  const existing = [];
  const renamed = [];
  const deleted = [];
  const used = usedIds;
  const ordered = [];

  for (const def of catDef.channels) {
    const type = wantedType(def, hasForums);
    const names = [def.name, ...(def.aliases || [])].map(n => n.toLowerCase());
    const pool = def.moveFrom ? guild.channels.cache : scope;
    const sameKind = c => (type === ChannelType.GuildVoice ? c.type === ChannelType.GuildVoice : isTextual(c.type));

    // Prefere uma sala que já está nesta categoria; depois o nome atual; depois os nomes antigos
    let channel = null;
    for (const inCategory of [true, false]) {
      for (const n of names) {
        channel = pool.find(c =>
          !used.has(c.id) && c.type !== ChannelType.GuildCategory &&
          (c.parentId === category.id) === inCategory &&
          c.name.toLowerCase() === n && sameKind(c)
        );
        if (channel) break;
      }
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
        if (def.tags && channel.type === ChannelType.GuildForum) edit.availableTags = forumTags(def, channel);
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

  // Ordem das salas dentro da categoria (o Discord sempre mostra texto antes de voz)
  const updates = ordered.map((c, i) => ({ channel: c.id, position: i }));
  if (updates.length) await guild.channels.setPositions(updates);

  return { created, existing, renamed, deleted };
}

module.exports = {
  setupGameChannels
};
