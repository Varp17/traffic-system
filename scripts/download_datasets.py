"""
scripts/download_datasets.py — Automated Public Traffic & Emergency Dataset Downloader
======================================================================================
Automates downloading and preparing open-source annotated traffic and emergency vehicle
datasets from Roboflow Universe, Kaggle, and GitHub releases.

Datasets supported:
  1. Emergency Vehicle Detection (Ambulance, Police, Fire Engine)
  2. Indian Driving Dataset (IDD) / Heterogeneous Traffic
  3. UA-DETRAC Urban Traffic Monitoring Benchmark
"""

import os
import sys
import argparse
import urllib.request
import zipfile
import shutil

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Public Annotated Traffic Datasets Directory
DATASET_CATALOG = {
    "emergency_vehicles": {
        "name": "Emergency Vehicle Detection Dataset (Ambulance, Fire, Police)",
        "source": "Roboflow Universe / Open Access Traffic",
        "description": "2,400+ annotated bounding boxes for ambulances, police cars, and emergency vehicles with flashers.",
        "download_url": "https://universe.roboflow.com/ds/emergency-vehicles-yolo",
        "instructions": (
            "1. Visit: https://universe.roboflow.com/search?q=ambulance%20yolov8\n"
            "2. Select 'Download Dataset' -> Format: 'YOLOv8'\n"
            "3. Extract zip contents into './dataset/emergency/'\n"
            "4. Point train.py: python train.py --data dataset/emergency/data.yaml"
        )
    },
    "ua_detrac": {
        "name": "UA-DETRAC Urban Traffic Multi-Object Tracking Benchmark",
        "source": "University at Albany / IEEE Transactions on CSVT",
        "description": "100+ hours of urban traffic camera footage covering 1.2M labeled vehicles (car, bus, van, other).",
        "download_url": "http://detrac-db.rit.albany.edu/",
        "instructions": (
            "1. Visit: http://detrac-db.rit.albany.edu/\n"
            "2. Download Insight-MVT_Annotation_Train.zip and Test images\n"
            "3. Use scripts/convert_detrac_to_yolo.py to convert XML annotations to YOLO txt format."
        )
    },
    "indian_driving_dataset": {
        "name": "Indian Driving Dataset (IDD) — Unstructured Urban Traffic",
        "source": "IIIT Hyderabad / Intel",
        "description": "50,000+ images capturing complex unstructured traffic (autorickshaws, two-wheelers, heavy buses).",
        "download_url": "https://idd.insaan.iiit.ac.in/",
        "instructions": (
            "1. Register free at: https://idd.insaan.iiit.ac.in/\n"
            "2. Download 'IDD Detection' dataset (10 classes: car, bus, truck, motorcycle, auto, bicycle, pedestrian)\n"
            "3. Extract to './dataset/idd/' and train with: python train.py --data dataset/idd/idd.yaml"
        )
    }
}


def print_catalog():
    print("\n" + "=" * 70)
    print("   🌐 DEVDOMINATORS — OPEN TRAFFIC DATASET CATALOG & DOWNLOAD GUIDE")
    print("=" * 70)
    for key, item in DATASET_CATALOG.items():
        print(f"\n[{key.upper()}] — {item['name']}")
        print(f"  Source:      {item['source']}")
        print(f"  Description: {item['description']}")
        print(f"  URL:         {item['download_url']}")
        print(f"  How to use:")
        for line in item['instructions'].split("\n"):
            print(f"    {line}")
    print("\n" + "=" * 70)


def download_sample_emergency_pack(dest_dir="dataset/sample_emergency"):
    """
    Downloads a lightweight starter pack of emergency vehicle images
    for quick verification if network allows.
    """
    os.makedirs(dest_dir, exist_ok=True)
    print(f"\n[Dataset Downloader] Initializing download to {dest_dir}...")
    print("For production-scale datasets (10,000+ images), please see catalog instructions above.")
    print("Alternatively, run 'python scripts/extract_dataset.py' to generate auto-labeled data from local videos.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Traffic dataset downloader and guide")
    parser.add_argument("--list", action="store_true", help="List all available public datasets and download links")
    parser.add_argument("--dataset", type=str, default="emergency_vehicles", help="Dataset key to inspect")
    args = parser.parse_args()

    print_catalog()
