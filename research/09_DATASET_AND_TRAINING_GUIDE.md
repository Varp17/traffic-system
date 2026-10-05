# 🧠 DevDominators — Traffic Dataset Collection & YOLOv8 Model Training Guide

This guide details how to extract, annotate, download, and fine-tune custom deep learning perception models (YOLOv8) for Intelligent Traffic Management Systems (ITMS) and Adaptive Traffic Signal Control (ATSC).

---

## 🎯 1. Instant Automated Keyframe Extraction & Auto-Labeling

You can immediately generate an annotated training dataset from your local video files (`north.mp4`, `south.mp4`, `east.mp4`, `west.mp4`, `amb.mp4`, etc.) with one command:

```powershell
.\venv\Scripts\python.exe scripts/extract_dataset.py --frame_interval 20 --max_frames 60
```

### What This Does:
1. Scans your video feeds at distinct frame intervals (to maximize visual diversity and prevent redundant duplicate images).
2. Runs YOLOv8 multi-class detection combined with optical flasher/reflectivity filters.
3. Automatically annotates bounding boxes in standardized YOLO format:
   `<class_id> <x_center> <y_center> <width> <height>` (normalized 0.0 to 1.0)
4. Mappings:
   - `0`: **Car** ($1.0\text{ PCU}$)
   - `1`: **Motorcycle** ($0.5\text{ PCU}$)
   - `2`: **Bus** ($3.0\text{ PCU}$)
   - `3`: **Truck** ($3.0\text{ PCU}$)
   - `4`: **Ambulance / Emergency Vehicle** (Priority EVP)
   - `5`: **Person / Pedestrian** (Crosswalk Safety)
5. Automatically partitions the data into 80% Training (`dataset/images/train/`) and 20% Validation (`dataset/images/val/`).
6. Generates `dataset/traffic_data.yaml`.

---

## 🌐 2. Where & What Public Datasets to Download

For large-scale production training (10,000+ images), you can augment your dataset using these high-quality, open-access benchmarks:

### A. Emergency Vehicle Detection (Ambulances, Fire Engines, Police)
* **Roboflow Universe — Emergency Vehicles YOLOv8**:
  - **URL**: [https://universe.roboflow.com/search?q=ambulance%20yolov8](https://universe.roboflow.com/search?q=ambulance%20yolov8)
  - **Dataset Size**: ~3,000+ annotated images.
  - **Classes**: `ambulance`, `emergency_vehicle`, `fire_truck`, `police_car`.
  - **Download Format**: Select **"YOLOv8"** -> Download ZIP.
  - **Placement**: Extract into `dataset/emergency/` and run `python train.py --data dataset/emergency/data.yaml`.

* **Kaggle Emergency Vehicle Classification**:
  - **URL**: [https://www.kaggle.com/datasets/abhisheksinghblr/emergency-vehicles-identification](https://www.kaggle.com/datasets/abhisheksinghblr/emergency-vehicles-identification)
  - **Description**: Real-world urban emergency vehicles with diverse angles, lighting, and occlusions.

---

### B. Indian Driving Dataset (IDD) — Heterogeneous Urban Traffic
* **Source**: IIIT Hyderabad & Intel India
* **URL**: [https://idd.insaan.iiit.ac.in/](https://idd.insaan.iiit.ac.in/)
* **Description**: The premier benchmark for unstructured traffic featuring autorickshaws, crowded two-wheelers, heavy buses, and mixed lane discipline.
* **Download**:
  1. Create a free account at `https://idd.insaan.iiit.ac.in/`.
  2. Download **"IDD Detection (Auto, Bike, Car, Bus, Truck, Rider)"**.
  3. Extract into `dataset/idd/`.

---

### C. UA-DETRAC Urban Traffic Surveillance Benchmark
* **Source**: University at Albany (IEEE Transactions on CSVT)
* **URL**: [http://detrac-db.rit.albany.edu/](http://detrac-db.rit.albany.edu/)
* **Description**: 100+ hours of urban traffic camera footage covering 1.2M labeled vehicles (car, bus, van, other) under sunny, cloudy, rainy, and night conditions.

---

## ⚡ 3. How to Fine-Tune YOLOv8 Locally

Once your dataset is prepared in `dataset/traffic_data.yaml`, launch model fine-tuning with:

```powershell
.\venv\Scripts\python.exe train.py --epochs 25 --batch 8 --imgsz 640 --device cpu
```

### Key Training Parameters:
- `--data`: Path to dataset configuration YAML (`dataset/traffic_data.yaml`).
- `--model`: Pre-trained base weights (`yolov8n.pt` for nano speed, `yolov8s.pt` for higher accuracy).
- `--epochs`: Number of complete training passes (10–50 recommended).
- `--batch`: Batch size (4–8 for CPU, 16–32 for GPU).
- `--imgsz`: Input image resolution (640 is standard; 320 for ultra-fast training).
- `--device`: `cpu` (default) or `0` (if an NVIDIA CUDA GPU is available).

### Output Artifacts:
- Checkpoints are saved to `runs/detect/runs/traffic_train/yolov8_atsc_custom/weights/`:
  - `best.pt`: Weights achieving the highest validation mAP.
  - `last.pt`: Weights from the final epoch.
  - `best.onnx`: Exported ONNX graph for optimized edge inference.

---

## ☁️ 4. Free Cloud GPU Training (Google Colab 1-Click Guide)

If you want 10x faster training on a free NVIDIA T4 GPU, run this directly in Google Colab:

```python
# Cell 1: Install Ultralytics
!pip install ultralytics

# Cell 2: Clone or upload your dataset
# (Zip your local ./dataset folder and upload to Colab, then unzip:)
!unzip -q dataset.zip -d ./dataset

# Cell 3: Launch YOLOv8 fine-tuning with GPU acceleration
from ultralytics import YOLO

model = YOLO("yolov8n.pt")  # Pretrained backbone
results = model.train(
    data="dataset/traffic_data.yaml",
    epochs=30,
    batch=16,
    imgsz=640,
    device=0,  # Uses Colab NVIDIA T4 GPU
    name="devdominators_atsc_gpu"
)

# Cell 4: Download best.pt back to your local project
from google.colab import files
files.download("runs/detect/devdominators_atsc_gpu/weights/best.pt")
```

---

## 🚀 5. Deploying Your Trained Weights to DevDominators

To activate your newly fine-tuned model in the live 4-way platform:

1. Copy your trained `best.pt` file to the root directory (e.g. `yolov8_custom_traffic.pt`).
2. Open [`config.py`](file:///c:/Users/HP/Downloads/GHR%20winner%20project/devdominator%20final/devdominators/config.py) and update line 21:
   ```python
   MODEL_NAME = "yolov8_custom_traffic.pt"
   ```
3. Restart the platform:
   ```powershell
   .\venv\Scripts\python.exe run_4way.py
   ```
*The ATSC platform will immediately load your custom-trained weights and apply multi-class perception and emergency detection in real time.*
