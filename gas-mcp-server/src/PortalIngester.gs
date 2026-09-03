/**
 * PortalIngester.gs - Multi-Child School Portal Cloud Scraping Engine
 * Executes autonomous HTTP scraping every 6 hours via UrlFetchApp in the parent's account.
 * Maintains child-scoped security payloads, per-domain storage, and graceful session expiry detection.
 */
var PortalIngester = {
  syncAll: function() {
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(30000)) return { status: 'locked' };

    try {
      McpLogger.log('INFO', 'PORTAL_CRON_START', 'Executing 6-hour autonomous portal sync for all children');
      var props = PropertiesService.getScriptProperties();
      var rawRegistry = props.getProperty('multi_child_portal_registry');
      if (!rawRegistry) {
        McpLogger.log('INFO', 'PORTAL_CRON_EMPTY', 'No registered school portals found in registry.');
        return { status: 'empty' };
      }

      var registry = JSON.parse(rawRegistry);
      var children = registry.children || [];
      var results = [];

      for (var c = 0; c < children.length; c++) {
        var child = children[c];
        try {
          var childRes = this.syncChild(child);
          results.push(childRes);
        } catch (childErr) {
          McpLogger.log('ERROR', 'PORTAL_CHILD_ERROR', 'Portal sync error for ' + child.kidName + ': ' + childErr);
        }
      }

      return { status: 'complete', results: results };
    } finally {
      lock.releaseLock();
    }
  },

  syncChild: function(child) {
    var childFolder = DriveApp.getFolderById(child.portalFolderId);
    var portalsFolder = this.getOrCreateSubfolder(childFolder, 'portals');
    var domains = child.domains || {};
    var domainKeys = Object.keys(domains);

    var statuses = [];

    for (var d = 0; d < domainKeys.length; d++) {
      var dom = domainKeys[d];
      var domConfig = domains[dom];
      var domFolder = this.getOrCreateSubfolder(portalsFolder, dom);
      var attachFolder = this.getOrCreateSubfolder(domFolder, 'attachments');

      var cookies = (domConfig.security_payload && domConfig.security_payload.cookies) ? domConfig.security_payload.cookies : '';
      var features = domConfig.features || [];
      var capturedFeatures = [];
      var isExpired = false;

      for (var f = 0; f < features.length; f++) {
        var feat = features[f];
        try {
          var fetchRes = UrlFetchApp.fetch(feat.endpoint, {
            headers: {
              'Cookie': cookies,
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            followRedirects: false,
            muteHttpExceptions: true
          });

          var code = fetchRes.getResponseCode();
          var body = fetchRes.getContentText();

          if (code === 401 || code === 403 || (code >= 300 && code < 400) || body.includes('password') && body.includes('login')) {
            isExpired = true;
            break;
          }

          capturedFeatures.push({
            name: feat.name,
            endpoint: feat.endpoint,
            lastFetched: new Date().toISOString(),
            htmlSnippet: body.substring(0, 1500)
          });
        } catch (fErr) {
          McpLogger.log('WARN', 'PORTAL_FEATURE_FETCH_WARN', 'Could not fetch feature ' + feat.name + ' for ' + child.kidName + ': ' + fErr);
        }
      }

      var domStatus = {
        childId: child.childId,
        kidName: child.kidName,
        domain: dom,
        status: isExpired ? 'EXPIRED' : 'ACTIVE',
        lastChecked: new Date().toISOString(),
        message: isExpired ? 'Session expired or redirected to login.' : 'Active and synced.'
      };
      statuses.push(domStatus);

      if (!isExpired) {
        this.saveJsonFile(domFolder, dom + '_data.json', {
          kidName: child.kidName,
          domain: dom,
          lastSyncedAt: new Date().toISOString(),
          features: capturedFeatures
        });
      }
    }

    this.saveJsonFile(portalsFolder, 'portals_status.json', {
      kidName: child.kidName,
      lastUpdated: new Date().toISOString(),
      domains: statuses
    });

    return { kidName: child.kidName, statuses: statuses };
  },

  getOrCreateSubfolder: function(parentFolder, name) {
    var it = parentFolder.getFoldersByName(name);
    if (it.hasNext()) return it.next();
    return parentFolder.createFolder(name);
  },

  saveJsonFile: function(folder, fileName, data) {
    var payload = JSON.stringify(data, null, 2);
    var it = folder.getFilesByName(fileName);
    if (it.hasNext()) {
      var file = it.next();
      file.setContent(payload);
      return file;
    }
    return folder.createFile(fileName, payload, 'application/json');
  }
};
