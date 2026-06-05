import React from 'react';
import { Select } from 'antd';
import addressDataMoi from '../data/addressDataMoi.json';
import addressDataCu from '../data/addressDataCu.json';

const { Option } = Select;

const AddressProvinceSelect = ({ value, onChange, placeholder, size, isOld = false }) => {
  const addressData = isOld ? addressDataCu : addressDataMoi;
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
