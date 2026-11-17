const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const db = require("../database/db");

// Armazena dados temporários enquanto o usuário escolhe a categoria
// { userId -> { name, description, startAt } }
const pending = new Map();

// Valida e converte "DD/MM/AAAA HH:MM" → "AAAA-MM-DD HH:MM" (para armazenar)
function parseDateTime(date, hour) {
  const dateMatch = date.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const hourMatch = hour.match(/^(\d{2}):(\d{2})$/);
  if (!dateMatch || !hourMatch) return null;

  const [, d, m, y] = dateMatch;
  const [, hh, mm] = hourMatch;

  const dt = new Date(`${y}-${m}-${d}T${hh}:${mm}:00`);
  if (isNaN(dt.getTime())) return null;

  return { iso: `${y}-${m}-${d} ${hh}:${mm}`, display: `${d}/${m}/${y} às ${hh}:${mm}` };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("evento-criar")
    .setDescription("Cria um novo evento e abre o painel de presença")
    .addStringOption((opt) =>
      opt.setName("nome").setDescription("Nome do evento").setRequired(true).setMaxLength(100)
    )
    .addStringOption((opt) =>
      opt.setName("data").setDescription("Data de início (DD/MM/AAAA)").setRequired(true).setMaxLength(10)
    )
    .addStringOption((opt) =>
      opt.setName("hora").setDescription("Hora de início (HH:MM)").setRequired(true).setMaxLength(5)
    )
    .addStringOption((opt) =>
      opt.setName("descricao").setDescription("Descrição do evento").setRequired(false).setMaxLength(500)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents),

  async execute(interaction) {
    const name = interaction.options.getString("nome").trim();
    const description = (interaction.options.getString("descricao") || "").trim();
    const dateStr = interaction.options.getString("data").trim();
    const hourStr = interaction.options.getString("hora").trim();

    const parsed = parseDateTime(dateStr, hourStr);
    if (!parsed) {
      return interaction.reply({
        content: "❌ Data ou hora inválida. Use o formato **DD/MM/AAAA** e **HH:MM**.",
        ephemeral: true,
      });
    }

    // Salva temporariamente enquanto usuário escolhe a categoria
    pending.set(interaction.user.id, { name, description, startAt: parsed.iso, startDisplay: parsed.display });

    const categoryNames = db.getCategoryNames();

    // Se não há categorias, abre modal direto para criar a primeira
    if (!categoryNames.length) {
      const modal = new ModalBuilder()
        .setCustomId("evento_cat_nova")
        .setTitle("Nova Categoria");
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("cat_input")
            .setLabel("Nome da categoria")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("Ex: Treino, Raid, PvP")
            .setRequired(true)
            .setMaxLength(50)
        )
      );
      return interaction.showModal(modal);
    }

    // Monta select com categorias existentes + opção de criar nova
    const options = categoryNames.slice(0, 24).map((c) => ({ label: c, value: c }));
    options.push({ label: "➕ Nova categoria…", value: "__new__" });

    const select = new StringSelectMenuBuilder()
      .setCustomId("evento_cat_select")
      .setPlaceholder("Selecione a categoria do evento")
      .addOptions(options);

    await interaction.reply({
      content: `📂 **Selecione a categoria** para o evento **${name}** (${parsed.display}):`,
      components: [new ActionRowBuilder().addComponents(select)],
      ephemeral: true,
    });
  },

  // Exporta o Map para o handler de interações acessar
  pending,
  parseDateTime,
};
