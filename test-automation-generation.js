#!/usr/bin/env node

// Test automation test generation functionality
import { generateAutomationTests } from './index.js';

// Sample test cases data
const sampleTestCases = {
  positive: [
    {
      id: 'TC_LOGIN_001',
      title: 'Login with valid credentials',
      type: 'positive',
      precondition: 'User has valid account',
      steps: ['Open login page', 'Enter valid username', 'Enter valid password', 'Click Login'],
      expected_result: 'User is redirected to dashboard',
      test_data: { username: 'valid_user', password: 'valid_pass' },
      priority: 'High'
    }
  ],
  negative: [
    {
      id: 'TC_LOGIN_002',
      title: 'Login with invalid password',
      type: 'negative',
      precondition: 'User account exists',
      steps: ['Open login page', 'Enter valid username', 'Enter invalid password', 'Click Login'],
      expected_result: 'Error message displays: Invalid credentials',
      test_data: { username: 'valid_user', password: 'invalid_pass' },
      priority: 'High'
    }
  ],
  boundary: [
    {
      id: 'TC_LOGIN_003',
      title: 'Login with maximum length username',
      type: 'boundary',
      precondition: 'User account with max length username exists',
      steps: ['Open login page', 'Enter 255 character username', 'Enter valid password', 'Click Login'],
      expected_result: 'User is redirected to dashboard',
      test_data: { username: 'a'.repeat(255), password: 'valid_pass' },
      priority: 'Medium'
    }
  ],
  edge: [
    {
      id: 'TC_LOGIN_004',
      title: 'Login with special characters in username',
      type: 'edge',
      precondition: 'User account with special characters exists',
      steps: ['Open login page', 'Enter username with special chars', 'Enter valid password', 'Click Login'],
      expected_result: 'User is redirected to dashboard',
      test_data: { username: 'user@domain.com', password: 'valid_pass' },
      priority: 'Medium'
    }
  ]
};

// Test function
async function testAutomationGeneration() {
  try {
    console.log('🤖 Testing Automation Test Generation...\n');
    
    console.log('📊 Sample test cases:');
    console.log(`   - Positive: ${sampleTestCases.positive.length}`);
    console.log(`   - Negative: ${sampleTestCases.negative.length}`);
    console.log(`   - Boundary: ${sampleTestCases.boundary.length}`);
    console.log(`   - Edge: ${sampleTestCases.edge.length}`);
    console.log(`   - Total: ${Object.values(sampleTestCases).flat().length}\n`);
    
    // Test 1: Default options (Playwright + JavaScript)
    console.log('🧪 Test 1: Playwright + JavaScript (default)');
    const result1 = generateAutomationTests(sampleTestCases);
    
    console.log(`✅ Framework: ${result1.framework}`);
    console.log(`✅ Language: ${result1.language}`);
    console.log(`✅ Base URL: ${result1.baseUrl}`);
    console.log(`✅ Dependencies: ${result1.dependencies.join(', ')}`);
    console.log(`✅ Total tests generated: ${Object.values(result1.tests).flat().length}\n`);
    
    // Test 2: Custom options
    console.log('🧪 Test 2: Custom options');
    const customOptions = {
      framework: 'playwright',
      language: 'javascript',
      baseUrl: 'https://myapp.com'
    };
    
    const result2 = generateAutomationTests(sampleTestCases, customOptions);
    
    console.log(`✅ Custom Base URL: ${result2.baseUrl}`);
    console.log(`✅ Setup code length: ${result2.setup.length} characters`);
    
    // Show sample generated test
    console.log('\n📝 Sample Generated Test (Positive):');
    console.log('=' .repeat(50));
    if (result2.tests.positive && result2.tests.positive.length > 0) {
      console.log(result2.tests.positive[0]);
    }
    console.log('=' .repeat(50));
    
    // Show setup code
    console.log('\n⚙️ Setup Code:');
    console.log('=' .repeat(50));
    console.log(result2.setup);
    console.log('=' .repeat(50));
    
    console.log('\n🎉 Automation test generation completed successfully!');
    console.log('💡 Generated code is ready to use with Playwright');
    console.log('📦 Install dependencies: npm install @playwright/test');
    console.log('🚀 Run tests: npx playwright test');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testAutomationGeneration();
