const { McpError, ErrorCode } = require('@modelcontextprotocol/sdk/types.js');
const axios = require('axios');
const configManager = require('../utils/config');

class GitLabTools {
  static getTools() {
    return [
      {
        name: 'scan_gitlab_projects',
        description: 'Scan GitLab projects for information, files, or content',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query or project name pattern' },
            scanType: {
              type: 'string',
              enum: ['projects', 'files', 'content', 'issues', 'merge_requests'],
              description: 'Type of scan to perform',
              default: 'projects'
            },
            maxResults: { type: 'number', description: 'Maximum number of results (default: 10)', default: 10 },
            specificProjects: {
              type: 'array',
              items: { type: 'string' },
              description: 'Specific projects to scan (optional, uses config if not provided)'
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_gitlab_project_info',
        description: 'Get detailed information about a specific GitLab project',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'string', description: 'Project ID or full path (namespace/project)' },
          },
          required: ['projectId'],
        },
      },
      {
        name: 'search_gitlab_code',
        description: 'Search for code across GitLab projects',
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
    const config = configManager.getConfig().gitlab;
    if (!config?.token) {
      throw new McpError(
        ErrorCode.InternalError,
        'GitLab credentials not configured in config.json'
      );
    }

    const baseURL = config.basePath || 'https://gitlab.com';
    const headers = {
      'Authorization': `Bearer ${config.token}`,
      'Content-Type': 'application/json',
    };

    switch (name) {
      case 'scan_gitlab_projects':
        try {
          const projects = args.specificProjects || config.repositories || [];
          const results = [];

          if (projects.length > 0) {
            // Scan specific projects
            for (const project of projects.slice(0, args.maxResults || 10)) {
              try {
                const response = await axios.get(
                  `${baseURL}/api/v4/projects/${encodeURIComponent(project)}`,
                  { headers }
                );
                results.push({
                  id: response.data.id,
                  name: response.data.name,
                  path_with_namespace: response.data.path_with_namespace,
                  description: response.data.description,
                  language: response.data.language || 'Unknown',
                  stars: response.data.star_count,
                  forks: response.data.forks_count,
                  updated: response.data.last_activity_at,
                });
              } catch (error) {
                console.warn(`Failed to scan project ${project}:`, error.message);
              }
            }
          } else {
            // Search all projects in the group/user
            const searchParams = {
              search: args.query,
              per_page: args.maxResults || 10,
            };

            if (config.basePath && config.basePath !== 'https://gitlab.com') {
              // For self-hosted GitLab, search within the instance
              searchParams.scope = 'projects';
            }

            const response = await axios.get(
              `${baseURL}/api/v4/projects`,
              { headers, params: searchParams }
            );

            results.push(...response.data.map(project => ({
              id: project.id,
              name: project.name,
              path_with_namespace: project.path_with_namespace,
              description: project.description,
              language: project.language || 'Unknown',
              stars: project.star_count,
              forks: project.forks_count,
              updated: project.last_activity_at,
            })));
          }

          return {
            content: [
              {
                type: 'text',
                text: `Found ${results.length} GitLab projects:\n${results.map(project =>
                  `• ${project.path_with_namespace}: ${project.description || 'No description'} (${project.language}, ⭐ ${project.stars})`
                ).join('\n')}`,
              },
            ],
          };
        } catch (error) {
          throw new McpError(
            ErrorCode.InternalError,
            `GitLab project scan failed: ${error.message}`
          );
        }

      case 'get_gitlab_project_info':
        try {
          const response = await axios.get(
            `${baseURL}/api/v4/projects/${encodeURIComponent(args.projectId)}`,
            { headers }
          );

          const project = response.data;
          return {
            content: [
              {
                type: 'text',
                text: `Project: ${project.path_with_namespace}\nName: ${project.name}\nDescription: ${project.description || 'No description'}\nLanguage: ${project.language || 'Unknown'}\nStars: ${project.star_count}\nForks: ${project.forks_count}\nIssues: ${project.open_issues_count}\nMerge Requests: ${project.merge_requests_enabled ? 'Enabled' : 'Disabled'}\nCreated: ${project.created_at}\nUpdated: ${project.last_activity_at}\nURL: ${project.web_url}`,
              },
            ],
          };
        } catch (error) {
          throw new McpError(
            ErrorCode.InternalError,
            `Failed to get GitLab project info: ${error.message}`
          );
        }

      case 'search_gitlab_code':
        try {
          const searchParams = {
            search: args.query,
            per_page: args.maxResults || 10,
          };

          if (args.language) {
            searchParams.language = args.language;
          }

          // GitLab advanced search for code
          const response = await axios.get(
            `${baseURL}/api/v4/search`,
            {
              headers,
              params: {
                ...searchParams,
                scope: 'blobs', // Search in file contents
              }
            }
          );

          const results = response.data.map(item => ({
            filename: item.filename,
            path: item.path,
            project_id: item.project_id,
            ref: item.ref,
            data: item.data.substring(0, 200) + '...', // Truncate content preview
          }));

          return {
            content: [
              {
                type: 'text',
                text: `Found ${results.length} code results:\n${results.map(result =>
                  `• Project ${result.project_id}/${result.path}: ${result.filename}\n  Preview: ${result.data}`
                ).join('\n\n')}`,
              },
            ],
          };
        } catch (error) {
          throw new McpError(
            ErrorCode.InternalError,
            `GitLab code search failed: ${error.message}`
          );
        }

      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown GitLab tool: ${name}`
        );
    }
  }
}

module.exports = GitLabTools;