import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import { Card, Row, Col, Statistic, Tag } from 'antd';
import { UserOutlined, VideoCameraOutlined, RobotOutlined } from '@ant-design/icons';

const WebcamFeed = () => {
  const webcamRef = useRef(null);
  const wsRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [processedImage, setProcessedImage] = useState(null);
  const [detectionData, setDetectionData] = useState(null);
  
  useEffect(() => {
    const connect = () => {
      wsRef.current = new WebSocket('ws://localhost:8000/ws');
      
      wsRef.current.onopen = () => {
        setIsConnected(true);
        console.log('Connected to pose detection server');
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.processed_image) {
            setProcessedImage(data.processed_image);
          }
          
          if (data.detection_data) {
            setDetectionData(data.detection_data);
          }
        } catch (err) {
          console.error('Error parsing message:', err);
        }
      };
      
      wsRef.current.onclose = () => {
        setIsConnected(false);
        setTimeout(connect, 3000);
      };
    };
    
    connect();
    
    const interval = setInterval(() => {
      if (webcamRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
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
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="Connection Status"
              value={isConnected ? "Connected" : "Disconnected"}
              valueStyle={{ color: isConnected ? '#52c41a' : '#ff4d4f' }}
              prefix={<VideoCameraOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="People Detected"
              value={detectionData?.num_people || 0}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Pose Status"
              value={detectionData?.pose_detected ? "Detected" : "Not Detected"}
              valueStyle={{ color: detectionData?.pose_detected ? '#52c41a' : '#faad14' }}
            />
            {detectionData?.keypoints_detected > 0 && (
              <Tag color="blue" style={{ marginTop: 8 }}>
                {detectionData.keypoints_detected} keypoints
              </Tag>
            )}
          </Card>
        </Col>
      </Row>
      
      <Row gutter={16}>
        <Col span={12}>
          <Card title={<span><VideoCameraOutlined /> Camera Feed</span>}>
            <Webcam
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              width={640}
              height={480}
              style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
            />
          </Card>
        </Col>
        
        <Col span={12}>
          <Card title={<span><RobotOutlined /> Pose Detection (YOLOv8 + MediaPipe)</span>}>
            {processedImage ? (
              <img 
                src={processedImage} 
                alt="Pose detection"
                style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
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
                {isConnected ? 'Waiting for frames...' : 'Connecting...'}
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default WebcamFeed;