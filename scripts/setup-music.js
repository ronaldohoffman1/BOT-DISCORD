require('dotenv').config();
const { Client, GatewayIntentBits, ChannelType, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

const PREFIX = 'm!'; // prefixo do Jockie Music (mude para '!' se alterar com m!prefix)
const MUSIC_CHANNEL_ID = '1556563122184261702';
const MUSIC_BOT_ROLE_ID = '1556563016927936613'; // cargo do Jockie Music

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('clientReady', async () => {
  try {
    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    const channels = await guild.channels.fetch();
    const musicChannel = channels.get(MUSIC_CHANNEL_ID);

    // 1. Canal de comandos: todos veem/escrevem; o bot de música responde aqui
    await musicChannel.permissionOverwrites.edit(MUSIC_BOT_ROLE_ID, {
      ViewChannel: true,
      SendMessages: true,
      EmbedLinks: true,
      ReadMessageHistory: true,
      AddReactions: true,
      UseExternalEmojis: true
    });
    await musicChannel.setTopic(`🎵 Use ${PREFIX}play <nome ou link> para tocar. ${PREFIX}queue = fila • ${PREFIX}skip = pular • ${PREFIX}pause • ${PREFIX}resume • ${PREFIX}stop`);

    // 2. Nos outros canais de texto o bot de música não pode falar (ele só responde aqui)
    let blocked = 0;
    for (const ch of channels.values()) {
      if (!ch || ch.id === MUSIC_CHANNEL_ID) continue;
      if (ch.type === ChannelType.GuildText) {
        await ch.permissionOverwrites.edit(MUSIC_BOT_ROLE_ID, { SendMessages: false });
        blocked++;
      }
    }

    // 3. Em todos os canais de voz o bot pode entrar e falar (inclusive nas áreas privadas)
    let voiceOk = 0;
    for (const ch of channels.values()) {
      if (!ch) continue;
      if (ch.type === ChannelType.GuildVoice) {
        await ch.permissionOverwrites.edit(MUSIC_BOT_ROLE_ID, {
          ViewChannel: true,
          Connect: true,
          Speak: true
        });
        voiceOk++;
      }
    }

    // 4. Mensagem de guia fixa no canal
    const msgs = await musicChannel.messages.fetch({ limit: 20 });
    for (const m of msgs.values()) {
      if (m.author.id === client.user.id) await m.delete().catch(() => {});
    }

    const embed = new EmbedBuilder()
      .setColor(0xFF0055)
      .setTitle('🎵 Toque Sua Música')
      .setDescription(
        'Este é o canal oficial para pedir música ao bot!\n\n' +
        '**Como usar:**\n' +
        '1️⃣ Entre em qualquer **canal de voz**.\n' +
        `2️⃣ Aqui neste canal digite \`${PREFIX}play\` e o nome da música ou o link do YouTube.\n` +
        '3️⃣ O bot entra na sua sala e toca. Se já houver música, ela entra na **fila de espera**.\n\n' +
        '**Comandos:**\n' +
        `▶️ \`${PREFIX}play <música ou link>\` — toca ou adiciona à fila\n` +
        `📜 \`${PREFIX}queue\` — mostra a fila de espera\n` +
        `⏭️ \`${PREFIX}skip\` — pula para a próxima\n` +
        `⏸️ \`${PREFIX}pause\` e ▶️ \`${PREFIX}resume\` — pausa e continua\n` +
        `⏹️ \`${PREFIX}stop\` — para e limpa a fila\n\n` +
        '⚠️ *Os comandos de música só funcionam neste canal.*'
      )
      .setFooter({ text: 'Fight Kings • Música' });
    const sent = await musicChannel.send({ embeds: [embed] });
    await sent.pin().catch(() => {});

    console.log(`OK: canal configurado, ${blocked} canais de texto bloqueados para o bot de música, ${voiceOk} canais de voz liberados.`);
  } catch (err) {
    console.error('Erro:', err);
  } finally {
    client.destroy();
  }
});

client.login(process.env.DISCORD_TOKEN);
