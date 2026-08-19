/**
 * Universal DOM Extractor
 * Extracts clean, structured text, tables, and notices from any active website in Chrome.
 */
export interface ExtractedWebPage {
  url: string;
  title: string;
  domain: string;
  extractedAt: string;
  structuredContent: string;
  tables: string[][][];
  metaDescription?: string;
}

export class UniversalDomExtractor {
  /**
   * Extracts clean structured text and tables from the current document.
   */
  public static extract(maxChars: number = 35000): ExtractedWebPage {
    const url = window.location.href;
    const domain = window.location.hostname;
    const title = document.title || 'Untitled Web Page';

    const metaEl = document.querySelector('meta[name="description"], meta[property="og:description"]');
    const metaDescription = metaEl ? metaEl.getAttribute('content') || '' : '';

    // Extract Tables
    const tables: string[][][] = [];
    const tableElements = document.querySelectorAll('table');
    tableElements.forEach(tbl => {
      const tableRows: string[][] = [];
      const rows = tbl.querySelectorAll('tr');
      rows.forEach(r => {
        const rowCols: string[] = [];
        const cells = r.querySelectorAll('th, td');
        cells.forEach(c => {
          rowCols.push((c.textContent || '').trim().replace(/\s+/g, ' '));
        });
        if (rowCols.length > 0) tableRows.push(rowCols);
      });
      if (tableRows.length > 0) tables.push(tableRows);
    });

    // Clone body to strip noisy elements
    const clone = document.body ? document.body.cloneNode(true) as HTMLElement : document.documentElement.cloneNode(true) as HTMLElement;

    const noiseSelectors = [
      'script', 'style', 'noscript', 'iframe', 'svg', 'canvas',
      'nav', 'footer', '.ad', '.ads', '.advertisement', '#cookie-banner', '.cookie-banner'
    ];
    noiseSelectors.forEach(sel => {
      clone.querySelectorAll(sel).forEach(el => el.remove());
    });

    let text = clone.innerText || clone.textContent || '';
    text = text.replace(/[ \t]+/g, ' ');
    text = text.replace(/\n\s*\n\s*\n/g, '\n\n');
    text = text.trim();

    if (text.length > maxChars) {
      text = text.substring(0, maxChars) + '\n\n...[Truncated for length]';
    }

    return {
      url,
      title,
      domain,
      extractedAt: new Date().toISOString(),
      structuredContent: text,
      tables,
      metaDescription
    };
  }
}

// Message listener for background bridge requests
if (typeof window !== 'undefined') {
  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data) return;
    if (event.data.type === 'EXTRACT_UNIVERSAL_DOM_REQUEST') {
      const result = UniversalDomExtractor.extract(event.data.maxChars || 35000);
      window.postMessage({
        type: 'EXTRACT_UNIVERSAL_DOM_RESPONSE',
        data: result
      }, '*');
    }
  });
}
