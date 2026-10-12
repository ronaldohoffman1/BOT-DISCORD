require('dotenv').config({ quiet: true });
const path = require('path');
const { Client, GatewayIntentBits } = require('discord.js');
const config = require('../src/config');
const { ensureRolesExist } = require('../src/roleManager');
const { setupGameChannels } = require('../src/channelManager');
const { createGateEmbed, createGateComponents } = require('../src/panel');
const { getGuildSetting } = require('../src/storage');

// Deixa o servidor igual ao src/config.js. Pode rodar de novo quantas vezes quiser:
//   node scripts/reorganizar-servidor.js
// 1. Apaga os cargos dos jogos que saíram do servidor (Dota 2, Conan, Valorant)
// 2. Cria/atualiza classes e cargos da legião (Comandante, Elite, Legionário, Amigos)
// 3. Organiza categorias e salas
// 4. Coloca o logo como ícone do servidor
// 5. Envia de novo o painel de escolha de classe

const OBSOLETE_ROLE = /dota|conan|valorant|vlr:/i;

const ICON = path.join(__dirname, '..', 'assets', 'logo-icone.png');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages]
});

client.once('clientReady', async () => {
  try {
    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    await guild.roles.fetch();
    await guild.members.fetch();
    console.log(`Conectado ao servidor: ${guild.name}`);

    // 1. Cargos de outros jogos
    const obsolete = guild.roles.cache.filter(r => !r.managed && OBSOLETE_ROLE.test(r.name));
    for (const role of obsolete.values()) {
      await role.delete('Servidor agora é só da guilda de Aion 2');
      console.log(`🗑️  Cargo apagado: ${role.name}`);
    }

    // 2. Classes + legião + separador
    const roles = await ensureRolesExist(guild);
    if (roles.created.length) console.log(`✨ Cargos criados: ${roles.created.join(', ')}`);
    for (const e of roles.errors) console.log(`⚠️  ${e.name}: ${e.error}`);

    // 3. Salas
    const result = await setupGameChannels(guild);
    if (result.error) throw new Error(result.error);
    for (const r of result.report) {
      console.log(`📁 ${r.categoryName}: ${r.created.length} criadas, ${r.renamed.length} renomeadas, ` +
        `${r.deleted.length} apagadas, ${r.existing.length} mantidas`);
      for (const n of r.renamed) console.log(`     ✏️  ${n}`);
    }
    for (const k of result.kept) console.log(`⚠️  Sobrou (tem mensagens): ${k}`);

    // 4. Ícone
    await guild.setIcon(ICON, 'Novo logo da Fight Kings');
    console.log('🖼️  Ícone do servidor atualizado');

    // 5. Painel de escolha de classe
    const rolesChannelId = getGuildSetting(guild.id, 'roles_channel_id');
    const channel = rolesChannelId && guild.channels.cache.get(rolesChannelId);
    if (channel) {
      const msgs = await channel.messages.fetch({ limit: 20 });
      for (const m of msgs.filter(m => m.author.id === client.user.id).values()) await m.delete().catch(() => {});
      await channel.send({ embeds: [createGateEmbed(guild.name)], components: createGateComponents() });
      console.log(`✅ Painel enviado em #${channel.name}`);
    }

    console.log('🎉 Servidor reorganizado!');
  } catch (err) {
    console.error('Erro na reorganização:', err);
    process.exitCode = 1;
  } finally {
    client.destroy();
  }
});

client.login(process.env.DISCORD_TOKEN);
