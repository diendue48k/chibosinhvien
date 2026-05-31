import React, { useEffect } from 'react';
import { Modal, Form, Input, Select, DatePicker, Upload, Button, Divider, Row, Col } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Option } = Select;

const MemberFormModal = ({ open, onCancel, onSuccess, initialValues }) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (open) {
      if (initialValues) {
        form.setFieldsValue({
          ...initialValues,
          joinDate: initialValues.joinDate ? dayjs(initialValues.joinDate) : null,
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, initialValues, form]);

  const onFinish = (values) => {
    const formattedValues = {
      ...values,
      joinDate: values.joinDate ? values.joinDate.format('YYYY-MM-DD') : null,
    };
    onSuccess(formattedValues);
  };

  const normFile = (e) => {
    if (Array.isArray(e)) {
      return e;
    }
    return e?.fileList;
  };

  return (
    <Modal
      title={initialValues ? "Cập nhật thông tin Đảng viên" : "Thêm Đảng viên mới"}
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      width={800}
      okText={initialValues ? "Cập nhật" : "Thêm mới"}
      cancelText="Hủy"
      okButtonProps={{ style: { backgroundColor: '#c62828' } }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
      >
        <Divider orientation="left">Thông tin cá nhân</Divider>
        <Row gutter={16}>
          <Col span={16}>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="mssv" label="MSSV" rules={[{ required: true, message: 'Vui lòng nhập MSSV' }]}>
                  <Input placeholder="Nhập MSSV" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="name" label="Họ và tên" rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}>
                  <Input placeholder="Nhập họ và tên" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="class" label="Lớp">
                  <Input placeholder="Nhập lớp" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="faculty" label="Khoa">
                  <Select placeholder="Chọn Khoa">
                    <Option value="CNTT">Công nghệ thông tin</Option>
                    <Option value="KT">Kinh tế</Option>
                    <Option value="XD">Xây dựng</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </Col>
          <Col span={8}>
            <Form.Item
              name="avatar"
              label="Ảnh đại diện"
              valuePropName="fileList"
              getValueFromEvent={normFile}
            >
              <Upload name="logo" action="/upload.do" listType="picture" maxCount={1}>
                <Button icon={<UploadOutlined />}>Tải ảnh lên</Button>
              </Upload>
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">Thông tin Đảng</Divider>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="joinDate" label="Ngày vào Đảng">
              <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" placeholder="Chọn ngày" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="status" label="Loại Đảng viên" initialValue="reserve">
              <Select>
                <Option value="reserve">Dự bị</Option>
                <Option value="official">Chính thức</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">Liên hệ</Divider>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="phone" label="Số điện thoại">
              <Input placeholder="Nhập SĐT" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="email" label="Email">
              <Input placeholder="Nhập Email" />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

export default MemberFormModal;
