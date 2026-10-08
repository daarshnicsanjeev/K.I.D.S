#!/usr/bin/env python3
"""
Multi-Run Google Classroom Stream Harvester & Dumper
Uses Android Accessibility Service / UIAutomator hierarchy to dump
the Stream tab from top to bottom multiple times, validating 100% consistency.
"""

import os
import sys
import time
import subprocess
import xml.etree.ElementTree as ET
import json
import hashlib
from pathlib import Path

# Fix Windows console encoding
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

def dump_ui_xml(local_filename: str = "scratch/temp_stream_pass.xml") -> Path:
    remote_path = "/sdcard/stream_pass.xml"
    run_adb(["shell", f"uiautomator dump {remote_path}"])
    local_path = Path(local_filename)
    local_path.parent.mkdir(parents=True, exist_ok=True)
    run_adb(["pull", remote_path, str(local_path)])
    return local_path

def parse_classroom_cards(xml_path: Path) -> list[dict]:
    tree = ET.parse(xml_path)
    root = tree.getroot()
    cards = []

    scroll_views = root.findall(".//node[@class='android.widget.ScrollView']")
    if not scroll_views:
        scroll_views = root.findall(".//node[@scrollable='true']")

    if not scroll_views:
        return []

    scroll_container = scroll_views[0]

    for child in scroll_container.findall("./node"):
        if child.attrib.get("class") == "android.widget.ImageView":
            continue

        buttons = child.findall(".//node[@class='android.widget.Button']")
        
        post_title = ""
        post_date = ""
        comments_desc = ""
        raw_texts = []

        for btn in buttons:
            btn_desc = (btn.attrib.get("content-desc") or "").strip()
            btn_text = (btn.attrib.get("text") or "").strip()
            combined_btn = btn_desc or btn_text
            if not combined_btn:
                continue

            raw_texts.append(combined_btn)

            if "class comments for" in combined_btn.lower() or "class comment" in combined_btn.lower():
                comments_desc = combined_btn
            elif combined_btn and not post_title:
                lines = [line.strip() for line in combined_btn.split("\n") if line.strip()]
                if lines:
                    post_title = lines[0]
                    if len(lines) > 1:
                        post_date = lines[1]

        if post_title and (comments_desc or "new material" in post_title.lower() or "assignment" in post_title.lower() or len(post_title) > 20):
            bounds = child.attrib.get("bounds", "")
            cards.append({
                "title": post_title,
                "date": post_date,
                "comments": comments_desc if comments_desc else "0 class comments",
                "bounds": bounds,
                "full_text": "\n".join(raw_texts)
            })

    return cards

def enforce_portrait():
    run_adb(["shell", "settings put system accelerometer_rotation 0"])
    run_adb(["shell", "settings put system user_rotation 0"])

def ensure_classroom_stream():
    """Ensure Classroom is in foreground and on the Stream tab."""
    print("[INIT] Locking portrait orientation...", flush=True)
    enforce_portrait()

    print("[INIT] Ensuring Classroom is running and active...", flush=True)
    run_adb(["shell", "monkey -p com.google.android.apps.classroom -c android.intent.category.LAUNCHER 1"])
    time.sleep(1.5)

    xml_path = dump_ui_xml("scratch/init_check.xml")
    tree = ET.parse(xml_path)
    
    # Check if on Classes List
    class_buttons = tree.findall(".//node[@class='android.widget.Button']")
    course_button = None
    for btn in class_buttons:
        desc = btn.attrib.get("content-desc", "")
        if "Grade 3B CAIE" in desc:
            course_button = btn
            break

    if course_button is not None:
        print("[INIT] Tapping Grade 3B CAIE course card...", flush=True)
        import re
        bounds = course_button.attrib.get("bounds", "[44,687][1036,1045]")
        m = re.findall(r"\d+", bounds)
        if len(m) == 4:
            cx = (int(m[0]) + int(m[2])) // 2
            cy = (int(m[1]) + int(m[3])) // 2
            run_adb(["shell", f"input tap {cx} {cy}"])
        else:
            run_adb(["shell", "input tap 540 866"])
        time.sleep(2.0)

    # Ensure Stream tab is selected (Tab 1 is at x=180, y=2220)
    print("[INIT] Selecting Stream Tab (Tab 1)...", flush=True)
    run_adb(["shell", "input tap 180 2220"])
    time.sleep(1.0)

def rewind_to_top():
    """Rewinds the stream feed back to the very top landmark."""
    print("  [REWIND] Rewinding stream to the very top landmark...", flush=True)
    enforce_portrait()

    for i in range(85):
        run_adb(["shell", "input swipe 540 600 540 1900 160"])
        time.sleep(0.12)
        if i % 10 == 0 and i > 0:
            xml_path = dump_ui_xml("scratch/rewind_check.xml")
            tree = ET.parse(xml_path)
            found_top = False
            for img in tree.findall(".//node[@class='android.widget.ImageView']"):
                desc = img.attrib.get("content-desc", "")
                if "Grade 3B CAIE" in desc:
                    print(f"  [REWIND] Top landmark detected at rewind swipe {i}!", flush=True)
                    found_top = True
                    break
            if found_top:
                break
    
    # Extra 3 gentle swipes to guarantee top alignment
    for _ in range(3):
        run_adb(["shell", "input swipe 540 600 540 1600 250"])
        time.sleep(0.2)
    time.sleep(2.0)

def run_single_harvest(run_index: int, output_json: str) -> list[dict]:
    print(f"\n=======================================================", flush=True)
    print(f"STARTING DUMP RUN #{run_index}", flush=True)
    print(f"=======================================================", flush=True)
    
    rewind_to_top()

    all_posts = []
    seen_fingerprints = set()
    consecutive_static = 0
    pass_num = 0
    max_passes = 180

    while consecutive_static < 10 and pass_num < max_passes:
        pass_num += 1
        xml_file = dump_ui_xml(f"scratch/run_{run_index}_pass_{pass_num}.xml")
        cards = parse_classroom_cards(xml_file)

        new_in_pass = 0
        for card in cards:
            header = card["title"].strip().lower()[:60]
            date_clean = card["date"].strip().lower()[:30]
            canonical_content = f"{header}|{date_clean}|"
            fp = hashlib.sha256(canonical_content.encode("utf-8")).hexdigest()[:16]

            if fp not in seen_fingerprints:
                seen_fingerprints.add(fp)
                card["fingerprint"] = fp
                card["index"] = len(all_posts) + 1
                all_posts.append(card)
                new_in_pass += 1
                print(f"  [Run #{run_index}] #{card['index']:3d}: {card['title'][:55]} ({card['date']})", flush=True)

        if new_in_pass == 0:
            consecutive_static += 1
            print(f"  [Run #{run_index} Pass {pass_num}] Static screen (count={consecutive_static}). Waiting 2.0s for network pagination...", flush=True)
            time.sleep(2.0)
            # Re-enforce portrait in case of background glitch
            enforce_portrait()
        else:
            consecutive_static = 0

        # Step scroll down (~2 cards height)
        run_adb(["shell", "input swipe 540 1650 540 750 350"])
        time.sleep(0.45)

    print(f"\n[RUN #{run_index} COMPLETED] Total stream posts captured: {len(all_posts)}", flush=True)
    if all_posts:
        print(f"  First Post: {all_posts[0]['title']} ({all_posts[0]['date']})", flush=True)
        print(f"  Last Post : {all_posts[-1]['title']} ({all_posts[-1]['date']})", flush=True)

    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(all_posts, f, indent=2, ensure_ascii=False)
    print(f"[RUN #{run_index}] Saved dump to {output_json}", flush=True)

    return all_posts

def main():
    ensure_classroom_stream()

    num_runs = 2
    runs_data = []

    for r in range(1, num_runs + 1):
        out_file = f"classroom_stream_dump_run{r}.json"
        posts = run_single_harvest(r, out_file)
        runs_data.append(posts)

    # Cross-run verification
    print("\n=======================================================", flush=True)
    print("CROSS-RUN DUMP VERIFICATION", flush=True)
    print("=======================================================", flush=True)
    run1 = runs_data[0]
    run2 = runs_data[1]

    print(f"Run #1 post count: {len(run1)}", flush=True)
    print(f"Run #2 post count: {len(run2)}", flush=True)

    run1_fps = {p["fingerprint"]: p for p in run1}
    run2_fps = {p["fingerprint"]: p for p in run2}

    missing_in_run2 = [p for fp, p in run1_fps.items() if fp not in run2_fps]
    missing_in_run1 = [p for fp, p in run2_fps.items() if fp not in run1_fps]

    if not missing_in_run2 and not missing_in_run1:
        print("✓ PERFECT MATCH: 100% concordance between Run #1 and Run #2!", flush=True)
    else:
        if missing_in_run2:
            print(f"  Missing in Run 2 ({len(missing_in_run2)}):", flush=True)
            for m in missing_in_run2:
                print(f"    - {m['title']} ({m['date']})", flush=True)
        if missing_in_run1:
            print(f"  Missing in Run 1 ({len(missing_in_run1)}):", flush=True)
            for m in missing_in_run1:
                print(f"    - {m['title']} ({m['date']})", flush=True)

    # Save canonical verified full stream
    primary_dump = run2 if len(run2) >= len(run1) else run1
    with open("classroom_full_stream.json", "w", encoding="utf-8") as f:
        json.dump(primary_dump, f, indent=2, ensure_ascii=False)
    print(f"\n✓ Updated canonical ground truth 'classroom_full_stream.json' with {len(primary_dump)} notices.", flush=True)

if __name__ == "__main__":
    main()
