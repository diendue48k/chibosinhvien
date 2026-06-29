import React, { useState, useEffect } from 'react';
import { Select, Input, Space, Button } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import addressDataMoi from '../data/addressDataMoi.json';
import addressDataCu from '../data/addressDataCu.json';

const { Option } = Select;

const AddressWardSelect = ({ value, onChange, province, district, isOld = false, disabled }) => {
  const [isManual, setIsManual] = useState(false);

  const options = React.useMemo(() => {
    if (!province) return [];
    
    if (!isOld) {
      // New Address format: just a list of wards under the province
      return addressDataMoi[province] ? [...addressDataMoi[province]].sort() : [];
    }

    // Old Address format: Province -> District -> Ward
    const provData = addressDataCu[province] || {};
    if (district) {
      return provData[district] || [];
    }
    // Fallback: merge all wards under all districts of this province
    const allWards = [];
    Object.values(provData).forEach(wardsList => {
      if (Array.isArray(wardsList)) {
        allWards.push(...wardsList);
      }
    });
    // Remove duplicates and sort
    return Array.from(new Set(allWards)).sort();
  }, [province, district, isOld]);

  useEffect(() => {
    if (value && options.length > 0) {
      if (!options.includes(value) && value !== "Khác") {
        setIsManual(true);
      }
    }
  }, [value, options]);

  const handleSelectChange = (val) => {
    if (val === "Khác") {
      setIsManual(true);
      onChange?.("");
    } else {
      onChange?.(val);
    }
  };

  if (isManual) {
    return (
      <Space.Compact style={{ width: '100%' }}>
        <Input 
          value={value} 
          onChange={(e) => onChange?.(e.target.value)} 
          placeholder="Nhập Xã/Phường" 
          size="large"
          disabled={disabled}
        />
        <Button size="large" onClick={() => { setIsManual(false); onChange?.(undefined); }} icon={<CloseOutlined />} disabled={disabled} />
      </Space.Compact>
    );
  }

  return (
    <Select 
      showSearch 
      allowClear
      value={value || undefined} 
      onChange={handleSelectChange} 
      placeholder={province ? "Chọn Xã/Phường" : "Chọn Tỉnh/TP trước"} 
      size="large"
      disabled={disabled || !province}
      filterOption={(input, option) => 
        option.children?.toString().toLowerCase().includes(input.toLowerCase())
      }
      style={{ width: '100%' }}
    >
      {options.map(opt => <Option key={opt} value={opt}>{opt}</Option>)}
      {province && <Option value="Khác" style={{ fontWeight: 'bold', color: '#c62828' }}>+ Khác (Nhập tay)</Option>}
    </Select>
  );
};

export default AddressWardSelect;
