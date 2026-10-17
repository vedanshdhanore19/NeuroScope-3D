"""Confirms the backend that is ACTUALLY answering on your port runs the fixed engine.
Usage: python verify_backend.py [http://127.0.0.1:8001]"""
import json, sys, urllib.request
base = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8001").rstrip("/")
try:
    data = json.load(urllib.request.urlopen(base + "/health", timeout=10))
except Exception as exc:
    sys.exit(f"Could not reach {base}/health: {exc}\nIs the backend running?")
ver = data.get("engine_version") or data.get("model", {}).get("engine_version")
if ver and str(ver).startswith("3."):
    m = data.get("model", {})
    print(f"OK - {base} runs the fixed engine {ver}")
    print("  checkpoint exists:", m.get("checkpoint_exists"), "| model loaded:", m.get("model_loaded"), "| device:", m.get("device"))
else:
    print(f"STALE - {base} still runs OLD code (engine_version={ver!r}).")
    print("Stop every old backend (netstat -ano | findstr :8001, then taskkill /PID <pid> /F) and start again.")
    sys.exit(1)
