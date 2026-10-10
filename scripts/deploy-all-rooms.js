require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { setupGameChannels } = require('../src/channelManager');
const { createGateEmbed, createGateComponents } = require('../src/panel');
const { getGuildSetting } = require('../src/storage');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

client.once('clientReady', async () => {
  try {
    const guildId = process.env.GUILD_ID;
    const guild = await client.guilds.fetch(guildId);
    console.log(`Conectado ao servidor: ${guild.name}`);

    // 1. Cria e atualiza todas as novas salas dos jogos e o canal de AFK
    console.log('Criando todas as novas salas (Builds Aion, Farm/Raid Conan, Ranked Solo Dota/Valorant, Tips, AFK)...');
    const result = await setupGameChannels(guild);
    console.log('Relatório de salas:');
    result.report.forEach(r => {
      console.log(`- ${r.gameTitle}: ${r.createdChannels.length} criadas, ${r.existingChannels.length} existentes`);
    });
    if (result.afkChannelName) {
      console.log(`- Canal de AFK Oficial configurado: ${result.afkChannelName}`);
    }

    // 2. Limpa e atualiza o canal #escolha-de-cargos com o botão privado
    const rolesChannelId = getGuildSetting(guild.id, 'roles_channel_id');
    if (rolesChannelId) {
      const channel = guild.channels.cache.get(rolesChannelId);
      if (channel) {
        console.log(`Limpando canal ${channel.name} e enviando o novo painel privado...`);
        const msgs = await channel.messages.fetch({ limit: 20 });
        for (const m of msgs.values()) {
          await m.delete().catch(() => {});
        }

        const embed = createGateEmbed(guild.name);
        const components = createGateComponents();
        await channel.send({ embeds: [embed], components });
        console.log('✅ Painel com botão privado enviado com sucesso para #escolha-de-cargos!');
      }
    }

    console.log('🎉 Todas as configurações foram concluídas com sucesso!');
  } catch (err) {
    console.error('Erro na sincronização:', err);
  } finally {
    client.destroy();
  }
});

client.login(process.env.DISCORD_TOKEN);
