# MCP Test Case Generator

MCP Server for generating structured, comprehensive test cases that QA teams can use immediately in TestRail, Jira, Xray, or other test management tools.

## 🎯 Mục tiêu

Tạo test case **chuẩn, có cấu trúc, copy-paste là dùng được** cho tester, không phải dạng mô tả chung chung.

## ✨ Đặc điểm nổi bật

### 🔧 Input chuẩn hóa
Chấp nhận 3 loại input và tự động chuẩn hóa:

1. **User Story** 
   ```json
   "As a user I want to login so that I can access dashboard"
   ```

2. **API Spec**
   ```json
   {
     "endpoint": "/login",
     "method": "POST", 
     "request": {"username": "string", "password": "string"}
   }
   ```

3. **Raw Text**
   ```json
   "Login functionality with username and password validation"
   ```

### 📁 File Reading Capabilities (NEW!)
MCP server giờ có thể đọc trực tiếp từ local filesystem:

#### 5 Tools Available:
1. **`generate_test_cases`** - Generate từ input text/object
2. **`read_requirement_file`** - Đọc file requirement từ local
3. **`scan_requirement_directory`** - Quét thư mục tìm requirement files
4. **`generate_test_cases_from_file`** - Đọc file và generate test cases
5. **`export_to_excel`** - Export test cases sang file Excel (.xlsx) **(NEW!)**

#### Supported File Formats:
- **Markdown** (.md, .markdown)
- **Text** (.txt, .text)
- **JSON** (.json) - API specs, configurations
- **YAML** (.yml, .yaml) - Config files
- **Word** (.doc, .docx) - Requirement documents
- **PDF** (.pdf) - Requirement specifications

### 📋 Output JSON cố định
Mỗi test case có đủ các field bắt buộc:

```json
{
  "id": "TC_LOGIN_001",
  "title": "Login with valid credentials",
  "type": "positive",
  "precondition": "User has valid account",
  "steps": [
    "Open login page",
    "Enter valid username", 
    "Enter valid password",
    "Click Login"
  ],
  "expected_result": "User is redirected to dashboard",
  "test_data": {"username": "valid_user", "password": "valid_pass"},
  "priority": "High"
}
```

### 🎯 4 nhóm test bắt buộc
- **Positive**: Test happy path (tối thiểu 3 test cases)
- **Negative**: Test error handling (tối thiểu 3 test cases) 
- **Boundary**: Test giới hạn (tối thiểu 3 test cases)
- **Edge**: Test trường hợp đặc biệt (tối thiểu 3 test cases)

## 🚀 Cài đặt

```bash
# Clone hoặc download project
cd mcp-test-case-generator

# Install dependencies
npm install

# Start server
npm start
```

## 📖 Cách sử dụng

### 1. Cấu hình MCP Client

Thêm vào MCP client config:

```json
{
  "mcpServers": {
    "test-case-generator": {
      "command": "node",
      "args": ["path/to/mcp-test-case-generator/index.js"]
    }
  }
}
```

### 2. Sử dụng Tools

#### Method 1: Direct Input (Original)
```json
{
  "input": "As a user I want to login so that I can access dashboard"
}
```

#### Method 2: Read from File (NEW!)
```json
{
  "file_path": "requirements/login-user-story.md"
}
```

#### Method 3: Scan Directory (NEW!)
```json
{
  "directory_path": "./requirements",
  "extensions": [".md", ".json", ".txt"]
}
```

#### Method 4: Generate from File (NEW!)
```json
{
  "file_path": "api-specs/login-api.json"
}
```

#### Method 5: Export to Excel (NEW!)
```json
{
  "test_cases": {
    "positive": [...],
    "negative": [...],
    "boundary": [...],
    "edge": [...]
  },
  "output_path": "./test-cases.xlsx"
}
```

### 3. Example Usage in Claude Desktop

```
"Read the login requirements file and generate test cases"
→ MCP sẽ tự động: scan → read → generate

"Scan my requirements directory and list all files"
→ MCP sẽ hiển thị danh sách file có thể xử lý

"Generate test cases from this API spec file: ./api/login.json"
→ MCP sẽ đọc file và generate test cases

"Export the generated test cases to Excel file"
→ MCP sẽ tạo file Excel với format chuẩn

"Generate test cases from requirements and export to Excel"
→ MCP sẽ generate và export trong 1 bước
```

### 4. Output structure

```json
{
  "success": true,
  "file_info": {
    "path": "/path/to/file.md",
    "type": "markdown",
    "extension": ".md",
    "size": 500
  },
  "input_type": "user_story",
  "validation": {
    "isValid": true,
    "errors": []
  },
  "test_cases": {
    "positive": [...],
    "negative": [...], 
    "boundary": [...],
    "edge": [...]
  },
  "summary": {
    "total_cases": 12,
    "by_section": {
      "positive": 3,
      "negative": 3,
      "boundary": 3,
      "edge": 3
    }
  }
}
```

## 🧠 QA Assumptions

Khi requirement không rõ ràng, server tự động áp dụng quy tắc QA chuẩn:

### String fields
- Max length: 255 characters
- Min length: 1 character  
- Invalid formats: `<script>`, SQL injection, etc.

### Number fields
- Min: 0
- Max: 999999
- Invalid: -1, 999999999

### Required fields
- Test với null values
- Test với empty strings
- Test với missing fields

## ✅ Validation

Server tự động validate output:
- Đủ 4 nhóm test
- Mỗi nhóm có tối thiểu 3 test cases
- Đủ các field bắt buộc
- Steps không được trống

Nếu validation fail → server báo lỗi chi tiết.

## 🎯 Best Practices

### Steps writing
- 1 step = 1 action cụ thể
- Dùng verb bắt đầu: "Enter", "Click", "Verify", "Navigate"
- Tránh từ mơ hồ: "successfully", "correctly", "as expected"

### Expected Results  
- 1 expected = 1 kết quả quan sát được
- Dùng measurable language: "User is redirected to", "Error message displays", "Status code is 200"

### Test Data
- Cung cấp data cụ thể cho từng test case
- Boundary tests: min/max values
- Negative tests: invalid data types

## 🔄 Integration

### TestRail
Copy-paste test case vào TestRail với format:
- Title: `test_case.title`
- Type: `test_case.type` 
- Priority: `test_case.priority`
- Precondition: `test_case.precondition`
- Steps: `test_case.steps` (mỗi step = 1 row)
- Expected Result: `test_case.expected_result`
- Test Data: `test_case.test_data`

### Jira/Xray
Tương tự TestRail, có thể import qua CSV format.

### 📊 Excel Export (NEW!)
Export test cases sang file Excel với format chuẩn:

#### Excel Columns:
- **Test Case ID**: Unique identifier (TC_LOGIN_001)
- **Title**: Test case description
- **Type**: positive/negative/boundary/edge
- **Priority**: High/Medium/Low
- **Precondition**: Conditions before test
- **Steps**: Test steps (newline separated)
- **Expected Result**: Expected outcome
- **Test Data**: Test data in JSON format
- **Section**: Test case category

#### Features:
- **Auto column widths** cho readability
- **Structured format** ready for import
- **All 4 test sections** trong 1 sheet
- **JSON test data** preserved
- **Professional formatting**

## 🐛 Troubleshooting

### Common Issues
1. **"Missing required fields"** → Kiểm tra input có đủ thông tin
2. **"Invalid input type"** → Input không phải string/object hợp lệ  
3. **"Validation failed"** → Output không đủ yêu cầu QA
4. **"File not found"** → Kiểm tra path và permissions
5. **"Unsupported file type"** → Check supported formats
6. **"Excel export failed"** → Kiểm tra write permissions và disk space

### Debug Mode
Server logs errors to stderr, check console output.

## 📈 Performance

- Processing time: < 1s cho input thông thường
- Memory usage: < 50MB
- Output size: ~10-50KB JSON
- File reading: < 100ms cho files < 1MB
- **Excel export**: < 500ms cho 50 test cases

## 🤝 Contributing

1. Fork project
2. Create feature branch
3. Add test cases cho new feature
4. Submit PR

## 📄 License

MIT License

---

**Made with ❤️ for QA Teams**

## 🔗 Links

- **GitHub Repository**: https://github.com/anhpdhe171578/mcp-test-case-generator
- **Issues & Feature Requests**: https://github.com/anhpdhe171578/mcp-test-case-generator/issues
