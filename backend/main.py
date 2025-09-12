import asyncio
import base64
import json
import cv2
import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fall_detection import FallDetector, GaitAnalyzer
import mediapipe as mp
from datetime import datetime
from collections import deque

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize components
fall_detector = FallDetector()
gait_analyzer = GaitAnalyzer()
mp_drawing = mp.solutions.drawing_utils
mp_pose = mp.solutions.pose

# Store incident history
incident_history = deque(maxlen=100)

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

def process_frame_comprehensive(image_data):
    """Comprehensive frame processing with fall and gait analysis"""
    try:
        # Decode base64 image
        image_data = image_data.split(',')[1] if ',' in image_data else image_data
        image_bytes = base64.b64decode(image_data)
        nparr = np.frombuffer(image_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # Fall detection
        fall_results = fall_detector.process_frame(frame)
        
        # Process with MediaPipe for visualization
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        with mp_pose.Pose(
            static_image_mode=False,
            model_complexity=1,
            min_detection_confidence=0.5
        ) as pose:
            results = pose.process(rgb_frame)
            
            # Draw annotations
            annotated_frame = frame.copy()
            
            if results.pose_landmarks:
                # Draw skeleton
                mp_drawing.draw_landmarks(
                    annotated_frame,
                    results.pose_landmarks,
                    mp_pose.POSE_CONNECTIONS,
                    mp_drawing.DrawingSpec(color=(0, 255, 0), thickness=2, circle_radius=3),
                    mp_drawing.DrawingSpec(color=(0, 0, 255), thickness=2)
                )
                
                # Gait analysis
                gait_results = gait_analyzer.analyze_gait(results.pose_landmarks.landmark)
                
                # Add fall detection overlay
                if fall_results['fall_detected']:
                    cv2.putText(annotated_frame, "FALL DETECTED!", (50, 50),
                               cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 0, 255), 3)
                    
                    # Log incident
                    incident = {
                        'timestamp': datetime.now().isoformat(),
                        'type': 'fall',
                        'confidence': fall_results['fall_confidence'],
                        'reasons': fall_results['reasons']
                    }
                    incident_history.append(incident)
                
                # Add gait analysis overlay
                if gait_results:
                    risk_color = (0, 255, 0) if gait_results['risk_level'] == 'low' else \
                                 (0, 165, 255) if gait_results['risk_level'] == 'medium' else (0, 0, 255)
                    cv2.putText(annotated_frame, f"Gait Risk: {gait_results['risk_level'].upper()}", 
                               (50, 100), cv2.FONT_HERSHEY_SIMPLEX, 0.7, risk_color, 2)
        
        # Encode processed frame
        _, buffer = cv2.imencode('.jpg', annotated_frame)
        processed_image_base64 = base64.b64encode(buffer).decode('utf-8')
        processed_image_data = f"data:image/jpeg;base64,{processed_image_base64}"
        
        return {
            'processed_image': processed_image_data,
            'fall_detection': fall_results,
            'gait_analysis': gait_results,
            'pose_data': {
                'detected': results.pose_landmarks is not None,
                'landmarks': 33 if results.pose_landmarks else 0,
                'confidence': fall_results['fall_confidence']
            }
        }
        
    except Exception as e:
        print(f"Error processing frame: {e}")
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
                result = process_frame_comprehensive(frame_data["image"])
                
                if result:
                    # Send to all connected clients if fall detected
                    if result['fall_detection']['fall_detected']:
                        await manager.broadcast({
                            'alert': 'fall_detected',
                            'data': result['fall_detection'],
                            'timestamp': datetime.now().isoformat()
                        })
                    
                    await websocket.send_text(json.dumps(result))
                    
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        print("Client disconnected")

@app.get("/api/incidents")
async def get_incidents():
    """Get incident history"""
    return {"incidents": list(incident_history)}

@app.get("/")
async def root():
    return {"message": "CaretAIker Fall Detection System Running"}