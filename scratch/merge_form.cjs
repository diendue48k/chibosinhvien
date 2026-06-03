const fs = require('fs');

let content = fs.readFileSync('src/pages/HoSoChuyenRa.jsx', 'utf8');

// We will replace the entire Modal 1: Add Transfer Process block.
// And we'll update handleAddTransferSubmit.

const newHandleAdd = `
  const handleAddTransferSubmit = async () => {
    try {
      const values = await addForm.validateFields();
      setSubmittingAdd(true);
      
      const member = activeMembers.find(m => m.id === values.dang_vien_select);
      if (!member) {
        message.error("Đảng viên không tồn tại trong danh sách!");
        return;
      }
      
      const isReserve = member.loai_dang_vien === "Dự bị" || member.dang_vien_du_bi === true || member.loai_dang_vien === "dubi";
      const fullAddressStr = values.dia_chi || '';
      
      const newRecord = {
        dang_vien_id: member.id,
        mssv: values.mssv || member.mssv || '',
        cccd: member.cccd || '',
        ho_ten: member.ho_ten || '',
        ngay_sinh: values.ngay_sinh ? values.ngay_sinh.format('YYYY-MM-DD') : (member.ngay_sinh || ''),
        nhom: member.nhom || '',
        so_dien_thoai: values.so_dien_thoai || member.so_dien_thoai || '',
        email: member.email || member.email_sv || '',
        facebook: member.facebook || '',
        noi_thuong_tru: fullAddressStr,
        noi_tam_tru: member.dia_chi_tam_tru || '',
        sdt_nguoi_than: member.sdt_nguoi_than || '',
        ho_ten_nguoi_than: member.ho_ten_nguoi_than || '',
        ngay_nop_ho_so: values.ngay_ky ? values.ngay_ky.format('YYYY-MM-DD') : new Date().toISOString().split('T')[0],
        buoc: 1,
        loai_chuyen: values.loai_chuyen_sh || 'chuyen_ra',
        ghi_chu: values.ly_do_chuyen || '',
        status: 'processing',
        created_at: new Date().toISOString(),
        history: [{
          step: 1,
          time: new Date().toISOString(),
          note: "Khởi tạo tiến trình chuyển sinh hoạt",
          updated_by: currentUser?.email || currentUser?.username || "Admin"
        }]
      };

      await addDoc(collection(db, "chuyen_sinh_hoat"), newRecord);
      
      // Update Dang Vien profile with new info
      const memberUpdateData = {
        gioi_tinh: values.gioi_tinh || 'Nam',
        lop: values.lop || '',
        khoa: values.khoa || '',
        ngay_sinh: values.ngay_sinh ? values.ngay_sinh.format('YYYY-MM-DD') : '',
        so_dien_thoai: values.so_dien_thoai || '',
        que_quan: values.que_quan || '',
        dia_chi_thuong_tru: values.dia_chi || '',
        nhiem_vu_dang: values.nhiem_vu_dang || 'Đảng viên',
        uu_diem: values.uu_diem || '',
        khuyet_diem: values.khuyet_diem || '',
        updated_at: new Date().toISOString()
      };
      if (values.so_the_dang) memberUpdateData.so_the_dang = values.so_the_dang;
      if (values.ngay_vao_dang) memberUpdateData.ngay_vao_dang = values.ngay_vao_dang.format('YYYY-MM-DD');
      if (values.ngay_chinh_thuc && !isReserve) memberUpdateData.ngay_chinh_thuc = values.ngay_chinh_thuc.format('YYYY-MM-DD');
      
      await updateDoc(doc(db, "dang_vien", member.id), memberUpdateData);

      // Offer to generate docs
      Modal.confirm({
        title: 'Thành công',
        content: \`Đã thêm \${member.ho_ten} vào quy trình. Bạn có muốn tải biểu mẫu hồ sơ ngay bây giờ không?\`,
        okText: 'Tải ngay (ZIP)',
        cancelText: 'Đóng',
        onOk: async () => {
          try {
             // We reuse docForm logic or direct docGeneratorService
             const docData = {
                ...values,
                ho_ten: member.ho_ten,
                gioi_tinh: values.gioi_tinh || 'Nam',
                ngay_sinh: values.ngay_sinh ? values.ngay_sinh.format('YYYY-MM-DD') : '',
                ngay_vao_dang: values.ngay_vao_dang ? values.ngay_vao_dang.format('YYYY-MM-DD') : '',
                ngay_chinh_thuc: values.ngay_chinh_thuc ? values.ngay_chinh_thuc.format('YYYY-MM-DD') : '',
                ngay_ky: values.ngay_ky ? values.ngay_ky.format('YYYY-MM-DD') : '',
                ngay_phan_cong: values.ngay_phan_cong ? values.ngay_phan_cong.format('YYYY-MM-DD') : '',
                dvhd_ngay_sinh: values.dvhd_ngay_sinh ? values.dvhd_ngay_sinh.format('YYYY-MM-DD') : '',
                dvhd_ngay_vao_dang: values.dvhd_ngay_vao_dang ? values.dvhd_ngay_vao_dang.format('YYYY-MM-DD') : '',
                dvhd_ngay_chinh_thuc: values.dvhd_ngay_chinh_thuc ? values.dvhd_ngay_chinh_thuc.format('YYYY-MM-DD') : '',
             };
             
             const list = [];
             if (values.loai_chuyen_sh === 'chuyen_ra') {
               list.push('mau1');
               if (isReserve) list.push('mau3');
             } else {
               list.push('mau2');
             }
             list.push('mau4');
             if (isReserve && values.dvhd_ngay_sinh) list.push('mau5'); // Simple check

             await docGeneratorService.generateTransferDocumentsZip(docData, list);
             message.success("Đã tải biểu mẫu ZIP!");
          } catch(e) {
             message.error("Lỗi khi tải ZIP: " + e.message);
          }
        }
      });

      setIsAddModalVisible(false);
      addForm.resetFields();
      await fetchActiveMembersAndProcesses();
    } catch (e) {
      console.error("Lỗi khi thêm hồ sơ chuyển ra:", e);
      if (!e.errorFields) message.error("Lỗi khi thêm hồ sơ chuyển ra: " + e.message);
    } finally {
      setSubmittingAdd(false);
    }
  };
`;

const oldHandleAddRegex = /const handleAddTransferSubmit = async \(\) => \{[\s\S]*?(?=const handleAdvanceStep)/;
content = content.replace(oldHandleAddRegex, newHandleAdd + "\n  ");

const newAddModal = `
      {/* Modal 1: Add Transfer Process */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '4px', height: '24px', backgroundColor: '#c62828', borderRadius: '2px' }} />
            <span style={{ fontWeight: 800, fontSize: '18px', color: '#1a1a1a' }}>
              Khởi tạo hồ sơ Chuyển sinh hoạt
            </span>
          </div>
        }
        open={isAddModalVisible}
        onOk={handleAddTransferSubmit}
        onCancel={() => setIsAddModalVisible(false)}
        confirmLoading={submittingAdd}
        okText="KHỞI TẠO TIẾN TRÌNH"
        cancelText="HỦY BỎ"
        width={900}
        okButtonProps={{ style: { backgroundColor: '#c62828', borderColor: '#c62828', height: 40, fontWeight: 700, borderRadius: '6px' } }}
        cancelButtonProps={{ style: { height: 40, borderRadius: '6px' } }}
      >
        <Form form={addForm} layout="vertical" style={{ marginTop: 20 }}>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="dang_vien_select"
                label={<span style={{ fontWeight: 600 }}>Chọn Đảng viên đang sinh hoạt:</span>}
                rules={[{ required: true, message: 'Vui lòng chọn Đảng viên!' }]}
              >
                <Select
                  showSearch
                  placeholder="Nhập họ tên hoặc MSSV để tìm..."
                  optionFilterProp="children"
                  filterOption={(input, option) => 
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={availableMembers.map(m => ({
                    value: m.id,
                    label: \`\${m.ho_ten} - MSSV: \${m.mssv || 'N/A'} (Lớp: \${m.lop || 'N/A'}) - \${m.loai_dang_vien || (m.dang_vien_du_bi ? 'Dự bị' : 'Chính thức')}\`
                  }))}
                  onChange={(val) => {
                    const m = activeMembers.find(x => x.id === val);
                    if (m) {
                      const isReserve = m.loai_dang_vien === "Dự bị" || m.dang_vien_du_bi === true || m.loai_dang_vien === "dubi";
                      const defaultUuDiem = m.uu_diem || "- Có phẩm chất chính trị tốt lập trường tư tưởng vững vàng, tuyệt đối trung thành với đường lối của Đảng, tác phong đứng đắn, mẫu mực.\\n- Có lối sống đạo đức trong sáng, giản dị, luôn có ý thức tu dưỡng và rèn luyện đạo đức, luôn là tấm gương sáng cho các thế hệ noi theo.\\n- Có năng lực công tác tốt, luôn tích cực tham gia các hoạt động của chi Đoàn, khoa, Đoàn trường.\\n- Tính tình vui vẻ, hòa đồng, luôn giúp đỡ mọi người.\\n- Luôn có thái độ cầu thị trong việc nhìn nhận, sửa chữa, khắc phục khuyết điểm.";
                      const defaultKhuyetDiem = m.khuyet_diem || "Không có khuyết điểm gì lớn";
                      const defaultReason = "Tôi đã hoàn thành chương trình học và đã tốt nghiệp ra trường. Cần chuyển đến tổ chức Đảng mới để tiếp tục hoàn thành nhiệm vụ Đảng viên.";

                      addForm.setFieldsValue({
                        loai_chuyen_sh: 'chuyen_ra',
                        mssv: m.mssv || '',
                        gioi_tinh: m.gioi_tinh || 'Nam',
                        lop: m.lop || '',
                        khoa: m.khoa || '',
                        ngay_sinh: m.ngay_sinh ? dayjs(m.ngay_sinh) : null,
                        ngay_vao_dang: m.ngay_vao_dang ? dayjs(m.ngay_vao_dang) : null,
                        ngay_chinh_thuc: m.ngay_chinh_thuc ? dayjs(m.ngay_chinh_thuc) : null,
                        so_dien_thoai: m.so_dien_thoai || m.sdt || '',
                        so_the_dang: m.so_the_dang || m.so_quyet_dinh_dvct || m.so_qd || '',
                        que_quan: m.que_quan || m.tinh_tp_qq || '',
                        dia_chi: m.chi_tiet_dc || m.tinh_tp_tt || m.dia_chi_thuong_tru || '',
                        nhiem_vu_dang: m.nhiem_vu_dang || 'Đảng viên',
                        noi_chuyen_den: m.noi_chuyen_den || '',
                        tinh_tp: 'Đà Nẵng',
                        ly_do_chuyen: defaultReason,
                        uu_diem: defaultUuDiem,
                        khuyet_diem: defaultKhuyetDiem,
                        ngay_ky: dayjs()
                      });
                    }
                  }}
                  dropdownStyle={{ borderRadius: '6px' }}
                />
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="loai_chuyen_sh" label="Loại chuyển sinh hoạt Đảng" rules={[{ required: true }]}>
                <Radio.Group>
                  <Radio value="chuyen_ra">Chuyển ra ngoài</Radio>
                  <Radio value="chuyen_tam_thoi">Chuyển tạm thời</Radio>
                </Radio.Group>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="gioi_tinh" label="Giới tính" rules={[{ required: true }]}>
                <Select>
                  <Option value="Nam">Nam</Option>
                  <Option value="Nữ">Nữ</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="lop" label="Lớp học tập" rules={[{ required: true }]}><Input /></Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="khoa" label="Khoa quản lý" rules={[{ required: true }]}><Input /></Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="ngay_sinh" label="Ngày sinh" rules={[{ required: true }]}><DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} /></Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="so_dien_thoai" label="Số điện thoại liên hệ" rules={[{ required: true }]}><Input /></Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="ngay_vao_dang" label="Ngày vào Đảng" rules={[{ required: true }]}><DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} /></Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="ngay_chinh_thuc" label="Ngày chính thức"><DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} /></Form.Item>
            </Col>
            <Col span={8}>
               <Form.Item name="so_the_dang" label="Số thẻ Đảng viên (nếu có)"><Input /></Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="que_quan" label="Quê quán" rules={[{ required: true }]}><Input placeholder="Xã..., Huyện..., Tỉnh..." /></Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="dia_chi" label="Địa chỉ cư trú hiện nay" rules={[{ required: true }]}><Input placeholder="Thôn..., Xã..., Huyện..., Tỉnh..." /></Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="nhiem_vu_dang" label="Nhiệm vụ trong Đảng" rules={[{ required: true }]}><Input /></Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="tinh_tp" label="Tỉnh/Thành phố ký hồ sơ" rules={[{ required: true }]}><Input /></Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="noi_chuyen_den" label="Nơi chuyển sinh hoạt Đảng đến" rules={[{ required: true }]}><Input /></Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="ngay_ky" label="Ngày ký hồ sơ" rules={[{ required: true }]}><DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} /></Form.Item>
            </Col>
          </Row>
          <Form.Item name="ly_do_chuyen" label="Lý do xin chuyển sinh hoạt Đảng" rules={[{ required: true }]}><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="uu_diem" label="Tự nhận xét Ưu điểm" rules={[{ required: true }]}><Input.TextArea rows={4} /></Form.Item>
          <Form.Item name="khuyet_diem" label="Tự nhận xét Khuyết điểm" rules={[{ required: true }]}><Input.TextArea rows={2} /></Form.Item>
          
          <Divider orientation="left">Dành cho Đảng viên Dự bị (Mẫu 5)</Divider>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="dvhd" label="Tên Đảng viên hướng dẫn"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="ngay_phan_cong" label="Ngày phân công HD"><DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}><Form.Item name="dvhd_ngay_sinh" label="Ngày sinh ĐVHD"><DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={8}><Form.Item name="dvhd_ngay_vao_dang" label="Ngày vào Đảng ĐVHD"><DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={8}><Form.Item name="dvhd_ngay_chinh_thuc" label="Ngày chính thức ĐVHD"><DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>
`;

const oldAddModalRegex = /\{\/\* Modal 1: Add Transfer Process \*\/\}[\s\S]*?(?=\{\/\* Modal 2: Complete Transfer Process \*\/)/;
content = content.replace(oldAddModalRegex, newAddModal + "\n      ");

fs.writeFileSync('src/pages/HoSoChuyenRa.jsx', content, 'utf8');
console.log("Replaced handleAddTransferSubmit and Add Modal in HoSoChuyenRa.jsx");
