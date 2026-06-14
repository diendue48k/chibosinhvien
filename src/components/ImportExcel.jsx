import React, { useState, useEffect } from 'react';
import { Modal, Button, Upload, Table, message, Space, Alert, Form, Row, Col, Input, Select, DatePicker, Checkbox, Tabs } from 'antd';
import { UploadOutlined, DownloadOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import { collection, addDoc, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import dayjs from 'dayjs';

const { TabPane } = Tabs;
const { Option } = Select;

const DAN_TOC = ["Kinh", "Tày", "Thái", "Hoa", "Khmer", "Mường", "Nùng", "H'Mông", "Dao", "Gia Rai", "Ngái", "Ê Đê", "Ba Na", "Xơ Đăng", "Sán Chay", "Cơ Ho", "Chăm", "Sán Dìu", "Hrê", "Mnông", "Ra Glai", "Xtiêng", "Bru-Vân Kiều", "Thổ", "Giáy", "Cơ Tu", "Giẻ Triêng", "Mạ", "Khơ Mú", "Co", "Tà Ôi", "Chơ Ro", "Kháng", "Xinh Mun", "Hà Nhì", "Chu Ru", "Lào", "La Chí", "La Ha", "Phù Lá", "La Hủ", "Lự", "Lô Lô", "Chứt", "Mảng", "Pà Thẻn", "Co Lao", "Cống", "Bố Y", "Si La", "Pu Péo", "Brâu", "Ơ Đu", "Rơ Măm", "Khác"];
const TON_GIAO = ["Không", "Phật giáo", "Công giáo", "Tin Lành", "Cao Đài", "Hòa Hảo", "Hồi giáo", "Bà La Môn", "Khác"];
const NHOM = ["Phát triển Đảng", "Hồ sơ sinh hoạt Đảng", "Kiểm tra - Giám sát", "Truyền thông", "Tổ chức"];
const KHOA = ["P.CTSV", "Quản trị Kinh doanh", "Trung tâm Đào tạo Quốc tế", "Du lịch", "Marketing", "Tài chính", "Ngân hàng", "Kinh tế", "Kế toán", "Luật", "Thống kê - Tin học", "Thương mại điện tử", "Kinh doanh quốc tế", "Lý luận chính trị", "Khác"];
const GIOI_TINH = ["Nam", "Nữ"];

const normalizeDropdown = (value, optionsArray) => {
  if (!value) return null;
  let trimmed = String(value).trim();
  
  if (optionsArray === KHOA) {
    if (trimmed.toLowerCase().startsWith("khoa ")) {
      trimmed = trimmed.substring(5).trim();
    }
  }
  
  const lower = trimmed.toLowerCase();
  let match = optionsArray.find(opt => opt.toLowerCase() === lower);
  if (match) return match;
  
  if (optionsArray === KHOA) {
    match = optionsArray.find(opt => opt.toLowerCase().includes(lower) || lower.includes(opt.toLowerCase()));
    if (match) return match;
  }
  
  if (optionsArray.includes("Khác")) return "Khác";
  return trimmed; // fallback
};

const validateAllRows = (rows, dbList) => {
  const existingMssvMap = new Map();
  const existingCccdMap = new Map();
  dbList.forEach(item => {
    if (item.mssv) existingMssvMap.set(item.mssv.toString().trim(), item);
    if (item.cccd) existingCccdMap.set(item.cccd.toString().trim(), item);
  });

  const mssvCounts = {};
  const cccdCounts = {};
  rows.forEach(r => {
    if (r.mssv) {
      const cleanM = r.mssv.toString().trim();
      mssvCounts[cleanM] = (mssvCounts[cleanM] || 0) + 1;
    }
    if (r.cccd) {
      const cleanC = r.cccd.toString().trim();
      cccdCounts[cleanC] = (cccdCounts[cleanC] || 0) + 1;
    }
  });

  return rows.map(mappedRow => {
    let errorMsg = "";
    let isUpdate = false;
    let docId = null;
    const cleanMssv = mappedRow.mssv ? mappedRow.mssv.toString().trim() : "";
    const cleanCccd = mappedRow.cccd ? mappedRow.cccd.toString().trim() : "";

    const existingMssvRec = cleanMssv ? existingMssvMap.get(cleanMssv) : null;

    if (!cleanMssv || !mappedRow.ho_ten) {
      errorMsg = "Thiếu MSSV hoặc Họ tên";
    } else if (mssvCounts[cleanMssv] > 1) {
      const otherOccur = rows.find(x => x.mssv && x.mssv.toString().trim() === cleanMssv && x.key !== mappedRow.key);
      errorMsg = `Trùng MSSV trong file Excel (với ${otherOccur?.ho_ten})`;
    } else {
      if (existingMssvRec) {
        isUpdate = true;
        docId = existingMssvRec.id;
        if (cleanCccd) {
          const existingCccdRec = existingCccdMap.get(cleanCccd);
          if (existingCccdRec && existingCccdRec.id !== docId) {
            errorMsg = `CCCD đã được sử dụng bởi người khác (${existingCccdRec.ho_ten || existingCccdRec.mssv})`;
            isUpdate = false;
          } else if (cccdCounts[cleanCccd] > 1) {
            const otherOccur = rows.find(x => x.cccd && x.cccd.toString().trim() === cleanCccd && x.key !== mappedRow.key);
            errorMsg = `Trùng CCCD trong file Excel (với ${otherOccur?.ho_ten})`;
            isUpdate = false;
          }
        }
      } else {
        if (cleanCccd && existingCccdMap.has(cleanCccd)) {
          const existingCccdRec = existingCccdMap.get(cleanCccd);
          errorMsg = `CCCD đã tồn tại trong CSDL (${existingCccdRec.ho_ten || existingCccdRec.mssv})`;
        } else if (cleanCccd && cccdCounts[cleanCccd] > 1) {
          const otherOccur = rows.find(x => x.cccd && x.cccd.toString().trim() === cleanCccd && x.key !== mappedRow.key);
          errorMsg = `Trùng CCCD trong file Excel (với ${otherOccur?.ho_ten})`;
        }
      }
    }

    return {
      ...mappedRow,
      hasError: !!errorMsg,
      errorMsg: errorMsg,
      isUpdate: isUpdate,
      docId: docId,
      dbRecord: existingMssvRec || null
    };
  });
};

const ImportExcel = ({ open, onCancel, onSuccess }) => {
  const [fileList, setFileList] = useState([]);
  const [previewData, setPreviewData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedDetailRow, setSelectedDetailRow] = useState(null);
  const [dbDangVienList, setDbDangVienList] = useState([]);
  const [detailForm] = Form.useForm();

  useEffect(() => {
    if (selectedDetailRow) {
      detailForm.setFieldsValue({
        ...selectedDetailRow,
        ngay_sinh: selectedDetailRow.ngay_sinh ? dayjs(selectedDetailRow.ngay_sinh) : null,
        ngay_vao_dang: selectedDetailRow.ngay_vao_dang ? dayjs(selectedDetailRow.ngay_vao_dang) : null,
        ngay_chinh_thuc: selectedDetailRow.ngay_chinh_thuc ? dayjs(selectedDetailRow.ngay_chinh_thuc) : null,
        ngay_chuyen_vao: selectedDetailRow.ngay_chuyen_vao ? dayjs(selectedDetailRow.ngay_chuyen_vao) : null,
      });
    }
  }, [selectedDetailRow]);

  const handleSaveDetailRow = (values) => {
    const updatedRow = {
      ...selectedDetailRow,
      ...values,
      ngay_sinh: values.ngay_sinh ? values.ngay_sinh.format('YYYY-MM-DD') : null,
      ngay_vao_dang: values.ngay_vao_dang ? values.ngay_vao_dang.format('YYYY-MM-DD') : null,
      ngay_chinh_thuc: values.ngay_chinh_thuc ? values.ngay_chinh_thuc.format('YYYY-MM-DD') : null,
      ngay_chuyen_vao: values.ngay_chuyen_vao ? values.ngay_chuyen_vao.format('YYYY-MM-DD') : null,
    };

    const updatedList = previewData.map(r => r.key === selectedDetailRow.key ? updatedRow : r);
    const revalidated = validateAllRows(updatedList, dbDangVienList);
    
    setPreviewData(revalidated);
    setSelectedRowKeys(revalidated.filter(d => !d.hasError).map(d => d.key));
    
    message.success("Đã cập nhật dòng dữ liệu.");
    setIsDetailOpen(false);
    setSelectedDetailRow(null);
  };

  const handleDownloadTemplate = () => {
    const templateData = [{
      "Họ tên": "Nguyễn Văn A",
      "MSSV": "20110001",
      "Ngày sinh": "2002-05-10",
      "Giới tính": "Nam",
      "CCCD": "012345678912",
      "Dân tộc": "Kinh",
      "Tôn giáo": "Không",
      "Lớp": "48K01.1",
      "Khoa": "CNTT",
      "Nhóm sinh hoạt": "Phát triển Đảng",
      "SĐT": "0987654321",
      "Email cá nhân": "nva@gmail.com",
      "Email sinh viên": "20110001@student.edu.vn",
      "Facebook": "facebook.com/nva",
      "Địa chỉ tạm trú": "Ký túc xá khu A",
      "Chi tiết địa chỉ thường trú": "Phòng 101",
      "Xã/phường thường trú": "Linh Trung",
      "Quận/huyện thường trú": "Thành phố Thủ Đức",
      "Tỉnh/TP thường trú": "Thành phố Hồ Chí Minh",
      "Chi tiết thường trú cũ": "Số 12 đường B",
      "Xã/phường thường trú cũ": "Phường C",
      "Quận/huyện thường trú cũ": "Quận D",
      "Tỉnh/TP thường trú cũ": "Tỉnh E",
      "Quê quán (chi tiết)": "Xã A, Huyện B, Tỉnh C",
      "Xã/phường quê quán": "Xã A",
      "Tỉnh/TP quê quán": "Tỉnh B",
      "Họ tên người thân": "Nguyễn Văn B",
      "SĐT người thân": "0912345678",
      "Ngày vào Đảng": "2023-09-02",
      "Ngày chính thức": "2024-09-02",
      "Số thẻ Đảng": "123456",
      "Nơi chuyển đi": "Chi bộ Trường Đại học A",
      "Ngày chuyển vào": "2024-05-15",
      "Loại Đảng viên (Dự bị / Chính thức)": "Dự bị",
      "Trạng thái sinh hoạt": "Đang sinh hoạt",
      "Đảng viên hướng dẫn": "Nguyễn Văn C",
      "Link ảnh cá nhân": "https://drive.google.com/.../view"
    }];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "DangVien_Template.xlsx");
  };

  const handleUpload = (file) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      setLoading(true);
      try {
        const snapshot = await getDocs(collection(db, "dang_vien"));
        const existingData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setDbDangVienList(existingData);

        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawJsonData = XLSX.utils.sheet_to_json(worksheet);
        
        const jsonData = rawJsonData.filter(row => {
          const mssvVal = row["MSSV"]?.toString().trim();
          const hotenVal = row["Họ tên"] || row["HỌ VÀ TÊN"] || row["Họ và tên"] || row["Họ tên"] || "";
          return !!mssvVal || !!hotenVal;
        });

        const parseDate = (dateStr) => {
          if (!dateStr) return null;
          if (typeof dateStr === 'string' && dateStr.includes('/')) {
            const parts = dateStr.split('/');
            if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          }
          return dateStr;
        };

        const parsedData = jsonData.map((row, index) => {
          const statusStr = row["Trạng thái sinh hoạt"] || "";
          const trang_thai = statusStr === "Đã chuyển ra" ? "da_chuyen" :
            statusStr === "Chờ kết nạp" ? "cho_ket_nap" :
              statusStr === "Đang xét chính thức" ? "dang_xet_chinh_thuc" : "dang_sinh_hoat";

          return {
            key: index.toString(),
            ho_ten: row["Họ tên"] || row["HỌ VÀ TÊN"] || row["Họ và tên"] || row["Họ tên"] || "",
            mssv: row["MSSV"]?.toString() || "",
            ngay_sinh: parseDate(row["Ngày sinh"]),
            gioi_tinh: normalizeDropdown(row["Giới tính"], GIOI_TINH),
            cccd: row["CCCD"]?.toString() || "",
            dan_toc: normalizeDropdown(row["Dân tộc"], DAN_TOC),
            ton_giao: normalizeDropdown(row["Tôn giáo"], TON_GIAO),
            lop: row["Lớp"] || "",
            khoa: normalizeDropdown(row["Khoa"], KHOA),
            nhom: normalizeDropdown(row["Nhóm sinh hoạt"], NHOM),
            so_dien_thoai: row["SĐT"]?.toString() || "",
            email: row["Email cá nhân"] || "",
            email_sv: row["Email sinh viên"] || "",
            facebook: row["Facebook"] || "",
            dia_chi_tam_tru: row["Địa chỉ tạm trú"] || "",
            
            // New Address
            chi_tiet_dc: row["Chi tiết địa chỉ thường trú"] || row["Chi tiết địa chỉ"] || "",
            xa_phuong_tt: row["Xã/phường thường trú"] || "",
            quan_huyen_tt: row["Quận/huyện thường trú"] || "",
            tinh_tp_tt: row["Tỉnh/TP thường trú"] || "",
            dia_chi_thuong_tru: (() => {
              const chiTiet = row["Chi tiết địa chỉ thường trú"] || row["Chi tiết địa chỉ"] || "";
              const xa = row["Xã/phường thường trú"] || "";
              const huyen = row["Quận/huyện thường trú"] || "";
              const tinh = row["Tỉnh/TP thường trú"] || "";
              const parts = [];
              if (chiTiet) parts.push(chiTiet);
              if (xa) parts.push(xa);
              if (huyen) parts.push(huyen);
              if (tinh) parts.push(tinh);
              return parts.join(', ');
            })(),
            
            // Old Address
            chi_tiet_tt_cu: row["Chi tiết thường trú cũ"] || "",
            xa_phuong_tt_cu: row["Xã/phường thường trú cũ"] || "",
            quan_huyen_tt_cu: row["Quận/huyện thường trú cũ"] || "",
            tinh_tp_tt_cu: row["Tỉnh/TP thường trú cũ"] || "",
            
            // Quê quán
            que_quan: (() => {
              const baseQueQuan = row["Quê quán (chi tiết)"] || row["Quê quán chi tiết"] || row["Quê quán"] || "";
              if (baseQueQuan) return baseQueQuan;
              const xa = row["Xã/phường quê quán"] || "";
              const huyen = row["Quận/huyện quê quán"] || "";
              const tinh = row["Tỉnh/TP quê quán"] || "";
              const parts = [];
              if (xa) parts.push(xa);
              if (huyen) parts.push(huyen);
              if (tinh) parts.push(tinh);
              return parts.join(', ');
            })(),
            xa_phuong_qq: row["Xã/phường quê quán"] || "",
            quan_huyen_qq: row["Quận/huyện quê quán"] || "",
            tinh_tp_qq: row["Tỉnh/TP quê quán"] || "",
            xa_phuong_qq_cu: row["Xã/phường quê quán cũ"] || "",
            quan_huyen_qq_cu: row["Quận/huyện quê quán cũ"] || "",
            tinh_tp_qq_cu: row["Tỉnh/TP quê quán cũ"] || "",
            
            ho_ten_nguoi_than: row["Họ tên người thân"] || "",
            sdt_nguoi_than: row["SĐT người thân"]?.toString() || "",
            ngay_vao_dang: parseDate(row["Ngày vào Đảng"]),
            ngay_chinh_thuc: parseDate(row["Ngày chính thức"]),
            so_the_dang: row["Số thẻ Đảng"]?.toString() || "",
            noi_chuyen_di: row["Nơi chuyển đi"] || "",
            ngay_chuyen_vao: parseDate(row["Ngày chuyển vào"]),
            dang_vien_du_bi: (row["Loại Đảng viên (Dự bị / Chính thức)"] || row["Trạng thái (Dự bị / Chính thức)"]) === "Dự bị",
            trang_thai: trang_thai,
            dvhd: row["Đảng viên hướng dẫn"] || "",
            anh_ca_nhan: row["Link ảnh cá nhân"] || ""
          };
        });

        const validatedData = validateAllRows(parsedData, existingData);

        // Đưa các dòng có lỗi lên đầu để người dùng dễ kiểm tra
        const sortedData = [...validatedData].sort((a, b) => {
          if (a.hasError && !b.hasError) return -1;
          if (!a.hasError && b.hasError) return 1;
          return 0;
        });

        setPreviewData(sortedData);
        setSelectedRowKeys(sortedData.filter(d => !d.hasError).map(d => d.key));
      } catch (err) {
        console.error(err);
        message.error("Lỗi khi đọc file Excel");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
    return false; // Prevent default upload
  };

  const handleImport = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Vui lòng chọn ít nhất 1 dòng hợp lệ để import');
      return;
    }
    setLoading(true);
    let successCount = 0;

    const FIELD_LABELS = {
      ho_ten: "Họ và tên",
      mssv: "MSSV",
      ngay_sinh: "Ngày sinh",
      gioi_tinh: "Giới tính",
      cccd: "CCCD",
      dan_toc: "Dân tộc",
      ton_giao: "Tôn giáo",
      lop: "Lớp",
      khoa: "Khoa",
      nhom: "Nhóm sinh hoạt",
      so_dien_thoai: "Số điện thoại",
      email: "Email cá nhân",
      email_sv: "Email sinh viên",
      facebook: "Facebook",
      dia_chi_tam_tru: "Địa chỉ tạm trú",
      chi_tiet_dc: "Địa chỉ thường trú",
      xa_phuong_tt: "Xã/Phường thường trú",
      tinh_tp_tt: "Tỉnh/TP thường trú",
      xa_phuong_qq: "Xã/Phường quê quán",
      tinh_tp_qq: "Tỉnh/TP quê quán",
      ngay_vao_dang: "Ngày vào Đảng",
      ngay_chinh_thuc: "Ngày chính thức",
      so_the_dang: "Số thẻ Đảng",
      noi_chuyen_di: "Nơi chuyển đi",
      ngay_chuyen_vao: "Ngày chuyển vào",
      dvhd: "Đảng viên hướng dẫn",
      ho_ten_nguoi_than: "Họ tên người thân",
      sdt_nguoi_than: "SĐT người thân",
      anh_ca_nhan: "Ảnh cá nhân",
      dang_vien_du_bi: "Loại Đảng viên",
      trang_thai: "Trạng thái sinh hoạt"
    };

    try {
      const dataToImport = previewData.filter(d => selectedRowKeys.includes(d.key));
      const insertPromises = [];

      for (const row of dataToImport) {
        const cleanData = { ...row };
        delete cleanData.key;
        delete cleanData.hasError;
        delete cleanData.errorMsg;
        delete cleanData.isUpdate;
        delete cleanData.docId;
        delete cleanData.dbRecord; // Delete the database reference before saving

        // Clean undefined and null values
        Object.keys(cleanData).forEach(key => {
          if (cleanData[key] === undefined || cleanData[key] === null) {
            delete cleanData[key];
          }
        });

        if (row.isUpdate && row.docId) {
          // For updates, ALSO delete empty string fields to avoid overwriting existing data with blanks
          Object.keys(cleanData).forEach(key => {
            if (cleanData[key] === "") {
              delete cleanData[key];
            }
          });

          if (Object.keys(cleanData).length > 0) {
            cleanData.updated_at = new Date().toISOString();
            insertPromises.push(updateDoc(doc(db, "dang_vien", row.docId), cleanData));

            // So sánh tìm các trường thông tin thay đổi để ghi log
            const changes = [];
            Object.keys(cleanData).forEach(key => {
              if (key === 'updated_at') return;
              const newVal = cleanData[key];
              const oldVal = row.dbRecord ? row.dbRecord[key] : undefined;

              let strOld = oldVal !== undefined && oldVal !== null ? String(oldVal).trim() : "";
              let strNew = newVal !== undefined && newVal !== null ? String(newVal).trim() : "";

              if (key === 'dang_vien_du_bi') {
                if (!!oldVal !== !!newVal) {
                  changes.push({
                    field: key,
                    label: FIELD_LABELS[key] || key,
                    oldVal: !!oldVal ? "Dự bị" : "Chính thức",
                    newVal: !!newVal ? "Dự bị" : "Chính thức"
                  });
                }
              } else if (strOld !== strNew) {
                changes.push({
                  field: key,
                  label: FIELD_LABELS[key] || key,
                  oldVal: oldVal !== undefined && oldVal !== null ? oldVal : "",
                  newVal: newVal !== undefined && newVal !== null ? newVal : ""
                });
              }
            });

            if (changes.length > 0) {
              insertPromises.push(addDoc(collection(db, "lich_su_cap_nhat"), {
                dang_vien_id: row.docId,
                mssv: row.mssv,
                ho_ten: row.ho_ten,
                updated_by: "Import từ Excel",
                updated_at: new Date().toISOString(),
                changes: changes
              }));
            }
          }
        } else {
          cleanData.trang_thai = 'dang_sinh_hoat'; // Default
          cleanData.created_at = new Date().toISOString();

          const addPromise = addDoc(collection(db, "dang_vien"), cleanData).then(async (docRef) => {
            await addDoc(collection(db, "lich_su_cap_nhat"), {
              dang_vien_id: docRef.id,
              mssv: cleanData.mssv || '',
              ho_ten: cleanData.ho_ten || '',
              updated_by: "Import từ Excel",
              updated_at: new Date().toISOString(),
              action: "create",
              changes: []
            });
          });
          insertPromises.push(addPromise);
        }

        successCount++;
      }

      await Promise.all(insertPromises);

      message.success(`Đã import thành công ${successCount} Đảng viên.`);
      setFileList([]);
      setPreviewData([]);
      onSuccess();
    } catch (error) {
      console.error(error);
      message.error("Đã xảy ra lỗi khi import.");
    } finally {
      setLoading(false);
    }
  };

  const renderFieldDiff = (label, key, formatter = null) => {
    if (!selectedDetailRow) return null;

    let newValue = selectedDetailRow[key];
    let oldValue = selectedDetailRow.dbRecord ? selectedDetailRow.dbRecord[key] : undefined;

    const isFieldEmptyInExcel = newValue === undefined || newValue === null || newValue === "";

    if (!selectedDetailRow.isUpdate || !selectedDetailRow.dbRecord) {
      const displayVal = formatter ? formatter(newValue) : newValue;
      return (
        <tr key={key} style={{ borderBottom: '1px solid #f0f0f0' }}>
          <td style={{ padding: '8px 12px', fontWeight: 600, color: '#666', width: '30%', backgroundColor: '#fafafa' }}>{label}</td>
          <td style={{ padding: '8px 12px', color: '#1a1a1a' }}>{displayVal || '--'}</td>
        </tr>
      );
    }

    if (isFieldEmptyInExcel) {
      const displayVal = formatter ? formatter(oldValue) : oldValue;
      return (
        <tr key={key} style={{ borderBottom: '1px solid #f0f0f0' }}>
          <td style={{ padding: '8px 12px', fontWeight: 600, color: '#666', width: '30%', backgroundColor: '#fafafa' }}>{label}</td>
          <td style={{ padding: '8px 12px', color: '#8c8c8c', fontStyle: 'italic' }}>
            {displayVal || '--'} <span style={{ fontSize: '11px', color: '#bfbfbf', marginLeft: '8px' }}>(Giữ nguyên từ CSDL)</span>
          </td>
        </tr>
      );
    }

    const normalizedOld = oldValue !== undefined && oldValue !== null ? String(oldValue).trim() : "";
    const normalizedNew = newValue !== undefined && newValue !== null ? String(newValue).trim() : "";

    const hasChanged = normalizedOld !== normalizedNew;

    if (hasChanged) {
      const displayOld = formatter ? formatter(oldValue) : oldValue;
      const displayNew = formatter ? formatter(newValue) : newValue;
      return (
        <tr key={key} style={{ borderBottom: '1px solid #f0e8e8', backgroundColor: '#fffbe6' }}>
          <td style={{ padding: '8px 12px', fontWeight: 600, color: '#c62828', width: '30%', backgroundColor: '#fff9e6' }}>{label}</td>
          <td style={{ padding: '8px 12px', color: '#1a1a1a' }}>
            <span style={{ color: '#8c8c8c', textDecoration: 'line-through', marginRight: '8px' }}>{displayOld || '(Trống)'}</span>
            <span style={{ color: '#d46b08', fontWeight: 800, marginRight: '8px' }}>➔</span>
            <span style={{ color: '#d46b08', fontWeight: 800, backgroundColor: '#fff2e8', padding: '2px 8px', borderRadius: '4px', border: '1px solid #ffd8bf' }}>
              {displayNew || '(Trống)'}
            </span>
          </td>
        </tr>
      );
    } else {
      const displayVal = formatter ? formatter(newValue) : newValue;
      return (
        <tr key={key} style={{ borderBottom: '1px solid #f0f0f0' }}>
          <td style={{ padding: '8px 12px', fontWeight: 600, color: '#666', width: '30%', backgroundColor: '#fafafa' }}>{label}</td>
          <td style={{ padding: '8px 12px', color: '#1a1a1a' }}>{displayVal || '--'}</td>
        </tr>
      );
    }
  };

  const columns = [
    { title: 'MSSV', dataIndex: 'mssv', key: 'mssv' },
    { title: 'Họ tên', dataIndex: 'ho_ten', key: 'ho_ten' },
    { title: 'Lớp', dataIndex: 'lop', key: 'lop' },
    { title: 'Khoa', dataIndex: 'khoa', key: 'khoa' },
    {
      title: 'Trạng thái',
      key: 'status',
      render: (_, record) => {
        if (record.hasError) return <span style={{ color: 'red', fontWeight: 500 }}>{record.errorMsg}</span>;
        if (record.isUpdate) return <span style={{ color: '#d46b08', fontWeight: 500 }}>Cập nhật thông tin</span>;
        return <span style={{ color: 'green', fontWeight: 500 }}>Thêm mới</span>;
      }
    }
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys) => setSelectedRowKeys(newSelectedRowKeys),
    getCheckboxProps: (record) => ({
      disabled: record.hasError,
    }),
  };

  return (
    <Modal
      title="Nhập danh sách & Cập nhật thay đổi từ Excel"
      open={open}
      onCancel={() => {
        setFileList([]);
        setPreviewData([]);
        onCancel();
      }}
      width={900}
      footer={[
        <Button key="cancel" onClick={onCancel}>Hủy</Button>,
        <Button key="import" type="primary" loading={loading} onClick={handleImport} style={{ backgroundColor: '#c62828' }}>
          Import Data
        </Button>
      ]}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <Alert
          message={
            <div style={{ textAlign: 'left' }}>
              <strong>Hỗ trợ Nhập & Cập nhật thay đổi:</strong> Hệ thống tự động đối chiếu mã số sinh viên (MSSV) để <strong>thêm mới</strong> hoặc <strong>cập nhật</strong> thông tin thay đổi. Cột nào có dữ liệu mới trong file Excel sẽ được cập nhật/ghi đè lên hệ thống, các cột để trống hoặc thiếu sẽ được giữ nguyên thông tin cũ trong cơ sở dữ liệu.
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: 12, borderRadius: '8px' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Upload
            beforeUpload={handleUpload}
            fileList={fileList}
            onChange={({ fileList }) => setFileList(fileList)}
            maxCount={1}
            accept=".xlsx,.xls"
          >
            <Button icon={<UploadOutlined />}>Chọn file Excel</Button>
          </Upload>
          <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>Tải file mẫu (Template)</Button>
        </div>

        {previewData.length > 0 && (
          <>
            <Alert 
              message={
                <div>
                  Tìm thấy <strong>{previewData.length}</strong> dòng dữ liệu. 
                  {previewData.some(d => d.hasError) ? (
                    <span>
                      {" "}Trong đó có <strong style={{ color: '#52c41a' }}>{previewData.filter(d => !d.hasError).length}</strong> dòng hợp lệ và <strong style={{ color: '#ff4d4f' }}>{previewData.filter(d => d.hasError).length}</strong> dòng bị lỗi (đã tự động bỏ qua).
                    </span>
                  ) : (
                    " Tất cả các dòng đều hợp lệ."
                  )}
                </div>
              } 
              type={previewData.some(d => d.hasError) ? "warning" : "success"}
              showIcon 
            />
            <Table
              rowSelection={rowSelection}
              columns={columns}
              dataSource={previewData}
              pagination={{ 
                defaultPageSize: 5,
                showSizeChanger: true,
                pageSizeOptions: ['5', '10', '20', '50', '100'],
                showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} dòng`
              }}
              size="small"
              onRow={(record) => {
                return {
                  onClick: (e) => {
                    if (e.target.closest('.ant-checkbox-wrapper') || e.target.closest('.ant-checkbox')) {
                      return;
                    }
                    setSelectedDetailRow(record);
                    setIsDetailOpen(true);
                  },
                  style: { cursor: 'pointer' }
                };
              }}
            />
          </>
        )}
      </Space>

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '4px', height: '20px', backgroundColor: '#c62828', borderRadius: '2px' }} />
            <span style={{ fontWeight: 800, fontSize: '16px', color: '#1a1a1a' }}>
              Chỉnh sửa dòng dữ liệu Excel - {selectedDetailRow?.ho_ten}
            </span>
          </div>
        }
        open={isDetailOpen}
        onCancel={() => {
          setIsDetailOpen(false);
          setSelectedDetailRow(null);
        }}
        width={800}
        footer={[
          <Button key="cancel" onClick={() => { setIsDetailOpen(false); setSelectedDetailRow(null); }}>
            Hủy
          </Button>,
          <Button key="save" type="primary" onClick={() => detailForm.submit()} style={{ backgroundColor: '#c62828', borderColor: '#c62828' }}>
            Lưu thay đổi
          </Button>
        ]}
      >
        <Form form={detailForm} layout="vertical" onFinish={handleSaveDetailRow}>
          {selectedDetailRow && selectedDetailRow.hasError && (
            <Alert 
              message={`Lỗi dòng dữ liệu: ${selectedDetailRow.errorMsg}`} 
              type="error" 
              showIcon 
              style={{ marginBottom: 16 }} 
            />
          )}
          <Tabs defaultActiveKey="1">
            <TabPane tab="Cá nhân" key="1">
              <Row gutter={12}>
                <Col span={8}>
                  <Form.Item name="ho_ten" label="Họ và tên" rules={[{ required: true, message: 'Nhập họ và tên' }]}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="mssv" label="MSSV" rules={[{ required: true, message: 'Nhập MSSV' }]}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="cccd" label="CCCD">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={12}>
                <Col span={6}>
                  <Form.Item name="ngay_sinh" label="Ngày sinh">
                    <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="gioi_tinh" label="Giới tính">
                    <Select>
                      {GIOI_TINH.map(g => <Option key={g} value={g}>{g}</Option>)}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="dan_toc" label="Dân tộc">
                    <Select showSearch>
                      {DAN_TOC.map(d => <Option key={d} value={d}>{d}</Option>)}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="ton_giao" label="Tôn giáo">
                    <Select showSearch>
                      {TON_GIAO.map(t => <Option key={t} value={t}>{t}</Option>)}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={12}>
                <Col span={8}>
                  <Form.Item name="lop" label="Lớp">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="khoa" label="Khoa">
                    <Select showSearch>
                      {KHOA.map(k => <Option key={k} value={k}>{k}</Option>)}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="nhom" label="Nhóm sinh hoạt">
                    <Select showSearch>
                      {NHOM.map(n => <Option key={n} value={n}>{n}</Option>)}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            </TabPane>
            
            <TabPane tab="Liên hệ & Địa chỉ" key="2">
              <Row gutter={12}>
                <Col span={6}>
                  <Form.Item name="so_dien_thoai" label="Số điện thoại">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="email" label="Email cá nhân">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="email_sv" label="Email sinh viên">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="facebook" label="Facebook">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={12}>
                <Col span={8}>
                  <Form.Item name="dia_chi_tam_tru" label="Địa chỉ tạm trú">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="chi_tiet_dc" label="Địa chỉ thường trú mới">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="chi_tiet_tt_cu" label="Địa chỉ thường trú cũ">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={12}>
                <Col span={6}>
                  <Form.Item name="xa_phuong_tt" label="Xã/phường thường trú mới">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="quan_huyen_tt" label="Quận/huyện thường trú mới">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="tinh_tp_tt" label="Tỉnh/TP thường trú mới">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="xa_phuong_tt_cu" label="Xã/phường thường trú cũ">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={12}>
                <Col span={6}>
                  <Form.Item name="quan_huyen_tt_cu" label="Quận/huyện thường trú cũ">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="tinh_tp_tt_cu" label="Tỉnh/TP thường trú cũ">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="xa_phuong_qq" label="Xã/phường quê quán">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="quan_huyen_qq" label="Quận/huyện quê quán">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={12}>
                <Col span={6}>
                  <Form.Item name="tinh_tp_qq" label="Tỉnh/TP quê quán">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="xa_phuong_qq_cu" label="Xã/phường quê quán cũ">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="quan_huyen_qq_cu" label="Quận/huyện quê quán cũ">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="tinh_tp_qq_cu" label="Tỉnh/TP quê quán cũ">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="ho_ten_nguoi_than" label="Họ tên người thân">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="sdt_nguoi_than" label="SĐT người thân">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
            </TabPane>

            <TabPane tab="Thông tin Đảng" key="3">
              <Row gutter={12}>
                <Col span={6}>
                  <Form.Item name="ngay_vao_dang" label="Ngày vào Đảng">
                    <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="ngay_chinh_thuc" label="Ngày chính thức">
                    <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="so_the_dang" label="Số thẻ Đảng">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="dang_vien_du_bi" valuePropName="checked" label="Loại Đảng viên" style={{ marginTop: '24px' }}>
                    <Checkbox>Dự bị</Checkbox>
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={12}>
                <Col span={8}>
                  <Form.Item name="dvhd" label="Đảng viên hướng dẫn">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="noi_chuyen_di" label="Nơi chuyển đi">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="ngay_chuyen_vao" label="Ngày chuyển vào">
                    <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
            </TabPane>
          </Tabs>
        </Form>
      </Modal>
    </Modal>
  );
};

export default ImportExcel;
