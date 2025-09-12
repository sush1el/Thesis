import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import { Card, Row, Col, Tabs } from 'antd';
import { VideoCameraOutlined, DashboardOutlined, RobotOutlined } from '@ant-design/icons';
import Dashboard from './Dashboard';

const { TabPane } = Tabs;

const WebcamFeed = () => {
  const webcamRef = useRef(null);
  const wsRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [processedImage, setProcessedImage] = useState(null);
  const [fallData, setFallData] = useState(null);
  const [gaitData, setGaitData] = useState(null);
  const [incidents, setIncidents] = useState([]);
  
  useEffect(() => {
    const connect = () => {
      wsRef.current = new WebSocket('ws://localhost:8000/ws');
      
      wsRef.current.onopen = () => {
        setIsConnected(true);
        console.log('Connected to CaretAIker server');
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.processed_image) {
            setProcessedImage(data.processed_image);
          }
          
          if (data.fall_detection) {
            setFallData(data.fall_detection);
          }
          
          if (data.gait_analysis) {
            setGaitData(data.gait_analysis);
          }
          
          if (data.alert === 'fall_detected') {
            // Handle fall alert
            console.log('Fall alert received:', data);
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
    }, 100);
    
    return () => {
      clearInterval(interval);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);
  
  return (
    <Tabs defaultActiveKey="1">
      <TabPane tab={<span><VideoCameraOutlined />Live Monitoring</span>} key="1">
        <Row gutter={16}>
          <Col span={12}>
            <Card title="Camera Feed">
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
            <Card title={<span><RobotOutlined /> AI Analysis View</span>}>
              {processedImage ? (
                <img 
                  src={processedImage} 
                  alt="AI processed feed"
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
                  {isConnected ? 'Processing...' : 'Connecting to server...'}
                </div>
              )}
            </Card>
          </Col>
        </Row>
      </TabPane>
      
      <TabPane tab={<span><DashboardOutlined />Analytics Dashboard</span>} key="2">
        <Dashboard 
          fallData={fallData}
          gaitData={gaitData}
          incidents={incidents}
        />
      </TabPane>
    </Tabs>
  );
};

export default WebcamFeed;