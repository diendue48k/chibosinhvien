import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ConfigProvider
      locale={viVN}
      theme={{
        token: {
          colorPrimary: '#c62828',
          colorInfo: '#c62828',
          colorSuccess: '#389e0d',
          colorWarning: '#fbc02d',
          colorError: '#cf1322',
          fontFamily: "'SVN-Gilroy', 'svn-gilroy', 'SVN - Gilroy', 'Gilroy', 'SVN Gilroy', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        },
        components: {
          Layout: {
            headerBg: '#c62828',
            siderBg: '#ffffff',
          },
          Menu: {
            itemSelectedColor: '#c62828',
            itemSelectedBg: '#fff1f0',
          }
        }
      }}
    >
      <App />
    </ConfigProvider>
  </React.StrictMode>,
);
