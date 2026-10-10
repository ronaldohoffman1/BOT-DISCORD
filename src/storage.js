const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

// Garante que o diretório data exista
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Configuração inicial (canal de cargos/boas-vindas) usada quando o bot roda pela
// primeira vez num servidor novo (ex: Railway) e ainda não existe data/settings.json
const SEED_FILE = path.join(__dirname, '..', 'settings.inicial.json');

function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
      return JSON.parse(data);
    }
    if (fs.existsSync(SEED_FILE)) {
      return JSON.parse(fs.readFileSync(SEED_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('Erro ao ler settings.json:', err);
  }
  return {};
}

function saveSettings(settings) {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
  } catch (err) {
    console.error('Erro ao salvar settings.json:', err);
  }
}

function getGuildSetting(guildId, key, defaultValue = null) {
  const settings = loadSettings();
  if (settings[guildId] && settings[guildId][key] !== undefined) {
    return settings[guildId][key];
  }
  return defaultValue;
}

function setGuildSetting(guildId, key, value) {
  const settings = loadSettings();
  if (!settings[guildId]) {
    settings[guildId] = {};
  }
  settings[guildId][key] = value;
  saveSettings(settings);
}

module.exports = {
  loadSettings,
  saveSettings,
  getGuildSetting,
  setGuildSetting
};
