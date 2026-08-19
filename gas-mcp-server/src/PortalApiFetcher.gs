/**
 * PortalApiFetcher - Executes stored portal specifications via UrlFetchApp.
 */
var PortalApiFetcher = {
  fetchPortalData: function (toolSpec) {
    var spec = toolSpec.endpoint_spec;
    var auth = toolSpec.auth_spec || {};

    var options = {
      method: spec.method || 'GET',
      headers: spec.headers || {},
      muteHttpExceptions: true
    };

    if (auth.cookies) {
      options.headers['Cookie'] = auth.cookies;
    }

    if (spec.method !== 'GET' && spec.body) {
      options.payload = spec.body;
    }

    var response = UrlFetchApp.fetch(spec.url, options);
    var code = response.getResponseCode();
    var contentText = response.getContentText();

    if (code !== 200) {
      throw new Error('Portal request returned HTTP status ' + code + ': ' + contentText.substring(0, 200));
    }

    try {
      return JSON.parse(contentText);
    } catch (e) {
      return { raw_content: contentText };
    }
  }
};
