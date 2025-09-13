import asyncio
import base64
import json
import cv2
import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fall_detection import PoseDetector
from datetime import datetime

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize pose detector
pose_detector = PoseDetector()

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_text(json.dumps(message))
            except:
                pass

manager = ConnectionManager()

def process_frame_simple(image_data):
    """Simple frame processing for pose detection only"""
    try:
        # Decode base64 image
        image_data = image_data.split(',')[1] if ',' in image_data else image_data
        image_bytes = base64.b64decode(image_data)
        nparr = np.frombuffer(image_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # Detect pose
        results = pose_detector.process_frame(frame)
        
        # Draw annotations
        annotated_frame = pose_detector.draw_annotations(frame, results)
        
        # Encode processed frame
        _, buffer = cv2.imencode('.jpg', annotated_frame)
        processed_image_base64 = base64.b64encode(buffer).decode('utf-8')
        processed_image_data = f"data:image/jpeg;base64,{processed_image_base64}"
        
        return {
            'processed_image': processed_image_data,
            'detection_data': {
                'person_detected': results.get('people_detected', 0) > 0,  # Add this
                'pose_detected': results.get('poses_detected', 0) > 0,    # Change this
                'num_people': results.get('people_detected', 0),          # Fix key name
                'keypoints_detected': len(results.get('body_keypoints', [])) * 8,  # Approximate
                'timestamp': results['timestamp']
            }
        }
        
    except Exception as e:
        print(f"Error processing frame: {e}")
        import traceback
        traceback.print_exc()  # This will show the full error
        return None
    
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    print("Client connected")
    
    try:
        while True:
            data = await websocket.receive_text()
            frame_data = json.loads(data)
            
            if "image" in frame_data:
                result = process_frame_simple(frame_data["image"])
                
                if result:
                    await websocket.send_text(json.dumps(result))
                    
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        print("Client disconnected")

@app.get("/")
async def root():
    return {"message": "Pose Detection System Running (YOLOv8 + MediaPipe)"}

if __name__ == "__main__":
    import uvicorn
    print("Starting CaretAIker server on http://localhost:8000")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)