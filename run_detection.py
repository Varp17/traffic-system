"""
run_detection.py — Simple launcher for the Real Detection Dashboard
====================================================================
Usage:
    python run_detection.py
    
Then open:
    http://localhost:8000/ui/detection_live.html   ← Real detection feed + cropped boxes
    http://localhost:8000/                          ← Overview dashboard
    http://localhost:8000/docs                      ← API docs

Uses these real videos from the project folder (4-quadrant composite):
    north.mp4, south.mp4, east.mp4, west1.mp4 (or west.mp4)
"""

import sys
import os
import time
import webbrowser
import threading

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def open_browser(url: str, delay: float = 3.0):
    def _open():
        time.sleep(delay)
        print(f"\n[Launcher] Opening: {url}\n")
        webbrowser.open(url)
    threading.Thread(target=_open, daemon=True).start()


def main():
    port = 8000
    url  = f"http://localhost:{port}/ui/detection_live.html"

    print("\n" + "=" * 60)
    print("  DevDominators — Real OpenCV + YOLOv8 Detection Server")
    print("=" * 60)
    print(f"\n  Live Detection Dashboard : {url}")
    print(f"  Overview Dashboard       : http://localhost:{port}/")
    print(f"  API Docs                 : http://localhost:{port}/docs")
    print("\n  Videos used (4-quadrant composite):")
    
    base = os.path.dirname(os.path.abspath(__file__))
    for name in ["north.mp4", "south.mp4", "east.mp4", "west1.mp4", "west.mp4"]:
        p = os.path.join(base, name)
        if os.path.exists(p):
            size_mb = os.path.getsize(p) / 1024 / 1024
            print(f"    ✓ {name}  ({size_mb:.1f} MB)")

    print("\n  Starting server...\n")

    open_browser(url, delay=3.5)

    import uvicorn
    from backend.app import app
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")


if __name__ == "__main__":
    main()
