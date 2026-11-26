const { createRoomEventCommand } = require("../utils/roomEventHelper");

module.exports = createRoomEventCommand({
  commandName: "evento-pve",
  description: "Cria um evento PvE na sala de convocação PvE com lista de presença",
  category: "PvE",
  channelKeywords: ["convocacao-pve", "convocação-pve", "evento-pve"],
  titlePrefix: "⚔️ [PvE]",
});
