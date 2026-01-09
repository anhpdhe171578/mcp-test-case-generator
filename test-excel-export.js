#!/usr/bin/env node

import { generateTestCases, exportToExcel } from './index.js';

// Sample test data for testing
const sampleInput = {
  type: 'user_story',
  content: 'As a user I want to login so that I can access dashboard'
};

async function testExcelExport() {
  try {
    console.log('🧪 Testing Excel Export functionality...\n');
    
    // Step 1: Generate test cases
    console.log('📝 Generating test cases from sample input...');
    const testCases = generateTestCases(sampleInput);
    
    console.log('✅ Test cases generated successfully!');
    console.log(`📊 Total test cases: ${Object.values(testCases).flat().length}`);
    console.log(`   - Positive: ${testCases.positive.length}`);
    console.log(`   - Negative: ${testCases.negative.length}`);
    console.log(`   - Boundary: ${testCases.boundary.length}`);
    console.log(`   - Edge: ${testCases.edge.length}\n`);
    
    // Step 2: Export to Excel
    console.log('📄 Exporting to Excel file...');
    const outputPath = './test-cases-output.xlsx';
    const result = await exportToExcel(testCases, outputPath);
    
    if (result.success) {
      console.log('✅ Excel export successful!');
      console.log(`📁 File saved to: ${result.path}`);
      console.log(`📏 File size: ${result.file_size} bytes`);
      console.log(`📋 Total test cases in Excel: ${result.total_cases}\n`);
      
      console.log('🎉 Test completed successfully!');
      console.log('💡 You can now open the Excel file to see the formatted test cases.');
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
