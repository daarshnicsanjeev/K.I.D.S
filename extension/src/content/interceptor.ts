/**
 * Content Script Interceptor
 * Listens for intercepted request messages from the main world and forwards captured specifications to the extension background.
 */
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (event.data && event.data.type === 'SCHOOL_MCP_INTERCEPTED_REQUEST') {
    const payload = event.data.data;
    try {
      chrome.runtime.sendMessage({
        type: 'RECORD_INTERCEPTED_SPEC',
        payload
      });
    } catch (err) {
      // Extension context invalidated or not listening
    }
  }
});
