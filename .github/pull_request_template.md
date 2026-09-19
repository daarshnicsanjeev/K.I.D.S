## Description
<!-- Provide a clear and concise summary of the changes proposed in this Pull Request. -->

## PR Checklist
- [ ] Conforms to **Antigravity Workspace Guidelines** (`GEMINI.md`)
- [ ] Maintains **Zero-Backend Architecture** (no private child data sent to third-party endpoints)
- [ ] Maintains strictly scoped Google OAuth permissions (`drive.file` + `spreadsheets`)
- [ ] ML Kit OCR processing runs 100% on-device
- [ ] All interactive elements enforce minimum **48dp × 48dp** touch targets
- [ ] Text contrast ratios satisfy **WCAG 2.1 AA/AAA** standard
- [ ] Added/updated Unit & Integration tests for all modified logic
- [ ] Ran `./gradlew test` and all tests pass
- [ ] Knowledge graph remains valid (`graphify-out/graph.json`)

## Types of Changes
- [ ] Bug fix (non-breaking change fixing an issue)
- [ ] New feature (non-breaking change adding functionality)
- [ ] Breaking change (fix or feature causing existing functionality to break)
- [ ] Refactor / Performance improvement
- [ ] Documentation update

## Testing Performed
<!-- Describe the tests you ran to verify your changes. Include unit tests, Robolectric, or ADB commands. -->
