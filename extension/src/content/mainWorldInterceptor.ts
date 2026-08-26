/**
 * Main World Interceptor Script
 * Intercepts window.fetch and XMLHttpRequest to sniff active endpoints, headers, and cookies.
 */
(function () {
  if ((window as any).__school_mcp_interceptor_injected) return;
  (window as any).__school_mcp_interceptor_injected = true;

  let lastKnownDocTitle = '';

  // Intercept all click events to extract active document title from clicked message card
  document.addEventListener('click', (ev) => {
    try {
      const target = ev.target as HTMLElement | null;
      if (!target) return;
      const docCard = target.closest('[data-testid="msg-container"], div.message-in, div.message-out, div.document-container, div[data-testid="document-body"], div.copyable-area');
      if (docCard) {
        const titleEl = docCard.querySelector('span[data-testid="document-name"], span[title*="."], div[title*="."]');
        if (titleEl) {
          const t = (titleEl.getAttribute('title') || titleEl.textContent || '').trim();
          if (t && !t.toLowerCase().includes('-icon') && t.length > 2) {
            lastKnownDocTitle = t;
          }
        }
      }
    } catch (e) {}
  }, true);

  // Intercept anchor click to capture download filename
  const originalAnchorClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    try {
      const dlName = this.download || this.getAttribute('download') || '';
      if (dlName) lastKnownDocTitle = dlName;
    } catch (e) {}
    return originalAnchorClick.apply(this, arguments as any);
  };

  // Intercept window.URL.createObjectURL for decrypted document Blobs at page start
  const originalCreateObjectURL = window.URL.createObjectURL;
  window.URL.createObjectURL = function (blob: any) {
    const url = originalCreateObjectURL.apply(this, arguments as any);
    try {
      if (blob instanceof Blob) {
        if (blob.type === 'application/pdf' || blob.type === 'application/octet-stream' || blob.type.includes('document') || blob.type.includes('sheet') || blob.type.includes('image') || blob.size > 1024) {
          const capturedName = lastKnownDocTitle || 'school_document.pdf';
          const reader = new FileReader();
          reader.onloadend = () => {
            const res = reader.result as string;
            if (res && res.includes(',')) {
              const base64Data = res.split(',')[1];
              (window as any).__school_mcp_captured_blobs = (window as any).__school_mcp_captured_blobs || new Map();
              (window as any).__school_mcp_captured_blobs.set(url, {
                name: capturedName,
                mime: blob.type || 'application/pdf',
                size: blob.size,
                base64: base64Data
              });

              window.postMessage({
                type: 'CAPTURED_PDF_STREAM',
                url,
                fileName: capturedName,
                mimeType: blob.type || 'application/pdf',
                size: blob.size,
                base64Data
              }, '*');
            }
          };
          reader.readAsDataURL(blob);
        }
      }
    } catch (e) {}
    return url;
  };

  // Intercept window.fetch
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const response = await originalFetch.apply(this, args);
    try {
      const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request)?.url || '';
      const options = args[1] || {};
      const method = options.method || 'GET';
      const headers = options.headers ? Object.fromEntries(new Headers(options.headers as any).entries()) : {};

      window.postMessage({
        type: 'SCHOOL_MCP_INTERCEPTED_REQUEST',
        data: {
          url,
          method,
          headers,
          body: options.body ? String(options.body) : undefined,
          cookies: document.cookie
        }
      }, '*');
    } catch (e) {
      console.error('[School MCP Interceptor] Fetch sniff error', e);
    }
    return response;
  };

  // Intercept XMLHttpRequest
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;
  const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;

  XMLHttpRequest.prototype.open = function (method: string, url: string | URL, ...rest: any[]) {
    (this as any).__mcp_method = method;
    (this as any).__mcp_url = String(url);
    (this as any).__mcp_headers = {};
    return originalOpen.apply(this, [method, url, ...rest] as any);
  };

  XMLHttpRequest.prototype.setRequestHeader = function (header: string, value: string) {
    if ((this as any).__mcp_headers) {
      (this as any).__mcp_headers[header] = value;
    }
    return originalSetRequestHeader.apply(this, [header, value]);
  };

  XMLHttpRequest.prototype.send = function (body?: Document | XMLHttpRequestBodyInit | null) {
    this.addEventListener('load', function () {
      try {
        window.postMessage({
          type: 'SCHOOL_MCP_INTERCEPTED_REQUEST',
          data: {
            url: (this as any).__mcp_url,
            method: (this as any).__mcp_method,
            headers: (this as any).__mcp_headers || {},
            body: body ? String(body) : undefined,
            cookies: document.cookie
          }
        }, '*');
      } catch (e) {
        console.error('[School MCP Interceptor] XHR sniff error', e);
      }
    });
    return originalSend.apply(this, [body]);
  };

  // Automatically dismiss WhatsApp Web error popups (e.g. "Document unavailable", "no longer on your phone")
  try {
    const autoDismissObserver = new MutationObserver(() => {
      const modalDialogs = document.querySelectorAll('div[data-animate-modal-popup="true"], div[role="dialog"], div.modal, [data-testid="popup-contents"]');
      modalDialogs.forEach(dialog => {
        const text = (dialog.textContent || '').toLowerCase();
        if (
          text.includes('document unavailable') ||
          text.includes('no longer on your phone') ||
          text.includes('media unavailable') ||
          text.includes('file not found') ||
          text.includes('download failed') ||
          text.includes("can't download") ||
          text.includes('cant download')
        ) {
          const okBtn = (dialog.querySelector('button, div[role="button"]') || dialog.querySelector('span')) as HTMLElement | null;
          if (okBtn) {
            okBtn.click();
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));
          }
        }
      });
    });
    if (document.body) {
      autoDismissObserver.observe(document.body, { childList: true, subtree: true });
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        autoDismissObserver.observe(document.body, { childList: true, subtree: true });
      });
    }
  } catch (e) {}

  console.log('[School MCP Interceptor] Sniffer and Auto-Dismiss initialized.');
})();
