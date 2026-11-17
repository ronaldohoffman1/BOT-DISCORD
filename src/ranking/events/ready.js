const PADMIN_ROLE = "Nobre";

module.exports = {
  name: "clientReady",
  once: true,
  async execute(client) {
    console.log(`✅ Bot online como ${client.user.tag}`);

    const guildId = process.env.GUILD_ID;
    if (!guildId) return;

    try {
      const guild = await client.guilds.fetch(guildId);
      const existing = guild.roles.cache.find((r) => r.name === PADMIN_ROLE);
      if (!existing) {
        await guild.roles.create({
          name: PADMIN_ROLE,
          color: "#5865F2",
          reason: "Cargo de administração de presenças criado pelo Nemon",
        });
        console.log(`✅ Cargo "${PADMIN_ROLE}" criado no servidor.`);
      } else {
        console.log(`ℹ️  Cargo "${PADMIN_ROLE}" já existe (ID ${existing.id}).`);
      }
    } catch (err) {
      console.warn(`⚠️  Não foi possível criar o cargo "${PADMIN_ROLE}":`, err.message);
    }
  },
};
