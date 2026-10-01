#!/usr/bin/env python3
"""
Zero-Hardcode & Dynamic Configuration Guardian Gate
K.I.D.S. (Kids Intelligent Dashboard System)

Enforces zero hardcoded pixel coordinates, static academic years, arbitrary loop caps,
or developer-specific handles across production codebase.
All exceptions must have detailed technical justification and explicit human approval.
"""

import os
import sys
import re
import json
from pathlib import Path

# Ensure UTF-8 output on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

ROOT_DIR = Path(__file__).resolve().parent.parent
TARGET_SOURCE_DIR = ROOT_DIR / "app" / "src" / "main" / "java"
EXEMPTIONS_FILE = ROOT_DIR / ".hardcode-exemptions.json"

# Rules to detect unapproved hardcoded values
# Each rule has:
# - id: unique identifier
# - description: explanation of the invariant
# - regex: pattern that indicates a violation
# - remedy: actionable advice to make it dynamic
RULES = [
    {
        "id": "HARDCODED_GESTURE_COORDINATES",
        "description": "Hardcoded pixel coordinates in touch or swipe gestures",
        "regex": re.compile(r'dispatchSwipeAction\s*\(\s*(?!\w+\b|\().*?\d+\.?\d*f'),
        "remedy": "Derive coordinates dynamically from node.getBoundsInScreen(rect) or context.resources.displayMetrics."
    },
    {
        "id": "HARDCODED_PIXEL_COORDINATES_LITERAL",
        "description": "Hardcoded literal swipe/tap float numbers (e.g. 540f, 1500f, 1600f, 300f in gesture calls)",
        "regex": re.compile(r'\b(dispatchSwipeAction|dispatchTapAction)\s*\([^)]*?\b(540f|1500f|1600f|300f|400f|800f)\b'),
        "remedy": "Anchor gesture vectors directly to container/element bounds (rect.centerX(), rect.top + rect.height() * fraction)."
    },
    {
        "id": "HARDCODED_ACADEMIC_YEAR",
        "description": "Hardcoded static academic year string literal (e.g. '2024-2025', '2026-2027')",
        "regex": re.compile(r'"\b20\d{2}-20\d{2}\b"'),
        "remedy": "Use DriveVaultManager.resolveDefaultAcademicYear(context) or DriveVaultManager.getAvailableAcademicYears(context)."
    },
    {
        "id": "HARDCODED_DEVELOPER_NAME",
        "description": "Hardcoded developer personal handle or name",
        "regex": re.compile(r'\b(daarshnic|sanjeev)\b', re.IGNORECASE),
        "remedy": "Match target student or parent email dynamically using account prefix or user session data."
    },
    {
        "id": "HARDCODED_ARBITRARY_PAGE_LIMIT",
        "description": "Hardcoded arbitrary page scroll cap (e.g. 'page < 40' or 'MAX_SCROLL_PAGES = 60')",
        "regex": re.compile(r'\bpage\s*<\s*\d{2,}\b|\bMAX_SCROLL_PAGES\s*=\s*\d+\b'),
        "remedy": "Derive scroll budget dynamically from pending work queue using calculateDynamicScrollPageLimit(pendingCount)."
    },
    {
        "id": "HARDCODED_ARBITRARY_FOLDER_DEPTH",
        "description": "Hardcoded folder depth threshold (e.g. 'folderDepth > 5')",
        "regex": re.compile(r'\bfolderDepth\s*>\s*[1-9]\b'),
        "remedy": "Use calculateDynamicFolderDepth(pendingAttachmentCount) to scale depth proportionally."
    },
    {
        "id": "HARDCODED_FIXED_ROW_PIXEL_BOUNDS",
        "description": "Hardcoded absolute pixel checks for list rows (e.g. 'r.top < 460', 'r.width() > 500')",
        "regex": re.compile(r'\br\.(top\s*<\s*\d{3,}|bottom\s*>\s*\d{3,}|width\(\)\s*>\s*500)\b'),
        "remedy": "Compare row bounds directly against parent containerBounds or density-scaled dimensions."
    }
]

INLINE_EXEMPTION_PATTERN = re.compile(
    r'//\s*ZERO_HARDCODE_EXEMPTION:\s*(?P<reason>.+?)\s*\[(?:Approved-By|approved_by):\s*(?P<approver>[^\]]+)\]',
    re.IGNORECASE
)

def load_central_exemptions() -> list[dict]:
    """Loads centrally approved exemptions from .hardcode-exemptions.json."""
    if not EXEMPTIONS_FILE.exists():
        return []
    try:
        with open(EXEMPTIONS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, list):
                return data
    except Exception as e:
        print(f"[DYNAMIC GUARDIAN WARNING] Failed to parse {EXEMPTIONS_FILE}: {e}")
    return []

def validate_exemption(reason: str, approver: str) -> tuple[bool, str]:
    """Validates that an exemption has thorough reasoning and explicit human approval."""
    clean_reason = reason.strip()
    clean_approver = approver.strip()

    if len(clean_reason) < 15:
        return False, "Exemption reason is too brief (< 15 characters). Must provide detailed technical justification."
    
    invalid_approvers = {"todo", "tbd", "none", "n/a", "me", "developer", "author", "unknown", "placeholder"}
    if not clean_approver or clean_approver.lower() in invalid_approvers:
        return False, f"Invalid human approver '{clean_approver}'. Must be an authorized human reviewer identifier."

    return True, ""

def check_file(file_path: Path, central_exemptions: list[dict]) -> list[dict]:
    """Audits a single source file against zero-hardcode invariants."""
    violations = []
    rel_path_str = str(file_path.relative_to(ROOT_DIR)).replace("\\", "/")

    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            lines = f.readlines()
    except Exception as e:
        print(f"[DYNAMIC GUARDIAN ERROR] Could not read {file_path}: {e}")
        return []

    for line_idx, line in enumerate(lines, start=1):
        # Check for inline exemption on current line or immediate previous line
        inline_exemption = None
        current_inline_match = INLINE_EXEMPTION_PATTERN.search(line)
        if current_inline_match:
            inline_exemption = current_inline_match
        elif line_idx > 1:
            prev_inline_match = INLINE_EXEMPTION_PATTERN.search(lines[line_idx - 2])
            if prev_inline_match:
                inline_exemption = prev_inline_match

        # Check central exemptions
        central_match = next((
            entry for entry in central_exemptions
            if entry.get("file", "").replace("\\", "/") == rel_path_str
            and (entry.get("line") is None or entry.get("line") == line_idx)
        ), None)

        for rule in RULES:
            match = rule["regex"].search(line)
            if match:
                # Evaluate exemption if present
                exemption_valid = False
                exemption_error = ""

                if inline_exemption:
                    reason = inline_exemption.group("reason")
                    approver = inline_exemption.group("approver")
                    is_valid, err_msg = validate_exemption(reason, approver)
                    if is_valid:
                        exemption_valid = True
                    else:
                        exemption_error = f"Invalid inline exemption: {err_msg}"
                elif central_match:
                    reason = central_match.get("reason", "")
                    approver = central_match.get("approved_by", "")
                    is_valid, err_msg = validate_exemption(reason, approver)
                    if is_valid:
                        exemption_valid = True
                    else:
                        exemption_error = f"Invalid central exemption: {err_msg}"

                if not exemption_valid:
                    violations.append({
                        "file": rel_path_str,
                        "line": line_idx,
                        "rule_id": rule["id"],
                        "description": rule["description"],
                        "snippet": line.strip(),
                        "remedy": rule["remedy"],
                        "exemption_error": exemption_error
                    })

    return violations

def main() -> int:
    print("=" * 80)
    print("  K.I.D.S. DYNAMIC CONFIGURATION & ZERO-HARDCODE GUARDIAN GATE")
    print("  Scanning codebase for unapproved static constants, coordinates & limits...")
    print("=" * 80)

    if not TARGET_SOURCE_DIR.exists():
        print(f"[DYNAMIC GUARDIAN ERROR] Target directory does not exist: {TARGET_SOURCE_DIR}")
        return 1

    central_exemptions = load_central_exemptions()
    all_violations = []

    kotlin_files = list(TARGET_SOURCE_DIR.rglob("*.kt"))
    print(f"Auditing {len(kotlin_files)} Kotlin source files in {TARGET_SOURCE_DIR.relative_to(ROOT_DIR)}...")

    for kfile in kotlin_files:
        violations = check_file(kfile, central_exemptions)
        if violations:
            all_violations.extend(violations)

    print("-" * 80)
    if not all_violations:
        print("✓ [ZERO-HARDCODE GUARDIAN PASSED] 0 hardcoded values detected.")
        print("✓ All coordinates, limits, and configurations are dynamically derived.")
        print("=" * 80)
        return 0

    print(f"✗ [ZERO-HARDCODE GUARDIAN REJECTED] Found {len(all_violations)} unapproved hardcoded values:\n")
    for idx, v in enumerate(all_violations, start=1):
        print(f"[{idx}] {v['rule_id']} in {v['file']}:{v['line']}")
        print(f"    Description: {v['description']}")
        print(f"    Code Snippet: {v['snippet']}")
        if v['exemption_error']:
            print(f"    Exemption Rejection: {v['exemption_error']}")
        print(f"    Remedy: {v['remedy']}")
        print("    Approval Requirement: To permit this value, you must document detailed technical reasoning")
        print("                          and obtain human approval via inline comment:")
        print("                          '// ZERO_HARDCODE_EXEMPTION: [Technical Reason] [Approved-By: <Reviewer>]'")
        print("                          or register it in .hardcode-exemptions.json.\n")

    print("=" * 80)
    print("BUILD REJECTED: Pipeline gate failed due to hardcoded values without approved justification.")
    print("=" * 80)
    return 1

if __name__ == "__main__":
    sys.exit(main())
