from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import cv2
import base64
import json
import numpy as np
import asyncio
from fall_detector import FallDetector

app = FastAPI()

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

fall_detector = FallDetector()
active_connections = []

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    
    try:
        while True:
            # Receive frame from frontend
            data = await websocket.receive_text()
            frame_data = json.loads(data)
            
            # Decode base64 image
            image_data = base64.b64decode(frame_data['image'].split(',')[1])
            nparr = np.frombuffer(image_data, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            # Detect fall
            fall_detected, pose_results = fall_detector.detect_fall(frame)
            
            # Send result back
            await websocket.send_json({
                "fall_detected": fall_detected,
                "timestamp": frame_data.get('timestamp'),
                "confidence": 0.85 if fall_detected else 0.0
            })
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        active_connections.remove(websocket)

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
