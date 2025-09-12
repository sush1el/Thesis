import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Alert, Badge, Timeline, Statistic, Progress, Table } from 'antd';
import { 
  AlertOutlined, 
  UserOutlined, 
  HeartOutlined,
  WarningOutlined,
  CheckCircleOutlined 
} from '@ant-design/icons';

const Dashboard = ({ fallData, gaitData, incidents }) => {
  const [alertVisible, setAlertVisible] = useState(false);
  const [recentFalls, setRecentFalls] = useState([]);

  useEffect(() => {
    if (fallData?.fall_detected) {
      setAlertVisible(true);
      setRecentFalls(prev => [...prev, {
        time: new Date().toLocaleTimeString(),
        confidence: fallData.fall_confidence,
        reasons: fallData.reasons
      }].slice(-5)); // Keep last 5 falls
      
      // Auto-hide alert after 10 seconds
      setTimeout(() => setAlertVisible(false), 10000);
    }
  }, [fallData]);

  const getRiskColor = (level) => {
    switch(level) {
      case 'high': return '#ff4d4f';
      case 'medium': return '#faad14';
      case 'low': return '#52c41a';
      default: return '#d9d9d9';
    }
  };

  return (
    <div>
      {alertVisible && (
        <Alert
          message="FALL DETECTED"
          description={`Confidence: ${(fallData?.fall_confidence * 100).toFixed(0)}% - ${fallData?.reasons?.join(', ')}`}
          type="error"
          showIcon
          banner
          icon={<AlertOutlined />}
          style={{ marginBottom: 20 }}
        />
      )}

      <Row gutter={[16, 16]}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Fall Risk Status"
              value={fallData?.fall_detected ? "ALERT" : "SAFE"}
              valueStyle={{ 
                color: fallData?.fall_detected ? '#ff4d4f' : '#52c41a',
                fontSize: '24px'
              }}
              prefix={fallData?.fall_detected ? <WarningOutlined /> : <CheckCircleOutlined />}
            />
          </Card>
        </Col>

        <Col span={6}>
          <Card>
            <Statistic
              title="Gait Stability"
              value={gaitData?.risk_level || 'Analyzing'}
              valueStyle={{ 
                color: getRiskColor(gaitData?.risk_level),
                fontSize: '24px'
              }}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>

        <Col span={6}>
          <Card>
            <Statistic
              title="Instability Score"
              value={(gaitData?.instability_score * 100 || 0).toFixed(1)}
              suffix="%"
              valueStyle={{ fontSize: '24px' }}
            />
            <Progress 
              percent={(gaitData?.instability_score * 100 || 0)} 
              strokeColor={{
                '0%': '#52c41a',
                '50%': '#faad14',
                '100%': '#ff4d4f',
              }}
              showInfo={false}
            />
          </Card>
        </Col>

        <Col span={6}>
          <Card>
            <Statistic
              title="Falls Today"
              value={recentFalls.length}
              valueStyle={{ fontSize: '24px' }}
              prefix={<AlertOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 20 }}>
        <Col span={12}>
          <Card title="Recent Fall Events">
            <Timeline>
              {recentFalls.map((fall, index) => (
                <Timeline.Item 
                  key={index}
                  color="red"
                  dot={<AlertOutlined />}
                >
                  <p>{fall.time}</p>
                  <p>Confidence: {(fall.confidence * 100).toFixed(0)}%</p>
                  <p style={{ fontSize: '12px', color: '#666' }}>
                    {fall.reasons?.join(', ')}
                  </p>
                </Timeline.Item>
              ))}
              {recentFalls.length === 0 && (
                <Timeline.Item color="green">
                  No falls detected
                </Timeline.Item>
              )}
            </Timeline>
          </Card>
        </Col>

        <Col span={12}>
          <Card title="Gait Analysis Details">
            {gaitData ? (
              <div>
                <Row gutter={16}>
                  <Col span={12}>
                    <div style={{ marginBottom: 16 }}>
                      <span>Step Width Variability</span>
                      <Progress 
                        percent={(gaitData.step_width_var * 500).toFixed(0)} 
                        size="small"
                      />
                    </div>
                  </Col>
                  <Col span={12}>
                    <div style={{ marginBottom: 16 }}>
                      <span>Center of Mass Sway</span>
                      <Progress 
                        percent={(gaitData.com_sway * 500).toFixed(0)} 
                        size="small"
                      />
                    </div>
                  </Col>
                </Row>
                <Badge 
                  status={
                    gaitData.risk_level === 'high' ? 'error' :
                    gaitData.risk_level === 'medium' ? 'warning' : 'success'
                  }
                  text={`Risk Level: ${gaitData.risk_level?.toUpperCase()}`}
                />
              </div>
            ) : (
              <p>Analyzing gait patterns...</p>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;