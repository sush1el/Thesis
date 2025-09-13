import numpy as np
import cv2
from ultralytics import YOLO
from datetime import datetime

class PoseDetector:
    def __init__(self):
        # YOLOv8 pose model
        self.pose_model = YOLO('yolov8n-pose.pt')
        
        # Body-only connections (excluding face and hands)
        # We'll only draw connections between shoulders, hips, knees, and ankles
        self.body_skeleton = [
            [5, 6],    # Shoulders
            [5, 11],   # Left shoulder to left hip
            [6, 12],   # Right shoulder to right hip
            [11, 12],  # Hips
            [11, 13],  # Left hip to left knee
            [13, 15],  # Left knee to left ankle
            [12, 14],  # Right hip to right knee
            [14, 16],  # Right knee to right ankle
        ]
        
        # Body-only keypoint indices (0-indexed)
        # 5: Left Shoulder, 6: Right Shoulder
        # 11: Left Hip, 12: Right Hip
        # 13: Left Knee, 14: Right Knee
        # 15: Left Ankle, 16: Right Ankle
        self.body_keypoints_indices = [5, 6, 11, 12, 13, 14, 15, 16]
        
    def process_frame(self, frame):
        """Process a single frame for pose detection"""
        results = {
            'person_detected': False,      # For frontend compatibility
            'people_detected': 0,
            'pose_detected': False,         # For frontend compatibility
            'poses_detected': 0,
            'num_people': 0,                # Alternative key for frontend
            'body_keypoints': [],
            'keypoints_detected': 0,        # For frontend display
            'timestamp': datetime.now().isoformat()
        }
        
        # Run YOLOv8 pose detection
        pose_results = self.pose_model(frame, verbose=False)
        
        if len(pose_results) > 0:
            result = pose_results[0]
            
            if result.keypoints is not None and result.keypoints.xy is not None:
                keypoints = result.keypoints.xy.cpu().numpy()
                confidences = result.keypoints.conf.cpu().numpy() if result.keypoints.conf is not None else None
                
                num_people = len(keypoints)
                results['people_detected'] = num_people
                results['person_detected'] = num_people > 0
                results['poses_detected'] = num_people
                results['pose_detected'] = num_people > 0
                results['num_people'] = num_people
                
                # Count total keypoints for display
                total_keypoints = 0
                
                # Extract only body keypoints for each person
                for person_idx in range(len(keypoints)):
                    person_keypoints = keypoints[person_idx]
                    person_conf = confidences[person_idx] if confidences is not None else None
                    
                    # Filter to body-only keypoints
                    body_points = {}
                    for idx in self.body_keypoints_indices:
                        if person_keypoints[idx][0] > 0 and person_keypoints[idx][1] > 0:
                            body_points[idx] = {
                                'x': float(person_keypoints[idx][0]),
                                'y': float(person_keypoints[idx][1]),
                                'conf': float(person_conf[idx]) if person_conf is not None else 1.0
                            }
                            total_keypoints += 1
                    
                    results['body_keypoints'].append(body_points)
                
                results['keypoints_detected'] = total_keypoints
        
        return results
    
    def draw_annotations(self, frame, results):
        """Draw only body skeleton on frame"""
        annotated_frame = frame.copy()
        
        # Run detection for drawing
        pose_results = self.pose_model(frame, verbose=False)
        
        if len(pose_results) > 0:
            result = pose_results[0]
            
            if result.keypoints is not None and result.keypoints.xy is not None:
                keypoints = result.keypoints.xy.cpu().numpy()
                confidences = result.keypoints.conf.cpu().numpy() if result.keypoints.conf is not None else None
                
                # Draw for each person
                for person_idx in range(len(keypoints)):
                    person_keypoints = keypoints[person_idx]
                    person_conf = confidences[person_idx] if confidences is not None else None
                    
                    # Draw body skeleton connections
                    for connection in self.body_skeleton:
                        idx1, idx2 = connection
                        x1, y1 = person_keypoints[idx1]
                        x2, y2 = person_keypoints[idx2]
                        
                        # Check if keypoints are valid
                        if x1 > 0 and y1 > 0 and x2 > 0 and y2 > 0:
                            # Check confidence
                            conf_check = True
                            if person_conf is not None:
                                conf_check = person_conf[idx1] > 0.5 and person_conf[idx2] > 0.5
                            
                            if conf_check:
                                # Draw line
                                cv2.line(annotated_frame, 
                                       (int(x1), int(y1)), 
                                       (int(x2), int(y2)), 
                                       (0, 255, 0), 3, cv2.LINE_AA)
                    
                    # Draw body keypoints only
                    for idx in self.body_keypoints_indices:
                        x, y = person_keypoints[idx]
                        if x > 0 and y > 0:
                            conf = person_conf[idx] if person_conf is not None else 1.0
                            if conf > 0.5:
                                # Color based on confidence
                                if conf > 0.75:
                                    color = (0, 255, 0)  # Green for high confidence
                                else:
                                    color = (0, 165, 255)  # Orange for medium confidence
                                
                                # Draw keypoint
                                cv2.circle(annotated_frame, (int(x), int(y)), 6, color, -1)
                                cv2.circle(annotated_frame, (int(x), int(y)), 8, (255, 255, 255), 2)
                    
                    # Draw bounding box around person
                    if result.boxes is not None and len(result.boxes) > person_idx:
                        box = result.boxes[person_idx]
                        x1, y1, x2, y2 = box.xyxy[0].cpu().numpy().astype(int)
                        cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (255, 0, 255), 2)
        
        # Add status text with background
        status = f"People: {results['people_detected']} | Body Poses: {results['poses_detected']}"
        
        # Black background for text
        cv2.rectangle(annotated_frame, (5, 5), (450, 40), (0, 0, 0), -1)
        cv2.putText(annotated_frame, status, (10, 30),
                   cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2, cv2.LINE_AA)
        
        # Add label
        cv2.putText(annotated_frame, "Body Posture Only (No Face/Hands)", (10, 60),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2, cv2.LINE_AA)
        
        return annotated_frame