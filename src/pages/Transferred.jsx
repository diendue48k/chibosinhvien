import React, { useState, useEffect } from 'react';
import { Table, Input, Typography, Space, message, Button } from 'antd';
import { SearchOutlined, EyeOutlined } from '@ant-design/icons';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import DetailModal from '../components/DetailModal';

const { Title } = Typography;

const Transferred = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDetailVisible, setIsDetailVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const fetchTransferred = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "transferred"));
      const transferredData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setData(transferredData);
    } catch (error) {
      message.error("Lỗi khi tải danh sách Đảng viên chuyển ra");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransferred();
  }, []);

  const handleView = (record) => {
    setSelectedRecord(record);
    setIsDetailVisible(true);
  };

  const columns = [
    { title: 'MSSV', dataIndex: 'MSSV', key: 'MSSV' },
    { title: 'Họ tên', dataIndex: 'Hovaten', key: 'Hovaten' },
    { title: 'Lớp', dataIndex: 'Lop', key: 'Lop' },
    { title: 'Ngày chuyển', dataIndex: 'Ngaychuyenra', key: 'Ngaychuyenra' },
    { title: 'Nơi chuyển đến', dataIndex: 'Noichuyenra', key: 'Noichuyenra' },
    {
      title: 'Hành động',
      key: 'action',
      render: (_, record) => (
        <Button type="text" icon={<EyeOutlined />} onClick={() => handleView(record)} style={{ color: '#1890ff' }} title="Xem chi tiết" />
      ),
    },
  ];

  return (
    <div>
      <Title level={3} style={{ marginBottom: 24 }}>Đảng viên chuyển ra</Title>
      
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Input.Search 
            placeholder="Tìm theo MSSV, Họ tên..." 
            allowClear 
            style={{ width: 300 }}
            enterButton={<SearchOutlined />}
          />
        </Space>
      </div>

      <Table 
        columns={columns} 
        dataSource={data} 
        loading={loading}
        rowKey="id"
      />

      <DetailModal 
        open={isDetailVisible} 
        onCancel={() => setIsDetailVisible(false)} 
        data={selectedRecord} 
      />
    </div>
  );
};

export default Transferred;
