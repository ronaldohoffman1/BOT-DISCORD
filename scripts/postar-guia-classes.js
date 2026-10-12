require('dotenv').config({ quiet: true });
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const config = require('../src/config');
const videos = require('../assets/videos-classes.json');

// Publica nas salas da categoria 📖┃GUIA DAS CLASSES os vídeos de assets/videos-classes.json
// (5 builds PvE + 5 PvP mais vistas no YouTube por classe). Para atualizar, troque os vídeos
// no JSON e rode de novo: node scripts/postar-guia-classes.js
// As mensagens antigas do bot em cada sala são apagadas antes.

const DATA = '12/10/2026';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const views = n => n >= 1000 ? `${Math.round(n / 1000).toLocaleString('pt-BR')} mil` : String(n);

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

client.once('clientReady', async () => {
  try {
    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    await guild.channels.fetch();

    for (const cls of config.classes) {
      const channel = guild.channels.cache.find(c => c.name === cls.channel);
      const list = videos[cls.key];
      if (!channel || !list) {
        console.log(`⚠️  Pulando ${cls.channel} (sala ou vídeos não encontrados)`);
        continue;
      }

      const old = await channel.messages.fetch({ limit: 50 });
      for (const m of old.filter(m => m.author.id === client.user.id).values()) await m.delete().catch(() => {});

      const title = cls.name.split('┃')[1];
      await channel.send({
        embeds: [new EmbedBuilder()
          .setColor(parseInt(cls.color.slice(1), 16))
          .setTitle(`${cls.emoji} ${title.toUpperCase()} — Builds mais vistas`)
          .setDescription(
            `**${title}** (${cls.en} no jogo): ${cls.description.toLowerCase()}.\n\n` +
            `Abaixo, as **5 builds PvE** e as **5 PvP** mais vistas no YouTube para o Aion 2 ` +
            `(visualizações em ${DATA}). A maioria é em inglês.\n\n` +
            `💬 Dúvidas e builds próprias: poste em **📚・builds-e-guias** com a etiqueta *${title}*.`
          )]
      });

      for (const [mode, label] of [['pve', '🐉 PvE — masmorras, chefes e raid'], ['pvp', '⚔️ PvP — arena, Abismo e guerra']]) {
        await channel.send(`## ${label}`);
        for (const [i, v] of list[mode].entries()) {
          await channel.send(
            `**${i + 1}.** ${v.title}\n` +
            `📺 ${v.channel} • ${views(v.views)} visualizações\n` +
            `https://www.youtube.com/watch?v=${v.id}`
          );
          await sleep(600);
        }
      }
      console.log(`✅ ${cls.channel}: ${list.pve.length} PvE + ${list.pvp.length} PvP`);
    }
  } catch (err) {
    console.error('Erro ao publicar o guia das classes:', err);
    process.exitCode = 1;
  } finally {
    client.destroy();
  }
});

client.login(process.env.DISCORD_TOKEN);
