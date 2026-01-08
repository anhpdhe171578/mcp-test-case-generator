#!/usr/bin/env node

import { spawn } from 'child_process';

// Test actual tool execution
const serverProcess = spawn('node', ['index.js'], {
  cwd: process.cwd(),
  stdio: ['pipe', 'pipe', 'inherit']
});

// Test tool call
const testRequest = {
  jsonrpc: '2.0',
  id: 2,
  method: 'tools/call',
  params: {
    name: 'generate_test_cases',
    arguments: {
      input: 'As a user I want to login so that I can access dashboard'
    }
  }
};

console.log('Testing generate_test_cases tool...');
console.log('Input:', testRequest.params.arguments.input);

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
        
        if (response.result && response.result.content) {
          const result = JSON.parse(response.result.content[0].text);
          console.log('\n✅ Test Case Generation Successful!');
          console.log('\n📊 Summary:');
          console.log(`- Input Type: ${result.input_type}`);
          console.log(`- Total Cases: ${result.summary.total_cases}`);
          console.log(`- Positive: ${result.summary.by_section.positive}`);
          console.log(`- Negative: ${result.summary.by_section.negative}`);
          console.log(`- Boundary: ${result.summary.by_section.boundary}`);
          console.log(`- Edge: ${result.summary.by_section.edge}`);
          
          console.log('\n🎯 Sample Test Case (Positive):');
          const positiveCase = result.test_cases.positive[0];
          console.log(`ID: ${positiveCase.id}`);
          console.log(`Title: ${positiveCase.title}`);
          console.log(`Priority: ${positiveCase.priority}`);
          console.log(`Steps: ${positiveCase.steps.length} steps`);
          console.log(`Expected: ${positiveCase.expected_result}`);
          
          console.log('\n✅ MCP Server is ready for Claude Desktop!');
        }
        
        serverProcess.kill();
        process.exit(0);
      }
    }
  } catch (e) {
    // Not complete JSON yet
  }
});

serverProcess.on('error', (error) => {
  console.error('Server error:', error);
});

setTimeout(() => {
  console.log('Timeout - killing server');
  serverProcess.kill();
  process.exit(1);
}, 10000);
