"""
scripts/extract_dataset.py — Automatic Traffic Frame Extractor & YOLO Auto-Labeler
==================================================================================
Extracts high-diversity keyframes from local traffic videos (north, south, east, west,
amb, etc.) and auto-generates normalized YOLO annotation labels (.txt) and traffic_data.yaml.

Usage:
  python scripts/extract_dataset.py --frame_interval 25 --max_frames_per_video 50
"""

import os
import sys
import cv2
import argparse
import random
import yaml

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

import config
from core.detector import Detector

# Normalized Traffic Classes for Fine-Tuning
CLASSES = ["car", "motorcycle", "bus", "truck", "ambulance", "person"]
CLASS_TO_IDX = {name: idx for idx, name in enumerate(CLASSES)}


def extract_and_annotate(
    video_paths=None,
    output_dir="dataset",
    frame_interval=20,
    max_frames_per_video=60,
    train_split=0.8,
    conf_thresh=0.40
):
    if video_paths is None:
        video_paths = ["north.mp4", "south.mp4", "east.mp4", "west.mp4", "amb.mp4", "south1.mp4", "west1.mp4"]

    output_dir = os.path.join(PROJECT_ROOT, output_dir)
    images_train = os.path.join(output_dir, "images", "train")
    images_val   = os.path.join(output_dir, "images", "val")
    labels_train = os.path.join(output_dir, "labels", "train")
    labels_val   = os.path.join(output_dir, "labels", "val")

    for p in [images_train, images_val, labels_train, labels_val]:
        os.makedirs(p, exist_ok=True)

    print(f"[Dataset Extractor] Initializing YOLO auto-annotator...")
    detector = Detector(model_name=getattr(config, 'MODEL_NAME', 'yolov8n.pt'), conf=conf_thresh)

    total_extracted = 0
    total_labels = 0
    class_counts = {c: 0 for c in CLASSES}

    for v_name in video_paths:
        v_path = os.path.join(PROJECT_ROOT, v_name) if not os.path.isabs(v_name) else v_name
        if not os.path.exists(v_path):
            print(f"[Dataset Extractor] Skipping missing video: {v_path}")
            continue

        cap = cv2.VideoCapture(v_path)
        if not cap.isOpened():
            print(f"[Dataset Extractor] Could not open {v_path}")
            continue

        frame_idx = 0
        extracted_from_video = 0
        is_amb_video = "amb" in os.path.basename(v_path).lower()
        prefix = os.path.splitext(os.path.basename(v_path))[0]

        print(f"[Dataset Extractor] Processing {v_name} (sampling every {frame_interval} frames)...")

        while cap.isOpened() and extracted_from_video < max_frames_per_video:
            ret, frame = cap.read()
            if not ret:
                break

            if frame_idx % frame_interval == 0:
                h, w = frame.shape[:2]
                detections = detector.detect(frame)

                # Skip completely empty frames to avoid background noise bias
                if len(detections) > 0 or is_amb_video:
                    is_train = random.random() < train_split
                    split_img_dir = images_train if is_train else images_val
                    split_lbl_dir = labels_train if is_train else labels_val

                    img_filename = f"{prefix}_frame_{frame_idx:05d}.jpg"
                    lbl_filename = f"{prefix}_frame_{frame_idx:05d}.txt"

                    img_out_path = os.path.join(split_img_dir, img_filename)
                    lbl_out_path = os.path.join(split_lbl_dir, lbl_filename)

                    # Save extracted JPEG
                    cv2.imwrite(img_out_path, frame, [cv2.IMWRITE_JPEG_QUALITY, 95])

                    # Build YOLO format labels: <class_idx> <x_center> <y_center> <w> <h> (normalized 0..1)
                    yolo_lines = []
                    for det in detections:
                        lbl = det.label
                        if det.is_ambulance:
                            lbl = "ambulance"
                        elif is_amb_video and det.is_vehicle and det.box[3] - det.box[1] > h * 0.15:
                            lbl = "ambulance"

                        if lbl not in CLASS_TO_IDX:
                            continue

                        cls_idx = CLASS_TO_IDX[lbl]
                        class_counts[lbl] += 1

                        # Bounding box conversion
                        x1, y1, x2, y2 = det.box
                        bw = (x2 - x1) / float(w)
                        bh = (y2 - y1) / float(h)
                        bx = (x1 + x2) / (2.0 * float(w))
                        by = (y1 + y2) / (2.0 * float(h))

                        # Clamp to [0.0, 1.0]
                        bx = max(0.0, min(1.0, bx))
                        by = max(0.0, min(1.0, by))
                        bw = max(0.001, min(1.0, bw))
                        bh = max(0.001, min(1.0, bh))

                        yolo_lines.append(f"{cls_idx} {bx:.6f} {by:.6f} {bw:.6f} {bh:.6f}")
                        total_labels += 1

                    with open(lbl_out_path, "w") as f:
                        f.write("\n".join(yolo_lines) + "\n")

                    extracted_from_video += 1
                    total_extracted += 1

            frame_idx += 1

        cap.release()
        print(f"  -> Extracted {extracted_from_video} keyframes from {v_name}")

    # Generate dataset YAML file
    yaml_path = os.path.join(output_dir, "traffic_data.yaml")
    yaml_content = {
        "path": output_dir.replace("\\", "/"),
        "train": "images/train",
        "val": "images/val",
        "names": {idx: name for idx, name in enumerate(CLASSES)},
        "nc": len(CLASSES),
    }

    with open(yaml_path, "w") as f:
        yaml.dump(yaml_content, f, sort_keys=False)

    print("\n" + "=" * 60)
    print(f"✓ DATASET EXTRACTION & AUTO-LABELING COMPLETE!")
    print(f"  Total Images Extracted: {total_extracted}")
    print(f"  Total Bounding Box Labels: {total_labels}")
    print(f"  Class Distribution: {class_counts}")
    print(f"  Dataset Configuration File: {yaml_path}")
    print("=" * 60 + "\n")
    return yaml_path, total_extracted, class_counts


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Extract and auto-annotate traffic dataset from videos")
    parser.add_argument("--frame_interval", type=int, default=25, help="Sample every N frames")
    parser.add_argument("--max_frames", type=int, default=50, help="Max frames per video")
    parser.add_argument("--output_dir", type=str, default="dataset", help="Output dataset directory")
    args = parser.parse_args()

    extract_and_annotate(
        frame_interval=args.frame_interval,
        max_frames_per_video=args.max_frames,
        output_dir=args.output_dir
    )
