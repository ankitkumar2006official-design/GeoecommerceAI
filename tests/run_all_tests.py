import subprocess
import time
import urllib.request
import os
import sys

def wait_for_url(url, timeout=12):
    start = time.time()
    while time.time() - start < timeout:
        try:
            with urllib.request.urlopen(url) as response:
                if response.status == 200:
                    return True
        except Exception:
            time.sleep(0.4)
    return False

def main():
    print("--- Starting GeoCommerce AI E2E Workflow Test ---")
    
    # Start ML Service
    ml_dir = os.path.join(os.getcwd(), "ml_service")
    ml_proc = subprocess.Popen(
        [sys.executable, "run.py"],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        cwd=ml_dir
    )
    print("Launched ML Service...")

    # Start Backend Server
    backend_proc = subprocess.Popen(
        ["node", "server.js"],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        cwd=os.path.join(os.getcwd(), "backend")
    )
    print("Launched Node.js Backend...")

    try:
        # Wait for health checks
        print("Waiting for ML Service on http://127.0.0.1:8000/health...")
        if not wait_for_url("http://127.0.0.1:8000/health", 12):
            print("ERROR: ML Service did not become healthy in time.")
            out, _ = ml_proc.communicate(timeout=2)
            print("ML Service Output:\n", out.decode('utf-8', errors='ignore'))
            return 1
        print("ML Service is healthy!")

        print("Waiting for Node.js Backend on http://127.0.0.1:5000/health...")
        if not wait_for_url("http://127.0.0.1:5000/health", 15):
            print("ERROR: Backend did not become healthy in time.")
            return 1
        print("Backend is healthy!")

        # Run E2E Test Suite
        print("\nExecuting End-to-End Workflow Test Suite...")
        test_run = subprocess.run(
            ["node", "--test", "tests/e2e_workflow.test.js"],
            cwd=os.getcwd()
        )
        return test_run.returncode

    finally:
        print("\nShutting down test server processes...")
        backend_proc.terminate()
        ml_proc.terminate()
        try:
            backend_proc.wait(timeout=3)
            ml_proc.wait(timeout=3)
        except Exception:
            backend_proc.kill()
            ml_proc.kill()
        print("Cleanup completed.")

if __name__ == "__main__":
    sys.exit(main())
