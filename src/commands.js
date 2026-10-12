const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

const commands = [
  new SlashCommandBuilder()
    .setName('setup-cargos')
    .setDescription('Envia o painel de escolha de classe para o canal')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(option =>
      option.setName('canal')
        .setDescription('Canal onde o painel será enviado (padrão: canal atual)')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('criar-cargos')
    .setDescription('Cria/atualiza as classes e as tags da legião (Comandante, Elite, Legionário)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('criar-salas')
    .setDescription('Organiza todas as categorias e salas do servidor')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('config-boas-vindas')
    .setDescription('Configura o canal de boas-vindas e mensagens para novos membros')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(option =>
      option.setName('canal')
        .setDescription('Canal de texto para anunciar novos membros')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    )
    .addBooleanOption(option =>
      option.setName('enviar_dm')
        .setDescription('Enviar mensagem privada (DM) para novos membros?')
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('cargos')
    .setDescription('Abre o menu para escolher ou trocar a sua classe no Aion 2'),

  new SlashCommandBuilder()
    .setName('ajuda')
    .setDescription('Mostra os comandos e instruções do bot da legião')
];

module.exports = commands;
