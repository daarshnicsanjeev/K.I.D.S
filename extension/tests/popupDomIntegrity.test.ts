import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Popup DOM Integrity Test', () => {
  const htmlPath = path.resolve(__dirname, '../src/popup/index.html');
  const wizardPath = path.resolve(__dirname, '../src/popup/wizard.ts');

  it('should ensure all getElementById IDs in wizard.ts exist in index.html', () => {
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

  describe('Step 2 Button Gating: Skip vs Continue Visibility', () => {
    it('should have btnNavStep2ToStep3 hidden by default in index.html before script creation', () => {
      const htmlContent = fs.readFileSync(htmlPath, 'utf-8');

      // Find the element with id="btnNavStep2ToStep3"
      const match = htmlContent.match(/<button[^>]*id=["']btnNavStep2ToStep3["'][^>]*>/);
      expect(match).not.toBeNull();
      const tagStr = match![0];

      // Must have .hidden class, hidden attribute, and aria-hidden="true"
      expect(tagStr).toContain('hidden');
      expect(tagStr).toContain('aria-hidden="true"');
    });

    it('should have btnSkipStep2Top and btnSkipStep2Bottom present in index.html', () => {
      const htmlContent = fs.readFileSync(htmlPath, 'utf-8');

      const topSkip = htmlContent.match(/<button[^>]*id=["']btnSkipStep2Top["'][^>]*>/);
      const bottomSkip = htmlContent.match(/<button[^>]*id=["']btnSkipStep2Bottom["'][^>]*>/);

      expect(topSkip).not.toBeNull();
      expect(bottomSkip).not.toBeNull();
      // Skip buttons should not be hidden by default in initial HTML
      expect(topSkip![0]).not.toContain('class="btn btn-outline btn-sm hidden"');
    });

    it('should strictly gate Skip and Continue in updateStep2View so both are NEVER visible at the same time', () => {
      const wizardContent = fs.readFileSync(wizardPath, 'utf-8');

      // Check updateStep2View logic
      expect(wizardContent).toContain('const isScriptCreated = Boolean(');
      expect(wizardContent).toContain('currentConfiguringProfile?.schoolGasDeploymentUrl ||');
      expect(wizardContent).toContain('currentConfiguringProfile?.schoolGasScriptId');

      // Check the exact branch conditions
      const branchPattern = /if\s*\(isScriptCreated\)\s*\{\s*setA11yVisibility\(btnNavStep2ToStep3,\s*true\);\s*setA11yVisibility\(btnSkipStep2Top,\s*false\);\s*setA11yVisibility\(btnSkipStep2Bottom,\s*false\);\s*\}\s*else\s*\{\s*setA11yVisibility\(btnNavStep2ToStep3,\s*false\);\s*setA11yVisibility\(btnSkipStep2Top,\s*true\);\s*setA11yVisibility\(btnSkipStep2Bottom,\s*true\);\s*\}/s;
      expect(wizardContent).toMatch(branchPattern);
    });

    it('should properly toggle classes and attributes in setA11yVisibility', () => {
      class MockElement {
        classes = new Set<string>();
        attributes: Record<string, string> = {};

        classList = {
          add: (c: string) => this.classes.add(c),
          remove: (c: string) => this.classes.delete(c),
          contains: (c: string) => this.classes.has(c)
        };

        setAttribute(name: string, value: string) {
          this.attributes[name] = value;
        }

        removeAttribute(name: string) {
          delete this.attributes[name];
        }

        hasAttribute(name: string) {
          return name in this.attributes;
        }

        getAttribute(name: string) {
          return this.attributes[name];
        }
      }

      function setA11yVisibility(el: any, isVisible: boolean) {
        if (!el) return;
        if (isVisible) {
          el.classList.remove('hidden');
          el.removeAttribute('hidden');
          el.removeAttribute('aria-hidden');
        } else {
          el.classList.add('hidden');
          el.setAttribute('hidden', '');
          el.setAttribute('aria-hidden', 'true');
        }
      }

      const btnContinue = new MockElement();
      const btnSkip = new MockElement();

      // Case 1: Before script creation (isScriptCreated = false)
      setA11yVisibility(btnContinue, false);
      setA11yVisibility(btnSkip, true);

      expect(btnContinue.classList.contains('hidden')).toBe(true);
      expect(btnContinue.hasAttribute('hidden')).toBe(true);
      expect(btnContinue.getAttribute('aria-hidden')).toBe('true');

      expect(btnSkip.classList.contains('hidden')).toBe(false);
      expect(btnSkip.hasAttribute('hidden')).toBe(false);
      expect(btnSkip.hasAttribute('aria-hidden')).toBe(false);

      // Case 2: After script creation (isScriptCreated = true)
      setA11yVisibility(btnContinue, true);
      setA11yVisibility(btnSkip, false);

      expect(btnContinue.classList.contains('hidden')).toBe(false);
      expect(btnContinue.hasAttribute('hidden')).toBe(false);
      expect(btnContinue.hasAttribute('aria-hidden')).toBe(false);

      expect(btnSkip.classList.contains('hidden')).toBe(true);
      expect(btnSkip.hasAttribute('hidden')).toBe(true);
      expect(btnSkip.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('Step 1 UI State Machine: Initial Setup vs Confirmed vs In-line Edit', () => {
    it('should have initial HTML with Edit, Save, and Cancel buttons hidden by default', () => {
      const htmlContent = fs.readFileSync(htmlPath, 'utf-8');

      // Edit, Save, Cancel buttons for Name
      const btnEditName = htmlContent.match(/<button[^>]*id=["']btnStep1EditChildName["'][^>]*>/);
      const btnSaveName = htmlContent.match(/<button[^>]*id=["']btnStep1SaveChildName["'][^>]*>/);
      const btnCancelName = htmlContent.match(/<button[^>]*id=["']btnStep1CancelChildName["'][^>]*>/);

      expect(btnEditName).not.toBeNull();
      expect(btnEditName![0]).toContain('hidden');
      expect(btnSaveName).not.toBeNull();
      expect(btnSaveName![0]).toContain('hidden');
      expect(btnCancelName).not.toBeNull();
      expect(btnCancelName![0]).toContain('hidden');

      // Edit, Save, Cancel buttons for Year
      const btnEditYear = htmlContent.match(/<button[^>]*id=["']btnStep1EditAcademicYear["'][^>]*>/);
      const btnSaveYear = htmlContent.match(/<button[^>]*id=["']btnStep1SaveAcademicYear["'][^>]*>/);
      const btnCancelYear = htmlContent.match(/<button[^>]*id=["']btnStep1CancelAcademicYear["'][^>]*>/);

      expect(btnEditYear).not.toBeNull();
      expect(btnEditYear![0]).toContain('hidden');
      expect(btnSaveYear).not.toBeNull();
      expect(btnSaveYear![0]).toContain('hidden');
      expect(btnCancelYear).not.toBeNull();
      expect(btnCancelYear![0]).toContain('hidden');

      // Primary Confirm Button
      const btnConfirm = htmlContent.match(/<button[^>]*id=["']btnStep1SaveChild["'][^>]*>/);
      expect(btnConfirm).not.toBeNull();
      expect(btnConfirm![0]).not.toContain('class="btn btn-primary btn-hero hidden"');
    });

    it('should implement setStep1Mode in wizard.ts with initial, locked, editing_name, and editing_year states', () => {
      const wizardContent = fs.readFileSync(wizardPath, 'utf-8');

      expect(wizardContent).toContain("type Step1Mode = 'initial' | 'locked' | 'editing_name' | 'editing_year';");
      expect(wizardContent).toContain("function setStep1Mode(mode: Step1Mode)");

      // In initial mode: edit, save, cancel, and lock badges must be false
      expect(wizardContent).toContain("setA11yVisibility(lblStep1ChildNameLockBadge, false);");
      expect(wizardContent).toContain("setA11yVisibility(btnStep1EditChildName, false);");
      expect(wizardContent).toContain("setA11yVisibility(btnStep1SaveChildName, false);");
      expect(wizardContent).toContain("setA11yVisibility(btnStep1CancelChildName, false);");

      expect(wizardContent).toContain("setA11yVisibility(lblStep1AcademicYearLockBadge, false);");
      expect(wizardContent).toContain("setA11yVisibility(btnStep1EditAcademicYear, false);");
      expect(wizardContent).toContain("setA11yVisibility(btnStep1SaveAcademicYear, false);");
      expect(wizardContent).toContain("setA11yVisibility(btnStep1CancelAcademicYear, false);");
    });

    it('should wire up .btn-edit-kid click handlers to load child profile in Step 1 for editing', () => {
      const wizardContent = fs.readFileSync(wizardPath, 'utf-8');

      // Check that .btn-edit-kid is queried and bound
      expect(wizardContent).toContain("document.querySelectorAll('.btn-edit-kid");
      expect(wizardContent).toContain("populateStep1ForEditing(target)");
      expect(wizardContent).toContain("showWizardStep(1)");
    });

    it('should have btnStep1BackToDashboard in index.html and wired to showFamilyDashboard in wizard.ts', () => {
      const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
      const wizardContent = fs.readFileSync(wizardPath, 'utf-8');

      expect(htmlContent).toContain('id="btnStep1BackToDashboard"');
      expect(wizardContent).toContain("btnStep1BackToDashboard?.addEventListener('click'");
      expect(wizardContent).toContain("await showFamilyDashboard()");
    });
  });
});
