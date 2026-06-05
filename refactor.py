import re

with open('src/pages/DocumentGenerator.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Remove the previewVisible state from handlePreview so it doesn't pop up
code = code.replace('setPreviewVisible(true);', '// setPreviewVisible(true); // removed for inline preview')

# 2. Extract the doc list code block because we will reuse it.
doc_list_start_str = '{/* COLUMN 1: LEFT DOCUMENT LIST MENU (span 9) */}'
doc_list_end_str = '{/* COLUMN 2: RIGHT FORM WORKSPACE PANEL (span 15) */}'

start_idx = code.find(doc_list_start_str)
end_idx = code.find(doc_list_end_str)

if start_idx == -1 or end_idx == -1:
    print("Could not find doc list markers via string match!")
    exit(1)

doc_list_code = code[start_idx:end_idx]

# Find the end of the MAIN WORKSPACE block
# Look for ") : (\n            <Card bordered={false} className=\"premium-card\" style={{ textAlign: 'center', padding: '48px 24px' }}>"
end_ws_str = ") : (\n            <Card bordered={false} className=\"premium-card\" style={{ textAlign: 'center', padding: '48px 24px' }}>"
end_ws_idx = code.find(end_ws_str)

if end_ws_idx == -1:
    print("Could not find end of workspace!")
    exit(1)

# Find the start of the MAIN WORKSPACE block
start_ws_str = '{/* MAIN 2-COLUMN BOTTOM WORKSPACE */}'
start_ws_idx = code.find(start_ws_str)

# Build the new forms code
new_forms_code = """
              {/* TOP SECTION: ALL FORMS */}
              <Form form={form} layout="vertical" className="premium-form">
                 <Card bordered={false} className="premium-card" style={{ marginBottom: 20, borderRadius: 16 }}>
                    <div style={{ fontWeight: 800, color: '#1e293b', fontSize: 13.5, marginBottom: 12 }}>Thông tin dùng chung & Đánh giá</div>
                    <Row gutter={16}>
                      <Col span={8}>
                        <Form.Item name="chi_bo_ket_nap" label={<span className="premium-form-label">Chi bộ kết nạp</span>}>
                          <Input placeholder="Chi bộ Sinh viên" />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="co_quan_cong_tac" label={<span className="premium-form-label">Cơ quan công tác</span>}>
                          <Input placeholder="Trường Đại học Kinh tế..." />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="chi_bo_sinh_hoat" label={<span className="premium-form-label">Chi bộ sinh hoạt</span>}>
                          <Input placeholder="Chi bộ Sinh viên" />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item name="uu_diem" label={<span className="premium-form-label">Ưu điểm</span>}>
                          <Input.TextArea rows={4} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="khuyet_diem" label={<span className="premium-form-label">Khuyết điểm</span>}>
                          <Input.TextArea rows={4} />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={16}>
                      <Col span={24}>
                        <Form.Item name="bien_phap_khac_phuc" label={<span className="premium-form-label">Biện pháp khắc phục (không bắt buộc)</span>}>
                          <Input.TextArea rows={2} />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Divider dashed style={{ margin: '16px 0' }} />
                    <div style={{ fontWeight: 800, color: '#1e293b', fontSize: 13.5, marginBottom: 12 }}>Đại diện các cấp & Số liệu họp</div>
                    
                    <Row gutter={16}>
                      <Col span={6}>
                        <Form.Item name="chu_tri_lop" label={<span className="premium-form-label">Chủ trì Lớp</span>}>
                          <Input placeholder="Lớp trưởng" />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item name="thu_ky_lop" label={<span className="premium-form-label">Thư ký Lớp</span>}>
                          <Input placeholder="Bí thư Chi đoàn" />
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item name="tong_so_sv_lop" label={<span className="premium-form-label">TS SV Lớp</span>}>
                          <InputNumber style={{width:'100%'}} />
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item name="tham_gia_lop" label={<span className="premium-form-label">Có mặt (Lớp)</span>}>
                          <InputNumber style={{width:'100%'}} />
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item name="vang_lop" label={<span className="premium-form-label">Vắng (Lớp)</span>}>
                          <InputNumber style={{width:'100%'}} />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={16}>
                      <Col span={6}>
                        <Form.Item name="chu_tri_chi_doan" label={<span className="premium-form-label">Chủ trì Chi đoàn</span>}>
                          <Input />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item name="thu_ky_chi_doan" label={<span className="premium-form-label">Thư ký Chi đoàn</span>}>
                          <Input />
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item name="tong_so_dv_chi_doan" label={<span className="premium-form-label">TS ĐV CĐ</span>}>
                          <InputNumber style={{width:'100%'}} />
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item name="tham_gia_chi_doan" label={<span className="premium-form-label">Có mặt (CĐ)</span>}>
                          <InputNumber style={{width:'100%'}} />
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item name="vang_chi_doan" label={<span className="premium-form-label">Vắng (CĐ)</span>}>
                          <InputNumber style={{width:'100%'}} />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={16}>
                      <Col span={6}>
                        <Form.Item name="chu_tri_lcd" label={<span className="premium-form-label">Chủ trì LCĐ</span>}>
                          <Input />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item name="thu_ky_lcd" label={<span className="premium-form-label">Thư ký LCĐ</span>}>
                          <Input />
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item name="tong_so_uy_vien_lcd" label={<span className="premium-form-label">TS UV LCĐ</span>}>
                          <InputNumber style={{width:'100%'}} />
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item name="tham_gia_lcd" label={<span className="premium-form-label">Có mặt (LCĐ)</span>}>
                          <InputNumber style={{width:'100%'}} />
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item name="vang_lcd" label={<span className="premium-form-label">Vắng (LCĐ)</span>}>
                          <InputNumber style={{width:'100%'}} />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={16}>
                      <Col span={6}>
                        <Form.Item name="tan_thanh_doan_truong" label={<span className="premium-form-label">Đoàn Trường: Tán thành</span>}>
                          <InputNumber style={{width:'100%'}} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item name="khong_tan_thanh_doan_truong" label={<span className="premium-form-label">Đoàn Trường: K.Tán thành</span>}>
                          <InputNumber style={{width:'100%'}} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item name="ly_do_vang_chi_doan" label={<span className="premium-form-label">Lý do vắng (nếu có)</span>}>
                          <Input />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item name="dia_diem_hop_lcd" label={<span className="premium-form-label">Địa điểm họp LCĐ</span>}>
                          <Input />
                        </Form.Item>
                      </Col>
                    </Row>

                    {isManager && (
                      <>
                        <Divider dashed style={{ margin: '16px 0' }} />
                        <div style={{ fontWeight: 800, color: '#0369a1', fontSize: 13.5, marginBottom: 12 }}>Dành cho Quản lý (Mẫu 11, 12, 13)</div>
                        
                        <Row gutter={16}>
                          <Col span={8}>
                            <Form.Item name="dvhd" label={<span className="premium-form-label">Đảng viên hướng dẫn (Mẫu 11)</span>}>
                              <Select 
                                showSearch 
                                placeholder="Chọn Đảng viên hướng dẫn"
                                optionFilterProp="children"
                                onChange={(val) => {
                                  const hd = officialMembers.find(m => m.ho_ten === val);
                                  if (hd) {
                                    form.setFieldsValue({
                                      dvhd_ngay_sinh: hd.ngay_sinh ? dayjs(hd.ngay_sinh) : null,
                                      dvhd_ngay_vao_dang: hd.ngay_vao_dang ? dayjs(hd.ngay_vao_dang) : null,
                                      dvhd_ngay_chinh_thuc: hd.ngay_chinh_thuc ? dayjs(hd.ngay_chinh_thuc) : null,
                                    });
                                  }
                                }}
                              >
                                {officialMembers.map(m => (
                                  <Option key={m.id} value={m.ho_ten}>{m.ho_ten} ({m.mssv})</Option>
                                ))}
                              </Select>
                            </Form.Item>
                          </Col>
                          <Col span={4}>
                            <Form.Item name="dvhd_ngay_sinh" label={<span className="premium-form-label">Ngày sinh (ĐVHD)</span>}>
                              <DatePicker format="DD/MM/YYYY" style={{width:'100%'}} />
                            </Form.Item>
                          </Col>
                          <Col span={4}>
                            <Form.Item name="dvhd_ngay_vao_dang" label={<span className="premium-form-label">Vào Đảng (ĐVHD)</span>}>
                              <DatePicker format="DD/MM/YYYY" style={{width:'100%'}} />
                            </Form.Item>
                          </Col>
                          <Col span={4}>
                            <Form.Item name="dvhd_ngay_chinh_thuc" label={<span className="premium-form-label">Chính thức (ĐVHD)</span>}>
                              <DatePicker format="DD/MM/YYYY" style={{width:'100%'}} />
                            </Form.Item>
                          </Col>
                          <Col span={4}>
                            <Form.Item name="nam_vao_chi_bo_dvhd" label={<span className="premium-form-label">Năm sinh hoạt</span>}>
                              <Input placeholder="2022" />
                            </Form.Item>
                          </Col>
                        </Row>

                        <Row gutter={16}>
                          <Col span={8}>
                            <Form.Item name="chi_uy_noi_cu_tru" label={<span className="premium-form-label">Tên Chi ủy cư trú (Mẫu 12)</span>}>
                              <Input placeholder="43-44-45 An Thượng" />
                            </Form.Item>
                          </Col>
                          <Col span={8}>
                            <Form.Item name="tong_so_chi_uy_noi_cu_tru" label={<span className="premium-form-label">Tổng số Chi ủy viên nơi cư trú</span>}>
                              <InputNumber style={{width:'100%'}} />
                            </Form.Item>
                          </Col>
                          <Col span={8}>
                            <Form.Item name="tong_so_to_chuc_ctxh" label={<span className="premium-form-label">Số lượng tổ chức CTXH</span>}>
                              <InputNumber style={{width:'100%'}} />
                            </Form.Item>
                          </Col>
                        </Row>

                        <Row gutter={16}>
                          <Col span={6}>
                            <Form.Item name="chu_tri_chi_bo" label={<span className="premium-form-label">Chủ trì (Mẫu 13)</span>}>
                              <Input />
                            </Form.Item>
                          </Col>
                          <Col span={6}>
                            <Form.Item name="chuc_vu_chu_tri_chi_bo" label={<span className="premium-form-label">Chức vụ</span>}>
                              <Input />
                            </Form.Item>
                          </Col>
                          <Col span={6}>
                            <Form.Item name="thu_ky_chi_bo" label={<span className="premium-form-label">Thư ký Chi bộ</span>}>
                              <Input />
                            </Form.Item>
                          </Col>
                        </Row>
                        <Row gutter={16}>
                          <Col span={4}>
                            <Form.Item name="tong_so_dv" label={<span className="premium-form-label">Tổng số ĐV</span>}>
                              <InputNumber style={{width:'100%'}} />
                            </Form.Item>
                          </Col>
                          <Col span={4}>
                            <Form.Item name="tong_so_dv_chinh_thuc" label={<span className="premium-form-label">ĐV Chính thức</span>}>
                              <InputNumber style={{width:'100%'}} />
                            </Form.Item>
                          </Col>
                          <Col span={4}>
                            <Form.Item name="tong_so_dv_du_bi" label={<span className="premium-form-label">ĐV Dự bị</span>}>
                              <InputNumber style={{width:'100%'}} />
                            </Form.Item>
                          </Col>
                        </Row>
                      </>
                    )}
                 </Card>
              </Form>
"""

new_bottom_code = """
              {/* BOTTOM SECTION: TWO COLUMNS */}
              <Row gutter={20}>
                """ + doc_list_code + """
                
                {/* COLUMN 2: RIGHT LIVE PREVIEW */}
                <Col xs={24} md={14} lg={15}>
                  <Card bordered={false} className="premium-card" style={{ borderRadius: 16, height: '100%', minHeight: 600 }}>
                    <div style={{ fontWeight: 800, color: '#c62828', fontSize: 16, marginBottom: 16 }}>
                      Xem trước văn bản: {previewDocType ? DOCUMENT_TYPES.find(d => d.key === previewDocType)?.label : 'Chưa chọn'}
                    </div>
                    {previewDocType ? renderDocPreview() : (
                      <div style={{ textAlign: 'center', padding: '100px 0', color: '#94a3b8' }}>
                         <EyeOutlined style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }} />
                         <div>Chọn "Xem trước" ở một biểu mẫu để xem kết quả.</div>
                      </div>
                    )}
                  </Card>
                </Col>
              </Row>
"""

new_block = "{/* MAIN WORKSPACE */}\n          {selectedMember ? (\n            <>\n" + new_forms_code + new_bottom_code + "\n            </>\n          "

code = code[:start_ws_idx] + new_block + code[end_ws_idx:]

# Remove modals manually
# The document preview modal starts with <Modal visible={previewVisible}
# Let's remove the <Modal visible={previewVisible} block completely
modal_start = code.find('<Modal\n        title="Xem trước văn bản"')
if modal_start == -1:
    modal_start = code.find('<Modal') # Try finding the first modal. But wait, I shouldn't just wipe all modals if I can't be sure.
    # I can just set previewVisible to always be false and hide the modal, or I can rely on removing the exact string.

if modal_start != -1:
    modal_end = code.find('</Modal>', modal_start)
    if modal_end != -1:
        # Just comment it out or remove
        code = code[:modal_start] + "{/* " + code[modal_start:modal_end+8] + " */}" + code[modal_end+8:]

with open('src/pages/DocumentGenerator.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Done refactoring layout!")
