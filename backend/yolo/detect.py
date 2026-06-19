import cv2
from ultralytics import YOLO

# Load YOLO model
model = YOLO("yolov8n.pt")

# Open video
cap = cv2.VideoCapture("traffic_video.mp4")

while True:
    ret, frame = cap.read()

    if not ret:
        break

    # Run YOLO detection
    results = model(frame, conf=0.3)

    vehicle_count = 0

    for r in results:
        boxes = r.boxes

        for box in boxes:
            cls = int(box.cls[0])
            conf = float(box.conf[0])

            # Vehicle classes in COCO dataset
            if cls in [2, 3, 5, 7]:  # car, motorcycle, bus, truck

                x1, y1, x2, y2 = map(int, box.xyxy[0])

                cv2.rectangle(frame, (x1,y1), (x2,y2), (0,255,0), 2)

                label = f"Vehicle {conf:.2f}"
                cv2.putText(frame, label, (x1, y1-10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5,
                            (0,255,0), 2)

                vehicle_count += 1

    # Display vehicle count
    cv2.putText(frame, f"Vehicles: {vehicle_count}",
                (50,50),
                cv2.FONT_HERSHEY_SIMPLEX,
                1,
                (0,0,255),
                2)

    cv2.imshow("Traffic Detection", frame)

    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

cap.release()
cv2.destroyAllWindows()