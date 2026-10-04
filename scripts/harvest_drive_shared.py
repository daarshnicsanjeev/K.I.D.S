#!/usr/bin/env python3
"""
Google Drive Shared Tab Harvester
Extracts all shared files, PDFs, worksheets, and folders from Google Drive Shared view.
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

def parse_drive_shared_items(xml_path: Path) -> list[dict]:
    tree = ET.parse(xml_path)
    root = tree.getroot()
    items = []

    for node in root.findall(".//node"):
        desc = node.attrib.get("content-desc", "").strip()
        prefix = "More actions for "
        if desc.startswith(prefix):
            file_name = desc[len(prefix):].strip()
            bounds = node.attrib.get("bounds", "")
            items.append({
                "fileName": file_name,
                "moreActionsDesc": desc,
                "bounds": bounds
            })

    return items

def harvest_entire_drive_shared(output_json: str = "drive_shared_full.json") -> list[dict]:
    print("[DRIVE HARVESTER] Starting Google Drive Shared tab harvest...")
    all_files = []
    seen_files = set()
    consecutive_static = 0

    print("[DRIVE HARVESTER] Rewinding to top of Drive Shared tab...")
    for _ in range(10):
        run_adb(["shell", "input swipe 540 600 540 1900 200"])
        time.sleep(0.3)

    time.sleep(1.2)

    pass_num = 0
    max_passes = 100

    while consecutive_static < 6 and pass_num < max_passes:
        pass_num += 1
        xml_file = dump_ui_xml(f"drive_pass_{pass_num}.xml")
        items = parse_drive_shared_items(xml_file)

        new_in_pass = 0
        for item in items:
            key = item["fileName"].strip().lower()
            if key not in seen_files:
                seen_files.add(key)
                item["index"] = len(all_files) + 1
                all_files.append(item)
                new_in_pass += 1
                print(f"  #{item['index']}: {item['fileName']}")

        if new_in_pass == 0:
            consecutive_static += 1
            print(f"  [Pass {pass_num}] Static screen (count={consecutive_static}). Waiting 1.5s for pagination...")
            time.sleep(1.5)
        else:
            consecutive_static = 0

        # Scroll down
        run_adb(["shell", "input swipe 540 1600 540 700 350"])
        time.sleep(0.5)

    print(f"\n=======================================================")
    print(f"[DRIVE HARVESTER COMPLETED] Total shared files discovered: {len(all_files)}")
    print(f"=======================================================")
    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(all_files, f, indent=2, ensure_ascii=False)
    print(f"[DRIVE HARVESTER] Saved ground-truth dump to {output_json}")
    return all_files

if __name__ == "__main__":
    harvest_entire_drive_shared()
