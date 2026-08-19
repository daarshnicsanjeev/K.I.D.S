/**
 * Main World Interceptor Script
 * Intercepts window.fetch and XMLHttpRequest to sniff active endpoints, headers, and cookies.
 */
(function () {
  if ((window as any).__school_mcp_interceptor_injected) return;
  (window as any).__school_mcp_interceptor_injected = true;

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
})();
