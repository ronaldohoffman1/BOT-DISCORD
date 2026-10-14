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
   'Papo da guilda em 💬 chat-guilda, builds em 📖 GUIA DAS CLASSES e quem quer entrar na legião usa 📝 recrutamento. Mantenha tudo organizado.'],
  ['🎙️ 6. Conduta nas salas de voz',
   'Sem gritos, barulho alto ou som de fundo atrapalhando. Em PvE, Raid, PvP ou Guerra de Facções, respeite quem está fazendo o call.'],
  ['🛡️ 7. Honra dentro do jogo',
   'Não roube loot, não abandone o grupo no meio da masmorra ou raid e não prejudique membros da legião. Um Fight King luta junto.'],
  ['🤐 8. O que é da legião fica na legião',
   'Estratégias, horários de guerra e conversas internas não devem ser compartilhados com outras legiões.'],
  ['👑 9. Respeite a liderança',
   'As decisões do **👑 Comandante**, da **⚜️ Elite** e da administração devem ser respeitadas. Discordou? Converse em particular com um líder.'],
  ['📅 10. Atividade',
   'Vai ficar um tempo ausente? Avise no 💬 chat-guilda. **7 dias offline sem aviso** = perde a tag 🪽 Legionário.'],
  ['📜 11. Termos do Discord',
   'Siga também os [Termos de Serviço](https://discord.com/terms) e as [Diretrizes da Comunidade](https://discord.com/guidelines) do Discord.']
];

// Regras de jogo da legião (segunda mensagem)
const compromissos = [
  ['🗡️ 12. Foco em PvP',
   'A Fight Kings é uma legião focada em **PvP**: Abismo, Fenda, Arena e Guerra de Facções. ' +
   'Também fazemos juntos todo o **PvE necessário** para evoluir: masmorras, raids e Invasão Dimensional.'],
  ['📣 13. Sempre tem um líder no call',
   'Em todo conteúdo da legião, **PvP ou PvE** (guerra, Fenda, raid, masmorra), sempre haverá um **líder puxando o call**. ' +
   'Siga as ordens dele: nada de sair sozinho, puxar briga sem ordem ou fazer por conta própria.'],
  ['🎧 14. Voz nas guerras e raids',
   'Em guerra e raid, entre no canal de voz. Microfone só para informação importante, para não atrapalhar o call.'],
  ['🏯 15. Presença nas guerras do Abismo',
   'O **Cerco ao Artefato (segunda, quinta e sábado às 21h)** é prioridade. Esteja online e no canal **🏰 Guerra de Facções 1** até **20:50**. ' +
   'Não vai poder? Avise antes no 💬 chat-guilda.'],
  ['⏳ 16. Tempo de Abismo guardado',
   'Guarde tempo de Abismo para os conteúdos PvP da legião. Não gaste tudo antes das guerras e das chamadas.'],
  ['🤝 17. Ninguém fica para trás',
   'Sempre que puder, ajude os membros mais fracos a evoluir: leve em masmorra, tire dúvidas de build e explique as mecânicas. ' +
   'Quem é ajudado hoje ajuda amanhã.'],
  ['📈 18. Evolução em dia',
   'Faça as diárias e semanais (chaves da Invasão Dimensional e do Shugo) e mantenha build e equipamento atualizados.'],
  ['🛡️ 19. Represente a legião',
   'No mundo aberto você carrega o nome **Fight Kings**. Respeite as legiões aliadas e não provoque briga à toa.'],
  ['👥 20. Recrutamento',
   'Só o **👑 Comandante** e a **⚜️ Elite** convidam para a legião. O Legionário pode indicar amigos no 📝 recrutamento.']
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
      .setTitle('📜 Conduta')
      .addFields(rules.map(([name, value]) => ({ name, value })));

    const legion = new EmbedBuilder()
      .setColor(RED)
      .setTitle('⚔️ Compromissos da Legião')
      .addFields(compromissos.map(([name, value]) => ({ name, value })));

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

    // Duas mensagens: o Discord limita o total de texto por mensagem
    await channel.send({ embeds: [header, body], files: [logo] });
    await channel.send({ embeds: [legion, penalties] });
    console.log(`✅ Regras publicadas em #${channel.name}`);
  } catch (err) {
    console.error('Erro ao publicar regras:', err);
  } finally {
    client.destroy();
  }
});

client.login(process.env.DISCORD_TOKEN);
