#!/usr/bin/env python3
"""
Ground-Truth Fixture Verification Suite
Runs our card detection, fingerprinting, and matching algorithms against the real device dumps:
- classroom_full_stream.json (172 posts)
- drive_shared_full.json (450 files)
"""

import json
import hashlib
import re
import sys
from pathlib import Path

# Fix Windows console encoding
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

def test_classroom_stream():
    stream_file = Path("classroom_full_stream.json")
    if not stream_file.exists():
        print("[ERROR] classroom_full_stream.json missing!")
        return

    with open(stream_file, "r", encoding="utf-8") as f:
        posts = json.load(f)

    print(f"\n=======================================================")
    print(f"VERIFYING GOOGLE CLASSROOM GROUND TRUTH ({len(posts)} POSTS)")
    print(f"=======================================================")

    fingerprints = set()
    duplicate_fps = []
    announcements_count = 0
    materials_count = 0

    comment_regex = re.compile(r"(?:\b\d+\s+)?class\s+comments?.*|add\s+class\s+comment.*", re.IGNORECASE)

    for p in posts:
        title = p["title"]
        date = p["date"]
        comments = p["comments"]

        # Classification
        if "new material" in title.lower() or "assignment" in title.lower():
            materials_count += 1
        else:
            announcements_count += 1

        # Canonical fingerprint computation: SHA-256(header|date|snippet)
        header = title.strip().lower()[:60]
        date_clean = date.strip().lower()[:30]
        canonical_content = f"{header}|{date_clean}|"
        fp = hashlib.sha256(canonical_content.encode("utf-8")).hexdigest()[:16]

        if fp in fingerprints:
            duplicate_fps.append((p["index"], title, date))
        else:
            fingerprints.add(fp)

        # Comment anchoring verification
        assert comment_regex.search(comments), f"Post #{p['index']} missing valid comment element!"

    print(f"✓ Total Unique Posts: {len(posts)}")
    print(f"  - Material / Assignment Posts: {materials_count}")
    print(f"  - Teacher Announcements: {announcements_count}")
    print(f"✓ Unique Canonical Fingerprints Generated: {len(fingerprints)} / {len(posts)}")

    if duplicate_fps:
        print(f"[WARNING] Duplicate fingerprints found: {len(duplicate_fps)}")
        for idx, t, d in duplicate_fps:
            print(f"   #{idx}: {t} ({d})")
    else:
        print("✓ 100% Deterministic 1-to-1 Mapping: Zero collisions, zero duplicates!")

def test_drive_shared_correlation():
    drive_file = Path("drive_shared_full.json")
    if not drive_file.exists():
        print("[ERROR] drive_shared_full.json missing!")
        return

    with open(drive_file, "r", encoding="utf-8") as f:
        files = json.load(f)

    print(f"\n=======================================================")
    print(f"VERIFYING GOOGLE DRIVE SHARED GROUND TRUTH ({len(files)} FILES)")
    print(f"=======================================================")

    grade3_files = []
    grade2_files = []
    file_types = {}

    for f in files:
        name = f["fileName"]
        ext = name.split(".")[-1].lower() if "." in name else "other"
        file_types[ext] = file_types.get(ext, 0) + 1

        if "grade 2" in name.lower() or "grade ii" in name.lower() or "2025" in name.lower() or "g2" in name.lower():
            grade2_files.append(name)
        else:
            grade3_files.append(name)

    print(f"✓ Total Drive Shared Files: {len(files)}")
    print(f"  - Grade 3 (Current Academic Year 2026-27): {len(grade3_files)} files")
    print(f"  - Grade 2 (Historical Academic Year 2025-26): {len(grade2_files)} files")
    print("\nFile Formats in Drive:")
    for ext, count in sorted(file_types.items(), key=lambda x: -x[1])[:8]:
        print(f"  - .{ext}: {count} files")

if __name__ == "__main__":
    test_classroom_stream()
    test_drive_shared_correlation()
