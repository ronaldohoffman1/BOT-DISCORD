const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { setupGuildRooms } = require("../guildGuides");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup-salas")
    .setDescription("Configura os painéis e guias do Kokushibo nas salas oficiais")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const results = await setupGuildRooms(interaction.guild, interaction.client, true);

      return interaction.editReply({
        content:
          `🛠️ **Configuração de Salas Concluída!**\n\n` +
          results.join("\n") +
          `\n\nO **Kokushibo** agora está ativo e responsável por essas salas!`
      });
    } catch (err) {
      console.error("Erro no comando setup-salas:", err);
      return interaction.editReply({
        content: `❌ Ocorreu um erro ao configurar as salas: ${err.message}`
      });
    }
  }
};
