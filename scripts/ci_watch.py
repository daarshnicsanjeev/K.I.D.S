#!/usr/bin/env python3
"""
CI/CD Pipeline Monitor & Automated Failure Diagnoser for K.I.D.S.
Continuously watches GitHub Actions runs, extracts error traces on failure,
and provides structured diagnostic reports for instant agentic/human remediation.
"""

import subprocess
import json
import sys
import time
import re

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

def run_cmd(cmd: list[str]) -> str:
    res = subprocess.run(cmd, capture_output=True, text=True)
    return res.stdout.strip()

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

def monitor_latest_run(workflow_name="Android CI & Quality Gates", timeout_seconds=420, poll_interval=10):
    print(f"[INFO] Monitoring workflow: {workflow_name}...")
    start_time = time.time()
    
    while time.time() - start_time < timeout_seconds:
        run = get_latest_run()
        if not run:
            print("[WARN] No active runs found.")
            time.sleep(poll_interval)
            continue
            
        run_id = str(run["databaseId"])
        status = run["status"]
        conclusion = run.get("conclusion")
        name = run.get("name", "CI")
        url = run.get("url", "")
        
        print(f"[{time.strftime('%H:%M:%S')}] Workflow: {name} (ID: {run_id}) -> Status: {status}, Conclusion: {conclusion}", flush=True)
        
        if status == "completed":
            if conclusion == "success":
                print(f"\n[SUCCESS] All quality gates, unit tests & APK compilation passed!")
                print(f"Run URL: {url}")
                artifacts_json = run_cmd(["gh", "run", "view", run_id, "--json", "artifacts"])
                try:
                    artifacts = json.loads(artifacts_json).get("artifacts", [])
                    if artifacts:
                        print("Available Artifacts:")
                        for art in artifacts:
                            print(f"   - {art.get('name')} (Size: {art.get('sizeInBytes', 0)} bytes)")
                except Exception:
                    pass
                return True
            else:
                print(f"\n[FAILURE] Run failed. Analyzing logs to isolate root cause...")
                failed_log = run_cmd(["gh", "run", "view", run_id, "--log-failed"])
                diagnose_failure(failed_log)
                return False
                
        time.sleep(poll_interval)
        
    print("[WARN] Monitoring timed out before completion.")
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

if __name__ == "__main__":
    monitor_latest_run()
