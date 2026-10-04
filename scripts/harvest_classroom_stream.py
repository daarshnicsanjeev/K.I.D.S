#!/usr/bin/env python3
"""
Device UI Hierarchy Dumper & Verifier
Extracts complete live post and folder dumps from Google Classroom and Google Drive.
"""

import os
import sys
import time
import subprocess
import xml.etree.ElementTree as ET
import json
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

def dump_ui_xml(local_filename: str) -> Path:
    remote_path = f"/sdcard/{local_filename}"
    run_adb(["shell", f"uiautomator dump {remote_path}"])
    local_path = Path(local_filename)
    run_adb(["pull", remote_path, str(local_path)])
    return local_path

def parse_classroom_cards(xml_path: Path) -> list[dict]:
    tree = ET.parse(xml_path)
    root = tree.getroot()
    cards = []

    # Find the ScrollView
    scroll_views = root.findall(".//node[@class='android.widget.ScrollView']")
    if not scroll_views:
        scroll_views = root.findall(".//node[@scrollable='true']")

    if not scroll_views:
        return []

    scroll_container = scroll_views[0]

    for child in scroll_container.findall("./node"):
        # If it's the cover image (ImageView), skip
        if child.attrib.get("class") == "android.widget.ImageView":
            continue

        buttons = child.findall(".//node[@class='android.widget.Button']")
        
        post_title = ""
        post_date = ""
        comments_desc = ""

        for btn in buttons:
            btn_desc = (btn.attrib.get("content-desc") or "").strip()
            btn_text = (btn.attrib.get("text") or "").strip()
            combined_btn = btn_desc or btn_text

            if "class comments for" in combined_btn.lower() or "class comment" in combined_btn.lower():
                comments_desc = combined_btn
            elif combined_btn and not post_title:
                lines = [line.strip() for line in combined_btn.split("\n") if line.strip()]
                if lines:
                    post_title = lines[0]
                    if len(lines) > 1:
                        post_date = lines[1]

        # Valid card condition:
        # Either has a comment button OR is a post container with text/content
        if post_title and (comments_desc or "new material" in post_title.lower() or "assignment" in post_title.lower() or len(post_title) > 20):
            bounds = child.attrib.get("bounds", "")
            cards.append({
                "title": post_title,
                "date": post_date,
                "comments": comments_desc if comments_desc else "0 class comments",
                "bounds": bounds
            })

    return cards

def harvest_entire_classroom(output_json: str = "classroom_full_stream.json") -> list[dict]:
    print("[CLASSROOM HARVESTER] Starting full Classroom stream harvest...")
    all_posts = []
    seen_titles = set()
    consecutive_static = 0

    print("[CLASSROOM HARVESTER] Ensuring top of stream...")
    for _ in range(12):
        run_adb(["shell", "input swipe 540 600 540 1900 200"])
        time.sleep(0.3)

    time.sleep(1.2)

    pass_num = 0
    max_passes = 120

    while consecutive_static < 7 and pass_num < max_passes:
        pass_num += 1
        xml_file = dump_ui_xml(f"stream_pass_{pass_num}.xml")
        cards = parse_classroom_cards(xml_file)
        
        new_in_pass = 0
        for card in cards:
            # Canonical key: title + first 30 chars of date
            title_key = (card["title"].strip().lower()[:60], card["date"].strip().lower()[:30])
            if title_key not in seen_titles:
                seen_titles.add(title_key)
                card["index"] = len(all_posts) + 1
                all_posts.append(card)
                new_in_pass += 1
                print(f"  #{card['index']}: {card['title'][:55]} ({card['date']})")

        if new_in_pass == 0:
            consecutive_static += 1
            print(f"  [Pass {pass_num}] Static screen (count={consecutive_static}). Waiting 1.8s for network pagination...")
            time.sleep(1.8)
        else:
            consecutive_static = 0

        # Scroll down
        run_adb(["shell", "input swipe 540 1650 540 750 350"])
        time.sleep(0.5)

    print(f"\n=======================================================")
    print(f"[CLASSROOM HARVESTER COMPLETED] Total notices discovered: {len(all_posts)}")
    print(f"=======================================================")
    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(all_posts, f, indent=2, ensure_ascii=False)
    print(f"[CLASSROOM HARVESTER] Saved ground-truth dump to {output_json}")
    return all_posts

if __name__ == "__main__":
    harvest_entire_classroom()
