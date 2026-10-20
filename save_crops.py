import cv2, os

def save_crop(vid_path, frame_num, box, out_name):
    cap = cv2.VideoCapture(vid_path)
    cap.set(cv2.CAP_PROP_POS_FRAMES, frame_num)
    ret, frame = cap.read()
    cap.release()
    if ret and frame is not None:
        x1, y1, x2, y2 = box
        crop = frame[y1:y2, x1:x2]
        if crop.size > 0:
            cv2.imwrite(out_name, crop)
            print(f"Saved {out_name} (size: {crop.shape})")

save_crop("assets/videos/west1.mp4", 10, (887, 221, 1078, 473), "test_crop_west_real_amb.jpg")
save_crop("assets/videos/west1.mp4", 40, (226, 289, 354, 455), "test_crop_west_bus.jpg")
save_crop("assets/videos/north.mp4", 40, (383, 358, 443, 451), "test_crop_north_veh.jpg")
save_crop("assets/videos/east.mp4", 30, (2158, 829, 2822, 1426), "test_crop_east_veh.jpg")
