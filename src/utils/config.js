const fs = require('fs');
const path = require('path');

class ConfigManager {
  constructor() {
    this.config = null;
    this.loadConfig();
  }

  loadConfig() {
    try {
      const configPath = path.join(process.cwd(), 'config.json');
      if (fs.existsSync(configPath)) {
        const configData = fs.readFileSync(configPath, 'utf8');
        this.config = JSON.parse(configData);
        console.error('Configuration loaded successfully');
      } else {
        console.warn('config.json not found. Please create it with your Atlassian credentials.');
        this.config = { atlassian: {} };
      }
    } catch (error) {
      console.error('Error loading config.json:', error.message);
      this.config = { atlassian: {} };
    }
  }

  getConfig() {
    return this.config;
  }

  getAtlassianConfig() {
    return this.config.atlassian || {};
  }

  isAtlassianConfigured() {
    const atlassian = this.getAtlassianConfig();
    return !!(atlassian.baseUrl && atlassian.username && atlassian.apiToken);
  }
}

module.exports = new ConfigManager();