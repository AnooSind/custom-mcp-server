const { McpError, ErrorCode } = require('@modelcontextprotocol/sdk/types.js');
const axios = require('axios');
const configManager = require('../utils/config');

class GitHubTools {
  static getTools() {
    return [
      {
        name: 'scan_github_repos',
        description: 'Scan GitHub repositories for information, files, or content',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query or repository name pattern' },
            scanType: {
              type: 'string',
              enum: ['repos', 'files', 'content', 'issues', 'pulls'],
              description: 'Type of scan to perform',
              default: 'repos'
            },
            maxResults: { type: 'number', description: 'Maximum number of results (default: 10)', default: 10 },
            specificRepos: {
              type: 'array',
              items: { type: 'string' },
              description: 'Specific repositories to scan (optional, uses config if not provided)'
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_github_repo_info',
        description: 'Get detailed information about a specific GitHub repository',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner/organization' },
            repo: { type: 'string', description: 'Repository name' },
          },
          required: ['owner', 'repo'],
        },
      },
      {
        name: 'search_github_code',
        description: 'Search for code across GitHub repositories',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Code search query' },
            language: { type: 'string', description: 'Programming language filter (optional)' },
            maxResults: { type: 'number', description: 'Maximum number of results (default: 10)', default: 10 },
          },
          required: ['query'],
        },
      },
    ];
  }

  static async handleTool(name, args) {
    const config = configManager.getConfig().github;
    if (!config?.token) {
      throw new McpError(
        ErrorCode.InternalError,
        'GitHub credentials not configured in config.json'
      );
    }

    const headers = {
      'Authorization': `token ${config.token}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Custom-MCP-Server',
    };

    switch (name) {
      case 'scan_github_repos':
        try {
          const repos = args.specificRepos || config.repositories || [];
          const results = [];

          if (repos.length > 0) {
            // Scan specific repositories
            for (const repo of repos.slice(0, args.maxResults || 10)) {
              try {
                const response = await axios.get(
                  `https://api.github.com/repos/${config.basePath}/${repo}`,
                  { headers }
                );
                results.push({
                  name: response.data.name,
                  full_name: response.data.full_name,
                  description: response.data.description,
                  language: response.data.language,
                  stars: response.data.stargazers_count,
                  forks: response.data.forks_count,
                  updated: response.data.updated_at,
                });
              } catch (error) {
                console.warn(`Failed to scan repo ${repo}:`, error.message);
              }
            }
          } else {
            // Search all repos in the organization/user
            const response = await axios.get(
              `https://api.github.com/search/repositories?q=user:${config.basePath}+${args.query}`,
              { headers, params: { per_page: args.maxResults || 10 } }
            );

            results.push(...response.data.items.map(repo => ({
              name: repo.name,
              full_name: repo.full_name,
              description: repo.description,
              language: repo.language,
              stars: repo.stargazers_count,
              forks: repo.forks_count,
              updated: repo.updated_at,
            })));
          }

          return {
            content: [
              {
                type: 'text',
                text: `Found ${results.length} GitHub repositories:\n${results.map(repo =>
                  `• ${repo.full_name}: ${repo.description || 'No description'} (${repo.language}, ⭐ ${repo.stars})`
                ).join('\n')}`,
              },
            ],
          };
        } catch (error) {
          throw new McpError(
            ErrorCode.InternalError,
            `GitHub repo scan failed: ${error.message}`
          );
        }

      case 'get_github_repo_info':
        try {
          const response = await axios.get(
            `https://api.github.com/repos/${args.owner}/${args.repo}`,
            { headers }
          );

          const repo = response.data;
          return {
            content: [
              {
                type: 'text',
                text: `Repository: ${repo.full_name}\nDescription: ${repo.description || 'No description'}\nLanguage: ${repo.language}\nStars: ${repo.stargazers_count}\nForks: ${repo.forks_count}\nIssues: ${repo.open_issues_count}\nCreated: ${repo.created_at}\nUpdated: ${repo.updated_at}\nURL: ${repo.html_url}`,
              },
            ],
          };
        } catch (error) {
          throw new McpError(
            ErrorCode.InternalError,
            `Failed to get GitHub repo info: ${error.message}`
          );
        }

      case 'search_github_code':
        try {
          let searchQuery = args.query;
          if (args.language) {
            searchQuery += ` language:${args.language}`;
          }
          if (config.basePath) {
            searchQuery += ` user:${config.basePath}`;
          }

          const response = await axios.get(
            `https://api.github.com/search/code?q=${encodeURIComponent(searchQuery)}`,
            { headers, params: { per_page: args.maxResults || 10 } }
          );

          const results = response.data.items.map(item => ({
            name: item.name,
            path: item.path,
            repository: item.repository.full_name,
            url: item.html_url,
          }));

          return {
            content: [
              {
                type: 'text',
                text: `Found ${results.length} code results:\n${results.map(result =>
                  `• ${result.repository}/${result.path}: ${result.name}`
                ).join('\n')}`,
              },
            ],
          };
        } catch (error) {
          throw new McpError(
            ErrorCode.InternalError,
            `GitHub code search failed: ${error.message}`
          );
        }

      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown GitHub tool: ${name}`
        );
    }
  }
}

module.exports = GitHubTools;