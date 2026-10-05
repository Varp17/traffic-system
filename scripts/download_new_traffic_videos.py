"""
scripts/download_new_traffic_videos.py — Automated Multi-Approach Traffic Video Ingestion
========================================================================================
Finds, downloads, and validates new real-world traffic videos for:
  - Multi-lane highway car detection
  - Heterogeneous mixed urban traffic (cars, bicycles, pedestrians)
  - Dense intersection aerial surveillance
  - Emergency vehicle / ambulance priority corridors
  - Crosswalk pedestrian safety zones
"""

import os
import sys
import shutil
import urllib.request
import time
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

try:
    import cv2
except ImportError:
    cv2 = None

# Curated list of verified open-access real-world traffic sample videos
ONLINE_VIDEOS = [
    {
        "filename": "car_detection_highway.mp4",
        "url": "https://github.com/intel-iot-devkit/sample-videos/raw/master/car-detection.mp4",
        "category": "Highway Multi-Lane Vehicle Flow",
        "description": "High-speed multi-lane traffic flow with diverse vehicle sizes and lane changing."
    },
    {
        "filename": "person_bicycle_car_urban.mp4",
        "url": "https://github.com/intel-iot-devkit/sample-videos/raw/master/person-bicycle-car-detection.mp4",
        "category": "Heterogeneous Mixed Urban Traffic",
        "description": "Real-world urban intersection with mixed cars, bicycles, and crosswalk pedestrians."
    },
    {
        "filename": "traffic_aerial_intersection.mp4",
        "url": "https://github.com/DeGirum/PySDKExamples/raw/main/images/Traffic.mp4",
        "category": "Aerial 4-Way Traffic Surveillance",
        "description": "Bird's eye view camera feed capturing multi-approach turning movements."
    },
    {
        "filename": "crosswalk_pedestrians.mp4",
        "url": "https://github.com/intel-iot-devkit/sample-videos/raw/master/people-detection.mp4",
        "category": "Crosswalk & Pedestrian Conflict Zone",
        "description": "Dense pedestrian crossing area for verifying safety conflict interlocks."
    }
]

# Sibling directory candidate videos
SIBLING_DIR = PROJECT_ROOT.parent.parent / "devdominators"


def copy_sibling_videos():
    """Copies high-res traffic & ambulance videos from existing project sibling storage."""
    print("\n--- Scanning Sibling Project Storage for New Videos ---")
    if not SIBLING_DIR.exists():
        print(f"Sibling directory not found: {SIBLING_DIR}")
        return

    candidates = [
        ("amublance.mp4", "ambulance_emergency_corridor.mp4"),
        ("videoplayback.mp4", "arterial_corridor_playback.mp4"),
        ("videoplaybac1k.mp4", "dense_junction_playback.mp4"),
    ]

    for src_name, dst_name in candidates:
        src_path = SIBLING_DIR / src_name
        dst_path = PROJECT_ROOT / dst_name
        if src_path.exists():
            if not dst_path.exists() or dst_path.stat().st_size != src_path.stat().st_size:
                print(f"  Copying: {src_name} -> {dst_name} ({src_path.stat().st_size / (1024*1024):.1f} MB)...")
                shutil.copy2(src_path, dst_path)
                print(f"  [OK] Saved {dst_name}")
            else:
                print(f"  [OK] Already up-to-date: {dst_name}")


def download_online_videos():
    """Downloads validated real-world traffic videos over HTTPS."""
    print("\n--- Downloading Public Real-World Traffic Benchmark Videos ---")
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}

    for item in ONLINE_VIDEOS:
        target_path = PROJECT_ROOT / item["filename"]
        print(f"\n[{item['category']}]")
        print(f"  Target: {item['filename']}")
        print(f"  URL:    {item['url']}")

        if target_path.exists() and target_path.stat().st_size > 100000:
            print(f"  [OK] Already downloaded ({target_path.stat().st_size / (1024*1024):.2f} MB)")
            continue

        try:
            req = urllib.request.Request(item["url"], headers=headers)
            print("  Connecting and downloading stream...")
            with urllib.request.urlopen(req, timeout=30) as response, open(target_path, "wb") as out_file:
                shutil.copyfileobj(response, out_file)
            size_mb = target_path.stat().st_size / (1024 * 1024)
            print(f"  [OK] Successfully downloaded {item['filename']} ({size_mb:.2f} MB)")
        except Exception as e:
            print(f"  [ERROR] Download failed: {e}")


def inspect_all_videos():
    """Validates all MP4 files in the project root with OpenCV."""
    print("\n" + "=" * 78)
    print("   DEVDOMINATORS - VIDEO ASSET REPOSITORY CATALOG")
    print("=" * 78)
    print(f"{'Filename':<34} {'Resolution':<12} {'FPS':<6} {'Frames':<8} {'Duration':<10} {'Size (MB)':<9}")
    print("-" * 78)

    mp4_files = sorted(PROJECT_ROOT.glob("*.mp4"))
    for vid in mp4_files:
        size_mb = vid.stat().st_size / (1024 * 1024)
        res_str = "Unknown"
        fps_str = "--"
        frames_str = "--"
        dur_str = "--"

        if cv2 is not None:
            cap = cv2.VideoCapture(str(vid))
            if cap.isOpened():
                w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
                total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                dur_sec = total_frames / fps if fps > 0 else 0
                res_str = f"{w}x{h}"
                fps_str = f"{fps:.1f}"
                frames_str = f"{total_frames}"
                dur_str = f"{dur_sec:.1f}s"
                cap.release()

        print(f"{vid.name:<34} {res_str:<12} {fps_str:<6} {frames_str:<8} {dur_str:<10} {size_mb:<9.2f}")

    print("=" * 78)
    print(f"Total Video Assets Ready: {len(mp4_files)}")
    print("=" * 78 + "\n")


if __name__ == "__main__":
    copy_sibling_videos()
    download_online_videos()
    inspect_all_videos()
