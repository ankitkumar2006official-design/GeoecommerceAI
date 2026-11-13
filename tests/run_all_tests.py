import subprocess
import time
import urllib.request
import os
import sys
import re

PROHIBITED_DATABASES = {
    'tracker',
    'tracker_staging',
    'staging',
    'production',
    'prod',
    'live',
    'main',
    'geocommerce_prod',
    'geocommerce_staging',
    'geocommerce',
    'admin',
    'local',
    'config'
}

def extract_db_name(uri: str) -> str:
    if not uri or not isinstance(uri, str):
        return ""
    match = re.search(r'(?:mongodb(?:\+srv)?:\/\/[^/]+\/)([^?]+)', uri, re.IGNORECASE)
    return match.group(1).strip() if match else ""

def assert_isolated_test_db(uri: str) -> str:
    if not uri or not uri.startswith("mongodb"):
        raise ValueError("[PYTHON DB GUARD] Fatal: MONGODB_TEST_URI must be configured with a valid mongodb:// or mongodb+srv:// connection string.")
    
    db_name = extract_db_name(uri)
    if not db_name:
        raise ValueError("[PYTHON DB GUARD] Fatal: MONGODB_TEST_URI must explicitly specify a database name (e.g. /tracker_test).")
    
    norm = db_name.lower()
    if norm in PROHIBITED_DATABASES:
        raise ValueError(f"[PYTHON SECURITY REJECTION] Python test runner REFUSED to run against prohibited database '{db_name}'.")
    
    if "test" not in norm:
        raise ValueError(f"[PYTHON SECURITY REJECTION] Target database '{db_name}' is not verified as isolated. Must contain 'test'.")
        
    return db_name

def load_test_environment():
    test_env_path = os.path.join(os.getcwd(), "backend", ".env.test")
    default_env_path = os.path.join(os.getcwd(), "backend", ".env")
    
    test_uri = None
    if os.path.exists(test_env_path):
        with open(test_env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line.startswith("MONGODB_TEST_URI="):
                    test_uri = line.split("=", 1)[1].strip()
                elif line.startswith("MONGODB_URI=") and not test_uri:
                    test_uri = line.split("=", 1)[1].strip()

    if not test_uri and os.path.exists(default_env_path):
        with open(default_env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line.startswith("MONGODB_TEST_URI="):
                    test_uri = line.split("=", 1)[1].strip()
                elif line.startswith("MONGODB_URI=") and not test_uri:
                    raw_uri = line.split("=", 1)[1].strip()
                    test_uri = re.sub(r'\/[^/?]+(?=\?|$)', '/tracker_test', raw_uri)

    if not test_uri:
        print("[PYTHON TEST ISOLATION FATAL] No test database URI could be resolved.", file=sys.stderr)
        sys.exit(1)

    try:
        db_name = assert_isolated_test_db(test_uri)
        print(f"[PYTHON TEST ISOLATION] Verified isolated database: '{db_name}'")
    except Exception as e:
        print(f"[PYTHON TEST ISOLATION FATAL] {e}", file=sys.stderr)
        sys.exit(1)

    env = os.environ.copy()
    env["NODE_ENV"] = "test"
    env["MONGODB_TEST_URI"] = test_uri
    env["MONGODB_URI"] = test_uri
    return env

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
    test_env = load_test_environment()
    
    # Start ML Service
    ml_dir = os.path.join(os.getcwd(), "ml_service")
    ml_proc = subprocess.Popen(
        [sys.executable, "run.py"],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        cwd=ml_dir,
        env=test_env
    )
    print("Launched ML Service...")

    # Start Backend Server with isolated test environment
    backend_proc = subprocess.Popen(
        ["node", "server.js"],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        cwd=os.path.join(os.getcwd(), "backend"),
        env=test_env
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
            cwd=os.getcwd(),
            env=test_env
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
