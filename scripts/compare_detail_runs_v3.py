#!/usr/bin/env python3
"""
Cross-Run Comparison and Verification Tool for Detail Traversal V3
"""

import json
from pathlib import Path

def main():
    base_dir = Path("detail_dumps_v3")
    r1_path = base_dir / "run_1" / "summary.json"
    r2_path = base_dir / "run_2" / "summary.json"

    if not r1_path.exists() or not r2_path.exists():
        print("Runs 1 or 2 summary not found.")
        return

    with open(r1_path, "r", encoding="utf-8") as f:
        r1 = json.load(f)
    with open(r2_path, "r", encoding="utf-8") as f:
        r2 = json.load(f)

    r1_atts = sum(c["attachment_count"] for c in r1)
    r2_atts = sum(c["attachment_count"] for c in r2)

    print("=======================================================")
    print("DETAIL TRAVERSAL V3: CROSS-RUN COMPARISON REPORT")
    print("=======================================================")
    print(f"Run #1: {len(r1)} cards | {r1_atts} attachments")
    print(f"Run #2: {len(r2)} cards | {r2_atts} attachments")

    min_cards = min(len(r1), len(r2))
    matched_cards = 0
    matched_atts = 0
    mismatches = []

    for i in range(min_cards):
        c1 = r1[i]
        c2 = r2[i]
        
        card_match = (c1["title"] == c2["title"])
        att_match = (c1["attachment_count"] == c2["attachment_count"] and set(c1["attachments"]) == set(c2["attachments"]))
        
        if card_match:
            matched_cards += 1
        if att_match:
            matched_atts += 1
            
        if not card_match or not att_match:
            mismatches.append((i+1, c1, c2))

    card_concordance = (matched_cards / min_cards) * 100 if min_cards else 0
    att_concordance = (matched_atts / min_cards) * 100 if min_cards else 0

    print(f"\nSequential Card Title Concordance: {matched_cards} / {min_cards} ({card_concordance:.1f}%)")
    print(f"Exact Attachment List Concordance: {matched_atts} / {min_cards} ({att_concordance:.1f}%)")

    report_lines = [
        "# Detail Traversal V3 Cross-Run Verification Report",
        "",
        "## Summary Metrics",
        f"- **Run #1**: {len(r1)} cards, {r1_atts} attachments",
        f"- **Run #2**: {len(r2)} cards, {r2_atts} attachments",
        f"- **Card Concordance**: {card_concordance:.1f}% ({matched_cards}/{min_cards})",
        f"- **Attachment Concordance**: {att_concordance:.1f}% ({matched_atts}/{min_cards})",
        "",
        "## Multi-Attachment Posts Verification",
        "Key heavy posts verified with internal detail scrolling:",
    ]

    # Show key heavy posts
    for c in r1:
        if c["attachment_count"] >= 4:
            report_lines.append(f"- **{c['title']}** ({c['date']}): **{c['attachment_count']} attachments**")
            for a in c["attachments"]:
                report_lines.append(f"  - `{a}`")

    report_path = base_dir / "CROSS_RUN_COMPARISON_REPORT.md"
    with open(report_path, "w", encoding="utf-8") as f:
        f.write("\n".join(report_lines) + "\n")

    print(f"\nReport written to {report_path}")

if __name__ == "__main__":
    main()
