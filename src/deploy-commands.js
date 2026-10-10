require('dotenv').config();
const { REST, Routes } = require('discord.js');
const slashCommands = require('./commands');

const commands = slashCommands.map(cmd => cmd.toJSON());

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token || !clientId) {
  console.error('❌ ERRO: DISCORD_TOKEN e CLIENT_ID são obrigatórios no arquivo .env!');
  console.error('Por favor, edite o arquivo .env com as credenciais do seu bot.');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log(`🔄 Iniciando registro de ${commands.length} comandos de barra (slash commands)...`);

    if (guildId) {
      const data = await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commands }
      );
      console.log(`✅ Sucesso! ${data.length} comandos registrados instantaneamente no servidor (${guildId})!`);
    } else {
      const data = await rest.put(
        Routes.applicationCommands(clientId),
        { body: commands }
      );
      console.log(`✅ Sucesso! ${data.length} comandos registrados globalmente!`);
    }
  } catch (error) {
    console.error('❌ Erro ao registrar comandos:', error);
  }
})();
