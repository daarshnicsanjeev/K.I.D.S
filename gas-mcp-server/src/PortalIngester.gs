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
      var props = PropertiesService.getScriptProperties();
      var rawRegistry = props.getProperty('multi_child_portal_registry');
      if (!rawRegistry) {
        return { status: 'empty', reason: 'No registered school portals found in registry.' };
      }

      var registry;
      try {
        registry = JSON.parse(rawRegistry);
      } catch (parseErr) {
        return { status: 'error', reason: 'Invalid portal registry JSON' };
      }

      var children = registry.children || [];
      if (!children || children.length === 0) {
        return { status: 'empty', reason: 'No children configured with portals yet.' };
      }

      var hasAnyActiveDomains = false;
      for (var i = 0; i < children.length; i++) {
        if (children[i].domains && Object.keys(children[i].domains).length > 0) {
          hasAnyActiveDomains = true;
          break;
        }
      }
      if (!hasAnyActiveDomains) {
        return { status: 'empty', reason: 'No active portal domains registered yet.' };
      }

      McpLogger.log('INFO', 'PORTAL_CRON_START', 'Executing 6-hour autonomous portal sync for all children');
      var results = [];

      for (var c = 0; c < children.length; c++) {
        var child = children[c];
        try {
          var childRes = this.syncChild(child);
          if (childRes) results.push(childRes);
        } catch (childErr) {
          McpLogger.log('ERROR', 'PORTAL_CHILD_ERROR', 'Portal sync error for ' + (child.kidName || 'Child') + ': ' + childErr);
        }
      }

      return { status: 'complete', results: results };
    } finally {
      lock.releaseLock();
    }
  },

  syncChild: function(child) {
    if (!child || !child.portalFolderId) return null;
    var childFolder;
    try {
      childFolder = DriveApp.getFolderById(child.portalFolderId);
      if (!childFolder || childFolder.isTrashed()) return null;
    } catch (fErr) {
      return null;
    }

    var portalsFolder = this.getOrCreateSubfolder(childFolder, 'portals');
    var domains = child.domains || {};
    var domainKeys = Object.keys(domains);
    if (domainKeys.length === 0) return null;

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
