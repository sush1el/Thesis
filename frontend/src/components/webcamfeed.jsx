import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import { Card, Badge, Statistic, Row, Col } from 'antd';
import { VideoCameraOutlined, UserOutlined } from '@ant-design/icons';

const WebcamFeed = () => {
  const webcamRef = useRef(null);
  const wsRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [processedImage, setProcessedImage] = useState(null);
  const [poseDetected, setPoseDetected] = useState(false);
  const [landmarks, setLandmarks] = useState(0);
  const [confidence, setConfidence] = useState(0);
  
  useEffect(() => {
    // Connect to WebSocket
    wsRef.current = new WebSocket('ws://localhost:8000/ws');
    
    wsRef.current.onopen = () => {
      setIsConnected(true);
      console.log('Connected to MediaPipe server');
    };
    
    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      // Update processed image with skeleton
      if (data.processed_image) {
        setProcessedImage(data.processed_image);
      }
      
      // Update pose detection stats
      if (data.pose_data) {
        setPoseDetected(data.pose_data.detected);
        setLandmarks(data.pose_data.landmarks || 0);
        setConfidence(data.pose_data.confidence || 0);
      }
    };
    
    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };
    
    wsRef.current.onclose = () => {
      setIsConnected(false);
      console.log('Disconnected from server');
    };
    
    // Send frames to backend
    const interval = setInterval(() => {
      if (webcamRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        const imageSrc = webcamRef.current.getScreenshot();
        if (imageSrc) {
          wsRef.current.send(JSON.stringify({
            image: imageSrc,
            timestamp: Date.now()
          }));
        }
      }
    }, 100); // 10 FPS
    
    return () => {
      clearInterval(interval);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);
  
  return (
    <div>
      <Row gutter={16}>
        <Col span={12}>
          <Card 
            title={
              <span>
                <VideoCameraOutlined /> Original Feed
                <Badge 
                  status={isConnected ? "success" : "error"} 
                  text={isConnected ? "Connected" : "Disconnected"}
                  style={{ marginLeft: '20px' }}
                />
              </span>
            }
          >
            <Webcam
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              width={640}
              height={480}
              style={{ 
                width: '100%',
                height: 'auto',
                borderRadius: '8px'
              }}
            />
          </Card>
        </Col>
        
        <Col span={12}>
          <Card 
            title={
              <span>
                <UserOutlined /> MediaPipe Skeleton View
              </span>
            }
          >
            {processedImage ? (
              <img 
                src={processedImage} 
                alt="Processed feed with skeleton"
                style={{ 
                  width: '100%',
                  height: 'auto',
                  borderRadius: '8px'
                }}
              />
            ) : (
              <div style={{ 
                width: '100%', 
                height: '480px', 
                background: '#f0f0f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px'
              }}>
                Waiting for processed frames...
              </div>
            )}
          </Card>
        </Col>
      </Row>
      
      <Row gutter={16} style={{ marginTop: '20px' }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="Pose Detection"
              value={poseDetected ? "Detected" : "Not Detected"}
              valueStyle={{ color: poseDetected ? '#3f8600' : '#cf1322' }}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Landmarks Detected"
              value={landmarks}
              suffix="/ 33"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Confidence"
              value={(confidence * 100).toFixed(1)}
              suffix="%"
              precision={1}
              valueStyle={{ color: confidence > 0.7 ? '#3f8600' : '#faad14' }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default WebcamFeed;