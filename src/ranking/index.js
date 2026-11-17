const fs = require("fs");
const path = require("path");
const { Client, GatewayIntentBits, Collection, ActivityType } = require("discord.js");
const interactionCreateEvent = require("./events/interactionCreate");
const readyEvent = require("./events/ready");
const { setupGuildRooms } = require("./guildGuides");

const rankingCommands = new Collection();
const rankingCommandsArray = [];

// Carrega os comandos de ranking
const commandsPath = path.join(__dirname, "commands");
if (fs.existsSync(commandsPath)) {
  for (const file of fs.readdirSync(commandsPath).filter((f) => f.endsWith(".js"))) {
    try {
      const command = require(path.join(commandsPath, file));
      if (command.data && command.execute) {
        rankingCommands.set(command.data.name, command);
        rankingCommandsArray.push(command);
      } else {
        console.warn(`⚠️ [Ranking] Comando ignorado (data/execute ausente): ${file}`);
      }
    } catch (err) {
      console.error(`❌ [Ranking] Falha ao carregar comando ${file}:`, err);
    }
  }
}

/**
 * Trata qualquer interação pertencente ao sistema de ranking/presenças
 */
async function handleRankingInteraction(interaction) {
  return interactionCreateEvent.execute(interaction, rankingCommands);
}

/**
 * Verifica e cria o cargo "Nobre" no servidor caso ele ainda não exista
 */
async function ensureNobreRole(guild) {
  const PADMIN_ROLE = "Nobre";
  try {
    const existing = guild.roles.cache.find((r) => r.name === PADMIN_ROLE);
    if (!existing) {
      await guild.roles.create({
        name: PADMIN_ROLE,
        color: "#5865F2",
        reason: "Cargo de administração de presenças criado pelo Nemon",
      });
      console.log(`✅ Cargo "${PADMIN_ROLE}" criado no servidor ${guild.name}.`);
    }
  } catch (err) {
    console.warn(`⚠️ Não foi possível verificar/criar cargo "${PADMIN_ROLE}" em ${guild.name}:`, err.message);
  }
}

/**
 * Inicia o bot em modo standalone (caso seja configurado com token separado)
 */
function startStandaloneRankingBot(token) {
  if (!token) return null;

  console.log("🚀 Iniciando instância dedicada para o Bot de Ranking (Kokushibo)...");
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  client.commands = rankingCommands;

  client.once("clientReady", async () => {
    console.log("====================================================");
    console.log(`🤖 Bot de Ranking iniciado com sucesso como: ${client.user.tag}`);
    console.log(`🌐 Conectado em ${client.guilds.cache.size} servidor(es).`);
    console.log("====================================================");

    client.user.setPresence({
      activities: [{ name: '📋 Presenças & Rankings | /ranking', type: ActivityType.Custom }],
      status: 'online'
    });

    for (const guild of client.guilds.cache.values()) {
      await ensureNobreRole(guild);
      try {
        await guild.commands.set(rankingCommandsArray.map(cmd => cmd.data));
        console.log(`⚡ Comandos de presenças/ranking registrados com sucesso em ${guild.name} para ${client.user.tag}`);
      } catch (err) {
        console.error(`Erro ao registrar comandos do ranking em ${guild.name}:`, err.message);
      }

      // Configura automaticamente as salas oficiais (presenças, advertências, hierarquia)
      try {
        const roomLogs = await setupGuildRooms(guild, client, false);
        roomLogs.forEach(log => console.log(`📌 [Salas] ${log}`));
      } catch (err) {
        console.error(`Erro ao configurar salas no servidor ${guild.name}:`, err.message);
      }
    }
  });

  client.on("interactionCreate", async (interaction) => {
    await handleRankingInteraction(interaction);
  });

  client.login(token).catch((err) => {
    console.error("❌ Falha ao autenticar Bot de Ranking:", err.message);
  });

  return client;
}

module.exports = {
  rankingCommands,
  rankingCommandsArray,
  handleRankingInteraction,
  ensureNobreRole,
  startStandaloneRankingBot,
};
