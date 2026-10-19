#!/usr/bin/env python3
"""
Classroom Stream Detail View & Attachment Harvester (v2.1)
- Traverses 100% of all cards on the Stream tab from top to bottom.
- Reliably enters Detail View (or PDF viewer for circulars) for each card.
- Accurately extracts and deduplicates attachment filenames.
- Preserves raw accessibility XML dump for each card.
- Runs multiple times and performs strict cross-run comparison.
"""

import os
import sys
import time
import subprocess
import xml.etree.ElementTree as ET
import json
import re
from pathlib import Path

# Fix Windows console encoding
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

ADB_PATH = os.path.expandvars(r"%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe")

IGNORED_CHROME = {
    "tab ", "show menu", "open navigation", "about", "class options for",
    "class comments for", "class comment", "add class comment", "toggle menu",
    "annotation", "google classroom", "search", "filter", "share", "tasks due"
}

def run_adb(args: list[str]) -> str:
    cmd = [ADB_PATH] + args
    result = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    return result.stdout.strip()

def enforce_portrait():
    run_adb(["shell", "settings put system accelerometer_rotation 0"])
    run_adb(["shell", "settings put system user_rotation 0"])

def dump_ui(remote_path: str, local_path: Path) -> bool:
    local_path.parent.mkdir(parents=True, exist_ok=True)
    res = run_adb(["shell", f"uiautomator dump {remote_path}"])
    if "dumped to" in res:
        run_adb(["pull", remote_path, str(local_path)])
        return local_path.exists() and local_path.stat().st_size > 0
    return False

def classify_screen(tree: ET.ElementTree) -> str:
    """Classifies the active screen accurately."""
    if tree is None:
        return "UNKNOWN"

    # 1. Drawer open
    if tree.find(".//node[@content-desc='Classes']") is not None:
        return "DRAWER"

    # 2. PDF / Media Viewer
    has_find = any(n.attrib.get("content-desc") == "Find" for n in tree.iter("node"))
    has_comments_btn = any(n.attrib.get("content-desc") == "Comments" for n in tree.iter("node"))
    if has_find and has_comments_btn:
        return "PDF_VIEWER"

    # 3. Class comments activity (separate screen)
    for n in tree.iter("node"):
        if n.attrib.get("content-desc") == "Class comments" and n.attrib.get("bounds") == "[165,154][1069,231]":
            return "COMMENTS_SCREEN"

    # 4. Stream tab active
    has_stream_tab = any("Stream\nTab 1 of 3" in n.attrib.get("content-desc", "") for n in tree.iter("node"))
    has_nav_menu = any(n.attrib.get("content-desc") == "Open navigation menu" for n in tree.iter("node"))
    if has_stream_tab and has_nav_menu:
        return "STREAM"

    # 5. Detail view (Assignment / Material / Announcement)
    has_back_cw = tree.find(".//node[@content-desc='Back to classwork page']") is not None
    has_detail_back = any(n.attrib.get("content-desc") in ["Back", "Navigate up", "Back to classwork page"] and
                         n.attrib.get("bounds") in ["[11,126][143,258]", "[0,104][154,258]"] for n in tree.iter("node"))
    if has_back_cw or (has_detail_back and not has_stream_tab):
        return "DETAIL"

    # 6. Course list
    if any("Grade 3B CAIE" in n.attrib.get("content-desc", "") and n.attrib.get("class") == "android.widget.Button" for n in tree.iter("node")) and not has_stream_tab:
        return "COURSE_LIST"

    return "UNKNOWN"

def get_current_screen_type(temp_xml: Path = Path("scratch/cur_screen.xml")) -> tuple[str, ET.ElementTree]:
    dump_ui("/sdcard/cur_screen.xml", temp_xml)
    try:
        tree = ET.parse(temp_xml)
        stype = classify_screen(tree)
        return stype, tree
    except Exception:
        return "UNKNOWN", None

def return_to_stream():
    """Guarantees a clean return to the Stream tab without leaving the course."""
    for _ in range(8):
        stype, tree = get_current_screen_type()
        if stype == "STREAM":
            return True
        if stype == "DRAWER":
            run_adb(["shell", "input keyevent 4"])
            time.sleep(0.5)
            continue
        if stype == "COMMENTS_SCREEN":
            run_adb(["shell", "input tap 77 192"])
            time.sleep(0.6)
            continue
        if stype in ["DETAIL", "PDF_VIEWER"]:
            run_adb(["shell", "input tap 77 192"])
            time.sleep(0.8)
            continue
        if stype == "COURSE_LIST":
            # Re-enter course
            if tree is not None:
                for btn in tree.findall(".//node[@class='android.widget.Button']"):
                    desc = btn.attrib.get("content-desc", "")
                    if "Grade 3B CAIE" in desc and "Class options" not in desc:
                        m = re.findall(r"\d+", btn.attrib.get("bounds", ""))
                        if len(m) == 4:
                            cx = (int(m[0]) + int(m[2])) // 2
                            cy = (int(m[1]) + int(m[3])) // 2
                            run_adb(["shell", f"input tap {cx} {cy}"])
                            time.sleep(1.5)
                            break
            continue
        # Fallback keyevent 4
        run_adb(["shell", "input keyevent 4"])
        time.sleep(0.6)
    return False

def rewind_to_top():
    return_to_stream()
    print("  [REWIND] Rewinding stream to the very top...", flush=True)
    for i in range(80):
        run_adb(["shell", "input swipe 540 600 540 1900 150"])
        time.sleep(0.12)
        if i % 10 == 0 and i > 0:
            stype, tree = get_current_screen_type(Path("scratch/rewind_chk.xml"))
            if tree is not None:
                for img in tree.findall(".//node[@class='android.widget.ImageView']"):
                    if "Grade 3B CAIE" in img.attrib.get("content-desc", ""):
                        print(f"  [REWIND] Top banner reached at swipe {i}.", flush=True)
                        break
                else:
                    continue
                break

    for _ in range(3):
        run_adb(["shell", "input swipe 540 600 540 1600 250"])
        time.sleep(0.2)
    time.sleep(1.5)
    return_to_stream()

def parse_stream_cards(tree: ET.ElementTree) -> list[dict]:
    """Extracts all post cards visible on the stream."""
    if tree is None:
        return []

    cards = []
    root = tree.getroot()
    scrolls = root.findall(".//node[@class='android.widget.ScrollView']")
    if not scrolls:
        scrolls = root.findall(".//node[@scrollable='true']")
    if not scrolls:
        scrolls = [root]

    scroll = scrolls[0]
    for child in scroll.findall(".//node"):
        cls = child.attrib.get("class", "")
        desc = child.attrib.get("content-desc", "").strip()
        txt = child.attrib.get("text", "").strip()
        bounds_str = child.attrib.get("bounds", "")
        val = desc or txt

        if not val or cls != "android.widget.Button":
            continue

        lower = val.lower()
        if any(lower.startswith(ch) or ch in lower for ch in IGNORED_CHROME):
            continue

        lines = [l.strip() for l in val.split("\n") if l.strip()]
        if not lines:
            continue

        title = lines[0]
        date = lines[1] if len(lines) > 1 else ""

        is_post = (
            any(k in lower for k in ["new material", "assignment", "dear parents", "posted", "yesterday", "edited", "jul", "aug", "sep", "oct", "jun", "am", "pm"]) or
            len(val) > 20
        )

        if is_post and len(title) > 3:
            m = re.findall(r"\d+", bounds_str)
            if len(m) == 4:
                x1, y1, x2, y2 = map(int, m)
                cards.append({
                    "title": title,
                    "date": date,
                    "raw_text": val,
                    "bounds": (x1, y1, x2, y2),
                    "fingerprint": f"{title}|{date}"
                })
    return cards

def extract_attachments(tree: ET.ElementTree, screen_type: str, fallback_title: str) -> tuple[str, str, list[str]]:
    """Accurately extracts post title, preview, and deduplicated attachment filenames."""
    if tree is None:
        return fallback_title, "", []

    attachments = []
    seen = set()
    post_title = ""
    body_texts = []

    if screen_type == "PDF_VIEWER":
        for n in tree.iter("node"):
            if n.attrib.get("class") == "android.widget.TextView":
                txt = n.attrib.get("text", "").strip()
                if any(txt.lower().endswith(ext) for ext in [".pdf", ".mp3", ".docx", ".xlsx", ".pptx", ".jpg", ".png"]):
                    if txt.lower() not in seen:
                        seen.add(txt.lower())
                        attachments.append(txt)
                        post_title = txt
        return post_title or fallback_title, "PDF Preview", attachments

    # DETAIL view
    for n in tree.iter("node"):
        cls = n.attrib.get("class", "")
        desc = n.attrib.get("content-desc", "").strip()
        txt = n.attrib.get("text", "").strip()
        val = desc or txt

        # 1. More options for attachment <name>
        m = re.search(r"More options for attachment\s+(.+)", desc, re.IGNORECASE)
        if m:
            name = m.group(1).strip()
            if name and name.lower() not in seen:
                seen.add(name.lower())
                attachments.append(name)
            continue

        # 2. Button with file extension
        if cls == "android.widget.Button":
            if any(desc.lower().endswith(ext) for ext in [".pdf", ".mp3", ".docx", ".xlsx", ".pptx", ".jpg", ".png", ".mp4", ".zip"]):
                if desc.lower() not in seen:
                    seen.add(desc.lower())
                    attachments.append(desc)

        # 3. Post title and body text
        if cls == "android.view.View" and val:
            if not post_title and len(val) > 3 and not any(k in val.lower() for k in ["back to", "show menu", "attachments", "class comments", "save all"]):
                post_title = val.split("\n")[0].strip()
            elif len(val) > 10 and not any(k in val.lower() for k in ["class comments", "no comments", "add class comment"]):
                body_texts.append(val)

    body_preview = " ".join(body_texts)[:200]
    return post_title or fallback_title, body_preview, attachments

def harvest_detail_run(run_id: int, base_dir: Path) -> list[dict]:
    print(f"\n{'='*70}", flush=True)
    print(f"  STARTING DETAIL VIEW HARVEST: RUN #{run_id}", flush=True)
    print(f"{'='*70}", flush=True)

    run_dir = base_dir / f"run_{run_id}"
    cards_xml_dir = run_dir / "cards"
    cards_xml_dir.mkdir(parents=True, exist_ok=True)

    summary_json_path = run_dir / "summary.json"
    summary_txt_path = run_dir / "summary.txt"

    enforce_portrait()
    rewind_to_top()

    visited_fingerprints = set()
    harvested_results = []
    card_index = 0
    consecutive_static = 0

    while consecutive_static < 15:
        return_to_stream()
        stype, stream_tree = get_current_screen_type(Path(f"scratch/stream_step_r{run_id}.xml"))
        if stype != "STREAM" or stream_tree is None:
            time.sleep(1.0)
            continue

        visible_cards = parse_stream_cards(stream_tree)
        new_cards_in_viewport = [c for c in visible_cards if c["fingerprint"] not in visited_fingerprints]

        # Filter cards whose top is comfortably within the visible area (290 to 1850 px)
        actionable_cards = []
        for c in new_cards_in_viewport:
            x1, y1, x2, y2 = c["bounds"]
            if 290 <= y1 <= 1850:
                actionable_cards.append(c)

        if not actionable_cards:
            too_high = [c for c in new_cards_in_viewport if c["bounds"][1] < 290]
            if too_high:
                # Scroll down slightly to bring top into view
                run_adb(["shell", "input swipe 540 600 540 1000 200"])
                time.sleep(1.2)
                continue
            else:
                consecutive_static += 1
                print(f"  [STREAM] Scrolling forward (Retry {consecutive_static}/15)...", flush=True)
                run_adb(["shell", "input swipe 540 1650 540 900 280"])
                time.sleep(1.5)
                continue

        consecutive_static = 0

        for card in actionable_cards:
            fp = card["fingerprint"]
            if fp in visited_fingerprints:
                continue

            x1, y1, x2, y2 = card["bounds"]
            card_title = card["title"]
            card_date = card["date"]

            # Tap upper third of the card
            tap_x = (x1 + x2) // 2
            tap_y = min(y1 + 75, (y1 + y2) // 2)

            run_adb(["shell", f"input tap {tap_x} {tap_y}"])
            time.sleep(1.4)

            # Check resulting screen
            detail_xml_temp = Path(f"scratch/detail_chk_r{run_id}.xml")
            stype, detail_tree = get_current_screen_type(detail_xml_temp)

            # If comments dialog opened, dismiss it and tap slightly higher
            if stype == "COMMENTS_SCREEN":
                run_adb(["shell", "input tap 77 192"]) # dismiss comments
                time.sleep(0.6)
                tap_y = y1 + 45
                run_adb(["shell", f"input tap {tap_x} {tap_y}"])
                time.sleep(1.4)
                stype, detail_tree = get_current_screen_type(detail_xml_temp)

            # If still on Stream, re-tap with midpoint offset
            if stype == "STREAM":
                tap_y = (y1 + y2) // 2
                run_adb(["shell", f"input tap {tap_x} {tap_y}"])
                time.sleep(1.4)
                stype, detail_tree = get_current_screen_type(detail_xml_temp)

            if stype not in ["DETAIL", "PDF_VIEWER"]:
                print(f"  [WARNING] Card \"{card_title[:30]}\" did not open detail view (Screen: {stype}). Skipping.", flush=True)
                return_to_stream()
                visited_fingerprints.add(fp)
                continue

            card_index += 1
            card_xml_save = cards_xml_dir / f"card_{card_index:03d}.xml"

            # Save raw XML dump
            if detail_xml_temp.exists():
                card_xml_save.write_text(detail_xml_temp.read_text(encoding="utf-8", errors="replace"), encoding="utf-8")

            # Extract detail info and attachments
            parsed_title, body_prev, attachments = extract_attachments(detail_tree, stype, card_title)
            final_title = parsed_title or card_title
            att_count = len(attachments)

            item_record = {
                "index": card_index,
                "title": final_title,
                "stream_date": card_date,
                "screen_type": stype,
                "attachment_count": att_count,
                "attachments": attachments,
                "body_preview": body_prev,
                "xml_file": f"cards/card_{card_index:03d}.xml"
            }
            harvested_results.append(item_record)
            visited_fingerprints.add(fp)

            att_summary_str = f"({att_count} attachments: {', '.join(attachments)})" if att_count > 0 else "(0 attachments)"
            print(f"  [CARD #{card_index:03d} - {stype}] \"{final_title[:42]}\" | {card_date} -> {att_summary_str}", flush=True)

            # Safely return to stream
            return_to_stream()

        # After actionable cards processed, scroll forward
        run_adb(["shell", "input swipe 540 1650 540 900 280"])
        time.sleep(1.2)

    # Save summary files
    with open(summary_json_path, "w", encoding="utf-8") as f:
        json.dump(harvested_results, f, indent=2, ensure_ascii=False)

    with open(summary_txt_path, "w", encoding="utf-8") as f:
        f.write(f"CLASSROOM STREAM DETAIL VIEW HARVEST SUMMARY - RUN #{run_id}\n")
        f.write(f"Total Cards Captured: {len(harvested_results)}\n")
        f.write(f"Total Attachments Counted: {sum(r['attachment_count'] for r in harvested_results)}\n")
        f.write("="*80 + "\n\n")
        for r in harvested_results:
            atts_str = f"[{', '.join(r['attachments'])}]" if r['attachments'] else "None"
            f.write(f"#{r['index']:03d} | [{r['screen_type']}] Title: {r['title']}\n")
            f.write(f"     Date: {r['stream_date']} | Attachments: {r['attachment_count']} -> {atts_str}\n")
            f.write(f"     XML Dump: {r['xml_file']}\n")
            f.write("-" * 80 + "\n")

    print(f"\n[RUN #{run_id} COMPLETE] Captured {len(harvested_results)} cards with {sum(r['attachment_count'] for r in harvested_results)} attachments.", flush=True)
    print(f"Summary JSON: {summary_json_path}", flush=True)
    print(f"Summary TXT: {summary_txt_path}", flush=True)
    return harvested_results

def compare_harvest_runs(run1_results: list[dict], run2_results: list[dict]):
    print(f"\n{'='*70}", flush=True)
    print(f"  CROSS-RUN COMPARISON: RUN 1 vs RUN 2", flush=True)
    print(f"{'='*70}", flush=True)

    print(f"Total Cards: Run 1 = {len(run1_results)}, Run 2 = {len(run2_results)}")
    r1_total_atts = sum(r["attachment_count"] for r in run1_results)
    r2_total_atts = sum(r["attachment_count"] for r in run2_results)
    print(f"Total Attachments: Run 1 = {r1_total_atts}, Run 2 = {r2_total_atts}")

    min_len = min(len(run1_results), len(run2_results))
    mismatches = 0

    for i in range(min_len):
        r1 = run1_results[i]
        r2 = run2_results[i]

        title_match = r1["title"].lower().strip() == r2["title"].lower().strip()
        att_match = r1["attachment_count"] == r2["attachment_count"]
        files_match = set(a.lower() for a in r1["attachments"]) == set(a.lower() for a in r2["attachments"])

        if not (title_match and att_match and files_match):
            mismatches += 1
            print(f"  [MISMATCH #{i+1}]:")
            print(f"    Run 1: \"{r1['title']}\" -> {r1['attachment_count']} atts ({r1['attachments']})")
            print(f"    Run 2: \"{r2['title']}\" -> {r2['attachment_count']} atts ({r2['attachments']})")

    if mismatches == 0 and len(run1_results) == len(run2_results):
        print(f"\n✓ 100% PERFECT MATCH ACROSS ALL {len(run1_results)} CARDS AND {r1_total_atts} ATTACHMENTS!")
    else:
        print(f"\nTotal Mismatches: {mismatches}")

def main():
    base_dir = Path("detail_dumps")
    base_dir.mkdir(parents=True, exist_ok=True)

    # Execute Run 1
    run1 = harvest_detail_run(1, base_dir)

    # Execute Run 2
    run2 = harvest_detail_run(2, base_dir)

    # Compare
    compare_harvest_runs(run1, run2)

if __name__ == "__main__":
    main()
