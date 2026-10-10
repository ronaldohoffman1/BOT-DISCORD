const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require('discord.js');
const config = require('./config');

/**
 * Cria o Embed do Painel Fixo no Canal (Card limpo com botão de abrir menu privado)
 */
function createGateEmbed(guildName) {
  return new EmbedBuilder()
    .setColor(config.embedColor)
    .setTitle(`🎮 Registro de Tags da Guilda - ${guildName}`)
    .setDescription(
      `Bem-vindo(a) ao servidor da guilda **${guildName}**!\n\n` +
      `Para liberar as salas dos jogos e encontrar outros membros para jogar, clique no botão verde abaixo.\n\n` +
      `🔒 **Tela 100% Individual e Privada:**\n` +
      `O menu de escolha abrirá apenas para você ("*Só você pode ver esta mensagem*"). Assim que você escolher suas tags, o chat é limpo automaticamente!\n\n` +
      `• ⚔️ **Aion 2** ➔ Classes\n` +
      `• 🛡️ **Dota 2** ➔ Medalhas / Ranks\n` +
      `• 🏕️ **Conan Exiles** ➔ Modos PvE / PvP\n` +
      `• 🎯 **Valorant** ➔ Todos os Elos\n`
    )
    .addFields({
      name: '✨ Como funciona?',
      value: '1. Clique em **"Escolher Minhas Tags"** abaixo.\n2. Selecione seus jogos e classes no menu que abrirá.\n3. Suas salas são liberadas instantaneamente e o menu se fecha sozinho!',
      inline: false
    })
    .setFooter({ text: 'Clique no botão abaixo para abrir seu menu pessoal' })
    .setTimestamp();
}

/**
 * Componentes do painel fixo do canal (Apenas o botão de abrir e checar)
 */
function createGateComponents() {
  const btnOpen = new ButtonBuilder()
    .setCustomId('btn_open_tag_selector')
    .setLabel('Escolher Minhas Tags')
    .setEmoji('🎯')
    .setStyle(ButtonStyle.Success);

  const btnView = new ButtonBuilder()
    .setCustomId('btn_view_roles')
    .setLabel('Ver Meus Cargos')
    .setEmoji('📋')
    .setStyle(ButtonStyle.Secondary);

  return [new ActionRowBuilder().addComponents(btnOpen, btnView)];
}

/**
 * Cria o Embed que aparece dentro da janela privada (Ephemeral)
 */
function createPanelEmbed(guildName) {
  return new EmbedBuilder()
    .setColor(config.embedColor)
    .setTitle(`🎮 Seu Menu de Seleção de Tags (Privado)`)
    .setDescription(
      `*Apenas você está vendo esta tela.*\n\n` +
      `Selecione abaixo os jogos que você joga para liberar as salas exclusivas correspondentes:\n\n` +
      `⚔️ **AION 2** ➔ Escolha sua classe (Gladiador, Templário, etc.)\n` +
      `🛡️ **DOTA 2** ➔ Escolha sua medalha atual\n` +
      `🏕️ **CONAN EXILES** ➔ Escolha seu estilo (PvE, PvP, Conflito)\n` +
      `🎯 **VALORANT** ➔ Escolha seu elo competitivo ou casual\n\n` +
      `*💡 Ao selecionar qualquer opção, suas salas aparecem na hora!*`
    )
    .setFooter({ text: 'Ao terminar, clique em Concluir para fechar e limpar a tela' })
    .setTimestamp();
}

/**
 * Cria as linhas de ação do menu privado (4 dropdowns + botão Concluir e Limpar)
 */
function createPanelComponents() {
  const rows = [];

  // Linha 1: Aion 2
  const aionMenu = new StringSelectMenuBuilder()
    .setCustomId(config.games.aion2.customId)
    .setPlaceholder(config.games.aion2.placeholder)
    .setMinValues(config.games.aion2.minValues)
    .setMaxValues(config.games.aion2.maxValues)
    .addOptions(
      config.games.aion2.roles.map(r =>
        new StringSelectMenuOptionBuilder()
          .setLabel(r.name)
          .setValue(r.id)
          .setDescription(r.description.slice(0, 100))
          .setEmoji(r.emoji)
      )
    );
  rows.push(new ActionRowBuilder().addComponents(aionMenu));

  // Linha 2: Dota 2
  const dotaMenu = new StringSelectMenuBuilder()
    .setCustomId(config.games.dota2.customId)
    .setPlaceholder(config.games.dota2.placeholder)
    .setMinValues(config.games.dota2.minValues)
    .setMaxValues(config.games.dota2.maxValues)
    .addOptions(
      config.games.dota2.roles.map(r =>
        new StringSelectMenuOptionBuilder()
          .setLabel(r.name)
          .setValue(r.id)
          .setDescription(r.description.slice(0, 100))
          .setEmoji(r.emoji)
      )
    );
  rows.push(new ActionRowBuilder().addComponents(dotaMenu));

  // Linha 3: Conan Exiles
  const conanMenu = new StringSelectMenuBuilder()
    .setCustomId(config.games.conan.customId)
    .setPlaceholder(config.games.conan.placeholder)
    .setMinValues(config.games.conan.minValues)
    .setMaxValues(config.games.conan.maxValues)
    .addOptions(
      config.games.conan.roles.map(r =>
        new StringSelectMenuOptionBuilder()
          .setLabel(r.name)
          .setValue(r.id)
          .setDescription(r.description.slice(0, 100))
          .setEmoji(r.emoji)
      )
    );
  rows.push(new ActionRowBuilder().addComponents(conanMenu));

  // Linha 4: Valorant
  const valorantMenu = new StringSelectMenuBuilder()
    .setCustomId(config.games.valorant.customId)
    .setPlaceholder(config.games.valorant.placeholder)
    .setMinValues(config.games.valorant.minValues)
    .setMaxValues(config.games.valorant.maxValues)
    .addOptions(
      config.games.valorant.roles.map(r =>
        new StringSelectMenuOptionBuilder()
          .setLabel(r.name)
          .setValue(r.id)
          .setDescription(r.description.slice(0, 100))
          .setEmoji(r.emoji)
      )
    );
  rows.push(new ActionRowBuilder().addComponents(valorantMenu));

  // Linha 5: Botões de Ação
  const btnFinish = new ButtonBuilder()
    .setCustomId('btn_finish_and_clean')
    .setLabel('Concluir e Limpar Chat')
    .setEmoji('✅')
    .setStyle(ButtonStyle.Success);

  const btnViewRoles = new ButtonBuilder()
    .setCustomId('btn_view_roles')
    .setLabel('Meus Cargos')
    .setEmoji('📋')
    .setStyle(ButtonStyle.Secondary);

  const btnClearRoles = new ButtonBuilder()
    .setCustomId('btn_clear_roles')
    .setLabel('Remover Tags')
    .setEmoji('🗑️')
    .setStyle(ButtonStyle.Danger);

  rows.push(new ActionRowBuilder().addComponents(btnFinish, btnViewRoles, btnClearRoles));

  return rows;
}

module.exports = {
  createGateEmbed,
  createGateComponents,
  createPanelEmbed,
  createPanelComponents
};
