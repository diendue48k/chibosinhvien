import React, { useEffect } from 'react';
import { Modal, Form, Input, Select, DatePicker, Row, Col, Tabs, Checkbox, Avatar, Button, Space, message, Divider } from 'antd';
import { UploadOutlined, UserOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import AddressWardSelect from './AddressWardSelect';
import AddressProvinceSelect from './AddressProvinceSelect';
import AddressDistrictSelect from './AddressDistrictSelect';
import addressDataCu from '../data/addressDataCu.json';
import addressDataMoi from '../data/addressDataMoi.json';
const { Option } = Select;

import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { DEFAULT_KHOA, DEFAULT_NHOM } from '../services/permissionService';
import { lookupOldAddress } from '../services/addressService';

const DAN_TOC = ["Kinh", "Tày", "Thái", "Hoa", "Khmer", "Mường", "Nùng", "H'Mông", "Dao", "Gia Rai", "Ngái", "Ê Đê", "Ba Na", "Xơ Đăng", "Sán Chay", "Cơ Ho", "Chăm", "Sán Dìu", "Hrê", "Mnông", "Ra Glai", "Xtiêng", "Bru-Vân Kiều", "Thổ", "Giáy", "Cơ Tu", "Giẻ Triêng", "Mạ", "Khơ Mú", "Co", "Tà Ôi", "Chơ Ro", "Kháng", "Xinh Mun", "Hà Nhì", "Chu Ru", "Lào", "La Chí", "La Ha", "Phù Lá", "La Hủ", "Lự", "Lô Lô", "Chứt", "Mảng", "Pà Thẻn", "Co Lao", "Cống", "Bố Y", "Si La", "Pu Péo", "Brâu", "Ơ Đu", "Rơ Măm", "Khác"];
const TON_GIAO = ["Không", "Phật giáo", "Công giáo", "Tin Lành", "Cao Đài", "Hòa Hảo", "Hồi giáo", "Bà La Môn", "Khác"];
const { TabPane } = Tabs;

const addProvincePrefix = (tinh) => {
  if (!tinh) return tinh;
  const clean = tinh.trim();
  if (/^(Tỉnh|Thành phố|Thành Phố|TP\.|TP)/i.test(clean)) {
    return clean;
  }
  const municipalities = ["Hà Nội", "Hồ Chí Minh", "TP HCM", "Hải Phòng", "Đà Nẵng", "Cần Thơ"];
  if (municipalities.some(m => clean.toLowerCase() === m.toLowerCase())) {
    return `Thành phố ${clean}`;
  }
  if (clean.toLowerCase() === "huế") {
    return "Thành phố Huế";
  }
  return `Tỉnh ${clean}`;
};

const normalizeAddressForForm = (data) => {
  if (!data) return {};
  const res = { ...data };
  
  const cleanProvinceName = (val) => {
    if (!val) return "";
    let s = val.trim();
    s = s.replace(/^(Tỉnh|Thành phố|Thành Phố|TP\.|TP)\s+/i, "");
    s = s.replace(/\s+(Tỉnh|Thành phố|Thành Phố|TP\.|TP)$/i, "");
    if (/^hồ\s+chí\s+minh$/i.test(s) || /^hcm$/i.test(s) || /^tp\s*hcm$/i.test(s) || /^tp\s*hồ\s+chí\s+minh$/i.test(s)) {
      return "hcm";
    }
    if (/^thừa\s+thiên\s+huế$/i.test(s) || /^huế$/i.test(s)) {
      return "huế";
    }
    return s.toLowerCase();
  };

  const cleanDistrictName = (val) => {
    if (!val) return "";
    return val.replace(/^(Quận|Huyện|Thị xã|Thị Xã|Thành phố|Thành Phố)\s+/i, "").trim().toLowerCase();
  };

  const cleanWardName = (val) => {
    if (!val) return "";
    return val.replace(/^(Phường|Xã|Thị trấn|Thị Trấn)\s+/i, "").trim().toLowerCase();
  };

  const findProvinceKey = (val) => {
    if (!val) return val;
    const target = cleanProvinceName(val);
    const match = Object.keys(addressDataCu).find(k => cleanProvinceName(k) === target);
    return match || val;
  };

  const findDistrictKey = (provKey, distVal) => {
    if (!provKey || !distVal) return distVal;
    const provData = addressDataCu[provKey];
    if (!provData) return distVal;
    const target = cleanDistrictName(distVal);
    const match = Object.keys(provData).find(k => cleanDistrictName(k) === target);
    return match || distVal;
  };

  const findWardKey = (provKey, distKey, wardVal) => {
    if (!provKey || !wardVal) return wardVal;
    const provData = addressDataCu[provKey] || {};
    let wardsList = [];
    if (distKey && provData[distKey]) {
      wardsList = provData[distKey];
    } else {
      Object.values(provData).forEach(list => {
        if (Array.isArray(list)) wardsList.push(...list);
      });
    }
    const target = cleanWardName(wardVal);
    const match = wardsList.find(w => cleanWardName(w) === target);
    return match || wardVal;
  };

  const findProvinceKeyMoi = (val) => {
    if (!val) return val;
    const target = cleanProvinceName(val);
    const match = Object.keys(addressDataMoi).find(k => cleanProvinceName(k) === target);
    return match || val;
  };

  const findWardKeyMoi = (provKey, wardVal) => {
    if (!provKey || !wardVal) return wardVal;
    const wardsList = addressDataMoi[provKey] || [];
    const target = cleanWardName(wardVal);
    const match = wardsList.find(w => cleanWardName(w) === target);
    return match || wardVal;
  };

  if (res.tinh_tp_qq) {
    res.tinh_tp_qq = findProvinceKeyMoi(res.tinh_tp_qq);
    res.xa_phuong_qq = findWardKeyMoi(res.tinh_tp_qq, res.xa_phuong_qq);
  }
  
  if (res.tinh_tp_tt) {
    res.tinh_tp_tt = findProvinceKeyMoi(res.tinh_tp_tt);
    res.xa_phuong_tt = findWardKeyMoi(res.tinh_tp_tt, res.xa_phuong_tt);
  }

  if (res.tinh_tp_tam_tru) {
    res.tinh_tp_tam_tru = findProvinceKeyMoi(res.tinh_tp_tam_tru);
    res.xa_phuong_tam_tru = findWardKeyMoi(res.tinh_tp_tam_tru, res.xa_phuong_tam_tru);
  }

  if (res.tinh_tp_qq_cu) {
    res.tinh_tp_qq_cu = findProvinceKey(res.tinh_tp_qq_cu);
    res.quan_huyen_qq_cu = findDistrictKey(res.tinh_tp_qq_cu, res.quan_huyen_qq_cu);
    res.xa_phuong_qq_cu = findWardKey(res.tinh_tp_qq_cu, res.quan_huyen_qq_cu, res.xa_phuong_qq_cu);
  }

  if (res.tinh_tp_tt_cu) {
    res.tinh_tp_tt_cu = findProvinceKey(res.tinh_tp_tt_cu);
    res.quan_huyen_tt_cu = findDistrictKey(res.tinh_tp_tt_cu, res.quan_huyen_tt_cu);
    res.xa_phuong_tt_cu = findWardKey(res.tinh_tp_tt_cu, res.quan_huyen_tt_cu, res.xa_phuong_tt_cu);
  }

  return res;
};

const DangVienForm = ({ open, onCancel, onSave, initialValues, title }) => {
  const [form] = Form.useForm();
  const watchTinhTpTt = Form.useWatch('tinh_tp_tt', form);
  const watchTinhTpQq = Form.useWatch('tinh_tp_qq', form);
  const watchTinhTpQqCu = Form.useWatch('tinh_tp_qq_cu', form);
  const watchTinhTpTtCu = Form.useWatch('tinh_tp_tt_cu', form);
  const watchTinhTpTamTru = Form.useWatch('tinh_tp_tam_tru', form);
  const watchQuanHuyenQqCu = Form.useWatch('quan_huyen_qq_cu', form);
  const watchQuanHuyenTtCu = Form.useWatch('quan_huyen_tt_cu', form);
  const isDuBi = Form.useWatch('dang_vien_du_bi', form);
  const watchAvatar = Form.useWatch('anh_ca_nhan', form);

  const handleAddressSelectChange = (type, fieldName, val) => {
    const currentValues = form.getFieldsValue();
    
    let chiTietKey = '';
    let tinhKey = '';
    let xaKey = '';
    let huyenKey = '';
    
    if (type === 'tt') {
      chiTietKey = 'chi_tiet_dc';
      tinhKey = 'tinh_tp_tt';
      xaKey = 'xa_phuong_tt';
    } else if (type === 'tam_tru') {
      chiTietKey = 'chi_tiet_tam_tru';
      tinhKey = 'tinh_tp_tam_tru';
      xaKey = 'xa_phuong_tam_tru';
    } else if (type === 'tt_cu') {
      chiTietKey = 'chi_tiet_tt_cu';
      tinhKey = 'tinh_tp_tt_cu';
      xaKey = 'xa_phuong_tt_cu';
      huyenKey = 'quan_huyen_tt_cu';
    }
    
    const currentChiTiet = currentValues[chiTietKey] || '';
    const selectedTinh = fieldName === 'tinh_tp' ? val : currentValues[tinhKey];
    const selectedXa = fieldName === 'xa_phuong' ? val : currentValues[xaKey];
    const selectedHuyen = fieldName === 'quan_huyen' ? val : currentValues[huyenKey];
    
    let customPart = currentChiTiet;
    
    const oldTinh = currentValues[tinhKey];
    const oldXa = currentValues[xaKey];
    const oldHuyen = huyenKey ? currentValues[huyenKey] : undefined;
    
    if (oldTinh) {
      customPart = customPart.replace(new RegExp(`[,_]\\s*${escapeRegExp(addProvincePrefix(oldTinh))}`, 'gi'), '');
      customPart = customPart.replace(new RegExp(`[,_]\\s*${escapeRegExp(oldTinh)}`, 'gi'), '');
    }
    if (oldXa) {
      customPart = customPart.replace(new RegExp(`[,_]\\s*${escapeRegExp(oldXa)}`, 'gi'), '');
    }
    if (oldHuyen && oldHuyen !== 'undefined') {
      customPart = customPart.replace(new RegExp(`[,_]\\s*${escapeRegExp(oldHuyen)}`, 'gi'), '');
    }
    
    customPart = customPart.trim().replace(/^[,\s_]+|[,\s_]+$/g, '');
    
    const parts = [];
    if (customPart) parts.push(customPart);
    if (selectedXa) parts.push(selectedXa);
    if (selectedHuyen) parts.push(selectedHuyen);
    if (selectedTinh) parts.push(addProvincePrefix(selectedTinh));
    
    form.setFieldsValue({
      [chiTietKey]: parts.join(', ')
    });
  };
  
  const escapeRegExp = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  // Dynamic categories states
  const [facultiesList, setFacultiesList] = React.useState(DEFAULT_KHOA);
  const [groupsList, setGroupsList] = React.useState(DEFAULT_NHOM);

  React.useEffect(() => {
    const loadCategories = async () => {
      try {
        const facultyRef = doc(db, 'system_config', 'faculties');
        const facultySnap = await getDoc(facultyRef);
        if (facultySnap.exists()) {
          setFacultiesList(facultySnap.data().items || []);
        }

        const groupRef = doc(db, 'system_config', 'groups');
        const groupSnap = await getDoc(groupRef);
        if (groupSnap.exists()) {
          setGroupsList(groupSnap.data().items || []);
        }
      } catch (e) {
        console.error('Error fetching categories in form:', e);
      }
    };
    if (open) {
      loadCategories();
    }
  }, [open]);

  const getAvatarUrl = (url) => {
    if (!url) return undefined;
    const driveRegex = /\/file\/d\/([a-zA-Z0-9_-]+)\//;
    const match = url.match(driveRegex);
    if (match && match[1]) {
      return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w500`;
    }
    return url;
  };

  useEffect(() => {
    if (open) {
      if (initialValues) {
        const normalizedValues = normalizeAddressForForm(initialValues);
        form.setFieldsValue({
          ...normalizedValues,
          tinh_tp_tam_tru: normalizedValues.tinh_tp_tam_tru || 'Thành phố Đà Nẵng',
          ngay_sinh: normalizedValues.ngay_sinh ? dayjs(normalizedValues.ngay_sinh) : null,
          ngay_vao_dang: normalizedValues.ngay_vao_dang ? dayjs(normalizedValues.ngay_vao_dang) : null,
          ngay_chuyen_vao: normalizedValues.ngay_chuyen_vao ? dayjs(normalizedValues.ngay_chuyen_vao) : null,
          ngay_chinh_thuc: normalizedValues.ngay_chinh_thuc ? dayjs(normalizedValues.ngay_chinh_thuc) : null,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({
          tinh_tp_tam_tru: 'Thành phố Đà Nẵng'
        });
      }
    }
  }, [open, initialValues, form]);



  const onFinish = (values) => {
    const buildAddress = (tinh, huyen, xa, chiTiet) => {
      const parts = [];
      if (chiTiet) parts.push(chiTiet);
      if (xa) parts.push(xa);
      if (huyen) parts.push(huyen);
      if (tinh) parts.push(addProvincePrefix(tinh));
      return parts.join(', ');
    };

    const queQuanMoi = buildAddress(values.tinh_tp_qq, undefined, values.xa_phuong_qq, null);
    const queQuanCu = buildAddress(values.tinh_tp_qq_cu, values.quan_huyen_qq_cu, values.xa_phuong_qq_cu, null);
    const queQuan = queQuanCu ? `${queQuanMoi} (Trước đây là ${queQuanCu})` : queQuanMoi;

    const thuongTruMoi = buildAddress(values.tinh_tp_tt, undefined, values.xa_phuong_tt, values.chi_tiet_dc);
    const thuongTruCu = buildAddress(values.tinh_tp_tt_cu, values.quan_huyen_tt_cu, values.xa_phuong_tt_cu, values.chi_tiet_tt_cu);
    const diaChiThuongTru = thuongTruCu ? `${thuongTruMoi} (Trước đây là ${thuongTruCu})` : thuongTruMoi;

    const tamTruMoi = buildAddress(values.tinh_tp_tam_tru, undefined, values.xa_phuong_tam_tru, values.chi_tiet_tam_tru);
    const diaChiTamTru = tamTruMoi;

    let chiTiet = values.chi_tiet_dc;
    if (!chiTiet) {
      const parts = [];
      if (values.xa_phuong_tt) parts.push(values.xa_phuong_tt);
      if (values.tinh_tp_tt) parts.push(values.tinh_tp_tt);
      chiTiet = parts.join(", ");
    }

    const formattedValues = {
      ...values,
      quan_huyen_qq: "", // Clear current districts in database
      quan_huyen_tt: "",
      quan_huyen_tam_tru: "",
      chi_tiet_dc: chiTiet,
      que_quan: queQuan,
      dia_chi_thuong_tru: diaChiThuongTru,
      dia_chi_tam_tru: diaChiTamTru,
      ngay_sinh: values.ngay_sinh ? values.ngay_sinh.format('YYYY-MM-DD') : null,
      ngay_vao_dang: values.ngay_vao_dang ? values.ngay_vao_dang.format('YYYY-MM-DD') : null,
      ngay_chuyen_vao: values.ngay_chuyen_vao ? values.ngay_chuyen_vao.format('YYYY-MM-DD') : null,
      ngay_chinh_thuc: values.ngay_chinh_thuc ? values.ngay_chinh_thuc.format('YYYY-MM-DD') : null,
      dang_vien_du_bi: !!values.dang_vien_du_bi,
      trang_thai: values.trang_thai || 'dang_sinh_hoat'
    };
    onSave(formattedValues);
  };

  const onValuesChange = (changedValues) => {
    // Auto lookup and sync old address fields
    if (changedValues.xa_phuong_tt || changedValues.tinh_tp_tt) {
      const tinh = changedValues.tinh_tp_tt || form.getFieldValue('tinh_tp_tt');
      const xa = changedValues.xa_phuong_tt || form.getFieldValue('xa_phuong_tt');
      const mapped = lookupOldAddress(tinh, xa);
      if (mapped) {
        form.setFieldsValue({
          tinh_tp_tt_cu: mapped.tinh_tp_cu,
          quan_huyen_tt_cu: mapped.quan_huyen_cu,
          xa_phuong_tt_cu: mapped.xa_phuong_cu
        });
        handleAddressSelectChange('tt_cu', 'tinh_tp', mapped.tinh_tp_cu);
        handleAddressSelectChange('tt_cu', 'quan_huyen', mapped.quan_huyen_cu);
        handleAddressSelectChange('tt_cu', 'xa_phuong', mapped.xa_phuong_cu);
      }
    }

    if (changedValues.xa_phuong_qq || changedValues.tinh_tp_qq) {
      const tinh = changedValues.tinh_tp_qq || form.getFieldValue('tinh_tp_qq');
      const xa = changedValues.xa_phuong_qq || form.getFieldValue('xa_phuong_qq');
      const mapped = lookupOldAddress(tinh, xa);
      if (mapped) {
        form.setFieldsValue({
          tinh_tp_qq_cu: mapped.tinh_tp_cu,
          quan_huyen_qq_cu: mapped.quan_huyen_cu,
          xa_phuong_qq_cu: mapped.xa_phuong_cu
        });
      }
    }
  };

  return (
    <Modal
      title={title || "Thêm mới Đảng viên"}
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      width={900}
      okText="Lưu"
      cancelText="Hủy"
      okButtonProps={{ style: { backgroundColor: '#c62828' } }}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        onValuesChange={onValuesChange}
      >
        <Tabs defaultActiveKey="1">
          <TabPane tab="Cá nhân & Liên hệ" key="1">
            <Row gutter={16}>
              <Col span={24}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '16px', background: '#fafafa', padding: '12px', borderRadius: '8px', border: '1px solid #f0f0f0' }}>
                  <Avatar 
                    size={72} 
                    icon={<UserOutlined />} 
                    src={getAvatarUrl(watchAvatar)} 
                    style={{ border: '2px solid #c62828', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, marginBottom: '6px', fontSize: '13px', color: '#1e293b' }}>
                      Ảnh cá nhân Đảng viên
                    </div>
                    <Space>
                      <input 
                        type="file" 
                        accept="image/*" 
                        id="form-avatar-upload" 
                        style={{ display: 'none' }} 
                        onChange={(e) => {
                          const file = e.target.value ? e.target.files[0] : null;
                          if (!file) return;
                          if (file.size > 800 * 1024) {
                            message.error("Ảnh quá lớn! Vui lòng chọn ảnh dưới 800KB để đảm bảo hiệu năng lưu trữ.");
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            form.setFieldsValue({ anh_ca_nhan: event.target.result });
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                      <Button 
                        type="primary" 
                        icon={<UploadOutlined />} 
                        onClick={() => document.getElementById('form-avatar-upload').click()}
                        style={{ backgroundColor: '#c62828', borderColor: '#c62828', borderRadius: '4px', fontWeight: 600 }}
                      >
                        Tải lên ảnh mới
                      </Button>
                      {watchAvatar && (
                        <Button 
                          type="link" 
                          danger 
                          onClick={() => form.setFieldsValue({ anh_ca_nhan: '' })}
                          style={{ fontWeight: 600 }}
                        >
                          Xóa ảnh
                        </Button>
                      )}
                    </Space>
                  </div>
                </div>
                <Form.Item name="anh_ca_nhan" label="Link ảnh cá nhân hoặc chuỗi ảnh mã hóa" style={{ marginBottom: 12 }}>
                  <Input placeholder="Chuỗi Base64 ảnh hoặc link ảnh trực tiếp..." />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}><Form.Item name="mssv" label="MSSV" rules={[{ required: true }]}><Input /></Form.Item></Col>
              <Col span={8}><Form.Item name="ho_ten" label="Họ tên" rules={[{ required: true }]}><Input /></Form.Item></Col>
              <Col span={8}><Form.Item name="ngay_sinh" label="Ngày sinh"><DatePicker style={{ width: '100%' }} format={['DD/MM/YYYY', 'DDMMYYYY']} placeholder="DD/MM/YYYY" /></Form.Item></Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="gioi_tinh" label="Giới tính">
                  <Select><Option value="Nam">Nam</Option><Option value="Nữ">Nữ</Option></Select>
                </Form.Item>
              </Col>
              <Col span={8}><Form.Item name="cccd" label="CCCD"><Input /></Form.Item></Col>
              <Col span={8}>
                <Form.Item name="dan_toc" label="Dân tộc" initialValue="Kinh">
                  <Select showSearch allowClear placeholder="Chọn Dân tộc" filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}>
                    {DAN_TOC.map(item => <Option key={item} value={item}>{item}</Option>)}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="ton_giao" label="Tôn giáo" initialValue="Không">
                  <Select showSearch allowClear placeholder="Chọn Tôn giáo" filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}>
                    {TON_GIAO.map(item => <Option key={item} value={item}>{item}</Option>)}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}><Form.Item name="lop" label="Lớp"><Input /></Form.Item></Col>
              <Col span={8}>
                <Form.Item name="khoa" label="Khoa">
                  <Select showSearch allowClear placeholder="Chọn Khoa" filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}>
                    {facultiesList.map(item => <Option key={item} value={item}>{item}</Option>)}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}><Form.Item name="so_dien_thoai" label="SĐT"><Input /></Form.Item></Col>
              <Col span={8}><Form.Item name="email" label="Email"><Input type="email" /></Form.Item></Col>
              <Col span={8}><Form.Item name="email_sv" label="Email SV"><Input type="email" /></Form.Item></Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}><Form.Item name="facebook" label="Facebook"><Input /></Form.Item></Col>
              <Col span={8}>
                <Form.Item name="nhom" label="Nhóm sinh hoạt">
                  <Select showSearch allowClear placeholder="Chọn Nhóm">
                    {groupsList.map(item => <Option key={item} value={item}>{item}</Option>)}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </TabPane>

          <TabPane tab="Địa chỉ & Gia đình" key="2">
            <Divider style={{ margin: '12px 0', fontWeight: 700, color: '#c62828' }}>Quê quán</Divider>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="tinh_tp_qq" label="Tỉnh/TP quê quán">
                   <AddressProvinceSelect onChange={() => form.setFieldsValue({ xa_phuong_qq: undefined })} size="large" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="xa_phuong_qq" label="Xã/Phường quê quán">
                   <AddressWardSelect province={watchTinhTpQq} />
                </Form.Item>
              </Col>
            </Row>

            <Divider style={{ margin: '12px 0', fontWeight: 700, color: '#c62828' }}>Quê quán cũ (nếu có)</Divider>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="tinh_tp_qq_cu" label="Tỉnh/TP quê quán cũ">
                  <AddressProvinceSelect isOld={true} onChange={() => form.setFieldsValue({ quan_huyen_qq_cu: undefined, xa_phuong_qq_cu: undefined })} size="large" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="quan_huyen_qq_cu" label="Quận/Huyện quê quán cũ">
                  <AddressDistrictSelect province={watchTinhTpQqCu} onChange={() => form.setFieldsValue({ xa_phuong_qq_cu: undefined })} size="large" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="xa_phuong_qq_cu" label="Xã/Phường quê quán cũ">
                  <AddressWardSelect isOld={true} province={watchTinhTpQqCu} district={watchQuanHuyenQqCu} />
                </Form.Item>
              </Col>
            </Row>

            <Divider style={{ margin: '12px 0', fontWeight: 700, color: '#c62828' }}>Địa chỉ thường trú</Divider>
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item name="chi_tiet_dc" label="Địa chỉ chi tiết">
                  <Input placeholder="Nhập số nhà, tên đường, tổ dân phố, thôn, xóm..." style={{ height: 40 }} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="tinh_tp_tt" label="Tỉnh/TP thường trú">
                   <AddressProvinceSelect onChange={(prov) => {
                     form.setFieldsValue({ xa_phuong_tt: undefined });
                     handleAddressSelectChange('tt', 'tinh_tp', prov);
                   }} size="large" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="xa_phuong_tt" label="Xã/Phường thường trú">
                   <AddressWardSelect province={watchTinhTpTt} onChange={(ward) => {
                     handleAddressSelectChange('tt', 'xa_phuong', ward);
                   }} />
                </Form.Item>
              </Col>
            </Row>

            <Divider style={{ margin: '12px 0', fontWeight: 700, color: '#c62828' }}>Thường trú cũ (nếu có)</Divider>
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item name="chi_tiet_tt_cu" label="Địa chỉ chi tiết cũ">
                  <Input placeholder="Nhập số nhà, tên đường, tổ dân phố, thôn, xóm cũ..." style={{ height: 40 }} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="tinh_tp_tt_cu" label="Tỉnh/TP thường trú cũ">
                  <AddressProvinceSelect isOld={true} onChange={(prov) => {
                    form.setFieldsValue({ quan_huyen_tt_cu: undefined, xa_phuong_tt_cu: undefined });
                    handleAddressSelectChange('tt_cu', 'tinh_tp', prov);
                  }} size="large" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="quan_huyen_tt_cu" label="Quận/Huyện thường trú cũ">
                  <AddressDistrictSelect province={watchTinhTpTtCu} onChange={(dist) => {
                    form.setFieldsValue({ xa_phuong_tt_cu: undefined });
                    handleAddressSelectChange('tt_cu', 'quan_huyen', dist);
                  }} size="large" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="xa_phuong_tt_cu" label="Xã/Phường thường trú cũ">
                  <AddressWardSelect isOld={true} province={watchTinhTpTtCu} district={watchQuanHuyenTtCu} onChange={(ward) => {
                    handleAddressSelectChange('tt_cu', 'xa_phuong', ward);
                  }} />
                </Form.Item>
              </Col>
            </Row>

            <Divider style={{ margin: '12px 0', fontWeight: 700, color: '#c62828' }}>Địa chỉ tạm trú</Divider>
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item name="chi_tiet_tam_tru" label="Địa chỉ chi tiết">
                  <Input placeholder="Nhập số nhà, tên đường, tổ dân phố, thôn, xóm..." style={{ height: 40 }} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="tinh_tp_tam_tru" label="Tỉnh/TP tạm trú">
                   <AddressProvinceSelect onChange={(prov) => {
                     form.setFieldsValue({ xa_phuong_tam_tru: undefined });
                     handleAddressSelectChange('tam_tru', 'tinh_tp', prov);
                   }} size="large" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="xa_phuong_tam_tru" label="Xã/Phường tạm trú">
                   <AddressWardSelect province={watchTinhTpTamTru} onChange={(ward) => {
                     handleAddressSelectChange('tam_tru', 'xa_phuong', ward);
                   }} />
                </Form.Item>
              </Col>
            </Row>

            <Divider style={{ margin: '16px 0' }} />
            <Row gutter={16}>
              <Col span={12}><Form.Item name="ho_ten_nguoi_than" label="Người thân (Tên)"><Input style={{ height: 40 }} /></Form.Item></Col>
              <Col span={12}><Form.Item name="sdt_nguoi_than" label="SĐT Người thân"><Input style={{ height: 40 }} /></Form.Item></Col>
            </Row>
          </TabPane>

          <TabPane tab="Thông tin Đảng" key="3">
            <Row gutter={16}>
              <Col span={8}><Form.Item name="ngay_vao_dang" label="Ngày vào Đảng"><DatePicker style={{ width: '100%' }} format={['DD/MM/YYYY', 'DDMMYYYY']} placeholder="DD/MM/YYYY" onChange={(date) => { if (date) form.setFieldsValue({ ngay_chinh_thuc: date.add(1, 'year') }); }} /></Form.Item></Col>

              <Col span={8}>
                <Form.Item name="dang_vien_du_bi" valuePropName="checked" style={{ marginTop: 30 }}>
                  <Checkbox>Là Đảng viên dự bị</Checkbox>
                </Form.Item>
              </Col>

              <Col span={8}>
                <Form.Item name="trang_thai" label="Trạng thái" initialValue="dang_sinh_hoat">
                  <Select>
                    <Option value="dang_sinh_hoat">Đang sinh hoạt</Option>
                    <Option value="da_chuyen">Đã chuyển ra</Option>
                    <Option value="cho_ket_nap">Chờ kết nạp</Option>
                    <Option value="dang_xet_chinh_thuc">Đang xét chính thức</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}><Form.Item name="ngay_chuyen_vao" label="Ngày chuyển vào Chi bộ"><DatePicker style={{ width: '100%' }} format={['DD/MM/YYYY', 'DDMMYYYY']} placeholder="DD/MM/YYYY" /></Form.Item></Col>
              <Col span={12}><Form.Item name="noi_chuyen_di" label="Nơi chuyển đi (Nơi sinh hoạt cũ)"><Input placeholder="Nhập tên chi bộ/đảng bộ cũ" /></Form.Item></Col>
            </Row>

            {!isDuBi && (
              <Row gutter={16}>
                <Col span={12}><Form.Item name="ngay_chinh_thuc" label="Ngày chính thức"><DatePicker style={{ width: '100%' }} format={['DD/MM/YYYY', 'DDMMYYYY']} placeholder="DD/MM/YYYY" /></Form.Item></Col>
                <Col span={12}><Form.Item name="so_the_dang" label="Số thẻ Đảng"><Input /></Form.Item></Col>
              </Row>
            )}

            <Row gutter={16}>
              <Col span={24}><Form.Item name="dvhd" label="Đảng viên hướng dẫn"><Input /></Form.Item></Col>
            </Row>
          </TabPane>
        </Tabs>
      </Form>
    </Modal>
  );
};

export default DangVienForm;
