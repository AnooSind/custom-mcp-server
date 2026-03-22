# Custom MCP Server

A custom Model Context Protocol (MCP) server built with Node.js that provides various tools for AI assistants.

## Project Structure

```
customMcp/
├── src/
│   ├── index.js                 # Main MCP server entry point
│   ├── tools/
│   │   ├── jira.js             # Jira integration tools
│   │   ├── confluence.js       # Confluence integration tools
│   │   ├── github.js           # GitHub integration tools
│   │   └── gitlab.js           # GitLab integration tools
│   └── utils/
│       ├── config.js           # Configuration management
│       └── atlassian.js        # Atlassian API utilities
├── chatmodes/
│   └── .chatmode.md            # Test Case Creation chat mode (copy to your projects)
├── config.json                 # Service credentials (create this)
├── package.json
├── test.js
├── README.md
├── .gitignore
└── .vscode/
    └── settings.json
```

### Jira Integration
- **search_jira_issues**: Search for Jira issues using JQL (Jira Query Language)
- **get_jira_issue**: Get detailed information about a specific Jira issue
- **create_jira_issue**: Create a new Jira issue

### Confluence Integration
- **search_confluence_pages**: Search for Confluence pages by content or title
- **get_confluence_page**: Get the content of a specific Confluence page
- **create_confluence_page**: Create a new Confluence page

### GitHub Integration
- **scan_github_repos**: Scan GitHub repositories for information or content
- **get_github_repo_info**: Get detailed information about a specific GitHub repository
- **search_github_code**: Search for code across GitHub repositories

### GitLab Integration
- **scan_gitlab_projects**: Scan GitLab projects for information or content
- **get_gitlab_project_info**: Get detailed information about a specific GitLab project
- **search_gitlab_code**: Search for code across GitLab projects

## Configuration

Create a `config.json` file in the project root with your service credentials:

```json
{
  "atlassian": {
    "baseUrl": "https://yourcompany.atlassian.net",
    "username": "your.email@company.com",
    "apiToken": "your-atlassian-api-token"
  },
  "github": {
    "token": "your-github-personal-access-token",
    "basePath": "your-github-username-or-org",
    "repositories": ["repo1", "repo2", "repo3"]
  },
  "gitlab": {
    "token": "your-gitlab-personal-access-token",
    "basePath": "https://gitlab.com",
    "repositories": ["namespace/project1", "namespace/project2"]
  }
}
```

**Security Note**: The `config.json` file is automatically excluded from version control via `.gitignore` to protect your credentials.

### Getting API Tokens
- **Atlassian**: Generate tokens at https://id.atlassian.com/manage-profile/security/api-tokens (same token works for both Jira and Confluence)
- **GitHub**: Create a Personal Access Token at https://github.com/settings/tokens with `repo` scope
- **GitLab**: Create a Personal Access Token at https://gitlab.com/-/profile/personal_access_tokens with `read_api` and `read_repository` scopes

### Jira Tools
```javascript
// Search for issues assigned to current user
search_jira_issues({
  jql: "assignee = currentUser() AND status != Closed"
})

// Get specific issue details
get_jira_issue({
  issueKey: "PROJ-123"
})

// Create a new issue
create_jira_issue({
  projectKey: "PROJ",
  issueType: "Task",
  summary: "New task title",
  description: "Task description"
})
```

### Confluence Tools
```javascript
// Search for pages containing specific text
search_confluence_pages({
  query: "project documentation",
  spaceKey: "PROJ"
})

// Get page content
get_confluence_page({
  pageId: "123456789"
})

// Create a new page
create_confluence_page({
  spaceKey: "PROJ",
  title: "New Documentation Page",
  content: "<p>This is the page content in Confluence storage format.</p>"
})
```

### GitHub Tools
```javascript
// Scan repositories for a specific pattern
scan_github_repos({
  query: "react",
  scanType: "repos",
  maxResults: 5
})

// Get detailed repository information
get_github_repo_info({
  owner: "microsoft",
  repo: "vscode"
})

// Search for code across repositories
search_github_code({
  query: "function handleClick",
  language: "javascript",
  maxResults: 10
})
```

### GitLab Tools
```javascript
// Scan projects for a specific pattern
scan_gitlab_projects({
  query: "api",
  scanType: "projects",
  maxResults: 5
})

// Get detailed project information
get_gitlab_project_info({
  projectId: "namespace/my-project"
})

// Search for code across projects
search_gitlab_code({
  query: "class UserService",
  language: "java",
  maxResults: 10
})
```

## Installation

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```

## Usage

Start the MCP server:
```bash
npm start
```

Or for development with auto-restart:
```bash
npm run dev
```

## Connecting to Copilot

To connect this MCP server to GitHub Copilot in VS Code, you can use either **workspace settings** (project-specific) or **global settings** (all VS Code projects).

### Option 1: Workspace Settings (Project-specific)

1. This project includes `.vscode/settings.json` in the project root directory
2. Open VS Code in this project directory
3. The settings are automatically loaded for this workspace
4. Restart VS Code or reload the window (Ctrl/Cmd + Shift + P → "Developer: Reload Window")

### Option 2: Global Settings (All VS Code projects)

You can also configure the MCP server in your global VS Code settings to use it across all projects.

**Mac:**
1. Navigate to: `~/Library/Application Support/Code/User/settings.json`
2. Or use VS Code: `Cmd+,` → Click **User** tab → Click **{}** icon (top-right) to edit JSON

**Windows:**
1. Navigate to: `%APPDATA%\Code\User\settings.json`
   - Full path: `C:\Users\[YourUsername]\AppData\Roaming\Code\User\settings.json`
2. Or use VS Code: `Ctrl+,` → Click **User** tab → Click **{}** icon (top-right) to edit JSON

Add the MCP server configuration to your global settings JSON file (same format as `.vscode/settings.json`).

**After configuring:**
- Restart VS Code or reload the window (Ctrl/Cmd + Shift + P → "Developer: Reload Window")
- The MCP server should now be available to Copilot

You can test the connection by asking Copilot to use the tools:
- "Search for Jira issues assigned to me"
- "Find Confluence pages about project documentation"
- "Scan my GitHub repositories for React projects"
- "Search for code in GitLab projects"

## Verifying Tool Availability

After configuring the MCP server, verify that all tools are accessible to Copilot:

### Method 1: Ask Copilot Directly (Quickest)
In the VS Code chat, ask:
```
What MCP tools do you have access to?
```
Copilot will list all available tools it can use.

### Method 2: Run the Test Script
In your terminal:
```bash
npm test
```
This will display:
```
✓ Found 3 Jira tools, 3 Confluence tools, 3 GitHub tools, and 3 GitLab tools
✓ All tools are properly registered
```

### Method 3: Test Individual Tools
Ask Copilot to use a specific tool:
```
Search my Jira issues assigned to me
```
If the tool is available and configured correctly, Copilot will execute it.

### Method 4: Check Server Logs
- Open VS Code **Output** panel: `View → Output`
- Select **"Custom MCP Server"** from the dropdown
- Look for initialization messages confirming all tools are loaded

### Expected Result
When fully configured, you should have access to **12 total tools**:
- 3 Jira tools
- 3 Confluence tools  
- 3 GitHub tools
- 3 GitLab tools

If you don't see all tools, verify:
1. MCP server configuration is correct in `.vscode/settings.json` or global settings
2. `config.json` has valid credentials for each service you want to use
3. VS Code has been reloaded after configuration changes

## Testing

Run the test script to verify all tools work correctly:
```bash
npm test
```

## Adding New Tools

To add new tools, modify the `setupToolHandlers()` method in `server.js`:

1. Add the tool to the `ListToolsRequestSchema` handler
2. Add a case in the `CallToolRequestSchema` handler
3. Implement the tool logic

## Chat Mode for Test Case Creation

This project includes a specialized chat mode file (`.chatmode.md`) designed for systematic test case creation. You can copy this file to your own projects to enable focused test case development workflows.

### How to Use the Chat Mode

1. **Copy the file** to your project:
   ```bash
   cp chatmodes/.chatmode.md /path/to/your/project/
   ```

2. **Activate the mode** in VS Code:
   - Open VS Code in your project
   - Use the chat mode selector to choose "Test Case Creation"
   - The mode will guide you through structured test case development

### What the Mode Provides

- **Structured templates** for writing comprehensive test cases
- **Best practices** for test case design and coverage
- **Examples** for different types of testing (functional, API, UI)
- **Checklists** for test case review and validation
- **Integration guidance** with development workflows

The chat mode helps ensure consistent, high-quality test case creation across your team and projects.

## Dependencies

- `@modelcontextprotocol/sdk`: MCP SDK for Node.js

## License

MIT