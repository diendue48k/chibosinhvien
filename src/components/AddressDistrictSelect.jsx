import React from 'react';
import { Select } from 'antd';
import addressData from '../data/addressData.json';

const { Option } = Select;

const AddressDistrictSelect = ({ value, onChange, province, placeholder, size }) => {
  const options = province ? Object.keys(addressData[province] || {}).sort() : [];

  return (
    <Select 
      showSearch 
      allowClear
      value={value || undefined} 
      onChange={onChange} 
      placeholder={placeholder || (province ? "Chọn Quận/Huyện" : "Chọn Tỉnh/TP trước")} 
      size={size}
      disabled={!province}
      filterOption={(input, option) => 
        option.children?.toString().toLowerCase().includes(input.toLowerCase())
      }
      style={{ width: '100%' }}
    >
      {options.map(opt => <Option key={opt} value={opt}>{opt}</Option>)}
    </Select>
  );
};

export default AddressDistrictSelect;
