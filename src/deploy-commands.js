require('dotenv').config();
const { REST, Routes } = require('discord.js');
const slashCommands = require('./commands');
const { rankingCommandsArray } = require('./ranking');

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
    console.log(`🔄 Iniciando registro de ${commands.length} comandos de barra no bot principal...`);

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

    // Se configurado um bot separado para o Nemon com token próprio
    const nemonToken = process.env.NEMON_DISCORD_TOKEN;
    const nemonClientId = process.env.NEMON_CLIENT_ID || clientId;
    if (nemonToken && nemonToken !== token) {
      console.log(`🔄 Registrando comandos no bot dedicado Nemon Ranking...`);
      const nemonRest = new REST({ version: '10' }).setToken(nemonToken);
      const rankingJson = rankingCommandsArray.map(cmd => cmd.data.toJSON());
      if (guildId) {
        const nemonData = await nemonRest.put(
          Routes.applicationGuildCommands(nemonClientId, guildId),
          { body: rankingJson }
        );
        console.log(`✅ Sucesso! ${nemonData.length} comandos registrados no bot Nemon Ranking!`);
      }
    }
  } catch (error) {
    console.error('❌ Erro ao registrar comandos:', error);
  }
})();
