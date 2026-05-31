import React from 'react';
import { Modal, Descriptions, Tag, Divider } from 'antd';
import {
  IdcardOutlined, HomeOutlined, EnvironmentOutlined
} from '@ant-design/icons';

const TRANG_THAI_COLORS = {
  'Đã nhận': 'gold',
  'Đã làm': 'blue',
  'Chờ đến nhận': 'green',
};

const DetailModal = ({ open, onCancel, data, title }) => {
  if (!data) return null;

  return (
    <Modal
      title={
        <span style={{ fontWeight: 700, fontSize: 16, color: '#c62828' }}>
          <IdcardOutlined style={{ marginRight: 8 }} />
          {title || 'Chi tiết Đăng ký 213'}
        </span>
      }
      open={open}
      onCancel={onCancel}
      footer={null}
      width={680}
      styles={{ body: { padding: '16px 24px' } }}
    >
      {/* THÔNG TIN ĐẢNG VIÊN */}
      <Divider orientation="left" style={{ color: '#c62828', fontWeight: 700, fontSize: 13, margin: '0 0 12px 0' }}>
        <IdcardOutlined style={{ marginRight: 6 }} />Thông tin Đảng viên
      </Divider>
      <Descriptions
        bordered
        column={2}
        size="small"
        labelStyle={{ fontWeight: 600, backgroundColor: '#fafafa', width: 140 }}
        contentStyle={{ backgroundColor: '#fff' }}
      >
        <Descriptions.Item label="Họ và tên" span={2}>
          <span style={{ fontWeight: 700, color: '#c62828', fontSize: 14 }}>{data.Hovaten}</span>
        </Descriptions.Item>
        <Descriptions.Item label="MSSV">{data.MSSV}</Descriptions.Item>
        <Descriptions.Item label="Giới tính">{data.GioiTinh}</Descriptions.Item>
        <Descriptions.Item label="Ngày sinh">{data.Ngaysinh}</Descriptions.Item>
        <Descriptions.Item label="CCCD">{data.CCCD}</Descriptions.Item>
        <Descriptions.Item label="SĐT">{data.SoDienThoai}</Descriptions.Item>
        <Descriptions.Item label="Email">{data.Email}</Descriptions.Item>
        <Descriptions.Item label="Lớp">{data.Lop}</Descriptions.Item>
        <Descriptions.Item label="Khoa">{data.Khoa}</Descriptions.Item>
        {data.Nhom && data.Nhom !== '--' && (
          <Descriptions.Item label="Nhóm">{data.Nhom}</Descriptions.Item>
        )}
        <Descriptions.Item label="Ngày vào Đảng">{data.NgayvaoDang}</Descriptions.Item>
        {data.Ngaychinhthuc && (
          <Descriptions.Item label="Ngày chính thức">{data.Ngaychinhthuc}</Descriptions.Item>
        )}
        {/* Các trường khác nếu có (dùng cho chuyển sinh hoạt) */}
        {data.Ngaychuyenvao && (
          <Descriptions.Item label="Ngày chuyển vào" span={2}>{data.Ngaychuyenvao}</Descriptions.Item>
        )}
        {data.Noichuyendi && (
          <Descriptions.Item label="Nơi sinh hoạt cũ" span={2}>{data.Noichuyendi}</Descriptions.Item>
        )}
        {data.Ngaychuyenra && (
          <Descriptions.Item label="Ngày chuyển ra" span={2}>{data.Ngaychuyenra}</Descriptions.Item>
        )}
        {data.Noichuyenra && (
          <Descriptions.Item label="Nơi chuyển đến" span={2}>{data.Noichuyenra}</Descriptions.Item>
        )}
      </Descriptions>

      {/* THÔNG TIN ĐĂNG KÝ 213 - chỉ hiển thị nếu có */}
      {data.LoaiDangKy && (
        <>
          <Divider orientation="left" style={{ color: '#1890ff', fontWeight: 700, fontSize: 13, margin: '16px 0 12px 0' }}>
            <EnvironmentOutlined style={{ marginRight: 6 }} />Thông tin Đăng ký 213
          </Divider>
          <Descriptions
            bordered
            column={2}
            size="small"
            labelStyle={{ fontWeight: 600, backgroundColor: '#fafafa', width: 140 }}
            contentStyle={{ backgroundColor: '#fff' }}
          >
            <Descriptions.Item label="Loại đăng ký">
              <Tag color={data.LoaiDangKy === 'Thường trú' ? 'blue' : 'purple'} style={{ fontWeight: 600 }}>
                {data.LoaiDangKy}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Ngày gửi">{data.NgayGui}</Descriptions.Item>
            <Descriptions.Item label="Địa chỉ cư trú" span={2}>
              <span style={{ fontWeight: 600 }}>{data.DiaChiCuTru}</span>
            </Descriptions.Item>
            <Descriptions.Item label="Phường/Xã">{data.PhuongXa}</Descriptions.Item>
            <Descriptions.Item label="Tỉnh/TP">{data.TinhTP}</Descriptions.Item>
            <Descriptions.Item label="Chi bộ nơi cư trú" span={2}>{data.ChiBoNoiCuTru}</Descriptions.Item>
            <Descriptions.Item label="Trạng thái" span={2}>
              {data.TrangThai && (
                <Tag color={TRANG_THAI_COLORS[data.TrangThai] || 'default'} style={{ fontWeight: 700 }}>
                  {data.TrangThai}
                </Tag>
              )}
            </Descriptions.Item>
          </Descriptions>
        </>
      )}
    </Modal>
  );
};

export default DetailModal;
