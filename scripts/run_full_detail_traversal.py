#!/usr/bin/env python3
"""
Full Deterministic Classroom Detail Traversal Pipeline with Internal Detail Scrolling
Traverses the ENTIRE academic year (all 190 posts from Oct 7 down to Jun 10).
Enters every card's detail view, scrolls internally to capture all attachments,
saves raw accessibility XML hierarchy dumps for every card, and verifies multi-run consistency.
"""

import os
import sys
import time
import json
import re
from pathlib import Path
import xml.etree.ElementTree as ET
import subprocess

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

ADB_PATH = os.path.expandvars(r"%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe")

def run_adb(args: list[str]) -> str:
    cmd = [ADB_PATH] + args
    result = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    return result.stdout.strip()

def enforce_portrait():
    run_adb(["shell", "settings put system accelerometer_rotation 0"])
    run_adb(["shell", "settings put system user_rotation 0"])
    run_adb(["shell", "input keyevent 224"])
    run_adb(["shell", "wm dismiss-keyguard"])

def is_stream_feed(root) -> bool:
    """Checks if the current screen is the Classroom Stream feed."""
    scroll = root.find(".//node[@class='android.widget.ScrollView']")
    if scroll is None:
        scroll = root.find(".//node[@scrollable='true']")
    if scroll is None:
        return False
    # Check if there are cards/buttons inside
    for btn in scroll.findall(".//node[@class='android.widget.Button']"):
        desc = btn.attrib.get("content-desc", "").lower()
        if "material" in desc or "assignment" in desc or "announced" in desc or "comments" in desc:
            return True
    return False

def ensure_back_to_stream(max_backs=5):
    """Presses Back until we are confirmed to be on the Stream feed. NEVER restarts the app."""
    for _ in range(max_backs):
        run_adb(["shell", "uiautomator dump /sdcard/stream_check.xml"])
        run_adb(["pull", "/sdcard/stream_check.xml", "scratch/stream_check.xml"])
        try:
            tree = ET.parse("scratch/stream_check.xml")
            if is_stream_feed(tree.getroot()):
                return True
        except Exception:
            pass
        run_adb(["shell", "input keyevent 4"])
        time.sleep(0.5)
    return False

def setup_stream_top():
    enforce_portrait()
    run_adb(["shell", "monkey -p com.google.android.apps.classroom -c android.intent.category.LAUNCHER 1"])
    time.sleep(2.0)

    run_adb(["shell", "uiautomator dump /sdcard/setup.xml"])
    run_adb(["pull", "/sdcard/setup.xml", "scratch/setup.xml"])
    try:
        tree = ET.parse("scratch/setup.xml")
        root = tree.getroot()
        for btn in root.findall(".//node[@class='android.widget.Button']"):
            desc = btn.attrib.get("content-desc", "")
            if "Grade 3B CAIE" in desc:
                bounds = btn.attrib.get("bounds", "")
                m = re.findall(r"\d+", bounds)
                if len(m) == 4:
                    cx = (int(m[0]) + int(m[2])) // 2
                    cy = (int(m[1]) + int(m[3])) // 2
                    run_adb(["shell", f"input tap {cx} {cy}"])
                    time.sleep(2.0)
                break
    except Exception:
        pass

    # Tap Stream tab at bottom
    run_adb(["shell", "input tap 180 2220"])
    time.sleep(1.0)

    # Rewind to top
    print("  [REWIND] Rewinding to the very top of the stream...", flush=True)
    for _ in range(75):
        run_adb(["shell", "input swipe 540 600 540 1900 150"])
        time.sleep(0.1)
    time.sleep(1.5)

def is_attachment(desc: str) -> bool:
    desc = desc.strip()
    if not desc:
        return False
    if desc.startswith("More options") or desc == "Save all files offline" or desc == "Back to classwork page" or desc == "Show menu":
        return False
    exts = ('.pdf', '.mp3', '.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt', '.jpeg', '.jpg', '.png', '.txt', '.zip')
    if any(desc.lower().endswith(ext) for ext in exts):
        return True
    return False

def run_single_traversal(run_id: int, base_dir: Path) -> list[dict]:
    print(f"\n=======================================================", flush=True)
    print(f"STARTING FULL ACADEMIC YEAR TRAVERSAL: RUN #{run_id}", flush=True)
    print(f"=======================================================", flush=True)

    setup_stream_top()

    run_dir = base_dir / f"run_{run_id}"
    cards_dir = run_dir / "cards"
    cards_dir.mkdir(parents=True, exist_ok=True)

    visited_cards = []
    seen_card_keys = set()
    consecutive_static_screens = 0
    last_screen_nodes = []
    stream_step = 0

    SAFE_Y_MIN = 350
    SAFE_Y_MAX = 1950 # strictly avoid the bottom navigation bar at 2220

    # Continue until physically at bottom of stream (June 10)
    reached_june_10 = False

    while consecutive_static_screens < 10 and len(visited_cards) < 220:
        stream_step += 1

        remote_xml = f"/sdcard/stream_step_{stream_step}.xml"
        run_adb(["shell", f"uiautomator dump {remote_xml}"])
        local_stream_xml = run_dir / f"stream_step_{stream_step:03d}.xml"
        run_adb(["pull", remote_xml, str(local_stream_xml)])

        try:
            tree = ET.parse(local_stream_xml)
            root = tree.getroot()
        except Exception as e:
            print(f"  [ERROR] Parsing stream step XML: {e}", flush=True)
            ensure_back_to_stream()
            continue

        scroll = root.find(".//node[@class='android.widget.ScrollView']")
        if scroll is None:
            scroll = root.find(".//node[@scrollable='true']")
        if scroll is None:
            print("  [WARN] Not on stream feed. Restoring...", flush=True)
            ensure_back_to_stream()
            continue

        # Check for June 10 bottom marker
        for node in scroll.findall(".//node"):
            desc = node.attrib.get("content-desc", "")
            txt = node.attrib.get("text", "")
            val = desc or txt
            if "Jun 10" in val and "Addition and Subtraction" in val:
                reached_june_10 = True

        # Extract visible cards on this screen
        cards_on_screen = []
        current_signatures = []

        for child in scroll.findall("./node"):
            if child.attrib.get("class") == "android.widget.ImageView":
                continue

            buttons = child.findall(".//node[@class='android.widget.Button']")
            title = ""
            date = ""
            card_btn = None
            inline_chips = []

            for b in buttons:
                desc = (b.attrib.get("content-desc") or "").strip()
                txt = (b.attrib.get("text") or "").strip()
                val = desc or txt
                if not val:
                    continue
                current_signatures.append((val, b.attrib.get("bounds", "")))
                if "class comments for" in val.lower() or "class comment" in val.lower():
                    continue
                elif is_attachment(val):
                    inline_chips.append(val)
                elif not title:
                    lines = [l.strip() for l in val.split("\n") if l.strip()]
                    if lines:
                        title = lines[0]
                        if len(lines) > 1:
                            date = lines[1]
                        card_btn = b

            if title:
                key = (title.strip().lower()[:60], date.strip().lower()[:30])
                cards_on_screen.append({
                    "key": key,
                    "title": title,
                    "date": date,
                    "card_btn": card_btn,
                    "inline_chips": inline_chips
                })

        found_new_on_screen = False

        for card_data in cards_on_screen:
            key = card_data["key"]
            if key in seen_card_keys:
                continue

            card_btn = card_data["card_btn"]
            if card_btn is None:
                continue

            bounds = card_btn.attrib.get("bounds", "")
            m = [int(x) for x in re.findall(r"\d+", bounds)]
            if len(m) != 4:
                continue

            cy = (m[1] + m[3]) // 2
            cx = (m[0] + m[2]) // 2

            # Guard against tapping outside safe screen bounds
            if m[3] > SAFE_Y_MAX or cy > SAFE_Y_MAX:
                run_adb(["shell", "input swipe 540 1600 540 1100 300"])
                time.sleep(0.5)
                found_new_on_screen = True
                break

            if m[1] < SAFE_Y_MIN or cy < SAFE_Y_MIN:
                if cy < 280:
                    continue

            card_idx = len(visited_cards) + 1
            seen_card_keys.add(key)
            title = card_data["title"]
            date = card_data["date"]
            print(f"\n[Run #{run_id}] Visiting Card #{card_idx:03d}: '{title}' ({date}) at ({cx}, {cy})...", flush=True)

            # Tap the card
            run_adb(["shell", f"input tap {cx} {cy}"])
            time.sleep(1.4)

            # Dump detail screen
            remote_detail = f"/sdcard/detail_card_{card_idx}.xml"
            run_adb(["shell", f"uiautomator dump {remote_detail}"])
            local_detail_xml = cards_dir / f"card_{card_idx:03d}.xml"
            run_adb(["pull", remote_detail, str(local_detail_xml)])

            try:
                dtree = ET.parse(local_detail_xml)
                droot = dtree.getroot()
            except Exception:
                droot = None

            is_detail_screen = False
            attachments = []
            seen_att_names = set()

            # Add inline chips from stream card
            for chip in card_data["inline_chips"]:
                if chip not in seen_att_names:
                    seen_att_names.add(chip)
                    attachments.append(chip)

            if droot is not None:
                first_node = droot.find(".//node")
                pkg = first_node.attrib.get("package", "") if first_node is not None else ""
                
                if pkg != "com.google.android.apps.classroom":
                    print(f"  -> External viewer opened ({pkg}). Extracting attachment & returning...", flush=True)
                    for tv in droot.findall(".//node[@class='android.widget.TextView']"):
                        t_txt = tv.attrib.get("text", "").strip()
                        if is_attachment(t_txt) and t_txt not in seen_att_names:
                            seen_att_names.add(t_txt)
                            attachments.append(t_txt)
                    ensure_back_to_stream()
                else:
                    is_detail_screen = any(
                        b.attrib.get("content-desc") in ["Back to classwork page", "Navigate up", "Back"]
                        for b in droot.findall(".//node[@class='android.widget.Button']")
                    )

            if is_detail_screen:
                print(f"  -> Entered DETAIL screen. Collecting attachments with internal scrolling...", flush=True)
                for detail_scroll in range(12):
                    if detail_scroll > 0:
                        run_adb(["shell", f"uiautomator dump /sdcard/detail_scroll.xml"])
                        scroll_xml = run_dir / f"card_{card_idx:03d}_scroll_{detail_scroll}.xml"
                        run_adb(["pull", "/sdcard/detail_scroll.xml", str(scroll_xml)])
                        try:
                            dtree = ET.parse(scroll_xml)
                            droot = dtree.getroot()
                        except Exception:
                            break

                    new_atts = 0
                    for btn in droot.findall(".//node[@class='android.widget.Button']"):
                        desc = btn.attrib.get("content-desc", "").strip()
                        if is_attachment(desc) and desc not in seen_att_names:
                            seen_att_names.add(desc)
                            attachments.append(desc)
                            new_atts += 1
                            print(f"     + Found attachment: {desc}", flush=True)

                    if new_atts == 0 and detail_scroll > 0:
                        break

                    run_adb(["shell", "input swipe 540 1800 540 600 350"])
                    time.sleep(0.5)

                ensure_back_to_stream()
            else:
                print(f"  -> Announcement / Inline Post. Attachments captured: {len(attachments)}", flush=True)
                ensure_back_to_stream()

            card_record = {
                "index": card_idx,
                "key": list(key),
                "title": title,
                "date": date,
                "is_detail_screen": is_detail_screen,
                "attachments": attachments,
                "attachment_count": len(attachments),
                "xml_file": str(local_detail_xml.name)
            }
            visited_cards.append(card_record)
            print(f"  [Summary] Card #{card_idx:03d} complete: {len(attachments)} attachments captured.", flush=True)
            found_new_on_screen = True
            consecutive_static_screens = 0
            break

        if not found_new_on_screen:
            if current_signatures == last_screen_nodes:
                consecutive_static_screens += 1
                if reached_june_10 and consecutive_static_screens >= 3:
                    print("  [BOTTOM REACHED] Confirmed end of stream at June 10. Traversal complete!", flush=True)
                    break
            else:
                consecutive_static_screens = 0

            last_screen_nodes = current_signatures
            run_adb(["shell", "input swipe 540 1650 540 750 350"])
            time.sleep(0.5)

    summary_path = run_dir / "summary.json"
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(visited_cards, f, indent=2, ensure_ascii=False)

    total_atts = sum(c["attachment_count"] for c in visited_cards)
    print(f"\n=======================================================", flush=True)
    print(f"RUN #{run_id} COMPLETE: {len(visited_cards)} cards, {total_atts} attachments.", flush=True)
    print(f"Summary saved to {summary_path}", flush=True)
    print(f"=======================================================", flush=True)

    return visited_cards

def main():
    base_dir = Path("detail_dumps_v3")
    base_dir.mkdir(parents=True, exist_ok=True)

    start_run = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    end_run = int(sys.argv[2]) if len(sys.argv) > 2 else 2

    for r in range(start_run, end_run + 1):
        run_single_traversal(r, base_dir)

    print("\n=======================================================", flush=True)
    print("ALL RUNS COMPLETE. RUNNING COMPARISON...", flush=True)
    print("=======================================================", flush=True)

    cmd = [sys.executable, "scripts/compare_detail_runs_v3.py"]
    subprocess.run(cmd)

if __name__ == "__main__":
    main()
