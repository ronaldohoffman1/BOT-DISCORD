const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

const commands = [
  new SlashCommandBuilder()
    .setName('setup-cargos')
    .setDescription('Envia o painel interativo de seleção de cargos para o canal')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(option =>
      option.setName('canal')
        .setDescription('Canal onde o painel será enviado (padrão: canal atual)')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('criar-cargos')
    .setDescription('Cria automaticamente no servidor todos os cargos e tags dos jogos com emojis e cores')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('criar-salas')
    .setDescription('Cria as categorias e salas privadas que só aparecem para quem selecionar a tag do jogo')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('setup-gods')
    .setDescription('Cria/sincroniza a Área Privada dos Gods (acesso restrito apenas para quem tem a tag Gods)')
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
    .setDescription('Abre o menu para você escolher ou atualizar suas tags de jogos'),

  new SlashCommandBuilder()
    .setName('ajuda')
    .setDescription('Mostra os comandos e instruções de uso do bot da guilda')
];

module.exports = commands;
