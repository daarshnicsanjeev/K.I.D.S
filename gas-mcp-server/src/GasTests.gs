/**
 * GasT Framework Unit Tests for Google Apps Script MCP Server
 */
function runGasTests() {
  var testResults = [];

  // Test 1: JSON-RPC tools/list
  try {
    var listRes = handleToolsList();
    if (listRes && listRes.tools && listRes.tools.length >= 3) {
      testResults.push({ name: 'tools/list returns native tools', passed: true });
    } else {
      testResults.push({ name: 'tools/list returns native tools', passed: false, error: 'Expected at least 3 tools' });
    }
  } catch (e) {
    testResults.push({ name: 'tools/list returns native tools', passed: false, error: e.toString() });
  }

  // Test 2: Tool registration
  try {
    var regRes = handleRegisterTool({
      domain: 'test.school.edu',
      feature: 'Homework',
      endpoint_spec: { url: 'https://test.school.edu/api/homework', method: 'GET' },
      auth_spec: { cookies: 'test=123' }
    });

    if (regRes && regRes.registered && regRes.toolName) {
      testResults.push({ name: 'register_mcp_tool succeeds', passed: true, toolName: regRes.toolName });
    } else {
      testResults.push({ name: 'register_mcp_tool succeeds', passed: false, error: 'Invalid response' });
    }
  } catch (e) {
    testResults.push({ name: 'register_mcp_tool succeeds', passed: false, error: e.toString() });
  }

  Logger.log(JSON.stringify(testResults, null, 2));
  return testResults;
}
