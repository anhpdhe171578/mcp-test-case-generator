#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { readFile, readdir, stat, writeFile } from 'fs/promises';
import { join, extname } from 'path';
import * as XLSX from 'xlsx';

const server = new Server(
  {
    name: 'test-case-generator',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// QA Assumptions for missing requirements
const QA_ASSUMPTIONS = {
  string: {
    maxLength: 255,
    minLength: 1,
    invalidFormats: ['<script>', 'SELECT * FROM', 'javascript:', 'data:'],
  },
  number: {
    min: 0,
    max: 999999,
    invalid: [-1, 999999999],
  },
  email: {
    validFormat: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    invalidFormats: ['invalid', 'test@', '@domain.com', 'test.domain.com'],
  },
  password: {
    minLength: 8,
    requirements: ['uppercase', 'lowercase', 'number', 'special'],
  }
};

// Input Normalization
function normalizeInput(input) {
  try {
    // If already structured, return as-is
    if (typeof input === 'object' && input.type) {
      return input;
    }

    // Try to parse as JSON first
    let parsed;
    if (typeof input === 'string') {
      try {
        parsed = JSON.parse(input);
      } catch {
        parsed = { raw: input };
      }
    } else {
      parsed = input;
    }

    // Detect input type
    if (parsed.endpoint && parsed.method) {
      return {
        type: 'api',
        endpoint: parsed.endpoint,
        method: parsed.method,
        request: parsed.request || parsed.parameters || {},
        response: parsed.response || {}
      };
    }

    if (parsed.user || parsed.story || parsed.as || parsed.iWant || parsed.soThat) {
      return {
        type: 'user_story',
        content: typeof parsed === 'string' ? parsed : 
                 parsed.userStory || parsed.story || parsed.content || JSON.stringify(parsed)
      };
    }

    // Default to raw text
    return {
      type: 'raw_text',
      content: typeof parsed === 'string' ? parsed : JSON.stringify(parsed)
    };

  } catch (error) {
    return {
      type: 'raw_text',
      content: String(input)
    };
  }
}

// Generate test cases based on input type
function generateTestCases(normalizedInput) {
  const baseId = generateBaseId(normalizedInput);
  
  switch (normalizedInput.type) {
    case 'api':
      return generateApiTestCases(normalizedInput, baseId);
    case 'user_story':
      return generateUserStoryTestCases(normalizedInput, baseId);
    case 'raw_text':
      return generateRawTextTestCases(normalizedInput, baseId);
    default:
      throw new Error(`Unsupported input type: ${normalizedInput.type}`);
  }
}

function generateBaseId(input) {
  if (input.type === 'api') {
    return `TC_${input.endpoint.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`;
  }
  
  // Extract key words from content for ID
  const content = input.content || '';
  const words = content.match(/\b\w{3,}\b/g) || [];
  const keyWords = words.slice(0, 3).map(w => w.toUpperCase());
  return `TC_${keyWords.join('_')}` || 'TC_GENERIC';
}

function generateApiTestCases(apiInput, baseId) {
  const endpoint = apiInput.endpoint;
  const method = apiInput.method;
  const request = apiInput.request || {};
  
  const testCases = {
    positive: [],
    negative: [],
    boundary: [],
    edge: []
  };

  // Positive Test Cases
  testCases.positive.push({
    id: `${baseId}_POS_001`,
    title: `${method} ${endpoint} with valid request`,
    type: 'positive',
    precondition: `API endpoint ${endpoint} is available and accessible`,
    steps: [
      `Prepare valid request data for ${endpoint}`,
      `Send ${method} request to ${endpoint}`,
      `Verify response status is 200`,
      `Verify response structure matches expected format`
    ],
    expected_result: `API returns 200 status with valid response data`,
    test_data: request,
    priority: 'High'
  });

  // Negative Test Cases
  testCases.negative.push({
    id: `${baseId}_NEG_001`,
    title: `${method} ${endpoint} with missing required fields`,
    type: 'negative',
    precondition: `API endpoint ${endpoint} is available`,
    steps: [
      `Send ${method} request to ${endpoint} without required fields`,
      `Verify response status is 400`,
      `Verify error message indicates missing required fields`
    ],
    expected_result: `API returns 400 status with validation error`,
    test_data: {},
    priority: 'High'
  });

  testCases.negative.push({
    id: `${baseId}_NEG_002`,
    title: `${method} ${endpoint} with invalid data format`,
    type: 'negative',
    precondition: `API endpoint ${endpoint} is available`,
    steps: [
      `Send ${method} request to ${endpoint} with invalid data types`,
      `Verify response status is 400`,
      `Verify error message indicates invalid format`
    ],
    expected_result: `API returns 400 status with format validation error`,
    test_data: getInvalidTestData(request),
    priority: 'Medium'
  });

  // Boundary Test Cases
  testCases.boundary.push({
    id: `${baseId}_BND_001`,
    title: `${method} ${endpoint} with maximum length values`,
    type: 'boundary',
    precondition: `API endpoint ${endpoint} is available`,
    steps: [
      `Send ${method} request to ${endpoint} with max length string values`,
      `Verify response status is 200`,
      `Verify data is processed correctly`
    ],
    expected_result: `API processes max length values successfully`,
    test_data: getBoundaryTestData(request, 'max'),
    priority: 'Medium'
  });

  testCases.boundary.push({
    id: `${baseId}_BND_002`,
    title: `${method} ${endpoint} with minimum length values`,
    type: 'boundary',
    precondition: `API endpoint ${endpoint} is available`,
    steps: [
      `Send ${method} request to ${endpoint} with min length values`,
      `Verify response status is 200`,
      `Verify data is processed correctly`
    ],
    expected_result: `API processes min length values successfully`,
    test_data: getBoundaryTestData(request, 'min'),
    priority: 'Medium'
  });

  // Edge Test Cases
  testCases.edge.push({
    id: `${baseId}_EDGE_001`,
    title: `${method} ${endpoint} with null values`,
    type: 'edge',
    precondition: `API endpoint ${endpoint} is available`,
    steps: [
      `Send ${method} request to ${endpoint} with null values for optional fields`,
      `Verify response status is 200`,
      `Verify null values are handled appropriately`
    ],
    expected_result: `API handles null values without errors`,
    test_data: getEdgeTestData(request, 'null'),
    priority: 'Low'
  });

  testCases.edge.push({
    id: `${baseId}_EDGE_002`,
    title: `${method} ${endpoint} with special characters`,
    type: 'edge',
    precondition: `API endpoint ${endpoint} is available`,
    steps: [
      `Send ${method} request to ${endpoint} with special characters`,
      `Verify response status is 200`,
      `Verify special characters are processed correctly`
    ],
    expected_result: `API handles special characters appropriately`,
    test_data: getEdgeTestData(request, 'special'),
    priority: 'Low'
  });

  return testCases;
}

function generateUserStoryTestCases(storyInput, baseId) {
  const content = storyInput.content;
  const testCases = {
    positive: [],
    negative: [],
    boundary: [],
    edge: []
  };

  // Extract main action from user story
  const mainAction = extractMainAction(content);

  // Positive Test Cases
  testCases.positive.push({
    id: `${baseId}_POS_001`,
    title: `Happy path - ${mainAction}`,
    type: 'positive',
    precondition: 'User has valid credentials and necessary permissions',
    steps: [
      'Navigate to the relevant page',
      `Perform ${mainAction} with valid data`,
      'Verify the action completes successfully',
      'Verify expected outcome is achieved'
    ],
    expected_result: `User can ${mainAction} and see expected result`,
    test_data: { scenario: 'happy_path' },
    priority: 'High'
  });

  // Negative Test Cases
  testCases.negative.push({
    id: `${baseId}_NEG_001`,
    title: `Invalid input - ${mainAction}`,
    type: 'negative',
    precondition: 'User is on the relevant page',
    steps: [
      'Enter invalid or missing required information',
      'Attempt to complete the action',
      'Verify validation error messages appear',
      'Verify action cannot be completed'
    ],
    expected_result: 'System displays appropriate error messages and prevents invalid action',
    test_data: { scenario: 'invalid_input' },
    priority: 'High'
  });

  // Boundary Test Cases
  testCases.boundary.push({
    id: `${baseId}_BND_001`,
    title: `Maximum limits - ${mainAction}`,
    type: 'boundary',
    precondition: 'User is on the relevant page',
    steps: [
      'Enter data at maximum allowed limits',
      'Attempt to complete the action',
      'Verify system handles maximum limits correctly',
      'Verify action completes or shows appropriate limit message'
    ],
    expected_result: 'System handles maximum boundary values appropriately',
    test_data: { scenario: 'max_limits' },
    priority: 'Medium'
  });

  // Edge Test Cases
  testCases.edge.push({
    id: `${baseId}_EDGE_001`,
    title: `Concurrent access - ${mainAction}`,
    type: 'edge',
    precondition: 'Multiple users have access to the system',
    steps: [
      'Multiple users attempt the same action simultaneously',
      'Verify system handles concurrent requests',
      'Verify data integrity is maintained',
      'Verify all users receive appropriate responses'
    ],
    expected_result: 'System maintains data integrity under concurrent access',
    test_data: { scenario: 'concurrent_access' },
    priority: 'Low'
  });

  return testCases;
}

function generateRawTextTestCases(textInput, baseId) {
  const content = textInput.content;
  const testCases = {
    positive: [],
    negative: [],
    boundary: [],
    edge: []
  };

  const mainFeature = extractMainFeature(content);

  // Generate generic test cases based on content analysis
  testCases.positive.push({
    id: `${baseId}_POS_001`,
    title: `Basic functionality - ${mainFeature}`,
    type: 'positive',
    precondition: 'System is available and user has necessary access',
    steps: [
      'Access the feature/function',
      'Perform basic operation with valid inputs',
      'Verify the operation completes successfully',
      'Verify expected output is displayed'
    ],
    expected_result: 'Feature works correctly with valid inputs',
    test_data: { scenario: 'basic_functionality' },
    priority: 'High'
  });

  testCases.negative.push({
    id: `${baseId}_NEG_001`,
    title: `Error handling - ${mainFeature}`,
    type: 'negative',
    precondition: 'User is accessing the feature',
    steps: [
      'Provide invalid or missing inputs',
      'Attempt to execute the operation',
      'Verify appropriate error messages are shown',
      'Verify system remains stable'
    ],
    expected_result: 'System handles errors gracefully with clear error messages',
    test_data: { scenario: 'error_handling' },
    priority: 'High'
  });

  testCases.boundary.push({
    id: `${baseId}_BND_001`,
    title: `Limit testing - ${mainFeature}`,
    type: 'boundary',
    precondition: 'User is accessing the feature',
    steps: [
      'Test with minimum allowed values',
      'Test with maximum allowed values',
      'Verify system behavior at boundaries',
      'Verify no crashes or unexpected behavior'
    ],
    expected_result: 'System behaves correctly at boundary values',
    test_data: { scenario: 'boundary_testing' },
    priority: 'Medium'
  });

  testCases.edge.push({
    id: `${baseId}_EDGE_001`,
    title: `Stress testing - ${mainFeature}`,
    type: 'edge',
    precondition: 'System is under normal load',
    steps: [
      'Execute multiple operations rapidly',
      'Verify system response time',
      'Verify system stability under load',
      'Verify data integrity is maintained'
    ],
    expected_result: 'System maintains performance and stability under stress',
    test_data: { scenario: 'stress_testing' },
    priority: 'Low'
  });

  return testCases;
}

// Helper functions
function extractMainAction(content) {
  const actionWords = ['login', 'register', 'create', 'update', 'delete', 'submit', 'save', 'search', 'view', 'access'];
  const lowerContent = content.toLowerCase();
  
  for (const word of actionWords) {
    if (lowerContent.includes(word)) {
      return word;
    }
  }
  return 'perform action';
}

function extractMainFeature(content) {
  const featureWords = ['authentication', 'authorization', 'validation', 'processing', 'display', 'storage', 'communication'];
  const lowerContent = content.toLowerCase();
  
  for (const word of featureWords) {
    if (lowerContent.includes(word)) {
      return word;
    }
  }
  return 'feature';
}

function getInvalidTestData(request) {
  const invalid = {};
  for (const [key, value] of Object.entries(request)) {
    if (typeof value === 'string') {
      invalid[key] = 123; // Wrong type
    } else if (typeof value === 'number') {
      invalid[key] = 'not_a_number';
    } else if (typeof value === 'boolean') {
      invalid[key] = 'not_a_boolean';
    }
  }
  return invalid;
}

function getBoundaryTestData(request, type) {
  const boundary = {};
  for (const [key, value] of Object.entries(request)) {
    if (typeof value === 'string') {
      boundary[key] = type === 'max' ? 'a'.repeat(QA_ASSUMPTIONS.string.maxLength) : 'a';
    } else if (typeof value === 'number') {
      boundary[key] = type === 'max' ? QA_ASSUMPTIONS.number.max : QA_ASSUMPTIONS.number.min;
    }
  }
  return boundary;
}

function getEdgeTestData(request, type) {
  const edge = {};
  for (const [key, value] of Object.entries(request)) {
    if (type === 'null') {
      edge[key] = null;
    } else if (type === 'special') {
      edge[key] = typeof value === 'string' ? '!@#$%^&*()_+-=[]{}|;:,.<>?' : value;
    }
  }
  return edge;
}

// Output validation
function validateOutput(testCases) {
  const requiredSections = ['positive', 'negative', 'boundary', 'edge'];
  const requiredFields = ['id', 'title', 'type', 'precondition', 'steps', 'expected_result', 'test_data', 'priority'];
  
  const errors = [];
  
  // Check all sections exist
  for (const section of requiredSections) {
    if (!testCases[section] || !Array.isArray(testCases[section])) {
      errors.push(`Missing or invalid section: ${section}`);
    } else if (testCases[section].length < 3) {
      errors.push(`Section ${section} has less than 3 test cases`);
    }
  }
  
  // Check each test case has required fields
  for (const [section, cases] of Object.entries(testCases)) {
    if (Array.isArray(cases)) {
      for (const [index, testCase] of cases.entries()) {
        for (const field of requiredFields) {
          if (!(field in testCase)) {
            errors.push(`Section ${section}, case ${index + 1}: Missing field ${field}`);
          }
        }
        
        // Check steps are not empty
        if (!testCase.steps || testCase.steps.length === 0) {
          errors.push(`Section ${section}, case ${index + 1}: Steps array is empty`);
        }
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// File reading functions
async function readRequirementFile(filePath) {
  try {
    const absolutePath = resolvePath(filePath);
    const stats = await stat(absolutePath);
    
    if (!stats.isFile()) {
      throw new Error(`Path is not a file: ${absolutePath}`);
    }
    
    const content = await readFile(absolutePath, 'utf-8');
    const ext = extname(absolutePath).toLowerCase();
    
    return {
      success: true,
      path: absolutePath,
      extension: ext,
      size: stats.size,
      content: content,
      type: detectFileType(ext, content)
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      path: filePath
    };
  }
}

function resolvePath(filePath) {
  // Handle relative and absolute paths
  if (filePath.startsWith('/') || /^[A-Za-z]:/.test(filePath)) {
    return filePath;
  }
  
  // Assume relative to current working directory
  return join(process.cwd(), filePath);
}

function detectFileType(extension, content) {
  const ext = extension.toLowerCase();
  
  // Check for common requirement file types
  if (['.md', '.markdown'].includes(ext)) {
    return 'markdown';
  }
  
  if (['.txt', '.text'].includes(ext)) {
    return 'text';
  }
  
  if (['.json'].includes(ext)) {
    return 'json';
  }
  
  if (['.yml', '.yaml'].includes(ext)) {
    return 'yaml';
  }
  
  if (['.doc', '.docx'].includes(ext)) {
    return 'word';
  }
  
  if (['.pdf'].includes(ext)) {
    return 'pdf';
  }
  
  // Try to detect by content
  if (content.includes('As a') && content.includes('I want') && content.includes('So that')) {
    return 'user_story';
  }
  
  if (content.includes('endpoint') || content.includes('method') || content.includes('request')) {
    return 'api_spec';
  }
  
  return 'unknown';
}

async function scanRequirementDirectory(directoryPath, options = {}) {
  try {
    const absolutePath = resolvePath(directoryPath);
    const stats = await stat(absolutePath);
    
    if (!stats.isDirectory()) {
      throw new Error(`Path is not a directory: ${absolutePath}`);
    }
    
    const files = await readdir(absolutePath);
    const result = {
      success: true,
      path: absolutePath,
      files: [],
      total_files: 0
    };
    
    const supportedExtensions = options.extensions || [
      '.md', '.txt', '.json', '.yml', '.yaml', '.doc', '.docx', '.pdf'
    ];
    
    for (const file of files) {
      const filePath = join(absolutePath, file);
      const fileStats = await stat(filePath);
      
      if (fileStats.isFile()) {
        const ext = extname(filePath).toLowerCase();
        
        if (supportedExtensions.includes(ext)) {
          result.files.push({
            name: file,
            path: filePath,
            extension: ext,
            size: fileStats.size,
            modified: fileStats.mtime
          });
        }
      }
    }
    
    result.total_files = result.files.length;
    return result;
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
      path: directoryPath
    };
  }
}

// Tool definitions
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'generate_test_cases',
        description: 'Generate comprehensive test cases from requirements, user stories, or API specs (with auto Excel export)',
        inputSchema: {
          type: 'object',
          properties: {
            input: {
              type: ['string', 'object'],
              description: 'Input can be: User Story text, API spec object, or raw requirement text'
            },
            auto_export_excel: {
              type: 'boolean',
              description: 'Automatically export test cases to Excel file (default: true)',
              default: true
            },
            excel_path: {
              type: 'string',
              description: 'Excel file output path (default: ./test-cases-auto.xlsx)',
              default: './test-cases-auto.xlsx'
            }
          },
          required: ['input']
        }
      },
      {
        name: 'read_requirement_file',
        description: 'Read requirement file from local filesystem (supports .md, .txt, .json, .yml, .yaml, .doc, .docx, .pdf)',
        inputSchema: {
          type: 'object',
          properties: {
            file_path: {
              type: 'string',
              description: 'Path to requirement file (relative or absolute)'
            }
          },
          required: ['file_path']
        }
      },
      {
        name: 'scan_requirement_directory',
        description: 'Scan directory for requirement files and list them',
        inputSchema: {
          type: 'object',
          properties: {
            directory_path: {
              type: 'string',
              description: 'Path to directory containing requirement files'
            },
            extensions: {
              type: 'array',
              items: { type: 'string' },
              description: 'File extensions to scan for (default: .md, .txt, .json, .yml, .yaml, .doc, .docx, .pdf)',
              default: ['.md', '.txt', '.json', '.yml', '.yaml', '.doc', '.docx', '.pdf']
            }
          },
          required: ['directory_path']
        }
      },
      {
        name: 'generate_test_cases_from_file',
        description: 'Read requirement file and generate test cases from its content',
        inputSchema: {
          type: 'object',
          properties: {
            file_path: {
              type: 'string',
              description: 'Path to requirement file'
            }
          },
          required: ['file_path']
        }
      },
      {
        name: 'export_to_excel',
        description: 'Export generated test cases to Excel file (.xlsx format)',
        inputSchema: {
          type: 'object',
          properties: {
            test_cases: {
              type: 'object',
              description: 'Test cases object with positive, negative, boundary, edge arrays'
            },
            output_path: {
              type: 'string',
              description: 'Output Excel file path (e.g., ./test-cases.xlsx)'
            }
          },
          required: ['test_cases', 'output_path']
        }
      },
      {
        name: 'generate_automation_tests',
        description: 'Generate automation test code from test cases (supports Playwright)',
        inputSchema: {
          type: 'object',
          properties: {
            test_cases: {
              type: 'object',
              description: 'Test cases object with positive, negative, boundary, edge arrays'
            },
            framework: {
              type: 'string',
              enum: ['playwright'],
              description: 'Automation framework (currently supports Playwright)',
              default: 'playwright'
            },
            language: {
              type: 'string',
              enum: ['javascript'],
              description: 'Programming language (currently supports JavaScript)',
              default: 'javascript'
            },
            base_url: {
              type: 'string',
              description: 'Base URL for tests (e.g., https://example.com)',
              default: 'https://example.com'
            }
          },
          required: ['test_cases']
        }
      }
    ]
  };
});

// ...
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'generate_test_cases') {
    try {
      // Step 1: Normalize input
      const normalizedInput = normalizeInput(args.input);
      
      // Step 2: Generate test cases
      let testCases = generateTestCases(normalizedInput);
      
      // Step 3: Validate output
      const validation = validateOutput(testCases);
      
      if (!validation.isValid) {
        console.error('Output validation failed:', validation.errors);
        // In a real implementation, you might want to regenerate here
      }
      
      // Step 4: Auto export to Excel (if enabled)
      let excelExport = null;
      const autoExportExcel = args.auto_export_excel !== false; // Default to true
      const excelPath = args.excel_path || './test-cases-auto.xlsx';
      
      if (autoExportExcel) {
        try {
          excelExport = await exportToExcel(testCases, excelPath);
        } catch (excelError) {
          console.error('Excel export failed:', excelError.message);
          excelExport = {
            success: false,
            error: excelError.message
          };
        }
      }
      
      // Step 5: Return structured output
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              input_type: normalizedInput.type,
              validation: validation,
              test_cases: testCases,
              excel_export: excelExport,
              auto_export_enabled: autoExportExcel,
              summary: {
                total_cases: Object.values(testCases).flat().length,
                by_section: {
                  positive: testCases.positive.length,
                  negative: testCases.negative.length,
                  boundary: testCases.boundary.length,
                  edge: testCases.edge.length
                }
              }
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
              details: error.stack
            }, null, 2)
          }
        ]
      };
    }
  }

  if (name === 'read_requirement_file') {
    try {
      const result = await readRequirementFile(args.file_path);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
              details: error.stack
            }, null, 2)
          }
        ]
      };
    }
  }

  if (name === 'scan_requirement_directory') {
    try {
      const result = await scanRequirementDirectory(args.directory_path, {
        extensions: args.extensions
      });
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
              details: error.stack
            }, null, 2)
          }
        ]
      };
    }
  }

  if (name === 'generate_test_cases_from_file') {
    try {
      // Step 1: Read the file
      const fileResult = await readRequirementFile(args.file_path);
      
      if (!fileResult.success) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: `Failed to read file: ${fileResult.error}`
              }, null, 2)
            }
          ]
        };
      }
      
      // Step 2: Normalize input from file content
      const normalizedInput = normalizeInput(fileResult.content);
      
      // Step 3: Generate test cases
      let testCases = generateTestCases(normalizedInput);
      
      // Step 4: Validate output
      const validation = validateOutput(testCases);
      
      // Step 5: Return comprehensive result
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              file_info: {
                path: fileResult.path,
                type: fileResult.type,
                extension: fileResult.extension,
                size: fileResult.size
              },
              input_type: normalizedInput.type,
              validation: validation,
              test_cases: testCases,
              summary: {
                total_cases: Object.values(testCases).flat().length,
                by_section: {
                  positive: testCases.positive.length,
                  negative: testCases.negative.length,
                  boundary: testCases.boundary.length,
                  edge: testCases.edge.length
                }
              }
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
              details: error.stack
            }, null, 2)
          }
        ]
      };
    }
  }

  if (name === 'export_to_excel') {
    try {
      const result = await exportToExcel(args.test_cases, args.output_path);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
              details: error.stack
            }, null, 2)
          }
        ]
      };
    }
  }

  if (name === 'generate_automation_tests') {
    try {
      const options = {
        framework: args.framework || 'playwright',
        language: args.language || 'javascript',
        baseUrl: args.base_url || 'https://example.com'
      };
      
      const result = generateAutomationTests(args.test_cases, options);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              framework: result.framework,
              language: result.language,
              base_url: result.baseUrl,
              dependencies: result.dependencies,
              setup: result.setup,
              tests: result.tests,
              summary: {
                total_tests: Object.values(result.tests).flat().length,
                by_section: {
                  positive: result.tests.positive ? result.tests.positive.length : 0,
                  negative: result.tests.negative ? result.tests.negative.length : 0,
                  boundary: result.tests.boundary ? result.tests.boundary.length : 0,
                  edge: result.tests.edge ? result.tests.edge.length : 0
                }
              }
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
              details: error.stack
            }, null, 2)
          }
        ]
      };
    }
  }

  throw new Error(`Unknown tool: ${name}`);
});

// Export test cases to Excel
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

// Generate automation test code using Playwright
function generateAutomationTests(testCases, options = {}) {
  const framework = options.framework || 'playwright';
  const language = options.language || 'javascript';
  const baseUrl = options.baseUrl || 'https://example.com';
  
  const automationTests = {
    framework,
    language,
    baseUrl,
    tests: {},
    setup: '',
    dependencies: []
  };

  // Generate setup code based on framework
  if (framework === 'playwright' && language === 'javascript') {
    automationTests.setup = generatePlaywrightSetup();
    automationTests.dependencies = ['@playwright/test'];
  }

  // Generate test code for each section
  const sections = ['positive', 'negative', 'boundary', 'edge'];
  
  sections.forEach(section => {
    if (testCases[section] && Array.isArray(testCases[section])) {
      automationTests.tests[section] = testCases[section].map(testCase => {
        return generateSingleTest(testCase, framework, language, baseUrl);
      });
    }
  });

  return automationTests;
}

// Generate Playwright setup code
function generatePlaywrightSetup() {
  return `// Playwright Test Configuration
import { test, expect } from '@playwright/test';

// Test configuration
const config = {
  baseURL: 'https://example.com',
  timeout: 30000,
  retries: 2
};

// Custom test helpers
const helpers = {
  async login(page, username, password) {
    await page.goto('/login');
    await page.fill('[data-testid="username"]', username);
    await page.fill('[data-testid="password"]', password);
    await page.click('[data-testid="login-button"]');
  },
  
  async verifyToast(page, message) {
    await expect(page.locator('.toast')).toContainText(message);
  },
  
  async waitForDashboard(page) {
    await expect(page.locator('h1')).toContainText('Dashboard');
  }
};`;
}

// Generate single test case code
function generateSingleTest(testCase, framework, language, baseUrl) {
  const { id, title, steps, expected_result, test_data, type } = testCase;
  
  if (framework === 'playwright' && language === 'javascript') {
    return generatePlaywrightTest(id, title, steps, expected_result, test_data, type, baseUrl);
  }
  
  return `// Test generation not implemented for ${framework} with ${language}`;
}

// Generate Playwright test code
function generatePlaywrightTest(id, title, steps, expectedResult, testData, type, baseUrl) {
  const testName = title.replace(/[^a-zA-Z0-9]/g, ' ').trim().replace(/\s+/g, ' ');
  const testFunction = `test('${testName}', async ({ page }) => {`;
  
  let testCode = testFunction + '\n';
  
  // Add precondition comment if available
  if (testCase.precondition) {
    testCode += `  // Precondition: ${testCase.precondition}\n`;
  }
  
  // Generate step code
  if (Array.isArray(steps)) {
    steps.forEach((step, index) => {
      const stepCode = convertStepToPlaywright(step, testData, type);
      if (stepCode) {
        testCode += `  // Step ${index + 1}: ${step}\n`;
        testCode += `  ${stepCode}\n\n`;
      }
    });
  }
  
  // Add expectation
  const expectationCode = convertExpectationToPlaywright(expectedResult, type);
  if (expectationCode) {
    testCode += `  // Expected Result: ${expectedResult}\n`;
    testCode += `  ${expectationCode}\n`;
  }
  
  testCode += '});';
  
  return testCode;
}

// Convert test step to Playwright code
function convertStepToPlaywright(step, testData, testType) {
  const stepLower = step.toLowerCase();
  
  // Login steps
  if (stepLower.includes('login') || stepLower.includes('enter username') || stepLower.includes('enter password')) {
    if (testData && testData.username && testData.password) {
      return `await helpers.login(page, '${testData.username}', '${testData.password}');`;
    }
  }
  
  // Navigation steps
  if (stepLower.includes('open') || stepLower.includes('navigate') || stepLower.includes('go to')) {
    const match = step.match(/(?:open|navigate|go to)\s+(.+?)(?:\s+page|$)/i);
    if (match) {
      const pageName = match[1].toLowerCase().trim();
      const path = pageName === 'login' ? '/login' : pageName === 'dashboard' ? '/dashboard' : `/${pageName}`;
      return `await page.goto('${path}');`;
    }
  }
  
  // Click steps
  if (stepLower.includes('click')) {
    const match = step.match(/click\s+(.+?)(?:\s+button|$)/i);
    if (match) {
      const buttonName = match[1].toLowerCase().trim();
      return `await page.click('[data-testid="${buttonName}-button"]');`;
    }
  }
  
  // Fill/Enter steps
  if (stepLower.includes('enter') || stepLower.includes('fill') || stepLower.includes('type')) {
    const match = step.match(/(?:enter|fill|type)\s+(.+?)\s+(?:in|into)?\s*(.+?)(?:\s+field|$)/i);
    if (match) {
      const value = match[1];
      const fieldName = match[2].toLowerCase().trim();
      
      // Handle test data substitution
      let actualValue = value;
      if (testData) {
        Object.keys(testData).forEach(key => {
          if (value.toLowerCase().includes(key)) {
            actualValue = testData[key];
          }
        });
      }
      
      return `await page.fill('[data-testid="${fieldName}"]', '${actualValue}');`;
    }
  }
  
  // Verify steps
  if (stepLower.includes('verify') || stepLower.includes('check')) {
    const match = step.match(/(?:verify|check)\s+(.+?)(?:\s+is|exists|displays)?/i);
    if (match) {
      const element = match[1].toLowerCase().trim();
      return `await expect(page.locator('[data-testid="${element}"]')).toBeVisible();`;
    }
  }
  
  // Default step
  return `// TODO: Implement step - ${step}`;
}

// Convert expected result to Playwright assertion
function convertExpectationToPlaywright(expectedResult, testType) {
  const resultLower = expectedResult.toLowerCase();
  
  // Success cases
  if (resultLower.includes('redirect') || resultLower.includes('dashboard')) {
    return `await helpers.waitForDashboard(page);`;
  }
  
  if (resultLower.includes('success') || resultLower.includes('200')) {
    return `await expect(page.locator('.success-message')).toBeVisible();`;
  }
  
  // Error cases
  if (resultLower.includes('error') || resultLower.includes('invalid') || resultLower.includes('400')) {
    return `await expect(page.locator('.error-message')).toBeVisible();`;
  }
  
  if (resultLower.includes('message')) {
    const match = expectedResult.match(/["']([^"']+)["']/);
    if (match) {
      return `await helpers.verifyToast(page, '${match[1]}');`;
    }
  }
  
  // Default expectation
  return `// TODO: Implement expectation - ${expectedResult}`;
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Test Case Generator MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});

// Export functions for testing
export { generateAutomationTests, exportToExcel };