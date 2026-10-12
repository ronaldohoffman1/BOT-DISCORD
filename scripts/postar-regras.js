require('dotenv').config();
const path = require('path');
const { Client, GatewayIntentBits, EmbedBuilder, AttachmentBuilder } = require('discord.js');

// Para mudar as regras, edite este arquivo e rode de novo: node scripts/postar-regras.js
// As mensagens antigas do bot em #regras são apagadas e as novas são enviadas.
const CHANNEL_NAME = '📜・regras';
const LOGO = path.join(__dirname, '..', 'assets', 'logo-fight-kings.png');
const GOLD = 0xD4AF37;
const RED = 0xB22222;

const rules = [
  ['⚔️ 1. Respeito acima de tudo',
   'Trate todos com respeito: membros, recrutas e adversários. Zoeira entre amigos é liberada, ofensa pessoal não.'],
  ['🚫 2. Zero preconceito',
   'Racismo, homofobia, machismo, xenofobia ou qualquer discriminação resulta em **banimento imediato**.'],
  ['🔞 3. Nada de conteúdo impróprio',
   'Proibido conteúdo NSFW, gore, ou qualquer coisa ilegal em qualquer sala, apelido ou foto de perfil.'],
  ['📢 4. Sem spam e sem divulgação',
   'Não floode, não abuse de menções (@everyone / cargos) e não divulgue outros servidores ou legiões. Lives e vídeos vão em 📺 MÍDIA.'],
  ['🗂️ 5. Use a sala certa',
   'Builds vão em 📚 builds-e-guias, grupos em 🔍 procurar-grupo e quem quer entrar na legião usa 📝 recrutamento. Mantenha tudo organizado.'],
  ['🎙️ 6. Conduta nas salas de voz',
   'Sem gritos, barulho alto ou som de fundo atrapalhando. Em PvE, Raid, PvP ou Guerra de Facções, respeite quem está fazendo o call.'],
  ['🛡️ 7. Honra dentro do jogo',
   'Não roube loot, não abandone o grupo no meio da masmorra ou raid e não prejudique membros da legião. Um Fight King luta junto.'],
  ['🤐 8. O que é da legião fica na legião',
   'Estratégias, horários de guerra e conversas internas não devem ser compartilhados com outras legiões.'],
  ['👑 9. Respeite a liderança',
   'As decisões do **👑 Comandante**, da **⚜️ Elite** e da administração devem ser respeitadas. Discordou? Converse em particular com um líder.'],
  ['📅 10. Atividade',
   'Vai ficar um tempo ausente? Avise. Membros inativos sem aviso podem perder a tag 🪽 Legionário.'],
  ['📜 11. Termos do Discord',
   'Siga também os [Termos de Serviço](https://discord.com/terms) e as [Diretrizes da Comunidade](https://discord.com/guidelines) do Discord.']
];

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

client.once('clientReady', async () => {
  try {
    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    await guild.channels.fetch();
    const channel = guild.channels.cache.find(c => c.name === CHANNEL_NAME);
    if (!channel) throw new Error(`Sala ${CHANNEL_NAME} não encontrada. Rode /criar-salas antes.`);

    // Remove as mensagens antigas do bot
    const old = await channel.messages.fetch({ limit: 50 });
    for (const m of old.filter(m => m.author.id === client.user.id).values()) {
      await m.delete().catch(() => {});
    }

    const logo = new AttachmentBuilder(LOGO, { name: 'logo.png' });

    const header = new EmbedBuilder()
      .setColor(GOLD)
      .setTitle('👑 FIGHT KINGS — REGRAS DA LEGIÃO')
      .setDescription(
        'Bem-vindo(a) ao **Fight Kings**!\n' +
        'Somos uma legião de Aion 2 que joga junto, luta junto e cresce junto. ' +
        'Para manter a casa em ordem, todos os membros devem seguir as regras abaixo.'
      )
      .setImage('attachment://logo.png');

    const body = new EmbedBuilder()
      .setColor(RED)
      .addFields(rules.map(([name, value]) => ({ name, value })));

    const penalties = new EmbedBuilder()
      .setColor(GOLD)
      .setTitle('⚖️ Punições')
      .setDescription(
        '**1ª vez:** advertência\n' +
        '**2ª vez:** silenciado (castigo) temporário\n' +
        '**3ª vez:** expulsão da legião\n\n' +
        'Casos graves (regras 2, 3 e 8) podem levar a **banimento direto**, a critério da liderança.\n\n' +
        '✅ Ao permanecer no servidor, você concorda com estas regras.\n' +
        '➡️ Próximo passo: escolha sua classe em **🎭・escolha-de-classe**!'
      )
      .setFooter({ text: 'Fight Kings • Aion 2' })
      .setTimestamp();

    await channel.send({ embeds: [header, body, penalties], files: [logo] });
    console.log(`✅ Regras publicadas em #${channel.name}`);
  } catch (err) {
    console.error('Erro ao publicar regras:', err);
  } finally {
    client.destroy();
  }
});

client.login(process.env.DISCORD_TOKEN);
