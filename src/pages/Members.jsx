import React, { useState, useEffect } from 'react';
import { Table, Button, Input, Space, Typography, Popconfirm, message, Modal, Form } from 'antd';
import { PlusOutlined, ExportOutlined, SearchOutlined, EyeOutlined, DeleteOutlined } from '@ant-design/icons';
import { collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import MemberForm from '../components/MemberForm';
import DetailModal from '../components/DetailModal';

const { Title } = Typography;

const Members = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isDetailVisible, setIsDetailVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  
  const [isTransferModalVisible, setIsTransferModalVisible] = useState(false);
  const [transferForm] = Form.useForm();
  const [recordToTransfer, setRecordToTransfer] = useState(null);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "members"));
      const membersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setData(membersData);
    } catch (error) {
      message.error("Lỗi khi tải danh sách Đảng viên");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleAdd = () => {
    setIsFormVisible(true);
  };

  const handleSave = async (values) => {
    try {
      await addDoc(collection(db, "members"), values);
      message.success('Thêm Đảng viên thành công');
      setIsFormVisible(false);
      fetchMembers();
    } catch (error) {
      message.error('Lỗi khi thêm Đảng viên');
      console.error(error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, "members", id));
      message.success('Xóa Đảng viên thành công');
      fetchMembers();
    } catch (error) {
      message.error('Lỗi khi xóa Đảng viên');
      console.error(error);
    }
  };

  const handleView = (record) => {
    setSelectedRecord(record);
    setIsDetailVisible(true);
  };

  const showTransferModal = (record) => {
    setRecordToTransfer(record);
    setIsTransferModalVisible(true);
  };

  const handleTransfer = async () => {
    try {
      const values = await transferForm.validateFields();
      const transferData = {
        ...recordToTransfer,
        Ngaychuyenra: values.Ngaychuyenra,
        Noichuyenra: values.Noichuyenra,
      };
      
      delete transferData.id;

      await addDoc(collection(db, "transferred"), transferData);
      await deleteDoc(doc(db, "members", recordToTransfer.id));
      
      message.success('Chuyển sinh hoạt thành công');
      setIsTransferModalVisible(false);
      transferForm.resetFields();
      fetchMembers();
    } catch (error) {
      console.error(error);
      if(!error.errorFields) message.error('Lỗi khi chuyển sinh hoạt');
    }
  };

  const columns = [
    { title: 'MSSV', dataIndex: 'MSSV', key: 'MSSV' },
    { title: 'Họ tên', dataIndex: 'Hovaten', key: 'Hovaten' },
    { title: 'Lớp', dataIndex: 'Lop', key: 'Lop' },
    { title: 'Khoa', dataIndex: 'Khoa', key: 'Khoa' },
    { title: 'Ngày vào Đảng', dataIndex: 'NgayvaoDang', key: 'NgayvaoDang' },
    {
      title: 'Hành động',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button type="text" icon={<EyeOutlined />} onClick={() => handleView(record)} style={{ color: '#1890ff' }} />
          <Button type="text" icon={<ExportOutlined />} onClick={() => showTransferModal(record)} title="Chuyển sinh hoạt" style={{ color: '#fbc02d' }} />
          <Popconfirm title="Bạn có chắc chắn muốn xóa Đảng viên này?" onConfirm={() => handleDelete(record.id)} okText="Có" cancelText="Không">
            <Button type="text" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={3} style={{ marginBottom: 24 }}>Đảng viên đang sinh hoạt</Title>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Space>
          <Input.Search 
            placeholder="Tìm theo MSSV, Họ tên..." 
            allowClear 
            style={{ width: 250 }}
            enterButton={<SearchOutlined />}
          />
        </Space>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} style={{ backgroundColor: '#c62828' }}>
            Thêm Đảng viên
          </Button>
        </Space>
      </div>

      <Table 
        columns={columns} 
        dataSource={data} 
        loading={loading}
        rowKey="id"
      />

      <MemberForm 
        open={isFormVisible} 
        onCancel={() => setIsFormVisible(false)} 
        onSave={handleSave}
        title="Thêm Đảng viên"
      />

      <DetailModal 
        open={isDetailVisible} 
        onCancel={() => setIsDetailVisible(false)} 
        data={selectedRecord} 
      />

      <Modal
        title="Chuyển sinh hoạt Đảng"
        open={isTransferModalVisible}
        onOk={handleTransfer}
        onCancel={() => setIsTransferModalVisible(false)}
        okText="Chuyển"
        cancelText="Hủy"
        okButtonProps={{ style: { backgroundColor: '#c62828' } }}
      >
        <Form form={transferForm} layout="vertical">
          <Form.Item name="Ngaychuyenra" label="Ngày chuyển ra" rules={[{ required: true, message: 'Vui lòng chọn ngày chuyển' }]}>
            <Input type="date" />
          </Form.Item>
          <Form.Item name="Noichuyenra" label="Nơi chuyển đến (Không bắt buộc)">
            <Input placeholder="Nhập nơi chuyển đến" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Members;
