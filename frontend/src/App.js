import React from 'react';
import { Layout, Menu, Typography } from 'antd';
import { DashboardOutlined, AlertOutlined } from '@ant-design/icons';
import WebcamFeed from './components/webcamfeed';
import 'antd/dist/reset.css';

const { Header, Content, Sider } = Layout;
const { Title } = Typography;

function App() {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#001529', padding: '0 20px' }}>
        <Title level={2} style={{ color: 'white', margin: '14px 0' }}>
          CaretAIker - Fall Detection System
        </Title>
      </Header>
      
      <Layout>
        <Sider width={200} style={{ background: '#fff' }}>
          <Menu
            mode="inline"
            defaultSelectedKeys={['1']}
            style={{ height: '100%', borderRight: 0 }}
          >
            <Menu.Item key="1" icon={<DashboardOutlined />}>
              Live Monitor
            </Menu.Item>
            <Menu.Item key="2" icon={<AlertOutlined />}>
              Alert History
            </Menu.Item>
          </Menu>
        </Sider>
        
        <Layout style={{ padding: '24px' }}>
          <Content style={{ background: '#fff', padding: 24, margin: 0 }}>
            <WebcamFeed />
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
}

export default App;