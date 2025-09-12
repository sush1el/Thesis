import React from 'react';
import { Layout, Typography } from 'antd';
import WebcamFeed from './components/WebcamFeed';

const { Header, Content } = Layout;
const { Title } = Typography;

function App() {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#001529', padding: '0 20px' }}>
        <Title level={2} style={{ color: 'white', margin: '14px 0' }}>
          CaretAIker - MediaPipe Pose Detection Dashboard
        </Title>
      </Header>
      
      <Layout style={{ padding: '24px' }}>
        <Content style={{ background: '#fff', padding: 24, margin: 0, borderRadius: '8px' }}>
          <WebcamFeed />
        </Content>
      </Layout>
    </Layout>
  );
}

export default App;