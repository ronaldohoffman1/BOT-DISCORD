const { PermissionFlagsBits } = require('discord.js');
const config = require('./config');

/**
 * Busca o cargo pelo nome ou por um nome antigo (aliases). Com rename, corrige o nome.
 */
async function findConfigRole(guild, def, { rename = false } = {}) {
  const names = [def.name, ...(def.aliases || [])].map(n => n.toLowerCase());
  const role = guild.roles.cache.find(r => r.name.toLowerCase() === def.name.toLowerCase()) ||
    guild.roles.cache.find(r => names.includes(r.name.toLowerCase()));
  if (role && rename && role.name !== def.name) await role.setName(def.name, 'Nome atualizado');
  return role || null;
}

/**
 * Garante que todos os cargos definidos no config existam no servidor.
 * Inclui os cargos pai (acesso às salas) e os cargos específicos (classes, elos, medalhas).
 */
async function ensureRolesExist(guild) {
  const created = [];
  const existing = [];
  const errors = [];

  // Mapeia todos os cargos (pai e filhos) de todos os jogos
  // Só o cargo pai do jogo fica "exibido separadamente" (hoist), assim a lista de
  // membros agrupa por jogo (AION 2, DOTA 2...) e não por classe/medalha/elo.
  const allRoles = [];
  for (const game of Object.values(config.games)) {
    if (game.parentRole) {
      allRoles.push({ ...game.parentRole, hoist: true });
    }
    for (const r of game.roles) {
      allRoles.push({ ...r, hoist: false });
    }
  }

  // Atualiza cache de cargos do servidor
  // 1. Garante que exista o cargo de BOTS categorizado
  let botRole = guild.roles.cache.find(r => r.name.toLowerCase() === '🤖┃bots');
  if (!botRole) {
    try {
      botRole = await guild.roles.create({
        name: '🤖┃BOTS',
        color: '#5865F2',
        hoist: true,
        reason: 'Separar bots na lista lateral de membros'
      });
      created.push(botRole.name);
    } catch (err) {
      console.error('Erro ao criar cargo de BOTS:', err);
    }
  } else if (!botRole.hoist) {
    await botRole.setHoist(true);
  }

  // Atribui o cargo de bots ao próprio bot
  if (botRole && guild.members.me && !guild.members.me.roles.cache.has(botRole.id)) {
    try {
      await guild.members.me.roles.add(botRole);
    } catch (e) {
      console.error('Erro ao adicionar cargo de BOTS ao bot:', e);
    }
  }

  // 2. Garante todos os cargos (hoist apenas nos cargos pai)
  for (const roleDef of allRoles) {
    let role = await findConfigRole(guild, roleDef, { rename: true });
    if (role) {
      existing.push(role.name);
      if (role.hoist !== roleDef.hoist) {
        try {
          await role.setHoist(roleDef.hoist);
        } catch (err) {
          console.error(`Erro ao ajustar hoist no cargo ${role.name}:`, err);
        }
      }
    } else {
      try {
        role = await guild.roles.create({
          name: roleDef.name,
          color: roleDef.color,
          hoist: roleDef.hoist,
          reason: 'Criação automática de cargos de jogos da guilda'
        });
        created.push(role.name);
      } catch (err) {
        errors.push({ name: roleDef.name, error: err.message });
      }
    }
  }

  // 3. Cargos da legião (Comandante, Elite, Legionário)
  try {
    const legion = await ensureLegionRoles(guild);
    created.push(...legion.created);
  } catch (err) {
    errors.push({ name: 'cargos da legião', error: err.message });
  }

  // 4. Separadores visuais entre os jogos na lista de cargos
  try {
    const sep = await ensureGameSeparators(guild);
    created.push(...sep.created);
  } catch (err) {
    errors.push({ name: 'separadores', error: err.message });
  }

  return { created, existing, errors };
}

/**
 * Processa a seleção do usuário nos menus de dropdown
 * Concede ou remove o cargo do jogo e o cargo pai (que libera as salas do jogo)
 */
async function handleRoleSelection(interaction, gameKey, selectedIds) {
  const game = config.games[gameKey];
  if (!game) return { error: 'Jogo não encontrado na configuração.' };

  const member = interaction.member;
  const guild = interaction.guild;
  await guild.roles.fetch();

  // Verifica se o bot tem permissão de gerenciar cargos
  const botMember = guild.members.me;
  if (!botMember.permissions.has('ManageRoles')) {
    return {
      error: '❌ O bot não possui permissão para gerenciar cargos (`Gerenciar Cargos` / `Manage Roles`). Por favor, dê essa permissão ao cargo do bot!'
    };
  }

  const added = [];
  const removed = [];

  // Garante ou busca o cargo pai (acesso às salas)
  let parentRole = null;
  if (game.parentRole) {
    parentRole = guild.roles.cache.find(
      r => r.name.toLowerCase() === game.parentRole.name.toLowerCase()
    );
    if (!parentRole) {
      try {
        parentRole = await guild.roles.create({
          name: game.parentRole.name,
          color: game.parentRole.color,
          hoist: true,
          reason: `Auto-criação do cargo pai de ${game.title}`
        });
      } catch (err) {
        console.error(`Erro ao criar cargo pai de ${game.title}:`, err);
      }
    }
  }

  // Mapeia roleDef -> guildRole
  const gameRoleMap = new Map();
  for (const roleDef of game.roles) {
    let guildRole = await findConfigRole(guild, roleDef);

    // Se o cargo ainda não existe, cria sob demanda
    if (!guildRole) {
      try {
        guildRole = await guild.roles.create({
          name: roleDef.name,
          color: roleDef.color,
          hoist: false,
          reason: `Auto-criação para categoria ${game.title}`
        });
      } catch (err) {
        console.error(`Erro ao criar cargo ${roleDef.name}:`, err);
      }
    }

    if (guildRole) {
      gameRoleMap.set(roleDef.id, guildRole);
    }
  }

  try {
    if (game.exclusive) {
      // Jogos com cargo único (ex: Elo do Valorant ou Medalha do Dota 2)
      const targetRoleId = selectedIds[0];
      const targetRole = targetRoleId ? gameRoleMap.get(targetRoleId) : null;

      // Remove qualquer outro cargo deste jogo que o membro possua
      for (const [defId, gRole] of gameRoleMap.entries()) {
        if (member.roles.cache.has(gRole.id)) {
          if (!targetRole || gRole.id !== targetRole.id) {
            await member.roles.remove(gRole, `Substituído por novo elo/medalha de ${game.title}`);
            removed.push(gRole.name);
          }
        }
      }

      // Adiciona o novo cargo selecionado
      if (targetRole && !member.roles.cache.has(targetRole.id)) {
        await member.roles.add(targetRole, `Selecionado no menu de ${game.title}`);
        added.push(targetRole.name);
      }
    } else {
      // Jogos de múltipla escolha (ex: Classes do Aion 2, Modos do Conan)
      for (const [defId, gRole] of gameRoleMap.entries()) {
        const isSelected = selectedIds.includes(defId);
        const hasRole = member.roles.cache.has(gRole.id);

        if (isSelected && !hasRole) {
          await member.roles.add(gRole, `Selecionado no menu de ${game.title}`);
          added.push(gRole.name);
        } else if (!isSelected && hasRole) {
          await member.roles.remove(gRole, `Desmarcado no menu de ${game.title}`);
          removed.push(gRole.name);
        }
      }
    }

    // Gerencia o cargo pai (Acesso às salas exclusivas do jogo)
    if (parentRole) {
      // Verifica se o membro tem pelo menos 1 cargo deste jogo após a alteração
      let hasAnyGameRole = false;
      for (const gRole of gameRoleMap.values()) {
        const currentlyHas = member.roles.cache.has(gRole.id);
        const wasAdded = added.includes(gRole.name);
        const wasRemoved = removed.includes(gRole.name);

        if ((currentlyHas && !wasRemoved) || wasAdded) {
          hasAnyGameRole = true;
          break;
        }
      }

      if (hasAnyGameRole && !member.roles.cache.has(parentRole.id)) {
        await member.roles.add(parentRole, `Libera canais de ${game.title}`);
      } else if (!hasAnyGameRole && member.roles.cache.has(parentRole.id)) {
        await member.roles.remove(parentRole, `Bloqueia canais de ${game.title}`);
      }
    }
  } catch (err) {
    if (err.code === 50013) {
      return {
        error: '⚠️ **Hierarquia de Cargos**: O cargo do Bot está **abaixo** dos cargos que ele tenta gerenciar!\n' +
               'Para corrigir: Vá em **Configurações do Servidor ➔ Cargos** e **arraste o cargo do Bot para cima** de todos os cargos de jogos!'
      };
    }
    return { error: `Erro ao gerenciar cargos: ${err.message}` };
  }

  return { added, removed, gameTitle: game.title, parentRoleName: game.parentRole?.name };
}

/**
 * Remove todos os cargos de jogos do membro (filhos e pais)
 */
async function clearAllGameRoles(interaction) {
  const member = interaction.member;
  const guild = interaction.guild;
  await guild.roles.fetch();

  const allConfigRoleNames = new Set();
  for (const game of Object.values(config.games)) {
    if (game.parentRole) {
      allConfigRoleNames.add(game.parentRole.name.toLowerCase());
    }
    for (const r of game.roles) {
      for (const n of [r.name, ...(r.aliases || [])]) allConfigRoleNames.add(n.toLowerCase());
    }
  }

  const removed = [];
  try {
    for (const role of member.roles.cache.values()) {
      if (allConfigRoleNames.has(role.name.toLowerCase())) {
        await member.roles.remove(role, 'Limpeza voluntária de tags de jogos');
        removed.push(role.name);
      }
    }
  } catch (err) {
    if (err.code === 50013) {
      return {
        error: '⚠️ **Hierarquia de Cargos**: Arraste o cargo do Bot para o topo em **Configurações do Servidor ➔ Cargos** para ele poder remover os cargos.'
      };
    }
    return { error: err.message };
  }

  return { removed };
}

/**
 * Retorna os cargos de jogos que o membro possui atualmente
 */
async function getMemberGameRoles(interaction) {
  const member = interaction.member;
  const guild = interaction.guild;
  await guild.roles.fetch();

  const userRolesByGame = {};

  for (const [key, game] of Object.entries(config.games)) {
    userRolesByGame[game.title] = [];
    for (const r of game.roles) {
      const gRole = await findConfigRole(guild, r);
      if (gRole && member.roles.cache.has(gRole.id)) {
        userRolesByGame[game.title].push(`${r.emoji || '🔹'} **${gRole.name}**`);
      }
    }
  }

  return userRolesByGame;
}

/**
 * Nome do cargo separador de um jogo (ex: "━━━━━ ⚔️ AION 2 ━━━━━")
 */
function getSeparatorName(game) {
  return `━━━━━ ${game.emoji} ${game.title.toUpperCase()} ━━━━━`;
}

// Palavras-chave para reconhecer cargos de cada jogo, inclusive os criados manualmente
// (ex: "Aion: Gladiador")
const GAME_KEYWORDS = {
  aion2: /aion/i
};

/**
 * Cria um cargo separador para cada jogo e reorganiza a lista de cargos:
 *   ━━━━━ ⚔️ AION 2 ━━━━━
 *   (cargos do Aion)
 *   ━━━━━ 🛡️ DOTA 2 ━━━━━
 *   (cargos do Dota)
 *   ...
 * Os separadores não têm permissões, cor nem exibição separada (hoist).
 */
async function ensureGameSeparators(guild) {
  await guild.roles.fetch();

  // Cargos atuais do topo para baixo (sem @everyone)
  const ordered = [...guild.roles.cache.values()]
    .filter(r => r.id !== guild.id)
    .sort((a, b) => b.position - a.position);

  const separatorNames = new Set(Object.values(config.games).map(g => getSeparatorName(g)));
  const blocks = Object.entries(config.games).map(([key, game]) => {
    const configNames = new Set(game.roles.flatMap(r => [r.name, ...(r.aliases || [])]).map(n => n.toLowerCase()));
    if (game.parentRole) configNames.add(game.parentRole.name.toLowerCase());
    return { game, keyword: GAME_KEYWORDS[key], configNames, separator: null, roles: [] };
  });

  // Distribui cada cargo de jogo no bloco correspondente
  for (const role of ordered) {
    if (role.managed || !role.editable) continue; // o bot não mexe em cargos acima dele
    const own = blocks.find(b => b.separator === null && role.name === getSeparatorName(b.game));
    if (own) {
      own.separator = role;
      continue;
    }
    if (separatorNames.has(role.name)) continue;
    const name = role.name.toLowerCase();
    const target =
      blocks.find(b => b.configNames.has(name)) ||
      blocks.find(b => b.keyword && b.keyword.test(role.name));
    if (target) target.roles.push(role);
  }

  // Cria os separadores que faltam (apenas para jogos que têm cargos no servidor)
  const created = [];
  for (const block of blocks) {
    if (block.separator || block.roles.length === 0) continue;
    block.separator = await guild.roles.create({
      name: getSeparatorName(block.game),
      color: 0,
      hoist: false,
      mentionable: false,
      permissions: [],
      reason: `Separador visual dos cargos de ${block.game.title}`
    });
    created.push(block.separator.name);
  }

  // Cargo pai no topo do bloco; só ele fica com hoist (grupo na lista de membros)
  for (const block of blocks) {
    const parentName = block.game.parentRole?.name.toLowerCase();
    block.roles.sort((a, b) => (b.name.toLowerCase() === parentName) - (a.name.toLowerCase() === parentName));
    for (const role of block.roles) {
      const shouldHoist = role.name.toLowerCase() === parentName;
      if (role.hoist !== shouldHoist) await role.setHoist(shouldHoist);
    }
  }

  const blockRoles = blocks.flatMap(b => (b.separator ? [b.separator, ...b.roles] : b.roles));
  if (blockRoles.length === 0) return { created, moved: 0, summary: [] };

  // Os blocos entram onde estava o cargo de jogo (ou separador) mais alto. Move um cargo por vez,
  // de cima para baixo (o reposicionamento em lote é recusado pelo Discord quando
  // a lista tem cargos gerenciados, como o de Server Booster).
  const topPosition = Math.max(...blockRoles.map(r => r.position));
  let moved = 0;
  for (let i = 0; i < blockRoles.length; i++) {
    await guild.roles.fetch();
    const role = guild.roles.cache.get(blockRoles[i].id);
    const target = topPosition - i;
    if (role.position !== target) {
      await role.setPosition(target);
      moved++;
    }
  }

  return {
    created,
    moved,
    summary: blocks
      .filter(b => b.separator)
      .map(b => ({ separator: b.separator.name, roles: b.roles.map(r => r.name) }))
  };
}

/**
 * Cria/atualiza os cargos da legião e coloca na ordem do config, logo acima dos cargos de jogo
 * (abaixo dos Gods e do cargo do bot). Exibidos separadamente na lista de membros.
 */
async function ensureLegionRoles(guild) {
  await guild.roles.fetch();
  const created = [];
  const roles = [];
  for (const def of config.legionRoles || []) {
    const permissions = def.permissions.map(p => PermissionFlagsBits[p]);
    let role = await findConfigRole(guild, def, { rename: true });
    if (!role) {
      role = await guild.roles.create({
        name: def.name,
        color: def.color,
        hoist: true,
        mentionable: true,
        permissions,
        reason: `Cargo da legião: ${def.description}`
      });
      created.push(role.name);
    } else {
      await role.edit({ color: def.color, hoist: true, permissions });
    }
    roles.push(role);
  }

  // Posição: em sequência logo abaixo dos Gods (ou do cargo do bot, se não houver Gods)
  await guild.roles.fetch();
  const me = guild.members.me;
  const gods = (config.staffRoles || []).map(n => guild.roles.cache.find(r => r.name === n)).find(Boolean);
  let above = gods && gods.position < me.roles.highest.position ? gods : me.roles.highest;
  for (const role of roles) {
    await guild.roles.fetch();
    const current = guild.roles.cache.get(role.id);
    const anchor = guild.roles.cache.get(above.id);
    const target = current.position < anchor.position ? anchor.position - 1 : anchor.position;
    if (current.position !== target) await current.setPosition(target);
    above = current;
  }
  return { created, roles };
}

module.exports = {
  ensureRolesExist,
  ensureLegionRoles,
  findConfigRole,
  ensureGameSeparators,
  handleRoleSelection,
  clearAllGameRoles,
  getMemberGameRoles
};
