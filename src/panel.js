const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require('discord.js');
const config = require('./config');

const classList = () => config.classes.map(c => `${c.emoji} ${c.name.split('┃')[1]}`).join(' • ');

/**
 * Cria o Embed do Painel Fixo no Canal (Card limpo com botão de abrir menu privado)
 */
function createGateEmbed(guildName) {
  return new EmbedBuilder()
    .setColor(config.embedColor)
    .setTitle(`⚔️ Escolha sua Classe — ${guildName}`)
    .setDescription(
      `Bem-vindo(a) à legião **${guildName}** do **Aion 2**!

` +
      `Clique no botão verde abaixo e escolha a sua classe (até 2: main e alt). ` +
      `Na hora, as salas do Aion 2 aparecem para você: chat, builds, PvE, Raid, PvP e Guerra de Facções.

` +
      `${classList()}

` +
      `🔒 **Tela privada:** o menu abre só para você e some quando terminar.`
    )
    .addFields({
      name: '🪽 Quer entrar na legião?',
      value: 'Apresente-se em **📝・recrutamento**. Quem é da guilda recebe a tag **🪽┃Legionário** da liderança.',
      inline: false
    })
    .setFooter({ text: 'Clique no botão abaixo para abrir seu menu pessoal' });
}

/**
 * Componentes do painel fixo do canal (Apenas o botão de abrir e checar)
 */
function createGateComponents() {
  const btnOpen = new ButtonBuilder()
    .setCustomId('btn_open_tag_selector')
    .setLabel('Escolher Minha Classe')
    .setEmoji('⚔️')
    .setStyle(ButtonStyle.Success);

  const btnView = new ButtonBuilder()
    .setCustomId('btn_view_roles')
    .setLabel('Ver Minhas Tags')
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
    .setTitle('⚔️ Sua Classe no Aion 2 (Privado)')
    .setDescription(
      `*Apenas você está vendo esta tela.*

` +
      `Escolha abaixo a sua classe (até 2). As salas do Aion 2 aparecem na hora!

` +
      `${classList()}`
    )
    .setFooter({ text: 'Ao terminar, clique em Concluir para fechar e limpar a tela' });
}

/**
 * Cria as linhas de ação do menu privado (um menu por jogo + botões)
 */
function createPanelComponents() {
  const rows = Object.values(config.games).map(game =>
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(game.customId)
        .setPlaceholder(game.placeholder)
        .setMinValues(game.minValues)
        .setMaxValues(game.maxValues)
        .addOptions(
          game.roles.map(r =>
            new StringSelectMenuOptionBuilder()
              .setLabel(r.name.split('┃')[1] || r.name)
              .setValue(r.id)
              .setDescription(r.description.slice(0, 100))
              .setEmoji(r.emoji)
          )
        )
    )
  );

  const btnFinish = new ButtonBuilder()
    .setCustomId('btn_finish_and_clean')
    .setLabel('Concluir e Limpar Chat')
    .setEmoji('✅')
    .setStyle(ButtonStyle.Success);

  const btnViewRoles = new ButtonBuilder()
    .setCustomId('btn_view_roles')
    .setLabel('Minhas Tags')
    .setEmoji('📋')
    .setStyle(ButtonStyle.Secondary);

  const btnClearRoles = new ButtonBuilder()
    .setCustomId('btn_clear_roles')
    .setLabel('Remover Classe')
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
