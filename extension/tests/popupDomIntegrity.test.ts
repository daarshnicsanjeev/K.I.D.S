import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Popup DOM Integrity Test', () => {
  it('should ensure all getElementById IDs in wizard.ts exist in index.html', () => {
    const htmlPath = path.resolve(__dirname, '../src/popup/index.html');
    const wizardPath = path.resolve(__dirname, '../src/popup/wizard.ts');

    const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
    const wizardContent = fs.readFileSync(wizardPath, 'utf-8');

    // Extract all getElementById('...') calls from wizard.ts
    const idRegex = /getElementById\(['"`]([a-zA-Z0-9_-]+)['"`]\)/g;
    const referencedIds = new Set<string>();
    let match;
    while ((match = idRegex.exec(wizardContent)) !== null) {
      referencedIds.add(match[1]);
    }

    // Dynamic IDs generated in loops (e.g., dot1..dot4, line1..line3)
    const dynamicIds = ['dot1', 'dot2', 'dot3', 'dot4', 'line1', 'line2', 'line3'];
    dynamicIds.forEach(id => referencedIds.add(id));

    // Extract all id="..." attributes from index.html
    const htmlIdRegex = /id=["']([a-zA-Z0-9_-]+)["']/g;
    const existingHtmlIds = new Set<string>();
    while ((match = htmlIdRegex.exec(htmlContent)) !== null) {
      existingHtmlIds.add(match[1]);
    }

    const missingIds: string[] = [];
    referencedIds.forEach(id => {
      if (!existingHtmlIds.has(id)) {
        missingIds.push(id);
      }
    });

    expect(missingIds, `The following IDs referenced in wizard.ts are missing in index.html: ${missingIds.join(', ')}`).toEqual([]);
  });
});
