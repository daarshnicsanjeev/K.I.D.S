/**
 * Content Script Interceptor
 * Listens for intercepted request and blob messages from the main world and forwards them to the extension background.
 */
(window as any).__capturedPdfStreams = (window as any).__capturedPdfStreams || new Map<string, any>();

window.addEventListener('message', (event) => {
  if (event.source !== window) return;

  if (event.data && event.data.type === 'SCHOOL_MCP_INTERCEPTED_REQUEST') {
    const payload = event.data.data;
    try {
      chrome.runtime.sendMessage({
        type: 'RECORD_INTERCEPTED_SPEC',
        payload
      });
    } catch (err) {}
  }

  if (event.data && event.data.type === 'CAPTURED_PDF_STREAM') {
    const stream = event.data;
    if (stream && stream.base64Data) {
      (window as any).__capturedPdfStreams.set(stream.url || 'latest', stream);
      try {
        chrome.runtime.sendMessage({
          type: 'CAPTURED_PDF_STREAM',
          payload: stream
        });
      } catch (err) {}
    }
  }
});
