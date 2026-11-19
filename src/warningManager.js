const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');

const WARNING_ROLES = [
  { level: 1, name: "⚠️┃Advertência 1", color: "#F1C40F", aliases: ["advertência 1", "advertencia 1", "adv 1"] },
  { level: 2, name: "⚠️┃Advertência 2", color: "#E67E22", aliases: ["advertência 2", "advertencia 2", "adv 2"] },
  { level: 3, name: "🚨┃Advertência 3", color: "#E74C3C", aliases: ["advertência 3", "advertencia 3", "adv 3"] },
];

/**
 * Garante que as 3 tags de advertência existam no servidor.
 */
async function ensureWarningRoles(guild) {
  const created = [];
  const existing = [];
  const errors = [];

  for (const def of WARNING_ROLES) {
    try {
      const names = [def.name, ...def.aliases].map(n => n.toLowerCase());
      let role = guild.roles.cache.find(r => names.includes(r.name.toLowerCase()));

      if (!role) {
        role = await guild.roles.create({
          name: def.name,
          color: def.color,
          hoist: false,
          mentionable: true,
          reason: `Sistema de Advertências da Fight Kings: Nível ${def.level}`
        });
        created.push(role.name);
      } else {
        if (role.name !== def.name) {
          await role.setName(def.name).catch(() => {});
        }
        existing.push(role.name);
      }
    } catch (err) {
      console.warn(`Erro ao verificar/criar tag de advertência "${def.name}":`, err.message);
      errors.push({ name: def.name, error: err.message });
    }
  }

  return { created, existing, errors };
}

/**
 * Retorna os cargos de advertência configurados no servidor
 */
function getWarningRoles(guild) {
  const map = new Map();
  for (const def of WARNING_ROLES) {
    const names = [def.name, ...def.aliases].map(n => n.toLowerCase());
    const role = guild.roles.cache.find(r => names.includes(r.name.toLowerCase()));
    if (role) map.set(def.level, role);
  }
  return map;
}

/**
 * Identifica o nível atual de advertência de um membro (0 a 3)
 */
function getMemberWarningLevel(member) {
  if (!member || !member.roles) return 0;
  for (let lvl = 3; lvl >= 1; lvl--) {
    const def = WARNING_ROLES.find(w => w.level === lvl);
    const names = [def.name, ...def.aliases].map(n => n.toLowerCase());
    const hasRole = member.roles.cache.some(r => names.includes(r.name.toLowerCase()));
    if (hasRole) return lvl;
  }
  return 0;
}

/**
 * Define o nível exato de advertência de um membro (0 = limpo, 1, 2, ou 3)
 */
async function setMemberWarningLevel(member, targetLevel, reason = 'Ajuste de advertência') {
  const guild = member.guild;
  const warningRoles = getWarningRoles(guild);

  // Remove todos os cargos de advertência que o membro possua
  for (const [, role] of warningRoles) {
    if (member.roles.cache.has(role.id)) {
      await member.roles.remove(role, reason).catch(() => {});
    }
  }

  // Se o novo nível for > 0, adiciona o cargo correspondente
  if (targetLevel > 0 && warningRoles.has(targetLevel)) {
    const newRole = warningRoles.get(targetLevel);
    await member.roles.add(newRole, reason).catch(() => {});
    return newRole;
  }

  return null;
}

/**
 * Envia notificação oficial no canal de advertências
 */
async function logWarningToChannel(guild, embed) {
  const channelNames = ["sistema-de-advertencias", "advertencias-e-regras", "advertencias"];
  const channel = guild.channels.cache.find(c =>
    c.isTextBased() && channelNames.some(name => c.name.toLowerCase().includes(name))
  );

  if (channel) {
    try {
      await channel.send({ embeds: [embed] });
      return true;
    } catch (err) {
      console.warn("Erro ao enviar log de advertência no canal:", err.message);
    }
  }
  return false;
}

module.exports = {
  WARNING_ROLES,
  ensureWarningRoles,
  getWarningRoles,
  getMemberWarningLevel,
  setMemberWarningLevel,
  logWarningToChannel,
};
