# Security Policy

## Privacy-First Architecture

K.I.D.S. Android Collector is engineered around an uncompromising zero-backend philosophy:
- **No Third-Party Cloud Servers:** All captured notifications and circulars stay on the local device or transfer encrypted directly to the parent's private Google Drive vault.
- **Scoped Permissions:** Only `https://www.googleapis.com/auth/drive.file` and `https://www.googleapis.com/auth/spreadsheets` are requested.
- **Local Machine Learning:** OCR is performed purely on-device using Google ML Kit.

## Reporting a Vulnerability

If you discover a security vulnerability or privacy flaw in K.I.D.S., please report it privately:

1. **Do NOT open a public GitHub issue.**
2. Send an email with reproduction steps and architectural details to `daarshnicsanjeev@users.noreply.github.com`.
3. We will acknowledge receipt within 48 hours and work with you on an expedited patch before disclosure.
