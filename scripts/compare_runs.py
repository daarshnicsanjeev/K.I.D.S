#!/usr/bin/env python3
"""
Deep Cross-Run Comparison Tool for Raw Classroom Stream Dumps
Compares Run 1, Run 3, and Run 4 step-by-step and card-by-card.
"""

import sys
import json
from pathlib import Path
import xml.etree.ElementTree as ET

# Fix Windows console encoding
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

def parse_run_xmls(xml_dir: str) -> list[dict]:
    xml_files = sorted(Path(xml_dir).glob("step_*.xml"))
    posts = []
    seen = set()

    for xml_file in xml_files:
        tree = ET.parse(xml_file)
        root = tree.getroot()
        scrolls = root.findall(".//node[@class='android.widget.ScrollView']")
        if not scrolls:
            scrolls = root.findall(".//node[@scrollable='true']")
        if not scrolls:
            continue
        scroll = scrolls[0]

        for child in scroll.findall("./node"):
            if child.attrib.get("class") == "android.widget.ImageView":
                continue

            buttons = child.findall(".//node[@class='android.widget.Button']")
            title = ""
            date = ""
            comments = ""
            all_text = []

            for b in buttons:
                desc = (b.attrib.get("content-desc") or "").strip()
                txt = (b.attrib.get("text") or "").strip()
                val = desc or txt
                if not val:
                    continue
                all_text.append(val)
                if "class comments for" in val.lower() or "class comment" in val.lower():
                    comments = val
                elif not title:
                    lines = [l.strip() for l in val.split("\n") if l.strip()]
                    if lines:
                        title = lines[0]
                        if len(lines) > 1:
                            date = lines[1]

            if title and (comments or "new material" in title.lower() or "assignment" in title.lower() or len(title) > 20):
                key = (title.strip().lower()[:60], date.strip().lower()[:30])
                if key not in seen:
                    seen.add(key)
                    posts.append({
                        "title": title,
                        "date": date,
                        "comments": comments,
                        "full_text": "\n".join(all_text)
                    })
    return posts

def main():
    r1 = parse_run_xmls("raw_stream_dumps/run_1_xmls")
    r3 = parse_run_xmls("raw_stream_dumps/run_3_xmls")
    r4 = parse_run_xmls("raw_stream_dumps/run_4_xmls")

    print("=======================================================")
    print("COMPARISON SUMMARY: RUN 1 vs RUN 3 vs RUN 4")
    print("=======================================================")
    print(f"Run 1 Total Cards Captured: {len(r1)}")
    print(f"Run 3 Total Cards Captured: {len(r3)}")
    print(f"Run 4 Total Cards Captured: {len(r4)}")

    print("\n-------------------------------------------------------")
    print("TOP OF STREAM (NEWEST NOTICE):")
    print("-------------------------------------------------------")
    print(f"  Run 1: {r1[0]['title']} ({r1[0]['date']})")
    print(f"  Run 3: {r3[0]['title']} ({r3[0]['date']})")
    print(f"  Run 4: {r4[0]['title']} ({r4[0]['date']})")

    print("\n-------------------------------------------------------")
    print("BOTTOM OF STREAM (OLDEST NOTICE):")
    print("-------------------------------------------------------")
    print(f"  Run 1: {r1[-1]['title']} ({r1[-1]['date']})")
    print(f"  Run 3: {r3[-1]['title']} ({r3[-1]['date']})")
    print(f"  Run 4: {r4[-1]['title']} ({r4[-1]['date']})")

    # Key sets for exact diff
    r1_keys = [(p["title"].strip().lower()[:60], p["date"].strip().lower()[:30]) for p in r1]
    r3_keys = [(p["title"].strip().lower()[:60], p["date"].strip().lower()[:30]) for p in r3]
    r4_keys = [(p["title"].strip().lower()[:60], p["date"].strip().lower()[:30]) for p in r4]

    set_r1 = set(r1_keys)
    set_r3 = set(r3_keys)
    set_r4 = set(r4_keys)

    print("\n-------------------------------------------------------")
    print("DIFFERENTIAL ANALYSIS:")
    print("-------------------------------------------------------")
    in_3_not_1 = set_r3 - set_r1
    in_1_not_3 = set_r1 - set_r3

    in_4_not_3 = set_r4 - set_r3
    in_3_not_4 = set_r3 - set_r4

    print(f"Differences between Run 1 and Run 3:")
    print(f"  In Run 3 but not Run 1: {len(in_3_not_1)}")
    for k in in_3_not_1:
        print(f"    + {k[0]} ({k[1]})")
    print(f"  In Run 1 but not Run 3: {len(in_1_not_3)}")
    for k in in_1_not_3:
        print(f"    - {k[0]} ({k[1]})")

    print(f"\nDifferences between Run 3 and Run 4:")
    print(f"  In Run 4 but not Run 3: {len(in_4_not_3)}")
    for k in in_4_not_3:
        print(f"    + {k[0]} ({k[1]})")
    print(f"  In Run 3 but not Run 4: {len(in_3_not_4)}")
    for k in in_3_not_4:
        print(f"    - {k[0]} ({k[1]})")

    # Sequence alignment
    print("\n-------------------------------------------------------")
    print("SEQUENCE ALIGNMENT CHECK:")
    print("-------------------------------------------------------")
    min_len = min(len(r3_keys), len(r4_keys))
    mismatches = 0
    for idx in range(min_len):
        if r3_keys[idx] != r4_keys[idx]:
            mismatches += 1
            if mismatches <= 5:
                print(f"  Mismatch at #{idx + 1}:")
                print(f"    Run 3: {r3_keys[idx][0]} ({r3_keys[idx][1]})")
                print(f"    Run 4: {r4_keys[idx][0]} ({r4_keys[idx][1]})")
    if mismatches == 0:
        print(f"  100% PERFECT ORDER ALIGNMENT: Every single item (#{1} to #{min_len}) appears in the exact same sequence in Run 3 and Run 4!")
    else:
        print(f"  Total sequence mismatches between Run 3 and Run 4: {mismatches}")

if __name__ == "__main__":
    main()
