# Test Case Generator MCP Server

## Installation & Usage Guide

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Claude Desktop

Add to your Claude Desktop config file (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "test-case-generator": {
      "command": "node",
      "args": ["C:\\Users\\ACER PRENDATOR\\AppData\\Local\\Programs\\Windsurf\\mcp-test-case-generator\\index.js"]
    }
  }
}
```

### 3. Restart Claude Desktop

### 4. Start Using

Ask Claude: "Generate test cases for login functionality"

The server will automatically detect input type and generate comprehensive test cases.

## Quick Test Examples

### User Story Input
```
As a user I want to login so that I can access dashboard
```

### API Spec Input
```json
{
  "endpoint": "/login",
  "method": "POST",
  "request": {
    "username": "string",
    "password": "string"
  }
}
```

### Raw Text Input
```
Login functionality with username and password validation
```

All inputs generate structured test cases ready for TestRail/Jira/Xray.
