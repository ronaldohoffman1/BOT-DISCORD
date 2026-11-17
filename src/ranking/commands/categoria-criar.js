const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const db = require("../database/db");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("categoria-criar")
    .setDescription("Cria uma nova categoria de eventos")
    .addStringOption((opt) =>
      opt.setName("nome").setDescription("Nome da categoria").setRequired(true).setMaxLength(50)
    )
    .addStringOption((opt) =>
      opt.setName("descricao").setDescription("Descrição da categoria").setRequired(false).setMaxLength(200)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents),

  async execute(interaction) {
    const name = interaction.options.getString("nome").trim();
    const description = (interaction.options.getString("descricao") || "").trim();

    if (db.getCategoryByName(name)) {
      return interaction.reply({
        content: `⚠️ Já existe uma categoria com o nome **${name}**.`,
        ephemeral: true,
      });
    }

    db.createCategory(name, description, interaction.user.tag);

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle("📂 Categoria criada!")
      .addFields(
        { name: "Nome", value: name, inline: true },
        { name: "Criada por", value: interaction.user.tag, inline: true }
      )
      .setDescription(description || "*Sem descrição*")
      .setFooter({ text: "Use /evento-criar para vincular um evento a esta categoria" })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
