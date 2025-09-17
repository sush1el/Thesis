import React, { useState, useRef, useEffect } from 'react';
import { Layout, Typography, Tabs, Card, Row, Col, Statistic, Tag, Upload, Button, Table, Space, Select, Progress, Alert, Input, Divider, Badge } from 'antd';
import { UserOutlined, VideoCameraOutlined, RobotOutlined, UploadOutlined, PlayCircleOutlined, BarChartOutlined, ExperimentOutlined, FileAddOutlined, DatabaseOutlined, CheckCircleOutlined, CloseCircleOutlined, SyncOutlined } from '@ant-design/icons';
import Webcam from 'react-webcam';

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;

// WebcamFeed Component
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
    }, 100);
    
    return () => {
      clearInterval(interval);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);
  
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card size="small">
            <Statistic
              title="Connection Status"
              value={isConnected ? "Connected" : "Disconnected"}
              valueStyle={{ color: isConnected ? '#52c41a' : '#ff4d4f', fontSize: '16px' }}
              prefix={isConnected ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic
              title="People Detected"
              value={detectionData?.num_people || 0}
              prefix={<UserOutlined />}
              valueStyle={{ fontSize: '16px' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic
              title="Pose Status"
              value={detectionData?.pose_detected ? "Detected" : "Not Detected"}
              valueStyle={{ color: detectionData?.pose_detected ? '#52c41a' : '#faad14', fontSize: '16px' }}
            />
          </Card>
        </Col>
      </Row>
      
      <Row gutter={16} style={{ height: 'calc(100vh - 320px)' }}>
        <Col span={12}>
          <Card 
            title={<span><VideoCameraOutlined /> Camera Feed</span>} 
            size="small"
            bodyStyle={{ padding: '12px', height: '100%' }}
            style={{ height: '100%' }}
          >
            <div style={{ position: 'relative', width: '100%', paddingTop: '75%' }}>
              <Webcam
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                style={{ 
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: '4px' 
                }}
              />
            </div>
          </Card>
        </Col>
        
        <Col span={12}>
          <Card 
            title={<span><RobotOutlined /> Pose Detection (YOLOv8 + MediaPipe)</span>}
            size="small"
            bodyStyle={{ padding: '12px', height: '100%' }}
            style={{ height: '100%' }}
          >
            {processedImage ? (
              <div style={{ position: 'relative', width: '100%', paddingTop: '75%' }}>
                <img 
                  src={processedImage} 
                  alt="Pose detection"
                  style={{ 
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: '4px'
                  }}
                />
              </div>
            ) : (
              <div style={{ 
                position: 'relative',
                width: '100%',
                paddingTop: '75%',
                background: '#f0f0f0',
                borderRadius: '4px'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center'
                }}>
                  {isConnected ? (
                    <>
                      <SyncOutlined spin style={{ fontSize: '24px', color: '#1890ff' }} />
                      <p style={{ marginTop: '8px', color: '#666' }}>Connecting...</p>
                    </>
                  ) : (
                    <p style={{ color: '#666' }}>Waiting for connection...</p>
                  )}
                </div>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

// Model Testing Component
const ModelTesting = () => {
  const [selectedModel, setSelectedModel] = useState(null);
  const [testResults, setTestResults] = useState(null);
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [logs, setLogs] = useState([]);
  
  const addLog = (message, type = 'info') => {
    const newLog = {
      time: new Date().toLocaleTimeString(),
      message,
      type
    };
    setLogs(prev => [...prev, newLog].slice(-10));
  };

  const handleModelUpload = (info) => {
    if (info.file.status === 'done') {
      addLog(`Model ${info.file.name} uploaded successfully`, 'success');
      setSelectedModel(info.file.name);
    }
  };

  const handleDataUpload = (info) => {
    if (info.file.status === 'done') {
      addLog(`Dataset ${info.file.name} uploaded successfully`, 'success');
    }
  };

  const startTraining = () => {
    setIsTraining(true);
    setTrainingProgress(0);
    addLog('Training started...', 'info');
    
    // Simulate training progress
    const interval = setInterval(() => {
      setTrainingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsTraining(false);
          addLog('Training completed!', 'success');
          setTestResults({
            accuracy: 94.5,
            precision: 92.3,
            recall: 96.1,
            f1Score: 94.2,
            confusionMatrix: [[850, 50], [30, 70]]
          });
          return 100;
        }
        return prev + 10;
      });
    }, 1000);
  };

  const metricsColumns = [
    { title: 'Metric', dataIndex: 'metric', key: 'metric' },
    { title: 'Value', dataIndex: 'value', key: 'value' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (status) => (
      <Tag color={status === 'good' ? 'green' : status === 'warning' ? 'orange' : 'red'}>
        {status.toUpperCase()}
      </Tag>
    )}
  ];

  const metricsData = testResults ? [
    { key: '1', metric: 'Accuracy', value: `${testResults.accuracy}%`, status: 'good' },
    { key: '2', metric: 'Precision', value: `${testResults.precision}%`, status: 'good' },
    { key: '3', metric: 'Recall', value: `${testResults.recall}%`, status: 'good' },
    { key: '4', metric: 'F1-Score', value: `${testResults.f1Score}%`, status: 'good' }
  ] : [];

  return (
    <div style={{ width: '100%' }}>
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <Card title="Model Management" extra={<Badge status="processing" text="PyTorch" />}>
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <div>
                <Text strong>Import Pre-trained Model</Text>
                <Upload
                  accept=".pt,.pth"
                  onChange={handleModelUpload}
                  showUploadList={false}
                >
                  <Button icon={<UploadOutlined />} style={{ marginTop: 8, width: '100%' }}>
                    Upload PyTorch Model (.pt, .pth)
                  </Button>
                </Upload>
                {selectedModel && (
                  <Alert
                    message={`Model loaded: ${selectedModel}`}
                    type="success"
                    showIcon
                    style={{ marginTop: 8 }}
                  />
                )}
              </div>
              
              <Divider />
              
              <div>
                <Text strong>Model Architecture</Text>
                <Select
                  style={{ width: '100%', marginTop: 8 }}
                  placeholder="Select model architecture"
                  options={[
                    { value: 'yolov8', label: 'YOLOv8-Pose' },
                    { value: 'mediapipe', label: 'MediaPipe Holistic' },
                    { value: 'custom_cnn', label: 'Custom CNN' },
                    { value: 'lstm', label: 'LSTM for Temporal Analysis' }
                  ]}
                />
              </div>

              <div>
                <Text strong>Training Configuration</Text>
                <Space style={{ width: '100%', marginTop: 8 }} direction="vertical">
                  <Input placeholder="Batch Size (e.g., 32)" />
                  <Input placeholder="Learning Rate (e.g., 0.001)" />
                  <Input placeholder="Epochs (e.g., 100)" />
                </Space>
              </div>
            </Space>
          </Card>
        </Col>

        <Col span={12}>
          <Card title="Dataset Management" extra={<DatabaseOutlined />}>
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <div>
                <Text strong>Upload Training Data</Text>
                <Upload
                  accept=".csv,.json,.zip"
                  onChange={handleDataUpload}
                  showUploadList={true}
                  multiple
                >
                  <Button icon={<FileAddOutlined />} style={{ marginTop: 8, width: '100%' }}>
                    Upload Dataset (CSV, JSON, ZIP)
                  </Button>
                </Upload>
              </div>

              <div>
                <Text strong>Data Split Configuration</Text>
                <Row gutter={8} style={{ marginTop: 8 }}>
                  <Col span={8}>
                    <Input placeholder="Train %" defaultValue="70" />
                  </Col>
                  <Col span={8}>
                    <Input placeholder="Val %" defaultValue="20" />
                  </Col>
                  <Col span={8}>
                    <Input placeholder="Test %" defaultValue="10" />
                  </Col>
                </Row>
              </div>

              <div>
                <Text strong>Data Augmentation</Text>
                <Space wrap style={{ marginTop: 8 }}>
                  <Tag color="blue">Rotation</Tag>
                  <Tag color="blue">Flip</Tag>
                  <Tag color="blue">Scale</Tag>
                  <Tag color="blue">Noise</Tag>
                </Space>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Card title="Training Control" extra={<ExperimentOutlined />}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button
                type="primary"
                size="large"
                icon={<PlayCircleOutlined />}
                onClick={startTraining}
                disabled={isTraining}
                style={{ width: '100%' }}
              >
                {isTraining ? 'Training in Progress...' : 'Start Training'}
              </Button>

              {isTraining && (
                <div>
                  <Text>Training Progress</Text>
                  <Progress percent={trainingProgress} status="active" />
                </div>
              )}

              <div style={{ marginTop: 16 }}>
                <Text strong>Training Logs</Text>
                <div style={{
                  marginTop: 8,
                  padding: 8,
                  background: '#f0f0f0',
                  borderRadius: 4,
                  maxHeight: 200,
                  overflowY: 'auto'
                }}>
                  {logs.length === 0 ? (
                    <Text type="secondary">No logs yet...</Text>
                  ) : (
                    logs.map((log, index) => (
                      <div key={index} style={{ marginBottom: 4 }}>
                        <Text type="secondary">[{log.time}]</Text>
                        <Text
                          style={{
                            marginLeft: 8,
                            color: log.type === 'error' ? '#ff4d4f' :
                                   log.type === 'success' ? '#52c41a' : '#000'
                          }}
                        >
                          {log.message}
                        </Text>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </Space>
          </Card>
        </Col>

        <Col span={12}>
          <Card title="Test Results" extra={<BarChartOutlined />}>
            {testResults ? (
              <Space direction="vertical" style={{ width: '100%' }}>
                <Table
                  columns={metricsColumns}
                  dataSource={metricsData}
                  pagination={false}
                  size="small"
                />
                
                <div style={{ marginTop: 16 }}>
                  <Text strong>Confusion Matrix</Text>
                  <div style={{
                    marginTop: 8,
                    padding: 16,
                    background: '#fafafa',
                    borderRadius: 4,
                    textAlign: 'center'
                  }}>
                    <table style={{ margin: '0 auto', borderCollapse: 'collapse' }}>
                      <tbody>
                        <tr>
                          <td style={{ padding: 8, border: '1px solid #d9d9d9' }}>TN: {testResults.confusionMatrix[0][0]}</td>
                          <td style={{ padding: 8, border: '1px solid #d9d9d9' }}>FP: {testResults.confusionMatrix[0][1]}</td>
                        </tr>
                        <tr>
                          <td style={{ padding: 8, border: '1px solid #d9d9d9' }}>FN: {testResults.confusionMatrix[1][0]}</td>
                          <td style={{ padding: 8, border: '1px solid #d9d9d9' }}>TP: {testResults.confusionMatrix[1][1]}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <Button type="primary" icon={<UploadOutlined />}>
                  Export Model
                </Button>
              </Space>
            ) : (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <Text type="secondary">No test results available. Train a model first.</Text>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

// Main App Component
function App() {
  const tabItems = [
    {
      key: 'live',
      label: (
        <span>
          <VideoCameraOutlined />
          Live Detection
        </span>
      ),
      children: <WebcamFeed />
    },
    {
      key: 'model',
      label: (
        <span>
          <ExperimentOutlined />
          Model Testing
        </span>
      ),
      children: <ModelTesting />
    }
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Header style={{ 
        background: '#001529', 
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <Title level={3} style={{ color: 'white', margin: 0 }}>
          CaretAIker - MediaPipe Pose Detection Dashboard
        </Title>
      </Header>
      
      <Content style={{ padding: '24px', height: 'calc(100vh - 64px)' }}>
        <div style={{ 
          background: '#fff', 
          borderRadius: '8px',
          height: '100%',
          overflow: 'hidden'
        }}>
          <Tabs
            items={tabItems}
            size="large"
            style={{ height: '100%' }}
            tabBarStyle={{ 
              paddingLeft: 24,
              paddingRight: 24,
              marginBottom: 0,
              borderBottom: '1px solid #f0f0f0'
            }}
          />
        </div>
      </Content>
    </Layout>
  );
}

export default App;