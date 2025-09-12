import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import { Alert, Card, Badge, Button } from 'antd';
import { VideoCameraOutlined, WarningOutlined } from '@ant-design/icons';

const WebcamFeed = () => {
  const webcamRef = useRef(null);
  const wsRef = useRef(null);
  const [fallDetected, setFallDetected] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [alertHistory, setAlertHistory] = useState([]);
  
  useEffect(() => {
    // Connect to WebSocket
    wsRef.current = new WebSocket('ws://localhost:8000/ws');
    
    wsRef.current.onopen = () => {
      setIsConnected(true);
      console.log('Connected to fall detection server');
    };
    
    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setFallDetected(data.fall_detected);
      
      if (data.fall_detected) {
        const alert = {
          time: new Date().toLocaleTimeString(),
          confidence: data.confidence
        };
        setAlertHistory(prev => [alert, ...prev].slice(0, 5));
      }
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
      wsRef.current.close();
    };
  }, []);
  
  return (
    <div style={{ padding: '20px' }}>
      <Card 
        title={
          <span>
            <VideoCameraOutlined /> Live Fall Detection Monitor
            <Badge 
              status={isConnected ? "success" : "error"} 
              text={isConnected ? "Connected" : "Disconnected"}
              style={{ marginLeft: '20px' }}
            />
          </span>
        }
      >
        <div style={{ position: 'relative' }}>
          <Webcam
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            width={640}
            height={480}
            style={{ 
              border: fallDetected ? '5px solid red' : '2px solid #d9d9d9',
              borderRadius: '8px'
            }}
          />
          
          {fallDetected && (
            <Alert
              message="FALL DETECTED!"
              description="Immediate assistance required"
              type="error"
              showIcon
              icon={<WarningOutlined />}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                width: '250px'
              }}
              action={
                <Button size="small" danger>
                  Acknowledge
                </Button>
              }
            />
          )}
        </div>
        
        <div style={{ marginTop: '20px' }}>
          <h3>Recent Alerts</h3>
          {alertHistory.map((alert, index) => (
            <Alert
              key={index}
              message={`Fall detected at ${alert.time}`}
              type="warning"
              showIcon
              style={{ marginBottom: '10px' }}
            />
          ))}
        </div>
      </Card>
    </div>
  );
};

export default WebcamFeed;