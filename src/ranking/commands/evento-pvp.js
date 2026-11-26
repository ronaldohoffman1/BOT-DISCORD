const { createRoomEventCommand } = require("../utils/roomEventHelper");

module.exports = createRoomEventCommand({
  commandName: "evento-pvp",
  description: "Cria um evento PvP na sala de convocação PvP com lista de presença",
  category: "PvP",
  channelKeywords: ["convocacao-pvp", "convocação-pvp", "evento-pvp"],
  titlePrefix: "📢 [PvP]",
});
