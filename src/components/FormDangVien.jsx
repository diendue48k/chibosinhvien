import React, { useEffect } from 'react';
import { Modal, Form, Input, Select, DatePicker, Row, Col } from 'antd';
import dayjs from 'dayjs';

const { Option } = Select;

const FormDangVien = ({ open, onCancel, onSave, initialValues, title }) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (open) {
      if (initialValues) {
        form.setFieldsValue({
          ...initialValues,
          ngay_sinh: initialValues.ngay_sinh ? dayjs(initialValues.ngay_sinh) : null,
          ngay_vao_dang: initialValues.ngay_vao_dang ? dayjs(initialValues.ngay_vao_dang) : null,
          ngay_chinh_thuc: initialValues.ngay_chinh_thuc ? dayjs(initialValues.ngay_chinh_thuc) : null,
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, initialValues, form]);

  const onFinish = (values) => {
    const formattedValues = {
      ...values,
      ngay_sinh: values.ngay_sinh ? values.ngay_sinh.format('YYYY-MM-DD') : null,
      ngay_vao_dang: values.ngay_vao_dang ? values.ngay_vao_dang.format('YYYY-MM-DD') : null,
      ngay_chinh_thuc: values.ngay_chinh_thuc ? values.ngay_chinh_thuc.format('YYYY-MM-DD') : null,
    };
    onSave(formattedValues);
  };

  return (
    <Modal
      title={title || "Thêm/Sửa Đảng viên"}
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      width={800}
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
            <Form.Item name="mssv" label="MSSV" rules={[{ required: true }]}>
              <Input placeholder="Nhập MSSV" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="ho_ten" label="Họ và tên" rules={[{ required: true }]}>
              <Input placeholder="Nhập họ và tên" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="cccd" label="CCCD">
              <Input placeholder="Nhập CCCD" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="gioi_tinh" label="Giới tính">
              <Select placeholder="Chọn giới tính">
                <Option value="Nam">Nam</Option>
                <Option value="Nữ">Nữ</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="ngay_sinh" label="Ngày sinh">
              <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="so_dien_thoai" label="Số điện thoại">
              <Input placeholder="Nhập SĐT" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="lop" label="Lớp">
              <Input placeholder="Nhập lớp" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="khoa" label="Khoa">
              <Input placeholder="Nhập khoa" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="ngay_vao_dang" label="Ngày vào Đảng">
              <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="trang_thai" label="Trạng thái" initialValue="dang_sinh_hoat">
              <Select>
                <Option value="dang_sinh_hoat">Đang sinh hoạt</Option>
                <Option value="da_chuyen">Đã chuyển ra</Option>
                <Option value="xoa_ten">Xóa tên</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

export default FormDangVien;
