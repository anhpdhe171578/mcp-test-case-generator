#!/usr/bin/env node

import { spawn } from 'child_process';

// Test new file reading tools
const serverProcess = spawn('node', ['index.js'], {
  cwd: process.cwd(),
  stdio: ['pipe', 'pipe', 'inherit']
});

console.log('Testing enhanced MCP server with file reading capabilities...\n');

// Test 1: List tools
const listToolsRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/list',
  params: {}
};

serverProcess.stdin.write(JSON.stringify(listToolsRequest) + '\n');

let responseData = '';
let currentTest = 1;

serverProcess.stdout.on('data', (data) => {
  responseData += data.toString();
  
  try {
    const lines = responseData.trim().split('\n');
    for (const line of lines) {
      if (line.trim()) {
        const response = JSON.parse(line);
        
        if (currentTest === 1 && response.result && response.result.tools) {
          console.log('✅ Test 1: Tools List');
          console.log('Available tools:');
          response.result.tools.forEach(tool => {
            console.log(`  - ${tool.name}: ${tool.description}`);
          });
          
          // Test 2: Scan directory
          currentTest = 2;
          const scanRequest = {
            jsonrpc: '2.0',
            id: 2,
            method: 'tools/call',
            params: {
              name: 'scan_requirement_directory',
              arguments: {
                directory_path: '.'
              }
            }
          };
          
          console.log('\n📁 Test 2: Scanning directory for requirement files...');
          serverProcess.stdin.write(JSON.stringify(scanRequest) + '\n');
          responseData = '';
          
        } else if (currentTest === 2 && response.result && response.result.content) {
          const scanResult = JSON.parse(response.result.content[0].text);
          console.log('Scan result:');
          console.log(`- Total files: ${scanResult.total_files}`);
          scanResult.files.forEach(file => {
            console.log(`  - ${file.name} (${file.extension}, ${file.size} bytes)`);
          });
          
          // Test 3: Read requirement file
          currentTest = 3;
          const readRequest = {
            jsonrpc: '2.0',
            id: 3,
            method: 'tools/call',
            params: {
              name: 'read_requirement_file',
              arguments: {
                file_path: 'sample-requirements.md'
              }
            }
          };
          
          console.log('\n📄 Test 3: Reading requirement file...');
          serverProcess.stdin.write(JSON.stringify(readRequest) + '\n');
          responseData = '';
          
        } else if (currentTest === 3 && response.result && response.result.content) {
          const readResult = JSON.parse(response.result.content[0].text);
          console.log('File read result:');
          console.log(`- Path: ${readResult.path}`);
          console.log(`- Type: ${readResult.type}`);
          console.log(`- Extension: ${readResult.extension}`);
          console.log(`- Size: ${readResult.size} bytes`);
          console.log(`- Content preview: ${readResult.content.substring(0, 100)}...`);
          
          // Test 4: Generate test cases from file
          currentTest = 4;
          const generateRequest = {
            jsonrpc: '2.0',
            id: 4,
            method: 'tools/call',
            params: {
              name: 'generate_test_cases_from_file',
              arguments: {
                file_path: 'sample-requirements.md'
              }
            }
          };
          
          console.log('\n🎯 Test 4: Generating test cases from file...');
          serverProcess.stdin.write(JSON.stringify(generateRequest) + '\n');
          responseData = '';
          
        } else if (currentTest === 4 && response.result && response.result.content) {
          const generateResult = JSON.parse(response.result.content[0].text);
          console.log('✅ Test Case Generation Successful!');
          console.log('\n📊 Summary:');
          console.log(`- File Type: ${generateResult.file_info.type}`);
          console.log(`- Input Type: ${generateResult.input_type}`);
          console.log(`- Total Cases: ${generateResult.summary.total_cases}`);
          console.log(`- Positive: ${generateResult.summary.by_section.positive}`);
          console.log(`- Negative: ${generateResult.summary.by_section.negative}`);
          console.log(`- Boundary: ${generateResult.summary.by_section.boundary}`);
          console.log(`- Edge: ${generateResult.summary.by_section.edge}`);
          
          console.log('\n🎉 All tests completed successfully!');
          console.log('🚀 MCP Server with file reading is ready!');
          
          serverProcess.kill();
          process.exit(0);
        }
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
}, 15000);
