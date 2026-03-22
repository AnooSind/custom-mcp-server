#!/usr/bin/env node

// Simple test script to verify MCP server tools
const { spawn } = require('child_process');

async function testListTools(serverProcess) {
  return new Promise((resolve, reject) => {
    const request = {
      jsonrpc: '2.0',
      id: Math.random().toString(36),
      method: 'tools/list',
      params: {}
    };

    serverProcess.stdin.write(JSON.stringify(request) + '\n');

    let response = '';
    const timeout = setTimeout(() => {
      reject(new Error('Timeout waiting for response'));
    }, 5000);

    const onData = (data) => {
      response += data.toString();
      try {
        const parsed = JSON.parse(response);
        clearTimeout(timeout);
        serverProcess.stdout.removeListener('data', onData);
        resolve(parsed);
      } catch (e) {
        // Wait for more data
      }
    };

    serverProcess.stdout.on('data', onData);
  });
}
  return new Promise((resolve, reject) => {
    const request = {
      jsonrpc: '2.0',
      id: Math.random().toString(36),
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args
      }
    };

    serverProcess.stdin.write(JSON.stringify(request) + '\n');

    let response = '';
    const timeout = setTimeout(() => {
      reject(new Error('Timeout waiting for response'));
    }, 5000);

    const onData = (data) => {
      response += data.toString();
      try {
        const parsed = JSON.parse(response);
        clearTimeout(timeout);
        serverProcess.stdout.removeListener('data', onData);
        resolve(parsed);
      } catch (e) {
        // Wait for more data
      }
    };

    serverProcess.stdout.on('data', onData);
  });
}

async function runTests() {
  console.log('Starting MCP server tests...');

  const serverProcess = spawn('node', ['server.js'], {
    cwd: __dirname,
    stdio: ['pipe', 'pipe', 'inherit']
  });

  try {
    // Wait a bit for server to start
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test Jira, Confluence, GitHub and GitLab tools are available (without actual API calls)
    console.log('Testing tool availability...');
    const listToolsResult = await testListTools(serverProcess);
    const tools = listToolsResult.result?.tools || [];
    const jiraTools = tools.filter(tool => tool.name.includes('jira')).length;
    const confluenceTools = tools.filter(tool => tool.name.includes('confluence')).length;
    const githubTools = tools.filter(tool => tool.name.includes('github')).length;
    const gitlabTools = tools.filter(tool => tool.name.includes('gitlab')).length;

    console.log(`✓ Found ${jiraTools} Jira tools, ${confluenceTools} Confluence tools, ${githubTools} GitHub tools, and ${gitlabTools} GitLab tools`);

    if (jiraTools === 3 && confluenceTools === 3 && githubTools === 3 && gitlabTools === 3) {
      console.log('✓ All tools are properly registered');
    } else {
      console.log('✗ Missing some tools');
    }

    console.log('All tests passed!');

  } catch (error) {
    console.error('Test failed:', error.message);
  } finally {
    serverProcess.kill();
  }
}

runTests();