import React, { useEffect } from 'react';
import { Modal, Form, Input, Select, DatePicker, Row, Col } from 'antd';
import dayjs from 'dayjs';

const { Option } = Select;

const MemberForm = ({ open, onCancel, onSave, initialValues, title }) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (open) {
      if (initialValues) {
        form.setFieldsValue({
          ...initialValues,
          NgayvaoDang: initialValues.NgayvaoDang ? dayjs(initialValues.NgayvaoDang) : null,
          Ngaychuyenvao: initialValues.Ngaychuyenvao ? dayjs(initialValues.Ngaychuyenvao) : null,
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, initialValues, form]);

  const onFinish = (values) => {
    const formattedValues = {
      ...values,
      NgayvaoDang: values.NgayvaoDang ? values.NgayvaoDang.format('YYYY-MM-DD') : null,
      Ngaychuyenvao: values.Ngaychuyenvao ? values.Ngaychuyenvao.format('YYYY-MM-DD') : null,
    };
    onSave(formattedValues);
  };

  return (
    <Modal
      title={title || "Thêm/Sửa Đảng viên"}
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      width={600}
      okText="Lưu"
      cancelText="Hủy"
      okButtonProps={{ style: { backgroundColor: '#c62828' } }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="MSSV" label="MSSV" rules={[{ required: true, message: 'Vui lòng nhập MSSV' }]}>
              <Input placeholder="Nhập MSSV" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="Hovaten" label="Họ và tên" rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}>
              <Input placeholder="Nhập họ và tên" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="Lop" label="Lớp">
              <Input placeholder="Nhập lớp" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="Khoa" label="Khoa">
              <Input placeholder="Nhập khoa" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="NgayvaoDang" label="Ngày vào Đảng">
              <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" placeholder="Chọn ngày" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="Ngaychuyenvao" label="Ngày chuyển vào Chi bộ">
              <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" placeholder="Chọn ngày" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item name="Noichuyendi" label="Nơi chuyển đi (Nơi sinh hoạt Đảng cũ)">
              <Input placeholder="Nhập tên Chi bộ / Đảng bộ đã sinh hoạt trước đây" />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

export default MemberForm;
