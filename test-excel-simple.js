#!/usr/bin/env node

// Simple test for Excel export functionality
import * as XLSX from 'xlsx';
import { writeFile, stat } from 'fs/promises';

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

// Export function (copied from index.js)
async function exportToExcel(testCases, outputPath) {
  try {
    // Create workbook
    const workbook = XLSX.utils.book_new();
    
    // Prepare data for Excel
    const excelData = [];
    
    // Add header row
    excelData.push([
      'Test Case ID',
      'Title',
      'Type',
      'Priority',
      'Precondition',
      'Steps',
      'Expected Result',
      'Test Data',
      'Section'
    ]);
    
    // Add test cases from all sections
    const sections = ['positive', 'negative', 'boundary', 'edge'];
    
    sections.forEach(section => {
      if (testCases[section] && Array.isArray(testCases[section])) {
        testCases[section].forEach(testCase => {
          excelData.push([
            testCase.id || '',
            testCase.title || '',
            testCase.type || '',
            testCase.priority || '',
            testCase.precondition || '',
            Array.isArray(testCase.steps) ? testCase.steps.join('\n') : (testCase.steps || ''),
            testCase.expected_result || '',
            typeof testCase.test_data === 'object' ? JSON.stringify(testCase.test_data) : (testCase.test_data || ''),
            section.charAt(0).toUpperCase() + section.slice(1)
          ]);
        });
      }
    });
    
    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(excelData);
    
    // Set column widths
    const colWidths = [
      { wch: 15 }, // Test Case ID
      { wch: 40 }, // Title
      { wch: 12 }, // Type
      { wch: 10 }, // Priority
      { wch: 30 }, // Precondition
      { wch: 50 }, // Steps
      { wch: 40 }, // Expected Result
      { wch: 30 }, // Test Data
      { wch: 12 }  // Section
    ];
    worksheet['!cols'] = colWidths;
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Test Cases');
    
    // Write file
    XLSX.writeFile(workbook, outputPath);
    
    return {
      success: true,
      path: outputPath,
      total_cases: excelData.length - 1, // Exclude header
      file_size: await (await stat(outputPath)).size
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
      details: error.stack
    };
  }
}

// Test function
async function testExcelExport() {
  try {
    console.log('🧪 Testing Excel Export functionality...\n');
    
    console.log('📊 Sample test cases prepared:');
    console.log(`   - Positive: ${sampleTestCases.positive.length}`);
    console.log(`   - Negative: ${sampleTestCases.negative.length}`);
    console.log(`   - Boundary: ${sampleTestCases.boundary.length}`);
    console.log(`   - Edge: ${sampleTestCases.edge.length}`);
    console.log(`   - Total: ${Object.values(sampleTestCases).flat().length}\n`);
    
    // Export to Excel
    console.log('📄 Exporting to Excel file...');
    const outputPath = './test-cases-output.xlsx';
    const result = await exportToExcel(sampleTestCases, outputPath);
    
    if (result.success) {
      console.log('✅ Excel export successful!');
      console.log(`📁 File saved to: ${result.path}`);
      console.log(`📏 File size: ${result.file_size} bytes`);
      console.log(`📋 Total test cases in Excel: ${result.total_cases}\n`);
      
      console.log('🎉 Test completed successfully!');
      console.log('💡 You can now open the Excel file to see the formatted test cases.');
      console.log('📋 Excel columns: Test Case ID, Title, Type, Priority, Precondition, Steps, Expected Result, Test Data, Section');
    } else {
      console.error('❌ Excel export failed:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testExcelExport();
