import React, { useState, useEffect } from 'react';
import { Table, Tag, Typography, Input, Space, message, Button, Modal, Form, Select, DatePicker, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { collection, getDocs, addDoc, deleteDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import dayjs from 'dayjs';
import PermissionWrapper from '../components/PermissionWrapper';

const { Title } = Typography;
const { Option } = Select;

const OfficialMembers = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [editingId, setEditingId] = useState(null);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "official_members"));
      const members = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setData(members);
    } catch (error) {
      message.error("Lỗi khi tải danh sách Đảng viên chính thức");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleAdd = () => {
    setEditingId(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingId(record.id);
    form.setFieldsValue({
      ...record,
      NgayvaoDang: record.NgayvaoDang ? dayjs(record.NgayvaoDang) : null,
    });
    setIsModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, "official_members", id));
      message.success('Xóa thành công');
      fetchMembers();
    } catch (error) {
      message.error('Xóa thất bại');
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const formattedValues = {
        ...values,
        NgayvaoDang: values.NgayvaoDang ? values.NgayvaoDang.format('YYYY-MM-DD') : null,
      };

      if (editingId) {
        await updateDoc(doc(db, "official_members", editingId), formattedValues);
        message.success("Cập nhật thành công");
      } else {
        await addDoc(collection(db, "official_members"), formattedValues);
        message.success("Thêm thành công");
      }
      setIsModalVisible(false);
      fetchMembers();
    } catch (error) {
      if(!error.errorFields) message.error("Thao tác thất bại");
    }
  };

  const columns = [
    { title: 'MSSV', dataIndex: 'MSSV', key: 'MSSV' },
    { title: 'Họ tên', dataIndex: 'Hovaten', key: 'Hovaten' },
    { title: 'Ngày chính thức', dataIndex: 'NgayvaoDang', key: 'NgayvaoDang' },
    { 
      title: 'Trạng thái', 
      dataIndex: 'Trangthai', 
      key: 'Trangthai',
      render: (status) => (
        <Tag color={status === 'active' ? 'green' : 'default'}>
          {status === 'active' ? 'Đang sinh hoạt' : 'Khác'}
        </Tag>
      )
    },
    {
      title: 'Hành động',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <PermissionWrapper module="official" action="edit">
            <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)} style={{ color: '#1890ff' }} />
          </PermissionWrapper>
          <PermissionWrapper module="official" action="delete">
            <Popconfirm title="Xóa Đảng viên này?" onConfirm={() => handleDelete(record.id)} okText="Có" cancelText="Không">
              <Button type="text" icon={<DeleteOutlined />} danger />
            </Popconfirm>
          </PermissionWrapper>
        </Space>
      )
    }
  ];

  return (
    <div>
      <Title level={3} style={{ marginBottom: 24 }}>Đảng viên chính thức</Title>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Space>
          <Input.Search placeholder="Tìm kiếm..." allowClear style={{ width: 300 }} enterButton={<SearchOutlined />} />
        </Space>
        <PermissionWrapper module="official" action="create">
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} style={{ backgroundColor: '#c62828' }}>Thêm Đảng viên</Button>
        </PermissionWrapper>
      </div>

      <Table columns={columns} dataSource={data} loading={loading} rowKey="id" />

      <Modal
        title={editingId ? "Sửa thông tin" : "Thêm Đảng viên"}
        open={isModalVisible}
        onOk={handleSave}
        onCancel={() => setIsModalVisible(false)}
        okText="Lưu"
        cancelText="Hủy"
        okButtonProps={{ style: { backgroundColor: '#c62828' } }}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="MSSV" label="MSSV" rules={[{required: true, message: 'Vui lòng nhập MSSV'}]}><Input /></Form.Item>
          <Form.Item name="Hovaten" label="Họ tên" rules={[{required: true, message: 'Vui lòng nhập Họ tên'}]}><Input /></Form.Item>
          <Form.Item name="NgayvaoDang" label="Ngày vào Đảng"><DatePicker style={{width:'100%'}} placeholder="Chọn ngày" /></Form.Item>
          <Form.Item name="Trangthai" label="Trạng thái" initialValue="active">
            <Select>
              <Option value="active">Đang sinh hoạt</Option>
              <Option value="inactive">Khác</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default OfficialMembers;
