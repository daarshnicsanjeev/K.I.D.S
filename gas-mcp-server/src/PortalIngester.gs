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

      McpLogger.log('INFO', 'PORTAL_CRON_START', 'Executing portal burst sync for all registered children');
      var results = [];

      for (var c = 0; c < children.length; c++) {
        var child = children[c];
        if (!child || !child.childId) continue;
        try {
          var burstRes = this.syncChildBurst(child.childId);
          if (burstRes) results.push(burstRes);
        } catch (childErr) {
          McpLogger.log('ERROR', 'PORTAL_CHILD_ERROR', 'Portal burst sync error for ' + (child.kidName || 'Child') + ': ' + childErr);
        }
      }

      return { status: 'complete', results: results };
    } finally {
      lock.releaseLock();
    }
  },

  /**
   * Burst-Then-Sleep Execution: Processes a batch of features for a child.
   * If features remain: schedules continuation in 10 minutes.
   * If all features complete: schedules next 6-hour cycle.
   */
  syncChildBurst: function(childId) {
    var props = PropertiesService.getScriptProperties();

    // Quiet hours check (11 PM to 6 AM IST)
    var now = new Date();
    var istHour = new Date(now.getTime() + (5.5 * 60 * 60 * 1000)).getUTCHours();
    if (istHour >= 23 || istHour < 6) {
      McpLogger.log('INFO', 'PORTAL_QUIET_HOURS', 'Portal burst paused for quiet hours (11 PM to 6 AM IST). Will resume at 6 AM.');
      return { status: 'quiet_hours_paused', childId: childId };
    }

    var rawRegistry = props.getProperty('multi_child_portal_registry');
    if (!rawRegistry) return null;
    var registry;
    try { registry = JSON.parse(rawRegistry); } catch (e) { return null; }

    var child = (registry.children || []).find(function(c) {
      return c.childId === childId || (c.kidName && c.kidName.toLowerCase() === String(childId).toLowerCase());
    });
    if (!child || !child.portalFolderId) return null;

    var childFolder;
    try {
      childFolder = DriveApp.getFolderById(child.portalFolderId);
      if (!childFolder || childFolder.isTrashed()) return null;
    } catch (fErr) {
      return null;
    }

    // Child-scoped lock for portals
    var pLockKey = 'portal_lock_' + child.childId;
    var nowMs = Date.now();
    var pLockExp = props.getProperty(pLockKey);
    if (pLockExp && nowMs < parseInt(pLockExp, 10)) {
      return { status: 'busy', reason: 'Portal sync already running for child ' + child.childId };
    }
    props.setProperty(pLockKey, (nowMs + 180000).toString()); // 3-min lock

    try {
      var portalsFolder = this.getOrCreateSubfolder(childFolder, 'portals');
      var domains = child.domains || {};
      var domainKeys = Object.keys(domains);
      if (domainKeys.length === 0) return null;

      // Load progress pointer
      var progressKey = 'portal_prog_' + child.childId;
      var rawProg = props.getProperty(progressKey);
      var prog = { domIdx: 0, featIdx: 0 };
      if (rawProg) {
        try { prog = JSON.parse(rawProg); } catch (e) {}
      }

      var BURST_TIME_LIMIT_MS = 90000; // 90 seconds max per 10-minute burst
      var BURST_MAX_FEATURES = 6;     // 6 features max per burst
      var burstStartTime = Date.now();
      var featuresProcessed = 0;
      var hasMore = false;
      var statuses = [];
      var newAttachmentsDownloaded = false;

      for (var d = prog.domIdx; d < domainKeys.length; d++) {
        var dom = domainKeys[d];
        var domConfig = domains[dom];
        var domFolder = this.getOrCreateSubfolder(portalsFolder, dom);
        var attachFolder = this.getOrCreateSubfolder(domFolder, 'attachments');
        var cookies = (domConfig.security_payload && domConfig.security_payload.cookies) ? domConfig.security_payload.cookies : '';
        var features = domConfig.features || [];
        var startFeat = (d === prog.domIdx) ? prog.featIdx : 0;
        var capturedFeatures = [];
        var isExpired = false;

        // Batch index existing attachments to avoid duplicate downloads
        var existingAttMap = {};
        try {
          var attFiles = attachFolder.getFiles();
          while (attFiles.hasNext()) {
            var af = attFiles.next();
            existingAttMap[af.getName().toLowerCase()] = af.getId();
          }
        } catch (e) {}

        // Load existing captured features if resuming
        if (startFeat > 0) {
          var exData = this.readJsonFile(domFolder, 'features_data.json');
          if (exData && exData.features) capturedFeatures = exData.features;
        }

        for (var f = startFeat; f < features.length; f++) {
          // Check time and feature budget
          if ((Date.now() - burstStartTime) > BURST_TIME_LIMIT_MS || featuresProcessed >= BURST_MAX_FEATURES) {
            hasMore = true;
            prog.domIdx = d;
            prog.featIdx = f;
            break;
          }

          var feat = features[f];
          featuresProcessed++;

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

            if (code === 401 || code === 403 || (code >= 300 && code < 400) || (body.includes('password') && body.includes('login'))) {
              isExpired = true;
              break;
            }

            var headers = fetchRes.getHeaders() || {};
            var contentType = (headers['Content-Type'] || headers['content-type'] || '').toLowerCase();
            var contentDisp = (headers['Content-Disposition'] || headers['content-disposition'] || '');

            var isDirectBinary = contentType.indexOf('application/pdf') !== -1 ||
                                 contentType.indexOf('image/') !== -1 ||
                                 contentType.indexOf('application/octet-stream') !== -1 ||
                                 contentType.indexOf('application/vnd.') !== -1 ||
                                 contentDisp.toLowerCase().indexOf('filename=') !== -1;

            var featAttachments = [];

            if (isDirectBinary) {
              // Direct binary document/file
              var fileName = this.extractFilename(contentDisp, feat.endpoint, feat.name);
              var fileNameLower = fileName.toLowerCase();
              var fileId = existingAttMap[fileNameLower];

              if (!fileId) {
                var blob = fetchRes.getBlob().setName(fileName);
                var savedFile = attachFolder.createFile(blob);
                fileId = savedFile.getId();
                existingAttMap[fileNameLower] = fileId;
                newAttachmentsDownloaded = true;
              }

              featAttachments.push({
                name: fileName,
                fileId: fileId,
                url: feat.endpoint
              });

              capturedFeatures.push({
                name: feat.name,
                endpoint: feat.endpoint,
                lastFetched: new Date().toISOString(),
                isBinary: true,
                attachments: featAttachments
              });
            } else {
              // HTML page - scan for document links
              var links = this.extractAttachmentLinks(body, feat.endpoint, dom);

              for (var l = 0; l < links.length; l++) {
                // Check time budget before each attachment fetch
                if ((Date.now() - burstStartTime) > BURST_TIME_LIMIT_MS) {
                  hasMore = true;
                  prog.domIdx = d;
                  prog.featIdx = f;
                  break;
                }

                var linkItem = links[l];
                var lNameLower = linkItem.name.toLowerCase();
                var lFileId = existingAttMap[lNameLower];

                if (!lFileId) {
                  try {
                    var attRes = UrlFetchApp.fetch(linkItem.url, {
                      headers: {
                        'Cookie': cookies,
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                      },
                      muteHttpExceptions: true
                    });

                    if (attRes.getResponseCode() === 200) {
                      var attBlob = attRes.getBlob().setName(linkItem.name);
                      var newFile = attachFolder.createFile(attBlob);
                      lFileId = newFile.getId();
                      existingAttMap[lNameLower] = lFileId;
                      newAttachmentsDownloaded = true;
                    }
                  } catch (attErr) {
                    McpLogger.log('WARN', 'PORTAL_ATTACH_FETCH_WARN', 'Could not download attachment ' + linkItem.name + ': ' + attErr);
                  }
                }

                if (lFileId) {
                  featAttachments.push({
                    name: linkItem.name,
                    fileId: lFileId,
                    url: linkItem.url
                  });
                }
              }

              capturedFeatures.push({
                name: feat.name,
                endpoint: feat.endpoint,
                lastFetched: new Date().toISOString(),
                htmlSnippet: body.substring(0, 1500),
                attachments: featAttachments
              });
            }
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

        if (!isExpired && capturedFeatures.length > 0) {
          this.saveJsonFile(domFolder, 'features_data.json', {
            domain: dom,
            childId: child.childId,
            kidName: child.kidName,
            lastSyncedAt: new Date().toISOString(),
            features: capturedFeatures
          });
        }

        if (hasMore) break;
      }

      this.saveJsonFile(portalsFolder, 'portals_status.json', {
        lastChecked: new Date().toISOString(),
        domains: statuses
      });

      // If new attachments were downloaded, trigger automated OCR indexing
      if (newAttachmentsDownloaded) {
        try {
          var ocrTrigs = ScriptApp.getProjectTriggers();
          var hasOcr = false;
          for (var ot = 0; ot < ocrTrigs.length; ot++) {
            if (ocrTrigs[ot].getHandlerFunction() === 'runAutonomousVaultOcr') {
              hasOcr = true;
              break;
            }
          }
          if (!hasOcr) {
            ScriptApp.newTrigger('runAutonomousVaultOcr').timeBased().after(10000).create();
            McpLogger.log('INFO', 'PORTAL_OCR_TRIGGER', 'New portal attachments downloaded. Scheduled autonomous OCR indexing in 10s.');
          }
        } catch (ocrTrigErr) {
          McpLogger.log('WARN', 'PORTAL_OCR_TRIGGER_WARN', 'Could not schedule OCR trigger: ' + ocrTrigErr);
        }
      }

      // Manage self-rescheduling: 10-minute continuation VS next 6-hour slot
      if (hasMore) {
        props.setProperty(progressKey, JSON.stringify(prog));
        this.scheduleChildPortalContinuation(child.childId, 10);
        McpLogger.log('INFO', 'PORTAL_BURST_CONTINUATION', 'Burst processed ' + featuresProcessed + ' feature(s) for ' + child.kidName + '. More pending. Next burst in 10 mins.');
        return { childId: child.childId, status: 'continuation_scheduled', nextInMinutes: 10 };
      } else {
        props.deleteProperty(progressKey);
        this.scheduleChildPortalContinuation(child.childId, 360); // 360 mins = 6 hours
        McpLogger.log('SUCCESS', 'PORTAL_CYCLE_COMPLETE', 'All registered portals synced for ' + child.kidName + '. Rescheduled for next 6-hour slot.');
        return { childId: child.childId, status: 'cycle_complete', nextInHours: 6 };
      }
    } finally {
      try { props.deleteProperty(pLockKey); } catch (e) {}
    }
  },

  getChildPortalHandler: function(childId) {
    if (typeof getChildPortalSyncHandlerName === 'function') {
      return getChildPortalSyncHandlerName(childId);
    }
    var clean = String(childId || 'Default').replace(/^child_/i, '').replace(/[^a-zA-Z0-9_]/g, '_');
    if (/^[a-z]/.test(clean)) { clean = clean.charAt(0).toUpperCase() + clean.slice(1); }
    var fn = 'runPortalSync_' + (clean || 'Default');
    if (typeof globalThis !== 'undefined' && !globalThis[fn]) {
      globalThis[fn] = function(e) { return runChildPortalSyncTrigger(e, childId); };
    }
    return fn;
  },

  scheduleChildPortalContinuation: function(childId, delayMinutes) {
    var props = PropertiesService.getScriptProperties();
    var handlerName = this.getChildPortalHandler(childId);
    try {
      var triggers = ScriptApp.getProjectTriggers();
      for (var i = 0; i < triggers.length; i++) {
        var hFn = triggers[i].getHandlerFunction();
        if (hFn === 'runChildPortalSyncTrigger' || hFn === handlerName || hFn.indexOf('runPortalSync_') === 0) {
          var uid = triggers[i].getUniqueId();
          var mappedChild = props.getProperty('portal_trigger_child_' + uid);
          if (mappedChild === childId || hFn === handlerName) {
            ScriptApp.deleteTrigger(triggers[i]);
            props.deleteProperty('portal_trigger_child_' + uid);
          }
        }
      }

      var delayMs = delayMinutes * 60 * 1000;
      var newTrig = ScriptApp.newTrigger(handlerName)
        .timeBased()
        .after(delayMs)
        .create();

      var newUid = (newTrig && typeof newTrig.getUniqueId === 'function') ? newTrig.getUniqueId() : ('trig_p_' + Math.random().toString(36).substring(2));
      props.setProperty('portal_trigger_child_' + newUid, childId);
      return { success: true, childId: childId, triggerUid: newUid, handler: handlerName, nextDelayMinutes: delayMinutes };
    } catch (err) {
      McpLogger.log('WARN', 'PORTAL_SCHEDULE_ERROR', 'Could not schedule portal continuation (' + handlerName + ') for ' + childId + ': ' + err);
      return { success: false, error: err.toString() };
    }
  },

  syncChild: function(child) {
    return this.syncChildBurst(child && child.childId);
  },

  extractFilename: function(contentDisp, url, fallbackName) {
    if (contentDisp) {
      var match = contentDisp.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
      if (match && match[1]) {
        var fn = decodeURIComponent(match[1].trim());
        return this.cleanFilename(fn);
      }
    }
    if (url) {
      var cleanUrl = url.split('?')[0].split('#')[0];
      var lastPart = cleanUrl.substring(cleanUrl.lastIndexOf('/') + 1);
      if (lastPart && lastPart.indexOf('.') !== -1) {
        return this.cleanFilename(decodeURIComponent(lastPart));
      }
    }
    var ext = '.pdf';
    var cleanBase = (fallbackName || 'portal_document').replace(/[^a-zA-Z0-9_-]/g, '_');
    return cleanBase + ext;
  },

  cleanFilename: function(name) {
    if (!name) return 'document.pdf';
    var cleaned = name.replace(/[/\\?%*:|"<>]/g, '_').trim();
    return cleaned.length > 0 ? cleaned : 'document.pdf';
  },

  extractAttachmentLinks: function(htmlBody, baseUrl, domain) {
    if (!htmlBody) return [];
    var links = [];
    var seenUrls = {};

    var aTagRegex = /<a\s+[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    var match;
    var docExtRegex = /\.(pdf|docx?|xlsx?|pptx?|jpe?g|png|csv)(\?|#|$)/i;
    var docKeywordRegex = /(download|receipt|attachment|report_card|reportcard|marksheet|circular|invoice|fees?|timetable|syllabus)/i;

    while ((match = aTagRegex.exec(htmlBody)) !== null) {
      var rawHref = match[1];
      var linkText = match[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

      if (!rawHref || rawHref.indexOf('javascript:') === 0 || rawHref.indexOf('#') === 0 || rawHref.indexOf('mailto:') === 0) {
        continue;
      }

      var isDocExt = docExtRegex.test(rawHref);
      var isDocKeyword = docKeywordRegex.test(rawHref) || docKeywordRegex.test(linkText);

      if (isDocExt || isDocKeyword) {
        var resolvedUrl = this.resolveUrl(rawHref, baseUrl, domain);
        if (resolvedUrl && !seenUrls[resolvedUrl]) {
          seenUrls[resolvedUrl] = true;
          var fileName = this.extractFilename(null, rawHref, linkText || 'document');
          links.push({
            url: resolvedUrl,
            name: fileName,
            label: linkText
          });
        }
      }
    }

    return links;
  },

  resolveUrl: function(href, baseUrl, domain) {
    if (!href) return '';
    href = href.trim();
    if (href.indexOf('http://') === 0 || href.indexOf('https://') === 0) {
      return href;
    }
    if (href.indexOf('//') === 0) {
      return 'https:' + href;
    }
    var baseHost = 'https://' + (domain || 'school.portal');
    if (baseUrl && baseUrl.indexOf('http') === 0) {
      var slashIdx = baseUrl.indexOf('://');
      var pathIdx = baseUrl.indexOf('/', slashIdx + 3);
      baseHost = pathIdx !== -1 ? baseUrl.substring(0, pathIdx) : baseUrl;
    }
    if (href.indexOf('/') === 0) {
      return baseHost + href;
    }
    var basePath = baseHost;
    if (baseUrl && baseUrl.indexOf('http') === 0) {
      var lastSlash = baseUrl.lastIndexOf('/');
      if (lastSlash > 8) {
        basePath = baseUrl.substring(0, lastSlash + 1);
      } else {
        basePath = baseUrl + '/';
      }
    } else {
      basePath = baseHost + '/';
    }
    return basePath + href;
  },

  readJsonFile: function(folder, fileName) {
    try {
      var it = folder.getFilesByName(fileName);
      if (it.hasNext()) {
        return JSON.parse(it.next().getBlob().getDataAsString());
      }
    } catch (e) {}
    return null;
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
