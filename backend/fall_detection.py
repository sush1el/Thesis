import numpy as np
import cv2
import mediapipe as mp
from ultralytics import YOLO
import tensorflow as tf
from collections import deque
from datetime import datetime

class FallDetector:
    def __init__(self):
        # MediaPipe initialization
        self.mp_pose = mp.solutions.pose
        self.pose = self.mp_pose.Pose(
            static_image_mode=False,
            model_complexity=2,
            enable_segmentation=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        
        # YOLOv8 for person detection
        self.yolo_model = YOLO('yolov8n.pt')  # Will download automatically
        
        # Fall detection thresholds
        self.fall_threshold = 0.6
        self.angle_threshold = 60  # degrees
        self.velocity_threshold = 2.0  # relative units
        
        # Historical data for analysis
        self.pose_history = deque(maxlen=30)  # Store 30 frames (1 second at 30fps)
        self.fall_events = []
        
    def calculate_body_angle(self, landmarks):
        """Calculate the angle of the body from vertical"""
        if not landmarks:
            return None
            
        # Get key points
        nose = landmarks[self.mp_pose.PoseLandmark.NOSE.value]
        left_hip = landmarks[self.mp_pose.PoseLandmark.LEFT_HIP.value]
        right_hip = landmarks[self.mp_pose.PoseLandmark.RIGHT_HIP.value]
        
        # Calculate midpoint of hips
        hip_center_x = (left_hip.x + right_hip.x) / 2
        hip_center_y = (left_hip.y + right_hip.y) / 2
        
        # Calculate angle from vertical
        dx = nose.x - hip_center_x
        dy = nose.y - hip_center_y
        angle = np.degrees(np.arctan2(dx, -dy))  # Negative dy for correct orientation
        
        return abs(angle)
    
    def calculate_vertical_velocity(self, current_landmarks):
        """Calculate vertical velocity of key points"""
        if len(self.pose_history) < 2:
            return 0
            
        prev_landmarks = self.pose_history[-2]
        if not prev_landmarks or not current_landmarks:
            return 0
            
        # Track hip center velocity
        curr_left_hip = current_landmarks[self.mp_pose.PoseLandmark.LEFT_HIP.value]
        curr_right_hip = current_landmarks[self.mp_pose.PoseLandmark.RIGHT_HIP.value]
        prev_left_hip = prev_landmarks[self.mp_pose.PoseLandmark.LEFT_HIP.value]
        prev_right_hip = prev_landmarks[self.mp_pose.PoseLandmark.RIGHT_HIP.value]
        
        curr_hip_y = (curr_left_hip.y + curr_right_hip.y) / 2
        prev_hip_y = (prev_left_hip.y + prev_right_hip.y) / 2
        
        velocity = (curr_hip_y - prev_hip_y) * 30  # Multiply by FPS for velocity
        return velocity
    
    def detect_fall_from_pose(self, landmarks):
        """Detect fall based on pose analysis"""
        if not landmarks:
            return False, 0
            
        # Calculate metrics
        body_angle = self.calculate_body_angle(landmarks)
        vertical_velocity = self.calculate_vertical_velocity(landmarks)
        
        # Get hip position relative to frame
        left_hip = landmarks[self.mp_pose.PoseLandmark.LEFT_HIP.value]
        right_hip = landmarks[self.mp_pose.PoseLandmark.RIGHT_HIP.value]
        hip_height = (left_hip.y + right_hip.y) / 2
        
        # Fall detection logic
        fall_score = 0
        reasons = []
        
        # Check body angle
        if body_angle and body_angle > self.angle_threshold:
            fall_score += 0.4
            reasons.append(f"Body angle: {body_angle:.1f}°")
        
        # Check vertical velocity (falling down)
        if vertical_velocity > self.velocity_threshold:
            fall_score += 0.3
            reasons.append(f"Fast downward movement: {vertical_velocity:.2f}")
        
        # Check if person is low in frame (on ground)
        if hip_height > 0.7:  # Lower 30% of frame
            fall_score += 0.3
            reasons.append(f"Low position: {hip_height:.2f}")
        
        # Additional check: sudden change in pose
        if len(self.pose_history) >= 10:
            recent_angles = [self.calculate_body_angle(p) for p in self.pose_history[-10:] if p]
            if recent_angles and body_angle:
                angle_change = body_angle - np.mean([a for a in recent_angles if a])
                if angle_change > 30:
                    fall_score += 0.2
                    reasons.append(f"Sudden angle change: {angle_change:.1f}°")
        
        is_fall = fall_score >= self.fall_threshold
        
        return is_fall, fall_score, reasons
    
    def process_frame(self, frame):
        """Process a single frame for fall detection"""
        results = {
            'person_detected': False,
            'pose_detected': False,
            'fall_detected': False,
            'fall_confidence': 0,
            'reasons': [],
            'timestamp': datetime.now().isoformat()
        }
        
        # YOLOv8 person detection
        yolo_results = self.yolo_model(frame, classes=[0])  # Class 0 is person
        
        if len(yolo_results[0].boxes) > 0:
            results['person_detected'] = True
            
            # Get the largest person bounding box
            boxes = yolo_results[0].boxes
            largest_box_idx = np.argmax([box.xywh[0][2] * box.xywh[0][3] for box in boxes])
            box = boxes[largest_box_idx]
            
            # Crop to person region for better pose detection
            x1, y1, x2, y2 = box.xyxy[0].int().tolist()
            person_roi = frame[y1:y2, x1:x2]
            
            # MediaPipe pose detection
            rgb_roi = cv2.cvtColor(person_roi, cv2.COLOR_BGR2RGB)
            pose_results = self.pose.process(rgb_roi)
            
            if pose_results.pose_landmarks:
                results['pose_detected'] = True
                landmarks = pose_results.pose_landmarks.landmark
                
                # Store in history
                self.pose_history.append(landmarks)
                
                # Detect fall
                is_fall, confidence, reasons = self.detect_fall_from_pose(landmarks)
                results['fall_detected'] = is_fall
                results['fall_confidence'] = confidence
                results['reasons'] = reasons
                
                if is_fall:
                    self.fall_events.append({
                        'timestamp': results['timestamp'],
                        'confidence': confidence,
                        'reasons': reasons
                    })
        
        return results

class GaitAnalyzer:
    """Analyze walking patterns for pre-fall detection"""
    
    def __init__(self):
        self.mp_pose = mp.solutions.pose
        self.gait_history = deque(maxlen=90)  # 3 seconds at 30fps
        self.stride_lengths = deque(maxlen=10)
        self.step_times = deque(maxlen=10)
        
    def analyze_gait(self, landmarks):
        """Analyze gait patterns for instability"""
        if not landmarks:
            return None
            
        # Calculate step width
        left_ankle = landmarks[self.mp_pose.PoseLandmark.LEFT_ANKLE.value]
        right_ankle = landmarks[self.mp_pose.PoseLandmark.RIGHT_ANKLE.value]
        step_width = abs(left_ankle.x - right_ankle.x)
        
        # Calculate center of mass shift
        left_hip = landmarks[self.mp_pose.PoseLandmark.LEFT_HIP.value]
        right_hip = landmarks[self.mp_pose.PoseLandmark.RIGHT_HIP.value]
        com_x = (left_hip.x + right_hip.x) / 2
        
        self.gait_history.append({
            'step_width': step_width,
            'com_x': com_x,
            'timestamp': datetime.now()
        })
        
        # Analyze patterns
        if len(self.gait_history) >= 30:
            recent_widths = [g['step_width'] for g in self.gait_history[-30:]]
            recent_com = [g['com_x'] for g in self.gait_history[-30:]]
            
            # Calculate variability (higher = more unstable)
            width_variability = np.std(recent_widths)
            com_variability = np.std(recent_com)
            
            instability_score = (width_variability * 2 + com_variability) / 3
            
            return {
                'instability_score': instability_score,
                'step_width_var': width_variability,
                'com_sway': com_variability,
                'risk_level': 'high' if instability_score > 0.15 else 'medium' if instability_score > 0.08 else 'low'
            }
        
        return None