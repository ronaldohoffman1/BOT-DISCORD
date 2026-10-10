require('dotenv').config({ quiet: true });
const API = 'https://discord.com/api/v10';
const H = { Authorization: `Bot ${process.env.DISCORD_TOKEN}`, 'Content-Type': 'application/json' };
const FORUM = '1556568665103671342';
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Posts de texto que estavam marcados como PvP mas são guias gerais -> passam a "Guia"
const retag = ['Gladiador', 'Arqueiro', 'Assassino', 'Feiticeiro', 'Invocador', 'Clérigo', 'Chanter'];

const posts = [
  ['Gladiador', '⚔️ Gladiador — Build PvP (Rank 1)', 'https://www.youtube.com/watch?v=pwY4X_rEeGs', 'Build de um Gladiador Rank 1 com skills, gear e status para PvP. Combo de duelo: Blade Toss → Leaping Slam → Mocking Blade → Overhead Slam → Aerial Snare → Focused Block.'],
  ['Arqueiro', '🏹 Arqueiro — Build PvP (kite)', 'https://www.youtube.com/watch?v=vRKgmp741F8', 'Guia de PvE e PvP do Ranger. No PvP, jogue de kite: mantenha distância, use o controle e ataque em movimento.'],
  ['Assassino', '🗡️ Assassino — PvP no Abyss', 'https://www.youtube.com/watch?v=oxKaDwyFV5I', 'Gameplay de PvP no Abyss (servidor TW): furtividade, posicionamento, mobilidade e burst. Shadow Walk dá 20s de stealth fora de combate; cace quem fica para trás.'],
  ['Feiticeiro', '🔥 Feiticeiro — Build PvP e PvE', 'https://www.youtube.com/watch?v=znmULE22qbg', 'Build com skills e stigmas para PvP. No PvP o controle é tudo: use o gelo (Bittercold Wind, Cold Storm) para travar o alvo antes do burst de Hellfire.'],
  ['Invocador', '🔮 Invocador — Build PvP (Fogo + Vento) (texto)', 'https://pixelnitro.com/aion-2-spiritmaster-guide-best-pve-pvp-builds-skill-rotations-and-daevanion-progression-2026-global-launch/', 'Guia escrito com build PvP. Espírito de Fogo reduz a cura do inimigo; espírito de Vento joga para o alto e silencia (priorize healers). Mantenha distância e faça kite.'],
  ['Clérigo', '💖 Clérigo — Guia PvP e PvE', 'https://www.youtube.com/watch?v=N9pok_7x9xA', 'Skills de PvP e PvE do Clérigo. No PvP endgame: healer puro de grupo ou híbrido cura + dano para solo. Busque ~33% de redução de cooldown.'],
  ['Chanter', '📜 Chanter — Build PvP (Arena e grupo)', 'https://www.youtube.com/watch?v=MoFUuQzrogQ', 'Skills e stigmas para Arena e PvP em grupo. Mantras PvP: Valor + Speed + Power of the Storm.'],
];

(async () => {
  const forum = await (await fetch(`${API}/channels/${FORUM}`, { headers: H })).json();
  const tagId = Object.fromEntries(forum.available_tags.map(t => [t.name, t.id]));

  // 1. Corrige as etiquetas dos guias escritos
  const active = await (await fetch(`${API}/guilds/${process.env.GUILD_ID}/threads/active`, { headers: H })).json();
  for (const t of active.threads.filter(t => t.parent_id === FORUM && t.name.endsWith('(texto)'))) {
    const cls = retag.find(c => t.applied_tags.includes(tagId[c]));
    if (!cls || !t.applied_tags.includes(tagId.PvP)) continue;
    const res = await fetch(`${API}/channels/${t.id}`, { method: 'PATCH', headers: H, body: JSON.stringify({ applied_tags: [tagId[cls], tagId.Guia] }) });
    console.log('retag', res.status, t.name);
    await sleep(1500);
  }

  // 2. Novos posts PvP
  for (const [cls, title, url, desc] of posts) {
    const body = JSON.stringify({
      name: title.slice(0, 100),
      applied_tags: [tagId[cls], tagId.PvP],
      message: { content: `**${title}**\n\n${desc}\n\n🔗 ${url}` }
    });
    let res = await fetch(`${API}/channels/${FORUM}/threads`, { method: 'POST', headers: H, body });
    if (res.status === 429) {
      const j = await res.json();
      await sleep((j.retry_after || 5) * 1000 + 500);
      res = await fetch(`${API}/channels/${FORUM}/threads`, { method: 'POST', headers: H, body });
    }
    console.log('post', res.status, title);
    await sleep(2500);
  }
})();
