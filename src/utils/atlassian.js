const axios = require('axios');
const configManager = require('./config');

class AtlassianAPI {
  constructor() {
    this.config = configManager.getAtlassianConfig();
  }

  getAuthHeader() {
    const { username, apiToken } = this.config;
    const auth = Buffer.from(`${username}:${apiToken}`).toString('base64');
    return `Basic ${auth}`;
  }

  getBaseUrl() {
    return this.config.baseUrl;
  }

  async makeRequest(method, endpoint, options = {}) {
    if (!configManager.isAtlassianConfigured()) {
      throw new Error('Atlassian credentials not configured in config.json');
    }

    const url = `${this.getBaseUrl()}${endpoint}`;
    const headers = {
      'Authorization': this.getAuthHeader(),
      'Content-Type': 'application/json',
      ...options.headers,
    };

    try {
      const response = await axios({
        method,
        url,
        headers,
        ...options,
      });
      return response;
    } catch (error) {
      // Re-throw with more context
      const message = error.response?.data?.message || error.message;
      throw new Error(`${method} ${endpoint} failed: ${message}`);
    }
  }

  // Convenience methods
  async get(endpoint, params = {}) {
    return this.makeRequest('GET', endpoint, { params });
  }

  async post(endpoint, data = {}, options = {}) {
    return this.makeRequest('POST', endpoint, { data, ...options });
  }

  async put(endpoint, data = {}, options = {}) {
    return this.makeRequest('PUT', endpoint, { data, ...options });
  }

  async delete(endpoint, options = {}) {
    return this.makeRequest('DELETE', endpoint, options);
  }
}

module.exports = AtlassianAPI;