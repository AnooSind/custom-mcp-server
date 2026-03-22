const { McpError, ErrorCode } = require('@modelcontextprotocol/sdk/types.js');
const AtlassianAPI = require('../utils/atlassian');

class JiraTools {
  static getTools() {
    return [
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
    ];
  }

  static async handleTool(name, args) {
    const api = new AtlassianAPI();

    switch (name) {
      case 'search_jira_issues':
        try {
          const response = await api.get('/rest/api/3/search', {
            jql: args.jql,
            maxResults: args.maxResults || 10,
            fields: 'key,summary,status,assignee,created',
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
            `Jira search failed: ${error.message}`
          );
        }

      case 'get_jira_issue':
        try {
          const response = await api.get(`/rest/api/3/issue/${args.issueKey}`);
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
            `Failed to get Jira issue: ${error.message}`
          );
        }

      case 'create_jira_issue':
        try {
          const issueData = {
            fields: {
              project: { key: args.projectKey },
              summary: args.summary,
              description: args.description || '',
              issuetype: { name: args.issueType },
            },
          };

          const response = await api.post('/rest/api/3/issue', issueData);
          const baseUrl = api.getBaseUrl();

          return {
            content: [
              {
                type: 'text',
                text: `Created Jira issue: ${response.data.key}\nURL: ${baseUrl}/browse/${response.data.key}`,
              },
            ],
          };
        } catch (error) {
          throw new McpError(
            ErrorCode.InternalError,
            `Failed to create Jira issue: ${error.message}`
          );
        }

      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown Jira tool: ${name}`
        );
    }
  }
}

module.exports = JiraTools;