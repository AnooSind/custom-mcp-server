#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} = require('@modelcontextprotocol/sdk/types.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

class CustomMCPServer {
  constructor() {
    // Load configuration
    this.config = this.loadConfig();

    this.server = new Server(
      {
        name: 'custom-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupRequestHandlers();
  }

  loadConfig() {
    try {
      const configPath = path.join(__dirname, 'config.json');
      if (fs.existsSync(configPath)) {
        const configData = fs.readFileSync(configPath, 'utf8');
        return JSON.parse(configData);
      } else {
        console.warn('config.json not found. Please create it with your Jira/Confluence credentials.');
        return { jira: {}, confluence: {} };
      }
    } catch (error) {
      console.error('Error loading config.json:', error.message);
      return { jira: {}, confluence: {} };
    }
  }

  setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'get_current_time',
            description: 'Get the current date and time',
            inputSchema: {
              type: 'object',
              properties: {},
              required: [],
            },
          },
          {
            name: 'calculate_sum',
            description: 'Calculate the sum of two numbers',
            inputSchema: {
              type: 'object',
              properties: {
                a: { type: 'number', description: 'First number' },
                b: { type: 'number', description: 'Second number' },
              },
              required: ['a', 'b'],
            },
          },
          {
            name: 'reverse_string',
            description: 'Reverse a given string',
            inputSchema: {
              type: 'object',
              properties: {
                text: { type: 'string', description: 'Text to reverse' },
              },
              required: ['text'],
            },
          },
          {
            name: 'search_jira_issues',
            description: 'Search for Jira issues using JQL (Jira Query Language)',
            inputSchema: {
              type: 'object',
              properties: {
                jql: { type: 'string', description: 'JQL query to search issues' },
                maxResults: { type: 'number', description: 'Maximum number of results (default: 10)', default: 10 },
              },
              required: ['jql'],
            },
          },
          {
            name: 'get_jira_issue',
            description: 'Get detailed information about a specific Jira issue',
            inputSchema: {
              type: 'object',
              properties: {
                issueKey: { type: 'string', description: 'Jira issue key (e.g., PROJ-123)' },
              },
              required: ['issueKey'],
            },
          },
          {
            name: 'create_jira_issue',
            description: 'Create a new Jira issue',
            inputSchema: {
              type: 'object',
              properties: {
                projectKey: { type: 'string', description: 'Project key where to create the issue' },
                issueType: { type: 'string', description: 'Issue type (e.g., Bug, Task, Story)' },
                summary: { type: 'string', description: 'Issue summary/title' },
                description: { type: 'string', description: 'Issue description' },
              },
              required: ['projectKey', 'issueType', 'summary'],
            },
          },
          {
            name: 'search_confluence_pages',
            description: 'Search for Confluence pages',
            inputSchema: {
              type: 'object',
              properties: {
                query: { type: 'string', description: 'Search query' },
                spaceKey: { type: 'string', description: 'Space key to limit search (optional)' },
                maxResults: { type: 'number', description: 'Maximum number of results (default: 10)', default: 10 },
              },
              required: ['query'],
            },
          },
          {
            name: 'get_confluence_page',
            description: 'Get content of a specific Confluence page',
            inputSchema: {
              type: 'object',
              properties: {
                pageId: { type: 'string', description: 'Confluence page ID' },
              },
              required: ['pageId'],
            },
          },
          {
            name: 'create_confluence_page',
            description: 'Create a new Confluence page',
            inputSchema: {
              type: 'object',
              properties: {
                spaceKey: { type: 'string', description: 'Space key where to create the page' },
                title: { type: 'string', description: 'Page title' },
                content: { type: 'string', description: 'Page content in Confluence storage format' },
                parentId: { type: 'string', description: 'Parent page ID (optional)' },
              },
              required: ['spaceKey', 'title', 'content'],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'get_current_time':
          return {
            content: [
              {
                type: 'text',
                text: new Date().toISOString(),
              },
            ],
          };

        case 'calculate_sum':
          const sum = args.a + args.b;
          return {
            content: [
              {
                type: 'text',
                text: `The sum of ${args.a} and ${args.b} is ${sum}`,
              },
            ],
          };

        case 'reverse_string':
          const reversed = args.text.split('').reverse().join('');
          return {
            content: [
              {
                type: 'text',
                text: `Reversed: ${reversed}`,
              },
            ],
          };

        case 'search_jira_issues':
          try {
            if (!this.config.atlassian?.baseUrl || !this.config.atlassian?.username || !this.config.atlassian?.apiToken) {
              throw new Error('Atlassian credentials not configured in config.json');
            }

            const auth = Buffer.from(`${this.config.atlassian.username}:${this.config.atlassian.apiToken}`).toString('base64');
            const response = await axios.get(`${this.config.atlassian.baseUrl}/rest/api/3/search`, {
              headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json',
              },
              params: {
                jql: args.jql,
                maxResults: args.maxResults || 10,
                fields: 'key,summary,status,assignee,created',
              },
            });

            const issues = response.data.issues.map(issue => ({
              key: issue.key,
              summary: issue.fields.summary,
              status: issue.fields.status.name,
              assignee: issue.fields.assignee?.displayName || 'Unassigned',
              created: issue.fields.created,
            }));

            return {
              content: [
                {
                  type: 'text',
                  text: `Found ${issues.length} issues:\n${issues.map(issue =>
                    `${issue.key}: ${issue.summary} (${issue.status}) - ${issue.assignee}`
                  ).join('\n')}`,
                },
              ],
            };
          } catch (error) {
            throw new McpError(
              ErrorCode.InternalError,
              `Jira search failed: ${error.response?.data?.message || error.message}`
            );
          }

        case 'get_jira_issue':
          try {
            if (!this.config.atlassian?.baseUrl || !this.config.atlassian?.username || !this.config.atlassian?.apiToken) {
              throw new Error('Atlassian credentials not configured in config.json');
            }

            const auth = Buffer.from(`${this.config.atlassian.username}:${this.config.atlassian.apiToken}`).toString('base64');
            const response = await axios.get(`${this.config.atlassian.baseUrl}/rest/api/3/issue/${args.issueKey}`, {
              headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json',
              },
            });

            const issue = response.data;
            const result = {
              key: issue.key,
              summary: issue.fields.summary,
              description: issue.fields.description,
              status: issue.fields.status.name,
              assignee: issue.fields.assignee?.displayName || 'Unassigned',
              reporter: issue.fields.reporter?.displayName || 'Unknown',
              created: issue.fields.created,
              updated: issue.fields.updated,
              priority: issue.fields.priority?.name || 'Not set',
            };

            return {
              content: [
                {
                  type: 'text',
                  text: `Issue ${result.key}:\nSummary: ${result.summary}\nDescription: ${result.description || 'No description'}\nStatus: ${result.status}\nAssignee: ${result.assignee}\nReporter: ${result.reporter}\nPriority: ${result.priority}\nCreated: ${result.created}\nUpdated: ${result.updated}`,
                },
              ],
            };
          } catch (error) {
            throw new McpError(
              ErrorCode.InternalError,
              `Failed to get Jira issue: ${error.response?.data?.message || error.message}`
            );
          }

        case 'create_jira_issue':
          try {
            if (!this.config.atlassian?.baseUrl || !this.config.atlassian?.username || !this.config.atlassian?.apiToken) {
              throw new Error('Atlassian credentials not configured in config.json');
            }

            const auth = Buffer.from(`${this.config.atlassian.username}:${this.config.atlassian.apiToken}`).toString('base64');
            const issueData = {
              fields: {
                project: { key: args.projectKey },
                summary: args.summary,
                description: args.description || '',
                issuetype: { name: args.issueType },
              },
            };

            const response = await axios.post(`${this.config.atlassian.baseUrl}/rest/api/3/issue`, issueData, {
              headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json',
              },
            });

            return {
              content: [
                {
                  type: 'text',
                  text: `Created Jira issue: ${response.data.key}\nURL: ${this.config.atlassian.baseUrl}/browse/${response.data.key}`,
                },
              ],
            };
          } catch (error) {
            throw new McpError(
              ErrorCode.InternalError,
              `Failed to create Jira issue: ${error.response?.data?.message || error.message}`
            );
          }

        case 'search_confluence_pages':
          try {
            if (!this.config.atlassian?.baseUrl || !this.config.atlassian?.username || !this.config.atlassian?.apiToken) {
              throw new Error('Atlassian credentials not configured in config.json');
            }

            const auth = Buffer.from(`${this.config.atlassian.username}:${this.config.atlassian.apiToken}`).toString('base64');
            const params = {
              cql: args.spaceKey ? `space=${args.spaceKey} AND text~"${args.query}"` : `text~"${args.query}"`,
              limit: args.maxResults || 10,
            };

            const response = await axios.get(`${this.config.atlassian.baseUrl}/rest/api/content/search`, {
              headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json',
              },
              params,
            });

            const pages = response.data.results.map(page => ({
              id: page.id,
              title: page.title,
              space: page.space?.name || 'Unknown',
              type: page.type,
              status: page.status,
            }));

            return {
              content: [
                {
                  type: 'text',
                  text: `Found ${pages.length} pages:\n${pages.map(page =>
                    `${page.id}: ${page.title} (${page.space}) - ${page.type}`
                  ).join('\n')}`,
                },
              ],
            };
          } catch (error) {
            throw new McpError(
              ErrorCode.InternalError,
              `Confluence search failed: ${error.response?.data?.message || error.message}`
            );
          }

        case 'get_confluence_page':
          try {
            if (!this.config.atlassian?.baseUrl || !this.config.atlassian?.username || !this.config.atlassian?.apiToken) {
              throw new Error('Atlassian credentials not configured in config.json');
            }

            const auth = Buffer.from(`${this.config.atlassian.username}:${this.config.atlassian.apiToken}`).toString('base64');
            const response = await axios.get(`${this.config.atlassian.baseUrl}/rest/api/content/${args.pageId}`, {
              headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json',
              },
              params: {
                expand: 'body.storage,space,version',
              },
            });

            const page = response.data;
            const content = page.body?.storage?.value || 'No content available';

            return {
              content: [
                {
                  type: 'text',
                  text: `Page: ${page.title}\nSpace: ${page.space?.name || 'Unknown'}\nStatus: ${page.status}\nVersion: ${page.version?.number || 'Unknown'}\n\nContent:\n${content}`,
                },
              ],
            };
          } catch (error) {
            throw new McpError(
              ErrorCode.InternalError,
              `Failed to get Confluence page: ${error.response?.data?.message || error.message}`
            );
          }

        case 'create_confluence_page':
          try {
            if (!this.config.atlassian?.baseUrl || !this.config.atlassian?.username || !this.config.atlassian?.apiToken) {
              throw new Error('Atlassian credentials not configured in config.json');
            }

            const auth = Buffer.from(`${this.config.atlassian.username}:${this.config.atlassian.apiToken}`).toString('base64');
            const pageData = {
              type: 'page',
              title: args.title,
              space: { key: args.spaceKey },
              body: {
                storage: {
                  value: args.content,
                  representation: 'storage',
                },
              },
            };

            if (args.parentId) {
              pageData.ancestors = [{ id: args.parentId }];
            }

            const response = await axios.post(`${this.config.atlassian.baseUrl}/rest/api/content`, pageData, {
              headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json',
              },
            });

            return {
              content: [
                {
                  type: 'text',
                  text: `Created Confluence page: ${response.data.title}\nURL: ${this.config.atlassian.baseUrl}${response.data._links.webui}\nID: ${response.data.id}`,
                },
              ],
            };
          } catch (error) {
            throw new McpError(
              ErrorCode.InternalError,
              `Failed to create Confluence page: ${error.response?.data?.message || error.message}`
            );
          }

        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${name}`
          );
      }
    });
  }

  setupRequestHandlers() {
    // Add any additional request handlers here if needed
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Custom MCP Server running on stdio');
  }
}

// Run the server
const server = new CustomMCPServer();
server.run().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});