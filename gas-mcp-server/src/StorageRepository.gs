/**
 * StorageRepository - Manages persistent state in UserProperties for the MCP server.
 */
var StorageRepository = {
  getRegisteredTools: function () {
    var props = PropertiesService.getUserProperties();
    var raw = props.getProperty('REGISTERED_PORTAL_TOOLS');
    return raw ? JSON.parse(raw) : [];
  },

  saveTool: function (domain, feature, endpointSpec, authSpec) {
    var tools = this.getRegisteredTools();
    var toolName = ('portal_' + domain + '_' + feature).toLowerCase().replace(/[^a-z0-9_]/g, '_');

    // Remove existing tool with same name if present
    tools = tools.filter(function (t) { return t.name !== toolName; });

    tools.push({
      name: toolName,
      domain: domain,
      feature: feature,
      endpoint_spec: endpointSpec,
      auth_spec: authSpec,
      registeredAt: new Date().toISOString()
    });

    var props = PropertiesService.getUserProperties();
    props.setProperty('REGISTERED_PORTAL_TOOLS', JSON.stringify(tools));
    return toolName;
  }
};
