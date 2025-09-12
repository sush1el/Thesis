import cv2
import mediapipe as mp
import numpy as np
from dataclasses import dataclass
from typing import List, Tuple

@dataclass
class FallDetectionConfig:
    hip_threshold: float = 0.5  # Hip position threshold
    angle_threshold: float = 60  # Body angle threshold
    confidence_threshold: float = 0.7

class FallDetector:
    def __init__(self):
        self.mp_pose = mp.solutions.pose
        self.pose = self.mp_pose.Pose(
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        self.mp_drawing = mp.solutions.drawing_utils
        self.config = FallDetectionConfig()
        self.previous_positions = []
        
    def detect_fall(self, image):
        # Convert to RGB
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        results = self.pose.process(image_rgb)
        
        if results.pose_landmarks:
            landmarks = results.pose_landmarks.landmark
            
            # Get key points
            left_hip = landmarks[self.mp_pose.PoseLandmark.LEFT_HIP]
            right_hip = landmarks[self.mp_pose.PoseLandmark.RIGHT_HIP]
            left_shoulder = landmarks[self.mp_pose.PoseLandmark.LEFT_SHOULDER]
            right_shoulder = landmarks[self.mp_pose.PoseLandmark.RIGHT_SHOULDER]
            
            # Calculate center points
            hip_center = (left_hip.y + right_hip.y) / 2
            shoulder_center = (left_shoulder.y + right_shoulder.y) / 2
            
            # Simple fall detection logic
            # 1. Check if person is horizontal (hip and shoulder at similar height)
            # 2. Check if person is low to ground
            is_horizontal = abs(hip_center - shoulder_center) < 0.15
            is_low = hip_center > self.config.hip_threshold
            
            fall_detected = is_horizontal and is_low
            
            return fall_detected, results
        
        return False, None