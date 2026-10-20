import cv2, numpy as np, os

crops = [
    ("Real Ambulance", "test_crop_west_real_amb.jpg"),
    ("West Auto/Bus f255", "test_crop_west_bus.jpg"),
    ("North Transit Bus", "crop_nort_f270_bus_5.jpg"),
    ("West Red Transit Bus", "crop_west_f315_bus_5.jpg"),
    ("East Delivery Truck", "test_crop_east_veh.jpg"),
    ("North Pickup", "test_crop_north_veh.jpg")
]

for name, fname in crops:
    if not os.path.exists(fname):
        print(f"File not found: {fname}")
        continue
    img = cv2.imread(fname)
    h, w = img.shape[:2]
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    
    # Roof region (top 25%)
    roof = hsv[:max(4, int(h * 0.28)), :]
    rf_area = max(1, roof.shape[0] * roof.shape[1])
    
    # Blue strobe
    blue_mask = cv2.inRange(roof, np.array([95, 80, 80]), np.array([135, 255, 255]))
    blue_ratio = cv2.countNonZero(blue_mask) / rf_area
    
    # Red strobe
    r1 = cv2.inRange(roof, np.array([0, 90, 90]), np.array([12, 255, 255]))
    r2 = cv2.inRange(roof, np.array([168, 90, 90]), np.array([180, 255, 255]))
    red_ratio = cv2.countNonZero(cv2.bitwise_or(r1, r2)) / rf_area
    
    # White body
    white_mask = cv2.inRange(hsv, np.array([0, 0, 150]), np.array([180, 50, 255]))
    white_ratio = cv2.countNonZero(white_mask) / float(h * w)
    
    print(f"[{name}] {fname}:")
    print(f"   Size: {w}x{h} | Blue strobe: {blue_ratio:.4f} | Red strobe: {red_ratio:.4f} | White ratio: {white_ratio:.4f}")
