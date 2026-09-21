#!/usr/bin/env python3
"""
CI/CD Pipeline Monitor, Release Verifier & Graphify Guardian for K.I.D.S.
Continuously watches GitHub Actions runs, verifies Graphify knowledge graph sync,
extracts error traces on failure, and checks latest release deployment.
"""

import subprocess
import json
import sys
import time
import re
import os

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

def run_cmd(cmd: list[str]) -> str:
    res = subprocess.run(cmd, capture_output=True, text=True)
    return res.stdout.strip()

def sync_local_graph():
    """Runs local Graphify AST extraction and community clustering."""
    print("\n[GRAPHIFY] Synchronizing codebase knowledge graph...")
    uv_path = r"C:\Users\daars\AppData\Local\hermes\bin\uv.exe"
    if not os.path.exists(uv_path):
        uv_path = "uv"

    res_extract = subprocess.run([uv_path, "tool", "run", "--from", "graphifyy", "graphify", "extract", ".", "--code-only"], text=True)
    if res_extract.returncode != 0:
        print("[GRAPHIFY ERROR] AST extraction failed.")
        return False

    res_cluster = subprocess.run([uv_path, "tool", "run", "--from", "graphifyy", "graphify", "cluster-only", "."], text=True)
    if res_cluster.returncode != 0:
        print("[GRAPHIFY ERROR] Clustering failed.")
        return False

    print("[GRAPHIFY] Knowledge graph successfully synchronized.")
    return True

def get_latest_run(workflow_name="Android CI & Quality Gates"):
    output = run_cmd(["gh", "run", "list", "--limit", "10", "--json", "databaseId,status,conclusion,name,headBranch,url,updatedAt"])
    if not output:
        return None
    try:
        runs = json.loads(output)
        if not runs:
            return None
        if workflow_name:
            filtered = [r for r in runs if workflow_name.lower() in r.get("name", "").lower()]
            return filtered[0] if filtered else runs[0]
        return runs[0]
    except json.JSONDecodeError:
        return None

def monitor_workflow(workflow_name: str, timeout_seconds=420, poll_interval=10) -> bool:
    print(f"\n[MONITOR] Watching workflow: '{workflow_name}'...")
    start_time = time.time()
    
    while time.time() - start_time < timeout_seconds:
        run = get_latest_run(workflow_name)
        if not run:
            print(f"[WARN] No active runs found for {workflow_name}.")
            time.sleep(poll_interval)
            continue
            
        run_id = str(run["databaseId"])
        status = run["status"]
        conclusion = run.get("conclusion")
        name = run.get("name", workflow_name)
        url = run.get("url", "")
        
        print(f"[{time.strftime('%H:%M:%S')}] Workflow: {name} (ID: {run_id}) -> Status: {status}, Conclusion: {conclusion}", flush=True)
        
        if status == "completed":
            if conclusion == "success":
                print(f"[SUCCESS] Workflow '{name}' completed successfully!")
                print(f"Run URL: {url}")
                return True
            else:
                print(f"\n[FAILURE] Workflow '{name}' failed. Analyzing diagnostic logs...")
                failed_log = run_cmd(["gh", "run", "view", run_id, "--log-failed"])
                diagnose_failure(failed_log)
                return False
                
        time.sleep(poll_interval)
        
    print(f"[WARN] Monitoring for '{workflow_name}' timed out before completion.")
    return False

def verify_release():
    print("\n[RELEASE] Verifying latest GitHub Release deployment...")
    release_info = run_cmd(["gh", "release", "view", "latest", "--json", "name,tagName,publishedAt,assets,url"])
    if not release_info:
        print("[WARN] Could not retrieve release 'latest'.")
        return False

    try:
        data = json.loads(release_info)
        tag = data.get("tagName")
        name = data.get("name")
        published = data.get("publishedAt")
        assets = data.get("assets", [])
        
        apk_asset = next((a for a in assets if a.get("name") == "app-debug.apk"), None)
        if apk_asset:
            apk_size = apk_asset.get("size", 0)
            download_url = apk_asset.get("apiUrl") or f"https://github.com/daarshnicsanjeev/K.I.D.S/releases/download/{tag}/app-debug.apk"
            print(f"[RELEASE SUCCESS] Release '{name}' (Tag: {tag}) is LIVE!")
            print(f"   - Asset: app-debug.apk ({apk_size:,} bytes)")
            print(f"   - Direct Download: {download_url}")
            return True
        else:
            print("[RELEASE WARN] Release found but app-debug.apk asset is missing!")
            return False
    except Exception as e:
        print(f"[RELEASE ERROR] Failed to parse release info: {e}")
        return False

def diagnose_failure(log_text: str):
    print("\n" + "="*70)
    print("AUTOMATED FAILURE DIAGNOSTIC REPORT")
    print("="*70)
    
    # 1. Look for test failures
    test_failures = re.findall(r"(\w+Test\s*>\s*[^()]+(?:\(\))?\s*FAILED)", log_text)
    if test_failures:
        print("[TEST FAILURES DETECTED]:")
        for tf in set(test_failures):
            print(f"   * {tf}")
            
    # 2. Look for compilation errors
    compile_errors = re.findall(r"(e:\s+file://[^\n]+)", log_text)
    if compile_errors:
        print("\n[COMPILATION ERRORS DETECTED]:")
        for ce in set(compile_errors):
            print(f"   * {ce}")
            
    # 3. Look for resource/AAPT linking errors
    aapt_errors = re.findall(r"(ERROR:\s+[^\n]+AAPT:\s+[^\n]+)", log_text)
    if aapt_errors:
        print("\n[AAPT / RESOURCE LINKING ERRORS]:")
        for ae in set(aapt_errors):
            print(f"   * {ae}")
            
    print("="*70)

def main():
    args = sys.argv[1:]
    if "--sync-graph" in args:
        sync_local_graph()
    
    android_ok = monitor_workflow("Android CI & Quality Gates")
    graph_ok = monitor_workflow("Knowledge Graph Validation & Graphify Pipeline")
    
    if "--verify-release" in args or android_ok:
        verify_release()

    if not android_ok or not graph_ok:
        sys.exit(1)

if __name__ == "__main__":
    main()
