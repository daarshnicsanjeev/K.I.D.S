#!/usr/bin/env python3
"""
Classroom Stream Detail View & Attachment Harvester
- Visits every single card on the Stream tab in detail view.
- Counts and logs all attachments for each card.
- Saves the full raw accessibility XML dump for each card.
- Runs multiple times and generates cross-run comparison reports.
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

def is_detail_view(xml_path: Path) -> bool:
    if not xml_path.exists():
        return False
    try:
        tree = ET.parse(xml_path)
        for n in tree.iter("node"):
            desc = n.attrib.get("content-desc", "").lower()
            txt = n.attrib.get("text", "").lower()
            if "back to classwork page" in desc or "attachments" in desc or "save all files offline" in desc or "class comments" in desc:
                return True
    except Exception:
        pass
    return False

def is_stream_view(xml_path: Path) -> bool:
    if not xml_path.exists():
        return False
    try:
        tree = ET.parse(xml_path)
        for n in tree.iter("node"):
            desc = n.attrib.get("content-desc", "")
            if "Stream" in desc and "Tab 1 of 3" in desc:
                return True
            if "Grade 3B CAIE" in desc and n.attrib.get("class") == "android.widget.ImageView":
                return True
    except Exception:
        pass
    return False

def ensure_stream_view():
    """Guarantees the active window is the Stream tab of Grade 3B CAIE."""
    enforce_portrait()
    run_adb(["shell", "input keyevent 224"])  # Wake up screen

    dumpsys = run_adb(["shell", "dumpsys window | grep mCurrentFocus"])
    if "com.google.android.apps.classroom" not in dumpsys:
        print("  [RECOVERY] Classroom not in focus. Bringing Classroom to front...", flush=True)
        run_adb(["shell", "monkey -p com.google.android.apps.classroom -c android.intent.category.LAUNCHER 1"])
        time.sleep(2.0)

    remote_xml = "/sdcard/stream_guard.xml"
    local_guard = Path("scratch/stream_guard.xml")
    if dump_ui(remote_xml, local_guard):
        try:
            tree = ET.parse(local_guard)
            # If in Detail View, tap in-app Back button!
            back_btn = tree.find(".//node[@content-desc='Back to classwork page']")
            if back_btn is not None:
                print("  [RECOVERY] Trapped in detail view. Returning to stream...", flush=True)
                run_adb(["shell", "input tap 77 192"])
                time.sleep(1.0)
                return ensure_stream_view()

            # If in Course List, tap Grade 3B CAIE
            for btn in tree.findall(".//node[@class='android.widget.Button']"):
                desc = btn.attrib.get("content-desc", "")
                if "Grade 3B CAIE" in desc and "Class options" not in desc:
                    print("  [RECOVERY] In course list. Tapping Grade 3B CAIE...", flush=True)
                    m = re.findall(r"\d+", btn.attrib.get("bounds", ""))
                    if len(m) == 4:
                        cx = (int(m[0]) + int(m[2])) // 2
                        cy = (int(m[1]) + int(m[3])) // 2
                        run_adb(["shell", f"input tap {cx} {cy}"])
                        time.sleep(2.0)
                    return ensure_stream_view()

            # If on Stream tab but Stream tab is not selected
            stream_tab = tree.find(".//node[@content-desc='Stream\nTab 1 of 3']")
            if stream_tab is not None and stream_tab.attrib.get("selected") != "true":
                print("  [RECOVERY] Selecting Stream tab...", flush=True)
                run_adb(["shell", "input tap 180 2220"])
                time.sleep(1.0)
        except Exception:
            pass

def return_to_stream_from_detail():
    """Taps the in-app back arrow button to return to the stream safely without exiting app."""
    run_adb(["shell", "input tap 77 192"])
    time.sleep(0.8)

    local_chk = Path("scratch/ret_chk.xml")
    if dump_ui("/sdcard/ret_chk.xml", local_chk):
        if not is_stream_view(local_chk):
            ensure_stream_view()

def rewind_to_top():
    ensure_stream_view()
    print("  [REWIND] Rewinding stream to the very top...", flush=True)
    for i in range(85):
        run_adb(["shell", "input swipe 540 600 540 1900 150"])
        time.sleep(0.12)
        if i % 10 == 0 and i > 0:
            remote_xml = "/sdcard/rewind_chk.xml"
            local_chk = Path("scratch/rewind_chk.xml")
            if dump_ui(remote_xml, local_chk):
                try:
                    tree = ET.parse(local_chk)
                    found = False
                    for img in tree.findall(".//node[@class='android.widget.ImageView']"):
                        if "Grade 3B CAIE" in img.attrib.get("content-desc", ""):
                            print(f"  [REWIND] Top banner reached at swipe {i}.", flush=True)
                            found = True
                            break
                    if found:
                        break
                except Exception:
                    pass

    for _ in range(3):
        run_adb(["shell", "input swipe 540 600 540 1600 250"])
        time.sleep(0.2)
    time.sleep(1.5)

def parse_stream_cards(xml_path: Path) -> list[dict]:
    """Extracts all post cards currently visible in the stream XML."""
    if not xml_path.exists():
        return []
    try:
        tree = ET.parse(xml_path)
    except Exception:
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

def parse_detail_attachments(xml_path: Path) -> tuple[str, str, list[str]]:
    """Extracts post title, instruction text, and all attachment names from detail view XML."""
    if not xml_path.exists():
        return "", "", []
    try:
        tree = ET.parse(xml_path)
    except Exception:
        return "", "", []

    root = tree.getroot()
    attachments = []
    seen_atts = set()
    post_title = ""
    body_texts = []

    for n in root.iter("node"):
        cls = n.attrib.get("class", "")
        desc = n.attrib.get("content-desc", "").strip()
        txt = n.attrib.get("text", "").strip()
        val = desc or txt

        # Attachment detected via "More options for attachment <name>"
        m = re.search(r"More options for attachment\s+(.+)", desc, re.IGNORECASE)
        if m:
            att_name = m.group(1).strip()
            if att_name and att_name.lower() not in seen_atts:
                seen_atts.add(att_name.lower())
                attachments.append(att_name)
            continue

        # Secondary check for attachment buttons with file extensions or media icons
        if cls == "android.widget.Button":
            if any(desc.lower().endswith(ext) for ext in [".pdf", ".mp3", ".docx", ".xlsx", ".pptx", ".jpg", ".png", ".mp4", ".zip"]):
                if desc.lower() not in seen_atts:
                    seen_atts.add(desc.lower())
                    attachments.append(desc)

        # Collect substantive texts
        if cls == "android.view.View" and val:
            if not post_title and len(val) > 3 and not any(k in val.lower() for k in ["back to", "show menu", "attachments", "class comments", "save all"]):
                post_title = val
            elif len(val) > 10 and not any(k in val.lower() for k in ["class comments", "no comments", "add class comment"]):
                body_texts.append(val)

    body_preview = " ".join(body_texts)[:200]
    return post_title, body_preview, attachments

def harvest_detail_run(run_id: int, base_dir: Path) -> list[dict]:
    print(f"\n{'='*70}", flush=True)
    print(f"  STARTING DETAIL VIEW HARVEST: RUN #{run_id}", flush=True)
    print(f"{'='*70}", flush=True)

    run_dir = base_dir / f"run_{run_id}"
    cards_xml_dir = run_dir / "cards"
    cards_xml_dir.mkdir(parents=True, exist_ok=True)

    summary_json_path = run_dir / "summary.json"
    summary_txt_path = run_dir / "summary.txt"

    rewind_to_top()

    visited_fingerprints = set()
    harvested_results = []
    card_index = 0
    consecutive_static = 0

    while consecutive_static < 10:
        ensure_stream_view()
        stream_xml = Path(f"scratch/stream_step_r{run_id}.xml")
        if not dump_ui("/sdcard/stream_step.xml", stream_xml):
            time.sleep(1.0)
            continue

        visible_cards = parse_stream_cards(stream_xml)
        new_cards_in_viewport = [c for c in visible_cards if c["fingerprint"] not in visited_fingerprints]

        if not new_cards_in_viewport:
            consecutive_static += 1
            print(f"  [STREAM] No new unvisited cards in viewport (Retry {consecutive_static}/10)...", flush=True)
            # Gentle scroll forward to reveal more
            run_adb(["shell", "input swipe 540 1650 540 850 320"])
            time.sleep(1.8)
            continue

        consecutive_static = 0

        for card in new_cards_in_viewport:
            fp = card["fingerprint"]
            if fp in visited_fingerprints:
                continue

            x1, y1, x2, y2 = card["bounds"]
            card_title = card["title"]
            card_date = card["date"]

            # Safe vertical viewport bounds
            if y1 < 300:
                # Nudge down so it's not under top bar
                run_adb(["shell", "input swipe 540 600 540 900 200"])
                time.sleep(0.8)
                stream_xml = Path(f"scratch/stream_step_r{run_id}.xml")
                dump_ui("/sdcard/stream_step.xml", stream_xml)
                refreshed = parse_stream_cards(stream_xml)
                matching = [c for c in refreshed if c["fingerprint"] == fp]
                if matching:
                    x1, y1, x2, y2 = matching[0]["bounds"]

            if y2 > 2050:
                # Nudge up so it's not under bottom bar
                run_adb(["shell", "input swipe 540 1200 540 900 200"])
                time.sleep(0.8)
                stream_xml = Path(f"scratch/stream_step_r{run_id}.xml")
                dump_ui("/sdcard/stream_step.xml", stream_xml)
                refreshed = parse_stream_cards(stream_xml)
                matching = [c for c in refreshed if c["fingerprint"] == fp]
                if matching:
                    x1, y1, x2, y2 = matching[0]["bounds"]

            # Tap upper third of the card to avoid clicking comment button
            tap_x = (x1 + x2) // 2
            tap_y = min(y1 + 75, (y1 + y2) // 2)

            run_adb(["shell", f"input tap {tap_x} {tap_y}"])
            time.sleep(1.4)

            # Wait and check for detail view
            detail_xml = Path(f"scratch/detail_chk_r{run_id}.xml")
            dump_ui("/sdcard/detail_chk.xml", detail_xml)

            # If comments dialog opened, dismiss it and tap higher
            if not is_detail_view(detail_xml):
                run_adb(["shell", "input keyevent 4"])
                time.sleep(0.6)
                tap_y = y1 + 45
                run_adb(["shell", f"input tap {tap_x} {tap_y}"])
                time.sleep(1.4)
                dump_ui("/sdcard/detail_chk.xml", detail_xml)

            card_index += 1
            card_xml_save = cards_xml_dir / f"card_{card_index:03d}.xml"

            # Save the raw accessibility XML dump
            if detail_xml.exists():
                card_xml_save.write_text(detail_xml.read_text(encoding="utf-8", errors="replace"), encoding="utf-8")

            # Extract detail information and count attachments
            parsed_title, body_prev, attachments = parse_detail_attachments(card_xml_save)
            final_title = parsed_title or card_title
            att_count = len(attachments)

            item_record = {
                "index": card_index,
                "title": final_title,
                "stream_date": card_date,
                "attachment_count": att_count,
                "attachments": attachments,
                "body_preview": body_prev,
                "xml_file": f"cards/card_{card_index:03d}.xml"
            }
            harvested_results.append(item_record)
            visited_fingerprints.add(fp)

            att_summary_str = f"({att_count} attachments: {', '.join(attachments)})" if att_count > 0 else "(0 attachments)"
            print(f"  [CARD #{card_index:03d}] \"{final_title[:45]}\" | Date: {card_date} -> {att_summary_str}", flush=True)

            # Return back to stream view safely
            return_to_stream_from_detail()

        # After visiting visible cards, scroll forward gently
        run_adb(["shell", "input swipe 540 1650 540 850 320"])
        time.sleep(1.0)

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
            f.write(f"#{r['index']:03d} | Title: {r['title']}\n")
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
