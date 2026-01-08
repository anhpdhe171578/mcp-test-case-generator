#!/usr/bin/env node

import { spawn } from 'child_process';
import { createReadStream, createWriteStream } from 'fs';

// Test MCP server
const serverProcess = spawn('node', ['index.js'], {
  cwd: process.cwd(),
  stdio: ['pipe', 'pipe', 'inherit']
});

// Test request
const testRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/list',
  params: {}
};

console.log('Testing MCP server...');
console.log('Sending request:', JSON.stringify(testRequest, null, 2));

// Send request
serverProcess.stdin.write(JSON.stringify(testRequest) + '\n');

// Collect response
let responseData = '';
serverProcess.stdout.on('data', (data) => {
  responseData += data.toString();
  try {
    const lines = responseData.trim().split('\n');
    for (const line of lines) {
      if (line.trim()) {
        const response = JSON.parse(line);
        console.log('Response:', JSON.stringify(response, null, 2));
        
        if (response.result && response.result.tools) {
          console.log('\n✅ MCP Server working! Available tools:');
          response.result.tools.forEach(tool => {
            console.log(`  - ${tool.name}: ${tool.description}`);
          });
        }
        
        serverProcess.kill();
        process.exit(0);
      }
    }
  } catch (e) {
    // Not complete JSON yet
  }
});

serverProcess.stdout.on('end', () => {
  console.log('Server response ended');
  serverProcess.kill();
});

serverProcess.on('error', (error) => {
  console.error('Server error:', error);
});

setTimeout(() => {
  console.log('Timeout - killing server');
  serverProcess.kill();
  process.exit(1);
}, 5000);
