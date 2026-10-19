# Kids Intelligent Dashboard System (K.I.D.S.)

A privacy-first AI command center and sync engine connecting school portals, Google Workspace tools (Classroom, Gmail, Calendar), and school chat groups (WhatsApp, Telegram) into personal Model Context Protocol (MCP) servers for **Google Gemini Spark**, **Gemini Advanced**, and AI assistants.

## 🚀 Key Modules

1. **`extension/` (K.I.D.S. Chrome Extension MV3)**
   - Built with TypeScript & Vite.
   - **4-Step Onboarding Wizard**: Guided multi-kid setup with academic year folder partitioning (`K.I.D.S. Data/[FirstName]/[AcademicYear]/`).
   - **Personalized Options**: Dynamic radio cards for schools using or not using Google Classroom.
   - **Universal Platform Tracking**: 1-click active tab capture for school ERPs, educational games, and video learning platforms.
   - **Dual-Path Chat Sync**: Automated daily scans + historical mobile export import with media attachments.
   - **Single Multi-Kid Background Service**: Unified persistent diagnostic log stream.
   - **Dynamic AI Skill Engine**: Generates personalized `K.I.D.S._SKILL.md` with multi-kid MCP routing and next-period default deadline inference.

2. **`gas-mcp-server/` (K.I.D.S. Google Apps Script MCP Backend)**
   - Implements Model Context Protocol JSON-RPC 2.0 router over HTTP POST.
   - Native Google Workspace integration (Classroom, Calendar, Gmail).
   - Master composite tool: `get_all_school_updates` for 1-click execution across all connected channels.

3. **`gas-error-webhook/` (Diagnostic Registry Web App)**
   - Lightweight error telemetry logging with fingerprint deduplication.

## 🛠️ Local Setup & Development

### Extension
```bash
cd extension
npm install
npm run build
npm test
```
Load the `extension/` or `extension/dist` folder into Chrome via `chrome://extensions` (Developer Mode -> **Load unpacked** or click the **🔄 Reload icon**).
