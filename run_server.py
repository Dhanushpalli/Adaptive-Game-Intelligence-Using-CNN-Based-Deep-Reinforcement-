import uvicorn
import os
import sys

# Ensure workspace root is in sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

if __name__ == "__main__":
    print("=" * 60)
    print("[*] Starting Adaptive Game Intelligence Platform...")
    print("[*] Open http://localhost:8000 in your web browser.")
    print("=" * 60)
    uvicorn.run("backend.app:app", host="127.0.0.1", port=8000, reload=True)
