#!/usr/bin/env python3
"""
Raw Unprocessed Google Classroom Stream Dumper
Dumps the complete raw UIAutomator / Accessibility hierarchy and raw text
from start to end of the Stream tab without any processing, filtering, or deduplication.
Runs multiple times as requested.
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

def enforce_portrait():
    run_adb(["shell", "settings put system accelerometer_rotation 0"])
    run_adb(["shell", "settings put system user_rotation 0"])

def ensure_classroom_stream():
    enforce_portrait()
    run_adb(["shell", "monkey -p com.google.android.apps.classroom -c android.intent.category.LAUNCHER 1"])
    time.sleep(1.5)

    remote_xml = "/sdcard/check_stream.xml"
    run_adb(["shell", f"uiautomator dump {remote_xml}"])
    temp_check = Path("scratch/check_stream.xml")
    temp_check.parent.mkdir(parents=True, exist_ok=True)
    run_adb(["pull", remote_xml, str(temp_check)])

    try:
        tree = ET.parse(temp_check)
        for btn in tree.findall(".//node[@class='android.widget.Button']"):
            desc = btn.attrib.get("content-desc", "")
            if "Grade 3B CAIE" in desc:
                bounds = btn.attrib.get("bounds", "")
                import re
                m = re.findall(r"\d+", bounds)
                if len(m) == 4:
                    cx = (int(m[0]) + int(m[2])) // 2
                    cy = (int(m[1]) + int(m[3])) // 2
                    run_adb(["shell", f"input tap {cx} {cy}"])
                    time.sleep(2.0)
                break
    except Exception:
        pass

    # Tap Stream tab (Tab 1 at bottom)
    run_adb(["shell", "input tap 180 2220"])
    time.sleep(1.0)

def rewind_to_top():
    enforce_portrait()
    print("  [REWIND] Rewinding to the top of the stream...", flush=True)
    for i in range(85):
        run_adb(["shell", "input swipe 540 600 540 1900 160"])
        time.sleep(0.12)
        if i % 10 == 0 and i > 0:
            remote_xml = "/sdcard/rewind_chk.xml"
            run_adb(["shell", f"uiautomator dump {remote_xml}"])
            local_chk = Path("scratch/rewind_chk.xml")
            run_adb(["pull", remote_xml, str(local_chk)])
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
    time.sleep(2.0)

def extract_raw_nodes(xml_path: Path) -> list[dict]:
    """Extracts all raw node elements with text/content-desc without any processing."""
    tree = ET.parse(xml_path)
    root = tree.getroot()
    raw_nodes = []
    for node in root.findall(".//node"):
        cls = node.attrib.get("class", "")
        desc = node.attrib.get("content-desc", "")
        text = node.attrib.get("text", "")
        bounds = node.attrib.get("bounds", "")
        scrollable = node.attrib.get("scrollable", "")
        clickable = node.attrib.get("clickable", "")

        if desc or text:
            raw_nodes.append({
                "class": cls,
                "content_desc": desc,
                "text": text,
                "bounds": bounds,
                "clickable": clickable,
                "scrollable": scrollable
            })
    return raw_nodes

def dump_stream_raw_run(run_id: int, base_dir: Path):
    print(f"\n=======================================================", flush=True)
    print(f"STARTING RAW STREAM DUMP: RUN #{run_id}", flush=True)
    print(f"=======================================================", flush=True)

    rewind_to_top()

    run_xml_dir = base_dir / f"run_{run_id}_xmls"
    run_xml_dir.mkdir(parents=True, exist_ok=True)

    raw_txt_path = base_dir / f"run_{run_id}_raw_stream.txt"
    raw_jsonl_path = base_dir / f"run_{run_id}_raw_stream.jsonl"

    txt_file = open(raw_txt_path, "w", encoding="utf-8")
    jsonl_file = open(raw_jsonl_path, "w", encoding="utf-8")

    step = 0
    consecutive_static = 0
    last_step_nodes = []

    try:
        while consecutive_static < 10 and step < 200:
            step += 1
            remote_xml = f"/sdcard/raw_step_{step}.xml"
            run_adb(["shell", f"uiautomator dump {remote_xml}"])

            local_xml = run_xml_dir / f"step_{step:03d}.xml"
            run_adb(["pull", remote_xml, str(local_xml)])

            nodes = extract_raw_nodes(local_xml)

            # Write raw text for this step
            txt_file.write(f"\n--- [RUN {run_id} | STEP {step:03d}] ---\n")
            for idx, n in enumerate(nodes, start=1):
                txt_file.write(f"Node #{idx:02d} | class={n['class']} | bounds={n['bounds']}\n")
                if n['content_desc']:
                    txt_file.write(f"  content-desc: {n['content_desc']}\n")
                if n['text']:
                    txt_file.write(f"  text: {n['text']}\n")
            txt_file.flush()

            # Write raw jsonl
            step_record = {
                "run": run_id,
                "step": step,
                "xml_file": str(local_xml.name),
                "nodes": nodes
            }
            jsonl_file.write(json.dumps(step_record, ensure_ascii=False) + "\n")
            jsonl_file.flush()

            # Check if screen was identical to previous step
            current_signatures = [(n['class'], n['content_desc'], n['text'], n['bounds']) for n in nodes]
            if current_signatures == last_step_nodes:
                consecutive_static += 1
                print(f"  [Run #{run_id} Step {step:03d}] Static frame (count={consecutive_static}). Waiting 2.0s...", flush=True)
                time.sleep(2.0)
                enforce_portrait()
            else:
                consecutive_static = 0
                if step % 5 == 0 or step == 1:
                    print(f"  [Run #{run_id} Step {step:03d}] Raw step dumped ({len(nodes)} raw nodes captured).", flush=True)

            last_step_nodes = current_signatures

            # Swipe down
            run_adb(["shell", "input swipe 540 1650 540 750 350"])
            time.sleep(0.45)

    finally:
        txt_file.close()
        jsonl_file.close()

    print(f"[RUN #{run_id} COMPLETE] Saved all raw XML files to {run_xml_dir}", flush=True)
    print(f"  Raw readable text dump saved to {raw_txt_path}", flush=True)
    print(f"  Raw JSONL step dump saved to {raw_jsonl_path}", flush=True)

def main():
    ensure_classroom_stream()

    base_dir = Path("raw_stream_dumps")
    base_dir.mkdir(parents=True, exist_ok=True)

    start_run = int(sys.argv[1]) if len(sys.argv) > 1 else 3
    end_run = int(sys.argv[2]) if len(sys.argv) > 2 else start_run + 1

    for r in range(start_run, end_run + 1):
        dump_stream_raw_run(r, base_dir)

    print("\n=======================================================", flush=True)
    print(f"RAW UNPROCESSED STREAM DUMPS (RUNS {start_run} TO {end_run}) COMPLETED SUCCESSFULLY", flush=True)
    print(f"Location: {base_dir.resolve()}", flush=True)
    print("=======================================================", flush=True)

if __name__ == "__main__":
    main()
