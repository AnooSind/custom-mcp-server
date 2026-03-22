#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} = require('@modelcontextprotocol/sdk/types.js');

// Import tool modules
const JiraTools = require('./tools/jira');
const ConfluenceTools = require('./tools/confluence');
const GitHubTools = require('./tools/github');
const GitLabTools = require('./tools/gitlab');

class CustomMCPServer {
  constructor() {
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

  setupToolHandlers() {
    // List all available tools from all modules
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const allTools = [
        ...JiraTools.getTools(),
        ...ConfluenceTools.getTools(),
        ...GitHubTools.getTools(),
        ...GitLabTools.getTools(),
      ];

      return { tools: allTools };
    });

    // Handle tool calls by routing to appropriate module
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        // Route to appropriate tool module
        if (JiraTools.getTools().some(tool => tool.name === name)) {
          return await JiraTools.handleTool(name, args);
        }

        if (ConfluenceTools.getTools().some(tool => tool.name === name)) {
          return await ConfluenceTools.handleTool(name, args);
        }

        if (GitHubTools.getTools().some(tool => tool.name === name)) {
          return await GitHubTools.handleTool(name, args);
        }

        if (GitLabTools.getTools().some(tool => tool.name === name)) {
          return await GitLabTools.handleTool(name, args);
        }

        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`
        );
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error.message}`
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