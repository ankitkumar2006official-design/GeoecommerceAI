import uvicorn
import os
import sys

# Ensure ml_service directory is in sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

if __name__ == "__main__":
    port = int(os.environ.get("ML_PORT", 8000))
    host = os.environ.get("ML_HOST", "127.0.0.1")
    print(f"Starting GeoCommerce AI ML Service on {host}:{port}...", flush=True)
    uvicorn.run("app.main:app", host=host, port=port, reload=False)
