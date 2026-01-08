#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

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

// Tool definitions
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'generate_test_cases',
        description: 'Generate comprehensive test cases from requirements, user stories, or API specs',
        inputSchema: {
          type: 'object',
          properties: {
            input: {
              type: ['string', 'object'],
              description: 'Input can be: User Story text, API spec object, or raw requirement text'
            }
          },
          required: ['input']
        }
      }
    ]
  };
});

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
      
      // Step 4: Return structured output
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
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

  throw new Error(`Unknown tool: ${name}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Test Case Generator MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});