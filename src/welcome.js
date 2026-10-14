const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('./config');
const { getGuildSetting, setGuildSetting } = require('./storage');

/**
 * Sala de boas-vindas: config.welcomeChannel (guardada pelo ID, pode ser renomeada).
 * Se não existir, usa a sala definida no /config-boas-vindas.
 */
function findWelcomeChannel(guild) {
  const savedId = getGuildSetting(guild.id, 'welcome_room_id');
  const saved = savedId && guild.channels.cache.get(savedId);
  if (saved) return saved;
  const room = guild.channels.cache.find(c => c.name === config.welcomeChannel && c.isTextBased());
  if (room) {
    setGuildSetting(guild.id, 'welcome_room_id', room.id);
    return room;
  }
  const fallbackId = getGuildSetting(guild.id, 'welcome_channel_id');
  return (fallbackId && guild.channels.cache.get(fallbackId)) || null;
}

function channelMention(guild, name) {
  const ch = guild.channels.cache.find(c => c.name === name);
  return ch ? `${ch}` : `**${name}**`;
}

// Botão que abre direto o menu privado de escolha de classe (mesmo do painel)
function tagButton() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('btn_open_tag_selector')
      .setLabel('Escolher Minha Classe')
      .setEmoji('⚔️')
      .setStyle(ButtonStyle.Success)
  );
}

// Passo a passo para pegar a tag (usado na boas-vindas e na mensagem fixada)
function steps(guild) {
  const rolesId = getGuildSetting(guild.id, 'roles_channel_id');
  const roles = rolesId ? `<#${rolesId}>` : channelMention(guild, '🎭・escolha-de-classe');
  return (
    `**1️⃣ Leia as regras** em ${channelMention(guild, '📜・regras')}.\n\n` +
    `**2️⃣ Pegue sua tag de classe:** clique no botão verde **⚔️ Escolher Minha Classe** aqui embaixo ` +
    `(ou em ${roles}) e escolha até 2 classes. Na hora aparecem as salas do Aion 2: ` +
    `chat da guilda, PvE, Raid, PvP e Guerra de Facções.\n\n` +
    `**3️⃣ Quer entrar na legião?** Apresente-se em ${channelMention(guild, '📝・recrutamento')} ` +
    `com nick, classe, nível/GS e horários. Quem entra recebe a tag **🪽┃Legionário** da liderança; ` +
    `quem é só amigo da guilda recebe **🤝┃Amigos**.\n\n` +
    `**4️⃣ Builds:** veja as mais vistas da sua classe em **📖┃GUIA DAS CLASSES**.`
  );
}

function welcomeMessage(member) {
  const guild = member.guild;
  return {
    content: `👋 Bem-vindo(a), ${member}!`,
    embeds: [new EmbedBuilder()
      .setColor(config.embedColor)
      .setTitle(`🎉 Bem-vindo(a) à ${guild.name}, ${member.displayName}!`)
      .setDescription(`Que bom ter você na legião do **Aion 2**! Para começar:\n\n${steps(guild)}`)
      .setThumbnail(member.user.displayAvatarURL())
      .setFooter({ text: 'Fight Kings • Aion 2' })
      .setTimestamp()],
    components: [tagButton()],
    allowedMentions: { users: [member.id] }
  };
}

// Mensagem fixa no topo da sala de boas-vindas
function guideMessage(guild) {
  return {
    embeds: [new EmbedBuilder()
      .setColor(config.embedColor)
      .setTitle('🪽 Como pegar sua tag — leia antes de tudo!')
      .setDescription(steps(guild))
      .setFooter({ text: 'Fight Kings • Aion 2' })],
    components: [tagButton()]
  };
}

module.exports = { findWelcomeChannel, welcomeMessage, guideMessage };
