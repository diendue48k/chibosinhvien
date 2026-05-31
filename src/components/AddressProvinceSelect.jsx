import React from 'react';
import { Select } from 'antd';
import addressData from '../data/addressData.json';

const { Option } = Select;

const AddressProvinceSelect = ({ value, onChange, placeholder, size }) => {
  const options = Object.keys(addressData);

  return (
    <Select 
      showSearch 
      allowClear
      value={value || undefined} 
      onChange={onChange} 
      placeholder={placeholder || "Chọn Tỉnh/TP"} 
      size={size}
      filterOption={(input, option) => 
        option.children?.toString().toLowerCase().includes(input.toLowerCase())
      }
    >
      {options.map(opt => <Option key={opt} value={opt}>{opt}</Option>)}
    </Select>
  );
};

export default AddressProvinceSelect;
