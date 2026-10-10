require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { ensureGameSeparators } = require('../src/roleManager');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

client.once('clientReady', async () => {
  try {
    const guildId = process.env.GUILD_ID;
    const guild = await client.guilds.fetch(guildId);
    await guild.roles.fetch();
    await guild.members.fetch();

    console.log(`Conectado ao servidor: ${guild.name}`);

    // 1. Cria ou atualiza o cargo de Bots
    let botRole = guild.roles.cache.find(r => r.name.toLowerCase() === '🤖┃bots');
    if (!botRole) {
      botRole = await guild.roles.create({
        name: '🤖┃BOTS',
        color: '#5865F2',
        hoist: true,
        reason: 'Separar bots na lista de membros'
      });
      console.log('Cargo 🤖┃BOTS criado.');
    } else if (!botRole.hoist) {
      await botRole.setHoist(true);
      console.log('Cargo 🤖┃BOTS atualizado para hoist: true.');
    }

    // Atribui o cargo de Bot ao bot
    const botMember = await guild.members.fetchMe();
    if (!botMember.roles.cache.has(botRole.id)) {
      await botMember.roles.add(botRole);
      console.log('Cargo 🤖┃BOTS atribuído ao Akaza BOT.');
    }

    // 2. Hoist só nos cargos pai dos jogos + separadores entre os jogos
    const result = await ensureGameSeparators(guild);
    if (result.created.length) console.log(`Separadores criados: ${result.created.join(', ')}`);
    for (const block of result.summary) {
      console.log(`
${block.separator}`);
      for (const name of block.roles) console.log(`   ${name}`);
    }
    console.log(`
Sucesso! ${result.moved} cargos reposicionados. Na lista de membros agora aparecem só os grupos dos jogos.`);
  } catch (err) {
    console.error('Erro na sincronização:', err);
  } finally {
    client.destroy();
  }
});

client.login(process.env.DISCORD_TOKEN);
