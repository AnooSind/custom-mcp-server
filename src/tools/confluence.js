const { McpError, ErrorCode } = require('@modelcontextprotocol/sdk/types.js');
const AtlassianAPI = require('../utils/atlassian');

class ConfluenceTools {
  static getTools() {
    return [
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
    ];
  }

  static async handleTool(name, args) {
    const api = new AtlassianAPI();

    switch (name) {
      case 'search_confluence_pages':
        try {
          const params = {
            cql: args.spaceKey ? `space=${args.spaceKey} AND text~"${args.query}"` : `text~"${args.query}"`,
            limit: args.maxResults || 10,
          };

          const response = await api.get('/rest/api/content/search', params);

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
            `Confluence search failed: ${error.message}`
          );
        }

      case 'get_confluence_page':
        try {
          const response = await api.get(`/rest/api/content/${args.pageId}`, {
            expand: 'body.storage,space,version',
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
            `Failed to get Confluence page: ${error.message}`
          );
        }

      case 'create_confluence_page':
        try {
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

          const response = await api.post('/rest/api/content', pageData);
          const baseUrl = api.getBaseUrl();

          return {
            content: [
              {
                type: 'text',
                text: `Created Confluence page: ${response.data.title}\nURL: ${baseUrl}${response.data._links.webui}\nID: ${response.data.id}`,
              },
            ],
          };
        } catch (error) {
          throw new McpError(
            ErrorCode.InternalError,
            `Failed to create Confluence page: ${error.message}`
          );
        }

      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown Confluence tool: ${name}`
        );
    }
  }
}

module.exports = ConfluenceTools;