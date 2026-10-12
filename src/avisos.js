const { EmbedBuilder } = require('discord.js');
const config = require('./config');
const { getGuildSetting, setGuildSetting } = require('./storage');

/**
 * Avisos automáticos do Aion 2 na sala config.avisos.channel:
 * - Comunicados oficiais da NCSoft na Steam (patch notes, manutenções, eventos), com link
 * - Eventos com horário fixo (Fenda, Festival Shugo), alguns minutos antes de começar
 */

const STEAM_API = 'https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/';
const OFFICIAL_FEED = 'steam_community_announcements';

// Hora e data atuais no fuso dos eventos (ex: horário de Brasília)
function nowParts(timeZone) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date()).map(p => [p.type, p.value])
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: +parts.hour, minute: +parts.minute };
}

function findChannel(guild) {
  return guild.channels.cache.find(c => c.name === config.avisos.channel && c.isTextBased());
}

const pad = n => String(n).padStart(2, '0');

/**
 * Verifica a cada 30s se algum evento começa daqui a leadMinutes e avisa uma vez.
 */
function checkEvents(client) {
  const { timeZone, events } = config.avisos;
  const now = nowParts(timeZone);
  const nowMin = now.hour * 60 + now.minute;

  for (const ev of events) {
    for (const hour of ev.hours) {
      const start = hour * 60 + (ev.minute || 0);
      const lead = ev.leadMinutes || 0;
      // minuto do aviso (pode cair no dia anterior, ex: evento 00:00 avisado 23:55)
      const alertMin = (start - lead + 1440) % 1440;
      if (alertMin !== nowMin) continue;

      const key = `${ev.key}:${now.date}:${pad(hour)}`;
      for (const guild of client.guilds.cache.values()) {
        if (getGuildSetting(guild.id, `aviso_${ev.key}`) === key) continue;
        const channel = findChannel(guild);
        if (!channel) continue;
        setGuildSetting(guild.id, `aviso_${ev.key}`, key);

        const time = `${pad(hour)}:${pad(ev.minute || 0)}`;
        const when = lead ? `começa em **${lead} minutos** (às ${time})` : `começou agora (${time})`;
        channel.send({
          content: `${ev.mention || ''} ${ev.emoji} **${ev.name}** ${when}!`.trim(),
          embeds: [new EmbedBuilder().setColor(ev.color).setDescription(ev.description)],
          allowedMentions: { parse: ['everyone'] }
        }).catch(err => console.error(`Erro ao avisar ${ev.name}:`, err.message));
      }
    }
  }
}

// Tipo do comunicado pelo título (os títulos da NCSoft vêm em inglês)
function newsLabel(title) {
  if (/patch notes|update notes/i.test(title)) return { emoji: '📝', label: 'Notas de atualização', color: 0x2ECC71 };
  if (/known issues/i.test(title)) return { emoji: '⚠️', label: 'Problemas conhecidos', color: 0xE74C3C };
  if (/maintenance/i.test(title)) return { emoji: '🛠️', label: 'Manutenção', color: 0xE67E22 };
  if (/event|giveaway|reward|compensation|voucher/i.test(title)) return { emoji: '🎉', label: 'Evento / Recompensa', color: 0x9B59B6 };
  if (/server/i.test(title)) return { emoji: '🌐', label: 'Servidores', color: 0x3498DB };
  return { emoji: '📢', label: 'Comunicado oficial', color: config.embedColor };
}

// Resumo em texto puro do conteúdo (a Steam manda BBCode/HTML)
function plain(text) {
  return (text || '')
    .replace(/\{STEAM_CLAN_IMAGE\}\S*/g, '')
    .replace(/\[\/?[^\]]+\]/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Busca os comunicados oficiais na Steam e posta os que ainda não foram avisados.
 * Na primeira vez só marca os atuais como vistos (para não despejar comunicados antigos).
 */
async function checkNews(client) {
  const { steamAppId, mention } = config.avisos;
  let items;
  try {
    const res = await fetch(`${STEAM_API}?appid=${steamAppId}&count=20&maxlength=400&format=json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    items = (await res.json()).appnews.newsitems.filter(n => n.feedname === OFFICIAL_FEED);
  } catch (err) {
    console.error('Erro ao buscar notícias do Aion 2 na Steam:', err.message);
    return;
  }

  for (const guild of client.guilds.cache.values()) {
    const channel = findChannel(guild);
    if (!channel) continue;

    const seen = getGuildSetting(guild.id, 'steam_seen');
    if (!seen) {
      setGuildSetting(guild.id, 'steam_seen', items.map(n => n.gid));
      continue;
    }

    const fresh = items.filter(n => !seen.includes(n.gid)).sort((a, b) => a.date - b.date);
    for (const n of fresh) {
      const kind = newsLabel(n.title);
      const url = `https://store.steampowered.com/news/app/${steamAppId}/view/${n.gid}`;
      const summary = plain(n.contents);
      try {
        await channel.send({
          content: `${mention} ${kind.emoji} **${kind.label} do Aion 2!**`,
          embeds: [new EmbedBuilder()
            .setColor(kind.color)
            .setTitle(n.title.slice(0, 256))
            .setURL(url)
            .setDescription(`${summary.slice(0, 350)}${summary.length > 350 ? '…' : ''}\n\n🔗 [Ler o comunicado completo](${url})`)
            .setFooter({ text: 'Comunicado oficial da NCSoft (Steam)' })
            .setTimestamp(new Date(n.date * 1000))],
          allowedMentions: { parse: ['everyone'] }
        });
        seen.push(n.gid);
      } catch (err) {
        console.error('Erro ao postar notícia:', err.message);
      }
    }
    // guarda só os mais recentes
    setGuildSetting(guild.id, 'steam_seen', seen.slice(-100));
  }
}

function startAvisos(client) {
  const { newsEveryMinutes } = config.avisos;
  setInterval(() => checkEvents(client), 30 * 1000);
  checkNews(client);
  setInterval(() => checkNews(client), newsEveryMinutes * 60 * 1000);
  console.log(`📢 Avisos do Aion 2 ligados (sala ${config.avisos.channel})`);
}

module.exports = { startAvisos, checkNews, checkEvents };
