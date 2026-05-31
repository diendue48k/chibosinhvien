import React, { useState, useEffect } from 'react';
import { Table, Tag, Typography, Input, Space, Button, message, Popconfirm, Modal, Form, Select, DatePicker, Row, Col } from 'antd';
import { SearchOutlined, EyeOutlined, DeleteOutlined, PlusOutlined, EditOutlined } from '@ant-design/icons';
import { collection, getDocs, addDoc, deleteDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;

const AdmissionRecords = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [editingId, setEditingId] = useState(null);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "admission_records"));
      const records = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setData(records);
    } catch (error) {
      message.error("Lỗi khi tải hồ sơ kết nạp");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
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
      Ngaysinh: record.Ngaysinh ? dayjs(record.Ngaysinh) : null,
      Ngaynhanhoso: record.Ngaynhanhoso ? dayjs(record.Ngaynhanhoso) : null,
    });
    setIsModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, "admission_records", id));
      message.success('Xóa hồ sơ thành công');
      fetchRecords();
    } catch (error) {
      message.error('Lỗi khi xóa hồ sơ');
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const formattedValues = {
        ...values,
        Ngaysinh: values.Ngaysinh ? values.Ngaysinh.format('YYYY-MM-DD') : null,
        Ngaynhanhoso: values.Ngaynhanhoso ? values.Ngaynhanhoso.format('YYYY-MM-DD') : null,
      };

      if (editingId) {
        await updateDoc(doc(db, "admission_records", editingId), formattedValues);
        message.success("Cập nhật hồ sơ thành công");
      } else {
        await addDoc(collection(db, "admission_records"), formattedValues);
        message.success("Thêm hồ sơ thành công");
      }
      setIsModalVisible(false);
      fetchRecords();
    } catch (error) {
      console.error(error);
      if (!error.errorFields) message.error("Thao tác thất bại");
    }
  };

  const getStatusTag = (status) => {
    switch (status) {
      case 'processing': return <Tag color="gold">Đang xử lý</Tag>;
      case 'approved': return <Tag color="green">Đã duyệt</Tag>;
      case 'missing': return <Tag color="red">Thiếu hồ sơ</Tag>;
      default: return <Tag>{status || 'N/A'}</Tag>;
    }
  };

  const columns = [
    { title: 'MSSV', dataIndex: 'MSSV', key: 'MSSV' },
    { title: 'Họ tên', dataIndex: 'Hovaten', key: 'Hovaten' },
    { title: 'Lớp', dataIndex: 'Lop', key: 'Lop' },
    { title: 'Ngày nhận', dataIndex: 'Ngaynhanhoso', key: 'Ngaynhanhoso' },
    { 
      title: 'Trạng thái', 
      dataIndex: 'Trangthaihoso', 
      key: 'Trangthaihoso',
      render: (status) => getStatusTag(status)
    },
    {
      title: 'Hành động',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)} style={{ color: '#1890ff' }} />
          <Popconfirm title="Xóa hồ sơ này?" onConfirm={() => handleDelete(record.id)} okText="Có" cancelText="Không">
            <Button type="text" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div>
      <Title level={3} style={{ marginBottom: 24 }}>Hồ sơ kết nạp Đảng</Title>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Space>
          <Input.Search placeholder="Tìm kiếm..." allowClear style={{ width: 300 }} enterButton={<SearchOutlined />} />
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} style={{ backgroundColor: '#c62828' }}>Thêm Hồ Sơ</Button>
      </div>

      <Table columns={columns} dataSource={data} loading={loading} rowKey="id" />

      <Modal
        title={editingId ? "Sửa hồ sơ" : "Thêm hồ sơ"}
        open={isModalVisible}
        onOk={handleSave}
        onCancel={() => setIsModalVisible(false)}
        width={700}
        okText="Lưu"
        cancelText="Hủy"
        okButtonProps={{ style: { backgroundColor: '#c62828' } }}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}><Form.Item name="MSSV" label="MSSV" rules={[{required: true, message: 'Vui lòng nhập MSSV'}]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="CCCD" label="CCCD" rules={[{required: true, message: 'Vui lòng nhập CCCD'}]}><Input /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="Hovaten" label="Họ và tên" rules={[{required: true, message: 'Vui lòng nhập Họ tên'}]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="Ngaysinh" label="Ngày sinh"><DatePicker style={{width:'100%'}} placeholder="Chọn ngày" /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="Gioitinh" label="Giới tính">
                <Select placeholder="Chọn giới tính"><Option value="Nam">Nam</Option><Option value="Nữ">Nữ</Option></Select>
              </Form.Item>
            </Col>
            <Col span={12}><Form.Item name="Email" label="Email"><Input /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="Lop" label="Lớp"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="Khoa" label="Khoa"><Input /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="Ngaynhanhoso" label="Ngày nhận hồ sơ"><DatePicker style={{width:'100%'}} placeholder="Chọn ngày" /></Form.Item></Col>
            <Col span={12}>
              <Form.Item name="Trangthaihoso" label="Trạng thái" initialValue="processing">
                <Select>
                  <Option value="processing">Đang xử lý</Option>
                  <Option value="approved">Đã duyệt</Option>
                  <Option value="missing">Thiếu hồ sơ</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default AdmissionRecords;
