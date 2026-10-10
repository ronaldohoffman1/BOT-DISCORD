require('dotenv').config({ quiet: true });
const API = 'https://discord.com/api/v10';
const H = { Authorization: `Bot ${process.env.DISCORD_TOKEN}`, 'Content-Type': 'application/json' };
const FORUM = '1556568665103671342';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const posts = [
  // Gladiador
  ['Gladiador', 'Guia', '⚔️ Gladiador — Guia completo em PT-BR (rotação, skills e dicas)', 'https://www.youtube.com/watch?v=RBX21w2-4jM', 'Vídeo em português com a rotação ideal, skills prioritárias e dicas de gameplay do Gladiador.'],
  ['Gladiador', 'PvE', '⚔️ Gladiador — Build PvE (do leveling ao endgame)', 'https://www.youtube.com/watch?v=xRPr30JetyY', 'Build PvE por fases de leveling. Foco em Overhead Slam, Rending Blow e Ruinous Blow para dano em chefe.'],
  ['Gladiador', 'PvP', '⚔️ Gladiador — Builds, gear, skills e stigmas (texto)', 'https://questlog.gg/aion-2/en/classes/gladiator', 'Guia escrito com 5 modelos de build: DPS de chefe, farm AoE/solo, off-tank, Arena e linha de frente no Abyss. Combo PvP: Blade Toss → Leaping Slam → Mocking Blade → Overhead Slam → Aerial Snare.'],
  // Templário
  ['Templário', 'PvE', '🛡️ Templário — Build PvE atualizada (Global)', 'https://www.youtube.com/watch?v=f3gxUdec82U', 'Build PvE para iniciantes. Núcleo: Judgment, Punishment e Pummel no nível 20 o quanto antes.'],
  ['Templário', 'PvP', '🛡️ Templário — Build PvP (skills, rotação e tabuleiro Daevanion)', 'https://www.youtube.com/watch?v=N9LIKmfVoVk', 'Build PvP com rotação, escolha de skills e explicação do tabuleiro, com exemplos de gameplay.'],
  ['Templário', 'Guia', '🛡️ Templário — Build e rotação (texto)', 'https://deltiasgaming.com/aion-2-templar-build-and-rotation-guide/', 'Guia escrito. Status: Bloqueio + Evasão + Destreza no início/meio; Bloqueio + Resistência + Ironclad Defense no fim de jogo.'],
  // Arqueiro
  ['Arqueiro', 'Guia', '🏹 Arqueiro (Ranger) — Guia completo em PT-BR (PvP e PvE)', 'https://www.youtube.com/watch?v=W2fYNsG0Y-Y', 'Vídeo em português: como começar certo, com habilidades, stigmas e macro.'],
  ['Arqueiro', 'PvE', '🏹 Arqueiro — Melhor build PvE', 'https://www.youtube.com/watch?v=xMeJ204VUbI', 'Build PvE de dano sustentado. Núcleo: Snipe, Tempest Shot, Gale Arrow, Drill Dart e Deadshot.'],
  ['Arqueiro', 'PvP', '🏹 Arqueiro — Skills, stigmas e macros (texto)', 'https://games.gg/aion-2/guides/aion-2-ranger-build-guide/', "Guia escrito. Stigmas PvE: Vaizel's Authority, Bow of Blessing, Supporting Fire e Explosive Arrow. Para PvP, use a build de kite."],
  // Assassino
  ['Assassino', 'PvE', '🗡️ Assassino — Guia PvE', 'https://www.youtube.com/watch?v=jRil2j7eqws', 'Guia PvE: adagas duplas, aplicação de runas e burst com Pattern Explosion.'],
  ['Assassino', 'Guia', '🗡️ Assassino — Macro e rotação de DPS', 'https://www.youtube.com/watch?v=0fbIckU13AI', 'Explica a macro e a rotação de dano. Elusive Clone zera o cooldown de Hardcore por alguns segundos.'],
  ['Assassino', 'PvP', '🗡️ Assassino — Builds PvP e PvE e combos (texto)', 'https://www.pvpbank.com/best-aion-2-assassin-builds', 'Guia escrito com combos. Skills-chave: Quick Slash, Pattern Explosion e Surprise Attack (dano pelas costas + roubo de vida).'],
  // Feiticeiro
  ['Feiticeiro', 'Guia', '🔥 Feiticeiro — Guia completo em PT-BR (skills, stigmas e combos)', 'https://www.youtube.com/watch?v=Jo-vsydnY5A', 'Vídeo em português com skills, stigmas e combos do Feiticeiro.'],
  ['Feiticeiro', 'PvE', '🔥 Feiticeiro — Guia PvE definitivo (build, macro e rotação)', 'https://www.youtube.com/watch?v=oVjN5QJjUZA', 'Build PvE, montagem da macro e rotação. Prioridade: Hellfire, Wish of Concentration e Blaze.'],
  ['Feiticeiro', 'PvP', '🔥 Feiticeiro — Builds, skills e rotações (texto)', 'https://games.gg/aion-2/guides/aion-2-sorcerer-guide/', 'Guia escrito. Stigma principal: Element Enhancement (+20% de ataque de Fogo e Água). Mantenha o MP acima de 50%.'],
  // Invocador
  ['Invocador', 'Guia', '🔮 Invocador (Spiritmaster) — Guia em PT-BR: rotação e dano máximo', 'https://www.youtube.com/watch?v=qQ8VOlb7tmg', 'Vídeo em português explicando a rotação do Spiritmaster e como tirar o máximo de dano.'],
  ['Invocador', 'PvE', '🔮 Invocador — Skills, stigmas e macros', 'https://www.youtube.com/watch?v=Xey9go7iYqc', 'Guia para iniciantes: Daevanion, macros e progressão de skills.'],
  ['Invocador', 'PvP', '🔮 Invocador — Builds, espíritos e rotações (texto)', 'https://games.gg/aion-2/guides/aion-2-spiritmaster-guide/', 'Guia escrito. Chefe: Combustion, Cold Shock e Elemental Fusion. Grupo: espíritos de Terra + Água. PvP: Fogo + Vento.'],
  // Clérigo
  ['Clérigo', 'Guia', '💖 Clérigo — Guia completo em PT-BR (skills, stigmas e combos)', 'https://www.youtube.com/watch?v=JLYdIsd32SA', 'Vídeo em português com skills, stigmas e combos do Clérigo.'],
  ['Clérigo', 'PvE', '💖 Clérigo — Guia PvE e PvP completo', 'https://www.youtube.com/watch?v=YV6jJBKyuro', 'Guia para PvE e PvP. Cura: Healing Light, Radiant Recovery e Light of Regeneration.'],
  ['Clérigo', 'PvP', '💖 Clérigo — Skills e como jogar (texto)', 'https://game8.co/games/Aion-2/archives/612967', 'Guia escrito. Dica: o cooldown de Condemnation zera a cada crítico, então busque 100% de crítico nessa skill.'],
  // Chanter
  ['Chanter', 'Guia', '📜 Chanter — Guia inicial definitivo (Global)', 'https://www.youtube.com/watch?v=7qMgsnSsmIU', 'Guia completo para começar de Chanter: híbrido de suporte e DPS corpo a corpo.'],
  ['Chanter', 'PvE', '📜 Chanter — Skills PvE e macro', 'https://www.youtube.com/watch?v=yIiym7-KGdI', 'Skills e macro para PvE. Dano principal: Dark Crush. Buff de grupo: Undefeated Mantra.'],
  ['Chanter', 'PvP', '📜 Chanter — Builds, skills e stigmas (texto)', 'https://games.gg/aion-2/guides/aion-2-chanter-guide/', 'Guia escrito. Mantras PvE: Valor + Speed + Healing. Mantras PvP: Valor + Speed + Power of the Storm. Precisão é obrigatória.'],
];

(async () => {
  const forum = await (await fetch(`${API}/channels/${FORUM}`, { headers: H })).json();
  const tagId = Object.fromEntries(forum.available_tags.map(t => [t.name, t.id]));
  for (const [cls, kind, title, url, desc] of posts) {
    const body = JSON.stringify({
      name: title.slice(0, 100),
      applied_tags: [tagId[cls], tagId[kind]].filter(Boolean),
      message: { content: `**${title}**\n\n${desc}\n\n🔗 ${url}` }
    });
    let res = await fetch(`${API}/channels/${FORUM}/threads`, { method: 'POST', headers: H, body });
    if (res.status === 429) {
      const j = await res.json();
      await sleep((j.retry_after || 5) * 1000 + 500);
      res = await fetch(`${API}/channels/${FORUM}/threads`, { method: 'POST', headers: H, body });
    }
    console.log(res.status, cls, kind, title);
    await sleep(2500);
  }
})();
