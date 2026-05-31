import React, { useState, useEffect } from 'react';
import { Table, Typography, message, Space, Input, Button, Modal, Form, Select, DatePicker, Popconfirm, Tag } from 'antd';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;

const HoSoChinhThuc = () => {
  const [data, setData] = useState([]);
  const [dangVienList, setDangVienList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [editingId, setEditingId] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Dang Vien
      const dvSnapshot = await getDocs(collection(db, "dang_vien"));
      const dvList = dvSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDangVienList(dvList);

      // 2. Fetch Ho So
      const hsSnapshot = await getDocs(collection(db, "ho_so_chinh_thuc"));
      const records = hsSnapshot.docs.map(docSnapshot => {
        const hsData = docSnapshot.data();
        const dv = dvList.find(d => d.id === hsData.dang_vien_id) || {};
        return {
          id: docSnapshot.id,
          ...hsData,
          mssv: dv.mssv || 'N/A',
          ho_ten: dv.ho_ten || 'N/A',
        };
      });
      setData(records);
    } catch (error) {
      message.error("Lỗi khi tải hồ sơ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
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
      ngay_nhan_quyet_dinh: record.ngay_nhan_quyet_dinh ? dayjs(record.ngay_nhan_quyet_dinh) : null,
    });
    setIsModalVisible(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const formatted = {
        ...values,
        ngay_nhan_quyet_dinh: values.ngay_nhan_quyet_dinh ? values.ngay_nhan_quyet_dinh.format('YYYY-MM-DD') : null,
      };

      if (editingId) {
        await updateDoc(doc(db, "ho_so_chinh_thuc", editingId), formatted);
        message.success("Cập nhật thành công");
      } else {
        await addDoc(collection(db, "ho_so_chinh_thuc"), formatted);
        message.success("Thêm mới thành công");
      }
      setIsModalVisible(false);
      fetchData();
    } catch (error) {
      if(!error.errorFields) message.error("Lỗi khi lưu");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, "ho_so_chinh_thuc", id));
      message.success("Xóa thành công");
      fetchData();
    } catch(e) {
      message.error("Lỗi khi xóa");
    }
  };

  const columns = [
    { title: 'Đảng viên ID (MSSV)', dataIndex: 'mssv', key: 'mssv' },
    { title: 'Họ tên', dataIndex: 'ho_ten', key: 'ho_ten' },
    { title: 'Lớp bồi dưỡng', dataIndex: 'da_hoc_lop', key: 'da_hoc_lop' },
    { title: 'Ngày nhận QĐ', dataIndex: 'ngay_nhan_quyet_dinh', key: 'ngay_nhan_quyet_dinh' },
    { 
      title: 'Trạng thái', 
      dataIndex: 'trang_thai', 
      key: 'trang_thai',
      render: (st) => <Tag color={st === 'chinh_thuc' ? 'green' : 'blue'}>{st}</Tag>
    },
    {
      title: 'Hành động',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm title="Xóa?" onConfirm={() => handleDelete(record.id)}>
            <Button type="text" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div>
      <Title level={3} style={{ marginBottom: 24 }}>Hồ sơ Đảng viên chính thức</Title>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Input.Search placeholder="Tìm kiếm..." allowClear style={{ width: 300 }} />
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} style={{ backgroundColor: '#c62828' }}>Thêm Hồ Sơ</Button>
      </div>

      <Table columns={columns} dataSource={data} loading={loading} rowKey="id" />

      <Modal title={editingId ? "Sửa" : "Thêm"} open={isModalVisible} onOk={handleSave} onCancel={() => setIsModalVisible(false)}>
        <Form form={form} layout="vertical">
          <Form.Item name="dang_vien_id" label="Chọn Đảng viên" rules={[{required: true}]}>
            <Select showSearch optionFilterProp="children">
              {dangVienList.map(dv => <Option key={dv.id} value={dv.id}>{dv.mssv} - {dv.ho_ten}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="da_hoc_lop" label="Lớp bồi dưỡng"><Input /></Form.Item>
          <Form.Item name="ngay_nhan_quyet_dinh" label="Ngày nhận QĐ"><DatePicker style={{width:'100%'}}/></Form.Item>
          <Form.Item name="trang_thai" label="Trạng thái" initialValue="dang_xet">
            <Select>
              <Option value="dang_xet">Đang xét</Option>
              <Option value="chinh_thuc">Đã chính thức</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default HoSoChinhThuc;
