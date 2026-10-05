"""
train.py — Production YOLOv8 Fine-Tuning & Transfer Learning Pipeline
====================================================================
Fine-tunes YOLOv8 on traffic datasets (custom extracted frames or public datasets).
Validates mAP metrics, saves checkpoint weights, and exports to ONNX for edge runtime.

Usage:
  python train.py --epochs 10 --batch 8 --data dataset/traffic_data.yaml
"""

import os
import sys
import argparse
import time

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, PROJECT_ROOT)

from ultralytics import YOLO
import config


def run_training(
    data_yaml="dataset/traffic_data.yaml",
    model_weights="yolov8n.pt",
    epochs=10,
    batch_size=8,
    imgsz=640,
    device="cpu",
    project="runs/traffic_train",
    name="yolov8_atsc_custom"
):
    data_yaml_path = os.path.join(PROJECT_ROOT, data_yaml) if not os.path.isabs(data_yaml) else data_yaml
    weights_path   = os.path.join(PROJECT_ROOT, model_weights) if not os.path.isabs(model_weights) else model_weights

    if not os.path.exists(data_yaml_path):
        print(f"[Training Pipeline] ERROR: Data YAML not found at: {data_yaml_path}")
        print("  -> First run 'python scripts/extract_dataset.py' to generate the training dataset.")
        return None

    if not os.path.exists(weights_path):
        print(f"[Training Pipeline] Base weights not found at {weights_path}, downloading standard yolov8n.pt...")
        weights_path = "yolov8n.pt"

    print("\n" + "=" * 65)
    print(f"   🚦 DEVDOMINATORS — YOLOv8 MODEL FINE-TUNING PIPELINE")
    print("=" * 65)
    print(f"  Dataset:      {data_yaml_path}")
    print(f"  Base Model:   {weights_path}")
    print(f"  Epochs:       {epochs}")
    print(f"  Batch Size:   {batch_size}")
    print(f"  Image Size:   {imgsz}")
    print(f"  Device:       {device.upper()}")
    print("=" * 65 + "\n")

    # Load model backbone
    model = YOLO(weights_path)

    start_time = time.time()

    # Train model
    results = model.train(
        data=data_yaml_path,
        epochs=epochs,
        batch=batch_size,
        imgsz=imgsz,
        device=device,
        project=project,
        name=name,
        workers=2,
        optimizer="AdamW",
        lr0=0.001,
        lrf=0.01,
        warmup_epochs=2,
        augment=True,
        verbose=True
    )

    elapsed_min = (time.time() - start_time) / 60.0

    print("\n" + "=" * 65)
    print(f"✓ MODEL TRAINING COMPLETE in {elapsed_min:.1f} minutes!")
    print(f"  Checkpoints saved to: {project}/{name}/weights/")

    best_pt = os.path.join(project, name, "weights", "best.pt")
    if os.path.exists(best_pt):
        print(f"  Best Weights: {best_pt}")

        # Validate trained model
        print("\n[Training Pipeline] Running post-training validation...")
        val_results = model.val(data=data_yaml_path)
        map50 = getattr(val_results.box, 'map50', 0.0)
        map50_95 = getattr(val_results.box, 'map', 0.0)
        print(f"  Validation mAP@50:    {map50 * 100:.2f}%")
        print(f"  Validation mAP@50-95: {map50_95 * 100:.2f}%")

        # Export to ONNX for edge inference
        print("\n[Training Pipeline] Exporting trained model to ONNX...")
        try:
            onnx_path = model.export(format="onnx", dynamic=True)
            print(f"✓ Exported ONNX model: {onnx_path}")
        except Exception as e:
            print(f"Notice: ONNX export skipped ({e})")

    print("=" * 65 + "\n")
    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fine-tune YOLOv8 on traffic datasets")
    parser.add_argument("--data", type=str, default="dataset/traffic_data.yaml", help="Path to traffic_data.yaml")
    parser.add_argument("--model", type=str, default="yolov8n.pt", help="Pretrained weights or backbone")
    parser.add_argument("--epochs", type=int, default=10, help="Number of training epochs")
    parser.add_argument("--batch", type=int, default=8, help="Training batch size")
    parser.add_argument("--imgsz", type=int, default=640, help="Input image dimension")
    parser.add_argument("--device", type=str, default="cpu", help="Device to use ('cpu' or '0' for CUDA GPU)")
    args = parser.parse_args()

    run_training(
        data_yaml=args.data,
        model_weights=args.model,
        epochs=args.epochs,
        batch_size=args.batch,
        imgsz=args.imgsz,
        device=args.device
    )
